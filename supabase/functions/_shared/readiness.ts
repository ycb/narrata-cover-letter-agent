import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { streamJsonFromLLM } from './pipeline-utils.ts';

const MAX_PROMPT_CHARS = 16000;
export const DRAFT_READINESS_MIN_WORDS = 150;
export const DRAFT_READINESS_MODEL = 'gpt-4o-mini';

// ============================================================================
// UNIFIED LABELS: Exceptional | Strong | Adequate | Needs Work
// ============================================================================
// Readiness provides a HOLISTIC EDITORIAL verdict - it does NOT duplicate
// Score, Gap Analysis, Requirements, or Fit metrics. It evaluates the draft
// AS A WHOLE from a recruiter/hiring manager perspective.
// ============================================================================

export const UNIFIED_LABELS = ['Exceptional', 'Strong', 'Adequate', 'Needs Work'] as const;
export type UnifiedLabel = typeof UNIFIED_LABELS[number];

export const TOO_SHORT_SUMMARY = 'The draft is too short to evaluate. Add more detail.';

// ============================================================================
// 4 EDITORIAL DIMENSIONS (non-duplicative with Score)
// Score = writing craft dimensions
// Readiness = high-level editorial verdict dimensions
// ============================================================================
export const readinessDimension = z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']);
export const draftReadinessSchema = z.object({
  verdict: z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']),
  verdict_summary: z.string().min(1).max(200),
  dimensions: z.object({
    narrative_coherence: readinessDimension,      // Does the letter tell a cohesive story?
    persuasiveness_evidence: readinessDimension,  // Is it convincing with real proof?
    role_relevance: readinessDimension,           // Does it speak to THIS specific role?
    professional_polish: readinessDimension,      // Is it polished and ready to send?
  }),
  improvements: z.array(z.string().min(1).max(150)).max(2), // Max 2 improvements per spec
});

export type DraftReadinessResult = z.infer<typeof draftReadinessSchema>;

// Legacy type mapping for frontend compatibility (4 dimensions)
export interface LegacyReadinessResult {
  rating: 'exceptional' | 'strong' | 'adequate' | 'weak';
  scoreBreakdown: {
    narrativeCoherence: 'strong' | 'sufficient' | 'insufficient';
    persuasivenessEvidence: 'strong' | 'sufficient' | 'insufficient';
    roleRelevance: 'strong' | 'sufficient' | 'insufficient';
    professionalPolish: 'strong' | 'sufficient' | 'insufficient';
  };
  feedback: {
    summary: string;
    improvements: string[];
  };
}

// Convert new format to legacy format for frontend compatibility
function toLegacyLabel(label: UnifiedLabel): 'strong' | 'sufficient' | 'insufficient' {
  switch (label) {
    case 'Exceptional':
    case 'Strong':
      return 'strong';
    case 'Adequate':
      return 'sufficient';
    case 'Needs Work':
      return 'insufficient';
  }
}

function toLegacyRating(label: UnifiedLabel): 'exceptional' | 'strong' | 'adequate' | 'weak' {
  switch (label) {
    case 'Exceptional':
      return 'exceptional';
    case 'Strong':
      return 'strong';
    case 'Adequate':
      return 'adequate';
    case 'Needs Work':
      return 'weak';
  }
}

export function convertToLegacyFormat(result: DraftReadinessResult): LegacyReadinessResult {
  return {
    rating: toLegacyRating(result.verdict),
    scoreBreakdown: {
      narrativeCoherence: toLegacyLabel(result.dimensions.narrative_coherence),
      persuasivenessEvidence: toLegacyLabel(result.dimensions.persuasiveness_evidence),
      roleRelevance: toLegacyLabel(result.dimensions.role_relevance),
      professionalPolish: toLegacyLabel(result.dimensions.professional_polish),
    },
    feedback: {
      summary: result.verdict_summary,
      improvements: result.improvements,
    },
  };
}

export interface ReadinessCompanyContext {
  name: string;
  industry: string;
  mission: string;
  values: string[];
}

export interface ReadinessRoleContext {
  title: string;
  level: string;
  keyRequirements: string[];
}

export interface DraftReadinessContext {
  draftId: string;
  userId: string;
  jobDescriptionId: string;
  mergedDraft: string;
  promptDraft: string;
  wordCount: number;
  companyContext: ReadinessCompanyContext;
  roleContext: ReadinessRoleContext;
}

export class ReadinessContextError extends Error {
  constructor(message: string, public status: number = 500) {
    super(message);
    this.name = 'ReadinessContextError';
  }
}

export async function loadDraftReadinessContext(
  supabase: SupabaseClient,
  draftId: string,
): Promise<DraftReadinessContext> {
  const { data: draft, error: draftError } = await supabase
    .from('cover_letters')
    .select('id, user_id, job_description_id, sections')
    .eq('id', draftId)
    .single();

  if (draftError || !draft) {
    throw new ReadinessContextError('Draft not found', 404);
  }

  if (!draft.job_description_id) {
    throw new ReadinessContextError('Draft missing job description', 422);
  }

  const sections = Array.isArray(draft.sections) ? draft.sections : [];
  const mergedDraft = mergeSections(sections);
  const wordCount = countWords(mergedDraft);
  const promptDraft = truncateDraft(mergedDraft);

  const { data: job, error: jobError } = await supabase
    .from('job_descriptions')
    .select(
      'id, company, role, structured_data, standard_requirements, preferred_requirements',
    )
    .eq('id', draft.job_description_id)
    .single();

  if (jobError || !job) {
    throw new ReadinessContextError('Job description not found', 404);
  }

  const structured = normalizeStructured(job.structured_data);
  const companyContext: ReadinessCompanyContext = {
    name: typeof job.company === 'string' ? job.company : '',
    industry: typeof structured?.industry === 'string' ? structured.industry : '',
    mission: typeof structured?.mission === 'string' ? structured.mission : '',
    values: Array.isArray(structured?.values)
      ? structured.values.filter((val: unknown): val is string => typeof val === 'string').slice(0, 5)
      : [],
  };

  const roleContext: ReadinessRoleContext = {
    title: typeof job.role === 'string' ? job.role : '',
    level: typeof structured?.level === 'string' ? structured.level : '',
    keyRequirements: extractRequirementLabels(job.standard_requirements, job.preferred_requirements),
  };

  return {
    draftId,
    userId: draft.user_id,
    jobDescriptionId: draft.job_description_id,
    mergedDraft,
    promptDraft,
    wordCount,
    companyContext,
    roleContext,
  };
}

export async function callReadinessJudge(params: {
  apiKey: string;
  draftText: string;
  wordCount: number;
  companyContext: ReadinessCompanyContext;
  roleContext: ReadinessRoleContext;
}): Promise<DraftReadinessResult> {
  // Special handling for drafts below 150 words
  if (params.wordCount < DRAFT_READINESS_MIN_WORDS) {
    return createTooShortResult(params.wordCount);
  }
  
  const prompt = buildReadinessPrompt(params);
  return streamJsonFromLLM({
    apiKey: params.apiKey,
    model: DRAFT_READINESS_MODEL,
    temperature: 0.2,
    maxTokens: 1000,
    prompt,
    schema: draftReadinessSchema,
  });
}

// Create result for drafts that are too short
function createTooShortResult(wordCount: number): DraftReadinessResult {
  return {
    verdict: 'Needs Work',
    verdict_summary: TOO_SHORT_SUMMARY,
    dimensions: {
      narrative_coherence: 'Needs Work',
      persuasiveness_evidence: 'Needs Work',
      role_relevance: 'Needs Work',
      professional_polish: 'Needs Work',
    },
    improvements: [
      'Expand the content to cover your background and the role.',
    ],
  };
}

function mergeSections(sections: any[]): string {
  return sections
    .slice()
    .sort((a, b) => {
      const orderA = typeof a?.order === 'number' ? a.order : 0;
      const orderB = typeof b?.order === 'number' ? b.order : 0;
      return orderA - orderB;
    })
    .map((section) => {
      if (typeof section?.content === 'string') {
        return section.content.trim();
      }
      if (typeof section?.text === 'string') {
        return section.text.trim();
      }
      return '';
    })
    .filter((chunk) => chunk.length > 0)
    .join('\n\n');
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function truncateDraft(text: string): string {
  if (text.length <= MAX_PROMPT_CHARS) return text;
  return `${text.slice(0, MAX_PROMPT_CHARS)}\n...`;
}

function normalizeStructured(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === 'object') return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

function extractRequirementLabels(...sources: unknown[]): string[] {
  const labels: string[] = [];
  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const label =
        typeof item?.label === 'string'
          ? item.label
          : typeof item?.text === 'string'
          ? item.text
          : typeof item === 'string'
          ? item
          : null;
      if (label) {
        labels.push(label);
      }
    }
  }
  return labels
    .map((label) => label.trim())
    .filter((label) => label.length > 0)
    .slice(0, 10);
}

function buildReadinessPrompt(params: {
  draftText: string;
  companyContext: ReadinessCompanyContext;
  roleContext: ReadinessRoleContext;
}): string {
  const { draftText, companyContext, roleContext } = params;

  return [
    '# READINESS EVALUATION — FINAL EDITORIAL VERDICT',
    '',
    'You are a hiring manager doing a FINAL review. Is this cover letter ready to send?',
    '',
    'This is NOT about writing quality (that is evaluated separately in Score).',
    'This IS about: Does this letter work as a WHOLE? Is it ready to submit?',
    '',
    'Return ONLY valid JSON matching the schema below.',
    '',
    '## VERDICT LABELS (use exact strings)',
    '- Exceptional: Polished, strategic, evidence-rich. Ready to send immediately.',
    '- Strong: Persuasive, well-structured. Ready with minor optional polish.',
    '- Adequate: Professional. Fine to send to recruiter; could be stronger.',
    '- Needs Work: Important elements missing. Not ready; requires revision.',
    '',
    '## 4 EDITORIAL DIMENSIONS (high-level, NOT writing craft)',
    '',
    '1. narrative_coherence',
    '   Does the letter tell a cohesive story? Is there a clear through-line?',
    '   Does it flow logically from opening → body → close?',
    '',
    '2. persuasiveness_evidence', 
    '   Is the letter convincing? Does it provide real proof of capability?',
    '   Would a skeptical hiring manager believe this candidate?',
    '',
    '3. role_relevance',
    '   Does the letter speak to THIS specific role and company?',
    '   Or could it be sent to any job? Is there clear fit signal?',
    '',
    '4. professional_polish',
    '   Does this feel ready to send? Is it appropriately formal?',
    '   Would you be confident submitting this as-is?',
    '',
    '## TIERED IMPROVEMENTS (CRITICAL)',
    '- Exceptional: improvements = [] (none needed)',
    '- Strong: improvements = [] or [1 max]',
    '- Adequate: improvements = [1 only]',
    '- Needs Work: improvements = [1-2]',
    '',
    'Each improvement: ≤18 words, actionable, high-level (not writing fixes).',
    'Do NOT critique grammar, word choice, or sentence structure.',
    '',
    '## Context',
    `Company: ${companyContext.name || 'Unknown'} (${companyContext.industry || 'Unknown'})`,
    `Role: ${roleContext.title || 'Unknown'} (${roleContext.level || 'Unknown'})`,
    '',
    '## Draft to Evaluate',
    draftText,
    '',
    '## CONSTRAINTS',
    '- NO hallucinated facts or fabricated experience.',
    '- Evaluate the draft AS GIVEN.',
    '- verdict_summary: 1-2 sentences explaining the verdict.',
    '- Do NOT suggest writing-level fixes (that belongs in Score).',
    '- Tone: Supportive editor, not harsh critic.',
    '',
    '## JSON Schema',
    JSON.stringify(
      {
        verdict: 'Exceptional | Strong | Adequate | Needs Work',
        verdict_summary: '1-2 sentence explanation',
        dimensions: {
          narrative_coherence: 'label',
          persuasiveness_evidence: 'label',
          role_relevance: 'label',
          professional_polish: 'label',
        },
        improvements: ['High-level actionable fix (if needed)'],
      },
      null,
      2,
    ),
  ].join('\n');
}

export { ZodError } from 'https://esm.sh/zod@3.23.8';


