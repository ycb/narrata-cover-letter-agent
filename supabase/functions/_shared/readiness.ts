import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { z } from 'https://esm.sh/zod@3.23.8';
import { streamJsonFromLLM } from './pipeline-utils.ts';

const MAX_PROMPT_CHARS = 16000;
export const DRAFT_READINESS_MIN_WORDS = 150;
export const DRAFT_READINESS_MODEL = 'gpt-4o-mini';

export const readinessDimension = z.enum(['strong', 'sufficient', 'insufficient']);
export const draftReadinessSchema = z.object({
  rating: z.enum(['weak', 'adequate', 'strong', 'exceptional']),
  scoreBreakdown: z.object({
    clarityStructure: readinessDimension,
    opening: readinessDimension,
    companyAlignment: readinessDimension,
    roleAlignment: readinessDimension,
    specificExamples: readinessDimension,
    quantifiedImpact: readinessDimension,
    personalization: readinessDimension,
    writingQuality: readinessDimension,
    lengthEfficiency: readinessDimension,
    executiveMaturity: readinessDimension,
  }),
  feedback: z.object({
    summary: z.string().min(1).max(140),
    improvements: z.array(z.string().min(1).max(280)).max(3),
  }),
});

export type DraftReadinessResult = z.infer<typeof draftReadinessSchema>;

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
      'id, company, role, position, structured_data, standard_requirements, preferred_requirements',
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
    title: typeof job.role === 'string' && job.role.length > 0 ? job.role : job.position ?? '',
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
  companyContext: ReadinessCompanyContext;
  roleContext: ReadinessRoleContext;
}): Promise<DraftReadinessResult> {
  const prompt = buildReadinessPrompt(params);
  return streamJsonFromLLM({
    apiKey: params.apiKey,
    model: DRAFT_READINESS_MODEL,
    temperature: 0.2,
    maxTokens: 800,
    prompt,
    schema: draftReadinessSchema,
  });
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
    'Rating rubric:',
    '- weak: major structural gaps; not ready.',
    '- adequate: professional but uneven.',
    '- strong: persuasive, needs minor polish.',
    '- exceptional: crisp, immediately sendable.',
    '',
    'Each dimension (clarityStructure, opening, companyAlignment, roleAlignment, specificExamples, quantifiedImpact, personalization, writingQuality, lengthEfficiency, executiveMaturity) must be one of strong | sufficient | insufficient.',
    '',
    'Company Context:',
    `- Name: ${companyContext.name || 'Unknown'}`,
    `- Industry: ${companyContext.industry || 'Unknown'}`,
    `- Mission: ${companyContext.mission || 'N/A'}`,
    `- Values: ${formatValues(companyContext.values)}`,
    '',
    'Role Context:',
    `- Title: ${roleContext.title || 'Unknown'}`,
    `- Level: ${roleContext.level || 'Unknown'}`,
    `- Key Requirements: ${formatRequirements(roleContext.keyRequirements)}`,
    '',
    'Draft:',
    draftText,
    '',
    'Constraints:',
    '- Evaluate only the provided content. Do not rewrite or add new facts.',
    '- Summary must be ≤140 characters.',
    '- Provide at most 3 specific improvement bullets grounded in the draft.',
    '',
    'JSON schema:',
    JSON.stringify(
      {
        rating: 'weak | adequate | strong | exceptional',
        scoreBreakdown: {
          clarityStructure: 'strong | sufficient | insufficient',
          opening: '...',
          companyAlignment: '...',
          roleAlignment: '...',
          specificExamples: '...',
          quantifiedImpact: '...',
          personalization: '...',
          writingQuality: '...',
          lengthEfficiency: '...',
          executiveMaturity: '...',
        },
        feedback: {
          summary: '≤140 chars verdict',
          improvements: ['Actionable improvement 1', 'Actionable improvement 2'],
        },
      },
      null,
      2,
    ),
  ].join('\n');
}

export { ZodError } from 'https://esm.sh/zod@3.23.8';


