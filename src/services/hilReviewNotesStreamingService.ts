/**
 * HIL Review Notes Streaming Service (V3)
 *
 * Purpose:
 * - Provide structured "review notes" for a user-edited/generated section
 * - Enable targeted Accept/Regenerate actions (via anchors + replacements)
 * - Avoid rewriting the paragraph unless explicitly requested elsewhere
 */

import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { EvalsLogger } from './evalsLogger';
import { getApplicableStandards } from '@/config/contentStandards';
import { getDefaultOpenAIModelId } from './openaiModel';

export interface StreamingOptions {
  onUpdate?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
  userId?: string; // For evals logging
}

export interface JobContextV3 {
  role?: string;
  company?: string;
  coreRequirements?: string[];
  preferredRequirements?: string[];
  jobDescriptionText?: string;
}

export interface HilContextV3 {
  userVoicePrompt?: string;
  sectionTitle?: string;
  workHistorySummary?: string;
  draftCoverageSummary?: string;
  draftOutline?: string;
  /**
   * When not reviewing a cover letter section, set this to guide constraints.
   * Default behavior (unset) assumes cover letter section review.
   */
  contentKind?: ReviewContentKind;
  /**
   * For saved sections, helps apply correct intro/closer/signature constraints.
   */
  savedSectionType?: 'introduction' | 'closer' | 'signature' | 'custom';
}

export type ReviewPriority = 'P0' | 'P1' | 'P2';

export type ReviewContentKind = 'cover_letter_section' | 'story' | 'role_description' | 'saved_section';

export interface ReviewSuggestion {
  id: string;
  priority: ReviewPriority;
  why: string;
  anchor: string;
  replacement: string;
}

export interface ReviewNotes {
  summary?: string;
  suggestions: ReviewSuggestion[];
  questionsToConsider?: string[];
  missingFacts?: string[];
  sectionAttribution?: {
    coreReqs: {
      met: Array<{ label: string; evidence?: string }>;
      unmet: Array<{ label: string; suggestion?: string }>;
    };
    prefReqs: {
      met: Array<{ label: string; evidence?: string }>;
      unmet: Array<{ label: string; suggestion?: string }>;
    };
    standards: {
      met: Array<{ label: string; evidence?: string }>;
      unmet: Array<{ label: string; suggestion?: string }>;
    };
  };
}

function truncate(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}

export class HilReviewNotesStreamingService {
  private apiKey: string;
  private openai: ReturnType<typeof createOpenAI>;
  private modelId: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_KEY || '';
    this.openai = createOpenAI({ apiKey: this.apiKey });
    this.modelId = getDefaultOpenAIModelId();
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async streamReviewNotes(
    params: {
      originalGap: any;
      job: JobContextV3;
      context: HilContextV3;
      text: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    // Initialize evals logger if userId is available
    const evalsLogger = options.userId ? new EvalsLogger({
      userId: options.userId,
      stage: 'hil.reviewNotes.stream',
    }) : null;
    
    evalsLogger?.start();
    
    try {
      const prompt = this.buildReviewNotesPrompt(params);
      let fullContent = '';
      let firstChunkTime: number | null = null;

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.25,
        maxTokens: 700,
      });

      for await (const chunk of result.textStream) {
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
        }
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      const trimmed = fullContent.trim();
      
      // Log success to evals
      await evalsLogger?.success({
        model: this.modelId,
        ttfu_ms: firstChunkTime ? firstChunkTime - (evalsLogger as any).startTime : undefined,
      });
      
      options.onComplete?.(trimmed);
      return trimmed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      
      // Log failure to evals
      await evalsLogger?.failure(err, { model: this.modelId });
      
      options.onError?.(err);
      throw err;
    }
  }

  async streamAlternativeSuggestion(
    params: {
      job: JobContextV3;
      context: HilContextV3;
      text: string;
      anchor: string;
      currentReplacement?: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const prompt = this.buildAlternativeSuggestionPrompt(params);
      let fullContent = '';

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.35,
        maxTokens: 350,
      });

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      const trimmed = fullContent.trim();
      options.onComplete?.(trimmed);
      return trimmed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
  }

  async streamReviewNotesForContent(
    params: {
      contentKind: Exclude<ReviewContentKind, 'cover_letter_section'>;
      context: HilContextV3;
      text: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const prompt = this.buildGenericReviewNotesPrompt(params);
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

      const trimmed = fullContent.trim();
      options.onComplete?.(trimmed);
      return trimmed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
  }

  async streamAlternativeSuggestionForContent(
    params: {
      contentKind: Exclude<ReviewContentKind, 'cover_letter_section'>;
      context: HilContextV3;
      text: string;
      anchor: string;
      currentReplacement?: string;
    },
    options: StreamingOptions = {},
  ): Promise<string> {
    try {
      const prompt = this.buildGenericAlternativeSuggestionPrompt(params);
      let fullContent = '';

      const result = await streamText({
        model: this.openai(this.modelId),
        prompt,
        temperature: 0.35,
        maxTokens: 320,
      });

      for await (const chunk of result.textStream) {
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      const trimmed = fullContent.trim();
      options.onComplete?.(trimmed);
      return trimmed;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
  }

  private buildReviewNotesPrompt(params: {
    originalGap: any;
    job: JobContextV3;
    context: HilContextV3;
    text: string;
  }): string {
    const isIntro = params.originalGap?.paragraphId === 'intro' || params.context.sectionTitle === 'intro';
    const isClosing = params.originalGap?.paragraphId === 'closing' || params.context.sectionTitle === 'closing';
    const jobText = params.job.jobDescriptionText ? truncate(params.job.jobDescriptionText, 1000) : '';
    // These should be the stable JD-extracted requirement labels (full lists), not just unmet/focus.
    // Keep the list bounded for tokens but large enough to preserve label stability for attribution.
    const coreReqs = (params.job.coreRequirements ?? []).slice(0, 24);
    const prefReqs = (params.job.preferredRequirements ?? []).slice(0, 18);
    const draftCoverage = params.context.draftCoverageSummary ? truncate(params.context.draftCoverageSummary, 1200) : '';
    const sectionCategory: 'intro' | 'body' | 'closing' = isIntro ? 'intro' : isClosing ? 'closing' : 'body';
    const standards = getApplicableStandards(sectionCategory).slice(0, 10).map(s => s.label);
    const draftOutline = params.context.draftOutline ? truncate(params.context.draftOutline, 1600) : '';

    return `You are a cover letter coach. The user wants review notes that help them improve their paragraph while staying in the driver's seat.

Rules:
- Do NOT rewrite the paragraph as a whole.
- Do NOT invent facts or propose fake metrics.
- Do NOT output bracket placeholders like [specific role], [company], [metric], etc.
- Keep the user's tone/style; do not impose a new tone.
- Produce at most 5 suggestions, prioritized by impact.
- Each suggestion MUST include an "anchor" that is an exact substring copied from the user's text (8–200 chars).
- Each suggestion MUST include a "replacement" that the user could swap in for the anchor (same tone, no new claims).
- Keep replacements local (phrase/sentence-level), not full-paragraph rewrites.
- In addition, compute section-level attribution: which requirements/standards this paragraph addresses.

${isIntro ? `Intro constraints (apply when deciding priorities):
- intro should be 2–3 sentences (max 4)
- prioritize: professional identity + unique fit + genuine interest
- avoid story-dumping and repetition with body paragraphs
- at most 1 credibility marker
` : ''}

${isClosing ? `Closing constraints (apply when deciding priorities):
- closing should reinforce fit + mission alignment + confident call-to-action
- do NOT introduce new stories or new achievements (those belong in the body)
- keep it concise (2–4 sentences for the closing paragraph, plus sign-off lines if present)
` : ''}

${sectionCategory === 'body' ? `Body constraints (apply when deciding priorities):
- keep this section focused (one theme / one proof point)
- do NOT include salutation ("Dear...") or sign-off ("Warm regards...") in body sections
` : ''}

Return JSON only (no code fences, no markdown).
Schema:
{
  "summary": string | null,
  "suggestions": Array<{
    "id": string,
    "priority": "P0" | "P1" | "P2",
    "why": string,
    "anchor": string,
    "replacement": string
  }>,
  "questionsToConsider": string[],
  "missingFacts": string[],
  "sectionAttribution": {
    "coreReqs": { "met": Array<{ "label": string, "evidence": string }>, "unmet": Array<{ "label": string, "suggestion": string }> },
    "prefReqs": { "met": Array<{ "label": string, "evidence": string }>, "unmet": Array<{ "label": string, "suggestion": string }> },
    "standards": { "met": Array<{ "label": string, "evidence": string }>, "unmet": Array<{ "label": string, "suggestion": string }> }
  }
}

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${params.job.role || 'Not specified'}
- Company: ${params.job.company || 'Not specified'}
${coreReqs.length ? `- Core requirements (JD-extracted labels): ${coreReqs.join('; ')}` : ''}
${prefReqs.length ? `- Preferred requirements (JD-extracted labels): ${prefReqs.join('; ')}` : ''}
${standards.length ? `- Applicable content standards for this section: ${standards.join('; ')}` : ''}
${jobText ? `\n**Job Description (excerpt):**\n${jobText}\n` : ''}

${params.context.workHistorySummary ? `**Work History Library (trusted context; use to avoid vague placeholders):**
${truncate(params.context.workHistorySummary, 1800)}
` : ''}

${draftCoverage ? `**Draft Coverage Map (avoid duplicating evidence already covered elsewhere):**
${draftCoverage}
` : ''}

${draftOutline ? `**Cover Letter Draft (outline + excerpts; avoid duplicating phrases/claims):**
${draftOutline}
` : ''}

**Gaps / Issues to Address (use these to guide suggestions):**
- Primary issue: ${params.originalGap?.description || 'Not specified'}
- Suggestion: ${params.originalGap?.suggestion || 'Not specified'}

**User text:**
${params.text.trim()}

Attribution instructions:
- For "coreReqs" and "prefReqs", only use labels from the provided requirement lists above; do not paraphrase labels.
- Mark a requirement as met only if the paragraph provides specific evidence for it (not vague intent).
- Use short evidence snippets quoted from the paragraph when possible (<= 120 chars).
- For standards, use ONLY labels from the "Applicable content standards" list above; do not paraphrase labels.
`;
  }

  private buildAlternativeSuggestionPrompt(params: {
    job: JobContextV3;
    context: HilContextV3;
    text: string;
    anchor: string;
    currentReplacement?: string;
  }): string {
    return `You are generating an alternative local edit suggestion for a cover letter paragraph.

Rules:
- Do NOT rewrite the paragraph as a whole.
- Do NOT invent facts or propose fake metrics.
- Do NOT output bracket placeholders like [specific role], [company], [metric], etc.
- Keep the user's tone/style.
- The "anchor" must remain exactly as provided (it must match a substring in the user's text).
- Provide ONE alternative replacement for just that anchor.

Return JSON only (no code fences, no markdown).
Schema:
{ "why": string, "anchor": string, "replacement": string }

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

**Job Context:**
- Role: ${params.job.role || 'Not specified'}
- Company: ${params.job.company || 'Not specified'}

${params.context.workHistorySummary ? `**Work History Library (trusted context; use to avoid vague placeholders):**
${truncate(params.context.workHistorySummary, 1800)}
` : ''}

**User text:**
${params.text.trim()}

**Anchor (exact substring to replace):**
${params.anchor}

${params.currentReplacement ? `**Current replacement (avoid repeating this exact phrasing):**
${params.currentReplacement}
` : ''}
`;
  }

  private buildGenericReviewNotesPrompt(params: {
    contentKind: Exclude<ReviewContentKind, 'cover_letter_section'>;
    context: HilContextV3;
    text: string;
  }): string {
    const kind = params.contentKind;
    const sectionType = params.context.savedSectionType ?? 'custom';

    const kindLabel =
      kind === 'story'
        ? 'work history story'
        : kind === 'role_description'
          ? 'role description'
          : 'saved section';

    const savedSectionConstraints =
      kind !== 'saved_section'
        ? ''
        : sectionType === 'introduction'
          ? `Saved section constraints (introduction):
- 3–4 sentences
- open with a hook, then value proposition, then relevance to the role/company
- include at most 1 credibility marker and do not story-dump`
          : sectionType === 'closer'
            ? `Saved section constraints (closer):
- 2–3 sentences
- reinforce fit, enthusiasm, and a confident call-to-action
- do NOT introduce new stories/achievements`
            : sectionType === 'signature'
              ? `Saved section constraints (signature):
- 1 sentence
- professional sign-off only`
              : `Saved section constraints (custom):
- keep it concise and reusable; avoid role/company-specific claims unless provided`;

    const kindConstraints =
      kind === 'story'
        ? `Story constraints:
- 2–5 sentences, STAR-shaped (situation/task/action/result)
- emphasize measurable outcomes if available
- do NOT include cover-letter framing ("I am applying", "Dear...")`
        : kind === 'role_description'
          ? `Role description constraints:
- 2–3 sentences
- lead with most credible impact (metric, scale, scope)
- avoid generic responsibilities without outcomes`
          : savedSectionConstraints;

    return `You are a career writing coach. Provide targeted feedback on the user's ${kindLabel} while keeping them in the driver's seat.

Rules:
- Do NOT rewrite the entire text.
- Do NOT invent facts or propose fake metrics.
- Do NOT output bracket placeholders like [company], [metric], etc.
- Keep the user's tone/style; do not impose a new tone.
- Always provide a 1-sentence summary of the highest-impact improvement to make (even if you also provide suggestions).
- Produce at most 5 suggestions, prioritized by impact.
- Each suggestion MUST include an "anchor" that is an exact substring copied from the user's text (8–200 chars).
- Each suggestion MUST include a "replacement" the user could swap in for the anchor (same tone, no new claims).
- Keep replacements local (phrase/sentence-level), not full rewrites.

${kindConstraints}

Return JSON only (no code fences, no markdown).
Schema:
{
  "summary": string,
  "suggestions": Array<{
    "id": string,
    "priority": "P0" | "P1" | "P2",
    "why": string,
    "anchor": string,
    "replacement": string
  }>,
  "questionsToConsider": string[],
  "missingFacts": string[]
}

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

${params.context.workHistorySummary ? `**Work History Library (trusted context; do not add new facts):**
${truncate(params.context.workHistorySummary, 1800)}
` : ''}

**User text:**
${truncate(params.text, 2400)}
`;
  }

  private buildGenericAlternativeSuggestionPrompt(params: {
    contentKind: Exclude<ReviewContentKind, 'cover_letter_section'>;
    context: HilContextV3;
    text: string;
    anchor: string;
    currentReplacement?: string;
  }): string {
    const kindLabel =
      params.contentKind === 'story'
        ? 'work history story'
        : params.contentKind === 'role_description'
          ? 'role description'
          : 'saved section';

    const currentReplacement = params.currentReplacement ? truncate(params.currentReplacement, 500) : '';

    return `You are a career writing coach. Provide an alternative replacement for a specific anchor in the user's ${kindLabel}.

Rules:
- Output JSON only.
- Do NOT invent facts or metrics.
- Do NOT output bracket placeholders like [metric], [company], etc.
- Keep the user's tone/style.
- The "anchor" MUST be an exact substring of the user's text.
- The "replacement" should be a better version of the anchor (same meaning, improved clarity/impact), without adding new claims.

Schema:
{ "why": string, "anchor": string, "replacement": string }

**Voice Guide:**
${params.context.userVoicePrompt ? truncate(params.context.userVoicePrompt, 700) : 'Not provided'}

${params.context.workHistorySummary ? `**Work History Library (trusted context; do not add new facts):**
${truncate(params.context.workHistorySummary, 1800)}
` : ''}

**User text:**
${truncate(params.text, 2400)}

**Anchor (exact substring to replace):**
${truncate(params.anchor, 220)}

${currentReplacement ? `**Current replacement (avoid repeating this exact phrasing):**
${currentReplacement}
` : ''}
`;
  }
}
