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
import { getApplicableStandards } from '@/config/contentStandards';

export interface StreamingOptions {
  onUpdate?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
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
}

export type ReviewPriority = 'P0' | 'P1' | 'P2';

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

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_KEY || '';
    this.openai = createOpenAI({ apiKey: this.apiKey });
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
    try {
      const prompt = this.buildReviewNotesPrompt(params);
      let fullContent = '';

      const result = await streamText({
        model: this.openai('gpt-4'),
        prompt,
        temperature: 0.25,
        maxTokens: 700,
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
        model: this.openai('gpt-4'),
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
}
