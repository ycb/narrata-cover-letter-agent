import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { streamJsonFromLLM } from './pipeline-utils.ts';

const MAX_PROMPT_CHARS = 16000;
export const DRAFT_READINESS_MIN_WORDS = 150;
export const DRAFT_READINESS_MODEL = 'gpt-4o-mini';

// ============================================================================
// UNIFIED LABELS: Exceptional | Strong | Adequate | Needs Work
// ============================================================================
export const UNIFIED_LABELS = ['Exceptional', 'Strong', 'Adequate', 'Needs Work'] as const;
export type UnifiedLabel = typeof UNIFIED_LABELS[number];

// Numeric mapping for weighted median calculation
export const LABEL_SCORES: Record<UnifiedLabel, number> = {
  'Exceptional': 4,
  'Strong': 3,
  'Adequate': 2,
  'Needs Work': 1,
} as const;

// Weighted dimensions (1.5x weight for Executive Maturity, Company Alignment, Role Alignment)
export const DIMENSION_WEIGHTS: Record<string, number> = {
  clarityStructure: 1.0,
  opening: 1.0,
  companyAlignment: 1.5,
  roleAlignment: 1.5,
  specificExamples: 1.0,
  quantifiedImpact: 1.0,
  personalization: 1.0,
  writingQuality: 1.0,
  lengthEfficiency: 1.0,
  executiveMaturity: 1.5,
} as const;

// Verdict summaries for each label
export const VERDICT_SUMMARIES: Record<UnifiedLabel, string> = {
  'Exceptional': 'Your draft demonstrates strong clarity, compelling storytelling, and excellent alignment.',
  'Strong': 'Your draft is strong overall and clearly communicates your fit, with room for refinement.',
  'Adequate': 'Your draft meets key expectations but would benefit from additional specificity and polish.',
  'Needs Work': 'Your draft needs more structure, specificity, or alignment before it\'s ready to send.',
} as const;

export const TOO_SHORT_SUMMARY = 'Draft too short for full evaluation (150 words required).';

export const readinessDimension = z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']);
export const draftReadinessSchema = z.object({
  verdict: z.enum(['Exceptional', 'Strong', 'Adequate', 'Needs Work']),
  verdict_summary: z.string().min(1).max(200),
  dimensions: z.object({
    clarity_structure: readinessDimension,
    compelling_opening: readinessDimension,
    company_alignment: readinessDimension,
    role_alignment: readinessDimension,
    specific_examples: readinessDimension,
    quantified_impact: readinessDimension,
    personalization_voice: readinessDimension,
    writing_quality: readinessDimension,
    length_efficiency: readinessDimension,
    executive_maturity: readinessDimension,
  }),
  improvements: z.array(z.string().min(1).max(280)).max(5),
});

export type DraftReadinessResult = z.infer<typeof draftReadinessSchema>;

// Legacy type mapping for frontend compatibility
export interface LegacyReadinessResult {
  rating: 'exceptional' | 'strong' | 'adequate' | 'weak';
  scoreBreakdown: {
    clarityStructure: 'strong' | 'sufficient' | 'insufficient';
    opening: 'strong' | 'sufficient' | 'insufficient';
    companyAlignment: 'strong' | 'sufficient' | 'insufficient';
    roleAlignment: 'strong' | 'sufficient' | 'insufficient';
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
      clarityStructure: toLegacyLabel(result.dimensions.clarity_structure),
      opening: toLegacyLabel(result.dimensions.compelling_opening),
      companyAlignment: toLegacyLabel(result.dimensions.company_alignment),
      roleAlignment: toLegacyLabel(result.dimensions.role_alignment),
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
      clarity_structure: 'Needs Work',
      compelling_opening: 'Needs Work',
      company_alignment: 'Needs Work',
      role_alignment: 'Needs Work',
      specific_examples: 'Needs Work',
      quantified_impact: 'Needs Work',
      personalization_voice: 'Needs Work',
      writing_quality: 'Needs Work',
      length_efficiency: 'Needs Work',
      executive_maturity: 'Needs Work',
    },
    improvements: [
      `Add more content so we can provide a fair evaluation (minimum 150 words, current: ${wordCount}).`,
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
  const formatValues = (values: string[]) => (values.length > 0 ? values.join(', ') : 'N/A');
  const formatRequirements = (requirements: string[]) =>
    requirements.length > 0 ? requirements.join(' • ') : 'N/A';

  return [
    'You are an experienced product editor assessing whether a cover letter is ready to send.',
    '',
    'Return ONLY JSON that matches the provided schema. Never invent new fields.',
    '',
    '## UNIFIED LABELS (use these exact strings everywhere)',
    '- Exceptional: Clear mastery. Strong evidence, metrics, specificity, storytelling. Exceeds typical.',
    '- Strong: Fully meets expectations. Solid, specific, relevant. No major gaps.',
    '- Adequate: Meets minimum. May be generic, light on specifics, lacking metrics.',
    '- Needs Work: Missing or weak. Generic, unclear, contradicts requirements, or too vague.',
    '',
    '## DIMENSIONS TO EVALUATE (10 total)',
    '1. clarity_structure - Clear flow, logical organization, easy to follow',
    '2. compelling_opening - Hooks the reader, makes them want to continue',
    '3. company_alignment - Shows understanding of company mission, values, culture',
    '4. role_alignment - Demonstrates fit for role level and responsibilities',
    '5. specific_examples - Concrete stories that prove claims',
    '6. quantified_impact - Numbers, metrics, measurable outcomes',
    '7. personalization_voice - Authentic voice, not generic template',
    '8. writing_quality - Grammar, clarity, professional tone',
    '9. length_efficiency - Appropriate length, no fluff, every word earns its place',
    '10. executive_maturity - Strategic thinking, appropriate for career level',
    '',
    '## VERDICT CALCULATION (Weighted Median)',
    'Map: Exceptional=4, Strong=3, Adequate=2, Needs Work=1',
    'Weights: executive_maturity, company_alignment, role_alignment = 1.5x weight; all others = 1x',
    'Compute weighted median and convert back to label.',
    '',
    '## Company Context',
    `- Name: ${companyContext.name || 'Unknown'}`,
    `- Industry: ${companyContext.industry || 'Unknown'}`,
    `- Mission: ${companyContext.mission || 'N/A'}`,
    `- Values: ${formatValues(companyContext.values)}`,
    '',
    '## Role Context',
    `- Title: ${roleContext.title || 'Unknown'}`,
    `- Level: ${roleContext.level || 'Unknown'}`,
    `- Key Requirements: ${formatRequirements(roleContext.keyRequirements)}`,
    '',
    '## Draft to Evaluate',
    draftText,
    '',
    '## Constraints',
    '- Evaluate ONLY the provided content. Do NOT invent accomplishments.',
    '- verdict_summary: Use the appropriate summary based on verdict:',
    '  • Exceptional: "Your draft demonstrates strong clarity, compelling storytelling, and excellent alignment."',
    '  • Strong: "Your draft is strong overall and clearly communicates your fit, with room for refinement."',
    '  • Adequate: "Your draft meets key expectations but would benefit from additional specificity and polish."',
    '  • Needs Work: "Your draft needs more structure, specificity, or alignment before it\'s ready to send."',
    '- improvements: 2-5 high-leverage, actionable items. Short and direct.',
    '- Tone: Neutral, supportive, PM-appropriate. Avoid "weak," "poor," "bad," "insufficient."',
    '',
    '## JSON Output Schema',
    JSON.stringify(
      {
        verdict: 'Exceptional | Strong | Adequate | Needs Work',
        verdict_summary: 'One of the standard summaries above',
        dimensions: {
          clarity_structure: 'Exceptional | Strong | Adequate | Needs Work',
          compelling_opening: '...',
          company_alignment: '...',
          role_alignment: '...',
          specific_examples: '...',
          quantified_impact: '...',
          personalization_voice: '...',
          writing_quality: '...',
          length_efficiency: '...',
          executive_maturity: '...',
        },
        improvements: ['Actionable improvement 1', 'Actionable improvement 2'],
      },
      null,
      2,
    ),
  ].join('\n');
}

export { ZodError } from 'https://esm.sh/zod@3.23.8';


