/**
 * Gap Resolution Streaming Service (V2)
 *
 * V2 goals:
 * - Preserve existing behavior but add stronger grounding context (voice, job context, standards)
 * - Support an iterative loop: initial draft -> user supplies missing facts -> refine
 * - De-dupe overlapping criteria to reduce prompt tokens
 */

import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { EvalsLogger } from './evalsLogger';
import type { Gap } from './gapTransformService';
import { getHilGenerationModelId } from './openaiModel';

export interface StreamingOptions {
  onUpdate?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export interface JobContextV2 {
  role?: string;
  company?: string;
  coreRequirements?: string[];
  preferredRequirements?: string[];
  jobDescriptionText?: string;
}

export interface HilContextV2 {
  userVoicePrompt?: string;
  sectionTitle?: string;
  workHistorySummary?: string;
  draftCoverageSummary?: string;
  draftOutline?: string;
}

type Criterion = { label: string; suggestion?: string };

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

function uniqByLabel(items: Criterion[]): Criterion[] {
  const seen = new Set<string>();
  const out: Criterion[] = [];
  for (const item of items) {
    const key = normalize(item.label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function truncate(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}

export class GapResolutionStreamingServiceV2 {
  private apiKey: string;
  private openai: ReturnType<typeof createOpenAI>;
  private modelId: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    this.modelId = getHilGenerationModelId();
    this.openai = createOpenAI({ apiKey: this.apiKey });
  }

  async streamGapResolutionV2(
    gap: Gap,
    job: JobContextV2,
    context: HilContextV2,
    options: StreamingOptions = {},
    promptOptions?: { allowNeedsInputPlaceholders?: boolean },
  ): Promise<string> {
    // Initialize evals logger if userId is available
    const evalsLogger = options.userId ? new EvalsLogger({
      userId: options.userId,
      stage: 'hil.gapResolutionV2.stream',
    }) : null;
    
    evalsLogger?.start();
    
    try {
      const prompt = this.buildPrompt(gap, job, context, {
        allowNeedsInputPlaceholders: promptOptions?.allowNeedsInputPlaceholders ?? true,
      });
      let fullContent = '';
      let firstChunkTime: number | null = null;

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.4,
        maxTokens: 900,
      });

      for await (const chunk of result.textStream) {
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
        }
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      fullContent = this.stripWrappingQuotes(fullContent);
      
      // Log success to evals
      await evalsLogger?.success({
        model: this.modelId,
        ttfu_ms: firstChunkTime ? firstChunkTime - (evalsLogger as any).startTime : undefined,
      });
      
      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      
      // Log failure to evals
      await evalsLogger?.failure(err, { model: this.modelId });
      
      options.onError?.(err);
      throw err;
    }
  }

  async streamRefineWithInputs(
    params: {
      originalGap: Gap;
      job: JobContextV2;
      context: HilContextV2;
      draft: string;
      inputs: Record<string, string>;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    // Initialize evals logger if userId is available
    const evalsLogger = options.userId ? new EvalsLogger({
      userId: options.userId,
      stage: 'hil.gapResolutionV2.refine',
    }) : null;
    
    evalsLogger?.start();
    
    try {
      const prompt = this.buildRefinePrompt(params);
      let fullContent = '';
      let firstChunkTime: number | null = null;

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.3,
        maxTokens: 900,
      });

      for await (const chunk of result.textStream) {
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
        }
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      fullContent = this.stripWrappingQuotes(fullContent);
      
      // Log success to evals
      await evalsLogger?.success({
        model: this.modelId,
        ttfu_ms: firstChunkTime ? firstChunkTime - (evalsLogger as any).startTime : undefined,
      });
      
      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      
      // Log failure to evals
      await evalsLogger?.failure(err, { model: this.modelId });
      
      options.onError?.(err);
      throw err;
    }
  }

  async streamRefineEditedText(
    params: {
      originalGap: Gap;
      job: JobContextV2;
      context: HilContextV2;
      editedText: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const prompt = this.buildRefineEditedTextPrompt(params);
      let fullContent = '';

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.25,
        maxTokens: 900,
      });

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      fullContent = this.stripWrappingQuotes(fullContent);
      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
  }

  async streamSuggestImprovements(
    params: {
      originalGap: Gap;
      job: JobContextV2;
      context: HilContextV2;
      editedText: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const prompt = this.buildSuggestImprovementsPrompt(params);
      let fullContent = '';

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.25,
        maxTokens: 650,
      });

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      fullContent = this.stripWrappingQuotes(fullContent);
      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
  }

  private stripWrappingQuotes(content: string): string {
    const trimmed = content.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).trim();
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1).trim();
    return trimmed;
  }

  private buildPrompt(
    gap: Gap,
    job: JobContextV2,
    context: HilContextV2,
    promptOptions: { allowNeedsInputPlaceholders: boolean },
  ): string {
    const unmetStandards: Criterion[] =
      (gap.sectionAttribution?.standards?.unmet ?? []).map((s: any) => ({
        label: s.label,
        suggestion: s.suggestion,
      })) ?? [];

    const ratingCriteria: Criterion[] =
      (gap.ratingCriteriaGaps ?? []).map((c: any) => ({
        label: c.title || c.id,
        suggestion: c.description,
      })) ?? [];

    const criteria = uniqByLabel([...unmetStandards, ...ratingCriteria]);

    const jobText = job.jobDescriptionText ? truncate(job.jobDescriptionText, 1200) : '';
    const isIntro = gap.paragraphId === 'intro';
    const isClosing = gap.paragraphId === 'closing';
    const sectionKind: 'intro' | 'body' | 'closing' = isIntro ? 'intro' : isClosing ? 'closing' : 'body';

    const missingDetailRule = promptOptions.allowNeedsInputPlaceholders
      ? '- If a required detail is missing, use [NEEDS-INPUT: ...] and keep it short.'
      : '- If a required detail is missing, do NOT invent it and do NOT use placeholders; write around it in a truthful, generic way.';

    const outputMissingRule = promptOptions.allowNeedsInputPlaceholders
      ? '- Use only truthful details from the existing content. If missing, use [NEEDS-INPUT: ...].'
      : '- Use only truthful details from the existing content. If missing, write around it without inventing specifics.';

    const placeholderRule = promptOptions.allowNeedsInputPlaceholders
      ? ''
      : '- Do NOT output bracket placeholders like [specific role], [company], [metric], etc.';

    const workHistoryBlock = context.workHistorySummary
      ? `\n**Work History Library (trusted context; you may reference ONLY what appears here):**\n${truncate(
          context.workHistorySummary,
          1800,
        )}\n`
      : '';

    const draftCoverageBlock = context.draftCoverageSummary
      ? `\n**Draft Coverage Map (what is already demonstrated elsewhere; avoid duplicating evidence):**\n${truncate(
          context.draftCoverageSummary,
          1800,
        )}\n`
      : '';

    const draftOutlineBlock = context.draftOutline
      ? `\n**Cover Letter Draft (outline + excerpts; avoid repeating content across sections):**\n${truncate(
          context.draftOutline,
          1800,
        )}\n`
      : '';

    return `You are a professional cover letter writer helping a candidate revise ONE section of a cover letter.

You must follow these principles:
- Truth fidelity: never invent companies, products, metrics, or achievements.
${missingDetailRule}
${placeholderRule}
 - Section scope: write ONLY the target section content (not the whole cover letter).
 - Avoid repetition: do not reuse phrases/claims already used in other sections unless essential.
 - Build on what's good: preserve strong evidence sentences (metrics, scope, roles, named companies) and reuse them verbatim when possible.
 - Do not remove concrete evidence unless you replace it with clearer or stronger evidence from the provided context.
 - Minimal-diff: preserve the user's sentence structure and phrasing where possible; prefer surgical edits over rewrites.

Before writing, select a PRIMARY proof point to build around:
- source: existing_section | work_history
- type: metric | project | scope
- idOrQuote: a specific quote or metric from the provided context
You may keep other strong evidence already present in the section; do NOT delete strong evidence unless it is redundant.

If you cannot identify a concrete proof point in the provided context, use a single [NEEDS-INPUT: ...] placeholder and keep it short.

**Voice Guide (follow this writing style):**
${context.userVoicePrompt ? truncate(context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${job.role || 'Not specified'}
- Company: ${job.company || 'Not specified'}
- Core Requirements: ${job.coreRequirements?.slice(0, 12).join(', ') || 'Not specified'}
- Preferred Requirements: ${job.preferredRequirements?.slice(0, 12).join(', ') || 'Not specified'}
${jobText ? `\n**Job Description (excerpt):**\n${jobText}\n` : ''}

**Section:**
- Target: ${gap.paragraphId || 'experience'}
- Title: ${context.sectionTitle || 'Not specified'}

**Existing Content (must be improved, do not ignore):**
${gap.existingContent ? gap.existingContent : 'No existing content provided.'}
${workHistoryBlock}
${draftCoverageBlock}
${draftOutlineBlock}

**Gaps / Issues to Address (address ALL):**
- Primary issue: ${gap.description}
- Suggestion: ${gap.suggestion}

${criteria.length ? `**Content Quality Criteria / Standards (deduped; address ALL relevant items):**\n${criteria
      .map((c, idx) => `${idx + 1}. ${c.label}${c.suggestion ? ` — ${c.suggestion}` : ''}`)
      .join('\n')}\n` : ''}

${isIntro ? `**Intro Strategy (follow strictly):**
- Goal: professional identity + unique fit + genuine interest. The intro is a thesis, not a story dump.
- Do NOT summarize multiple stories. Avoid adding details likely covered in body paragraphs.
- Evidence: prefer 1 credibility marker; allow 2 only if both are already present and strong.
  - Preferred order (pick ONE primary; keep secondary only if already in the existing content):
    1) Role-level metrics (from Work History Library “Role metrics”)
    2) Story-level metrics (from Work History Library “Story metrics”)
    3) Non-metric credibility marker (scope, domain, leadership, team size, etc.)
- The credibility marker must be concrete and grounded in the Work History Library or existing content (no vague "significantly").
- Do not name companies/products unless they are already in the existing content OR in the Work History Library context above.
- Keep it 2–3 sentences (max 4).

If any criteria suggest “metrics” or “specific examples”, satisfy them in the intro via ONE credibility marker only; leave detailed proof for body sections.
` : ''}

${isClosing ? `**Closing Strategy (follow strictly):**
- Goal: concise close that reinforces fit + genuine interest; a confident next step is optional.
- Do NOT introduce new stories or new achievements here (those belong in the body).
- Do NOT introduce metrics or quantitative outcomes unless they already appear in the closing content.
- If a gap or suggestion mentions metrics, ignore it and reinforce fit/mission alignment instead.
- Do NOT add a new paragraph for a story; do NOT expand into multiple paragraphs.
- If this section includes a sign-off, preserve it; otherwise do not invent contact info.
- Keep it 2–4 sentences for the closing paragraph (plus sign-off lines if already present in existing content).
` : ''}

${sectionKind === 'body' ? `**Body Section Strategy (follow strictly):**
- Goal: ONE focused proof point that supports the job (one theme, one story lens). Keep any strong existing evidence sentence unless it is clearly off-topic.
- Do NOT include a salutation ("Dear...") or a sign-off ("Warm regards...") in a body section.
- Do NOT restate the entire cover letter; keep it to 3–6 sentences.
` : ''}

${gap.sectionAttribution ? `**Preserve what is already met (hard constraints):**
- Do not remove evidence signals for items already marked as met.
- Do not remove named tools/skills/metrics unless replacing with equivalent or stronger proof.
` : ''}

**Output Requirements:**
- Output exactly 1 paragraph (no bullets, no headings).
- Intro: 2–3 sentences (max 4), 1 credibility marker (2 only if already present and strong).
- Closing: 2–4 sentences.
- Experience: 3–6 sentences.
${outputMissingRule}
- Reuse at least one concrete evidence sentence or clause verbatim from the existing content if one exists.
- You are revising ONE section in a larger draft. Avoid adding details that would likely be repeated in dedicated story paragraphs.
- If a requirement is already clearly demonstrated elsewhere (see Draft Coverage Map), avoid repeating the same evidence; instead focus this section on unmet requirements or add a new angle.
 - For body sections, never include salutation or sign-off.
 - For closing sections, do NOT add new metrics or achievements; summarize established fit and mission alignment only.

Output ONLY the revised paragraph.`;
  }

  private buildRefinePrompt(params: {
    originalGap: Gap;
    job: JobContextV2;
    context: HilContextV2;
    draft: string;
    inputs: Record<string, string>;
  }): string {
    const filled = Object.entries(params.inputs)
      .filter(([, v]) => v.trim().length > 0)
      .map(([k, v]) => `- ${k}: ${v.trim()}`)
      .join('\n');

    return `You are refining a cover letter section draft after the user supplied missing facts.

Rules:
- Replace [NEEDS-INPUT: ...] placeholders using ONLY the facts below.
- Do NOT introduce new facts; if something is still missing, keep a short [NEEDS-INPUT: ...].
- Preserve the user's voice guide.
- Output exactly 1 paragraph (no bullets, no headings).

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${params.job.role || 'Not specified'}
- Company: ${params.job.company || 'Not specified'}

**User-provided facts:**
${filled || '(none)'}

**Current draft:**
${params.draft.trim()}

Return ONLY the refined paragraph.`;
  }

  private buildRefineEditedTextPrompt(params: {
    originalGap: Gap;
    job: JobContextV2;
    context: HilContextV2;
    editedText: string;
  }): string {
    const isIntro = params.originalGap.paragraphId === 'intro';

    return `You are reviewing and tightening a user-edited cover letter section.

Rules:
- Treat the user's edited text as the source of truth and a strong signal of tone/style preference.
- Preserve the user's voice, wording, and sentence structure as much as possible (minimal-diff edit).
- Do NOT add new facts or claims. Do NOT rewrite in a new direction unless strictly required to fix a clear strategy/quality issue.
- If a clear strategy/quality issue exists, do NOT rewrite anyway—only make minimal edits and leave the strategy intact.
- Do NOT invent details. Avoid introducing new [NEEDS-INPUT: ...] placeholders unless the user's text already implies a missing factual slot.
- Diff budget: aim to change no more than ~15–20% of words.
- Output exactly 1 paragraph (no bullets, no headings).

${isIntro ? `Intro constraints:
- 2–3 sentences (max 4).
- Do not summarize multiple stories.
- Use at most 1 credibility marker; leave detailed proof for body paragraphs.
` : ''}

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${params.job.role || 'Not specified'}
- Company: ${params.job.company || 'Not specified'}

**Section:**
- Target: ${params.originalGap.paragraphId || 'experience'}

**Gaps / Issues to Address (address ALL relevant items):**
- Primary issue: ${params.originalGap.description}
- Suggestion: ${params.originalGap.suggestion}

**User-edited text:**
${params.editedText.trim()}

Return ONLY the improved paragraph.`;
  }

  private buildSuggestImprovementsPrompt(params: {
    originalGap: Gap;
    job: JobContextV2;
    context: HilContextV2;
    editedText: string;
  }): string {
    const isIntro = params.originalGap.paragraphId === 'intro';

    return `You are a cover letter coach. The user has edited a section and wants feedback, not a rewrite.

Rules:
- Do NOT rewrite the paragraph.
- Do NOT invent facts or propose fake metrics.
- Respect the user's tone/style; suggestions should help preserve and elevate it.
- Be concise and actionable.

${isIntro ? `This is the INTRO section. Feedback should prioritize:
- professional identity + unique fit + genuine interest
- avoid story-dumping and repetition with body sections
- at most 1 credibility marker
` : ''}

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${params.job.role || 'Not specified'}
- Company: ${params.job.company || 'Not specified'}

**Gaps / Issues to Address (use these to guide feedback):**
- Primary issue: ${params.originalGap.description}
- Suggestion: ${params.originalGap.suggestion}

**User-edited text:**
${params.editedText.trim()}

Output format:
- 3–7 bullets of suggestions that preserve the user's direction.
- Then (optional) 1–3 bullets of clarifying questions the user can answer to strengthen the section.

Output ONLY bullets.`;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
