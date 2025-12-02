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

// 8 DIMENSIONS (NOT 10) - removed company_alignment and role_alignment
// Those metrics already exist in Gaps/Requirements/Fit sections
export const readinessDimension = z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']);
export const draftReadinessSchema = z.object({
  verdict: z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']),
  verdict_summary: z.string().min(1).max(200),
  dimensions: z.object({
    compelling_opening: readinessDimension,
    clarity_structure: readinessDimension,
    specific_examples: readinessDimension,
    quantified_impact: readinessDimension,
    personalization_voice: readinessDimension,
    writing_quality: readinessDimension,
    length_efficiency: readinessDimension,
    executive_maturity: readinessDimension,
  }),
  improvements: z.array(z.string().min(1).max(150)).max(2), // Max 2 improvements per spec
});

export type DraftReadinessResult = z.infer<typeof draftReadinessSchema>;

// Legacy type mapping for frontend compatibility (8 dimensions)
export interface LegacyReadinessResult {
  rating: 'exceptional' | 'strong' | 'adequate' | 'weak';
  scoreBreakdown: {
    opening: 'strong' | 'sufficient' | 'insufficient';
    clarityStructure: 'strong' | 'sufficient' | 'insufficient';
    specificExamples: 'strong' | 'sufficient' | 'insufficient';
    quantifiedImpact: 'strong' | 'sufficient' | 'insufficient';
    personalization: 'strong' | 'sufficient' | 'insufficient';
    writingQuality: 'strong' | 'sufficient' | 'insufficient';
    lengthEfficiency: 'strong' | 'sufficient' | 'insufficient';
    executiveMaturity: 'strong' | 'sufficient' | 'insufficient';
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
      opening: toLegacyLabel(result.dimensions.compelling_opening),
      clarityStructure: toLegacyLabel(result.dimensions.clarity_structure),
      specificExamples: toLegacyLabel(result.dimensions.specific_examples),
      quantifiedImpact: toLegacyLabel(result.dimensions.quantified_impact),
      personalization: toLegacyLabel(result.dimensions.personalization_voice),
      writingQuality: toLegacyLabel(result.dimensions.writing_quality),
      lengthEfficiency: toLegacyLabel(result.dimensions.length_efficiency),
      executiveMaturity: toLegacyLabel(result.dimensions.executive_maturity),
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
      compelling_opening: 'Needs Work',
      clarity_structure: 'Needs Work',
      specific_examples: 'Needs Work',
      quantified_impact: 'Needs Work',
      personalization_voice: 'Needs Work',
      writing_quality: 'Needs Work',
      length_efficiency: 'Needs Work',
      executive_maturity: 'Needs Work',
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
    '# READINESS EVALUATION',
    '',
    'You are a hiring manager reviewing a cover letter. Provide a HOLISTIC EDITORIAL verdict.',
    'Focus on: clarity, coherence, evidence, credibility, professionalism.',
    '',
    'Return ONLY valid JSON matching the schema below.',
    '',
    '## UNIFIED LABELS (use exact strings)',
    '- Exceptional: Polished, strategic, evidence-rich. Ready to send with no edits.',
    '- Strong: Persuasive, well-structured. Minor optional polish only.',
    '- Adequate: Professional and coherent. Fine to send; can be improved.',
    '- Needs Work: Important elements missing or weak. Not ready; requires revision.',
    '',
    '## 8 DIMENSIONS (evaluate writing quality, NOT requirements/gaps/fit)',
    '1. compelling_opening - Hooks reader, makes them want to continue',
    '2. clarity_structure - Clear flow, logical organization',
    '3. specific_examples - Concrete stories proving claims',
    '4. quantified_impact - Numbers, metrics, measurable outcomes',
    '5. personalization_voice - Authentic voice, not template',
    '6. writing_quality - Grammar, clarity, professional tone',
    '7. length_efficiency - No fluff, every word earns its place',
    '8. executive_maturity - Strategic thinking for career level',
    '',
    '## TIERED IMPROVEMENTS (CRITICAL)',
    '- Exceptional: improvements = [] (none)',
    '- Strong: improvements = [] or [1 max]',
    '- Adequate: improvements = [1 only]',
    '- Needs Work: improvements = [1-2] + note "More issues exist—focus on these first."',
    '',
    'Each improvement must be ≤18 words, actionable, and specific.',
    '',
    '## Context',
    `Company: ${companyContext.name || 'Unknown'} (${companyContext.industry || 'Unknown'})`,
    `Role: ${roleContext.title || 'Unknown'} (${roleContext.level || 'Unknown'})`,
    '',
    '## Draft to Evaluate',
    draftText,
    '',
    '## CONSTRAINTS',
    '- NO hallucinated facts. NO new content. NO fabricating experience.',
    '- Evaluate draft AS GIVEN.',
    '- verdict_summary: 1-2 sentences explaining the verdict.',
    '- Do NOT suggest rewriting entire sections.',
    '- Tone: Honest but supportive. Avoid "weak," "poor," "bad."',
    '',
    '## JSON Schema',
    JSON.stringify(
      {
        verdict: 'Exceptional | Strong | Adequate | Needs Work',
        verdict_summary: '1-2 sentence explanation',
        dimensions: {
          compelling_opening: 'label',
          clarity_structure: 'label',
          specific_examples: 'label',
          quantified_impact: 'label',
          personalization_voice: 'label',
          writing_quality: 'label',
          length_efficiency: 'label',
          executive_maturity: 'label',
        },
        improvements: ['Short actionable fix (if needed)'],
      },
      null,
      2,
    ),
  ].join('\n');
}

export { ZodError } from 'https://esm.sh/zod@3.23.8';


