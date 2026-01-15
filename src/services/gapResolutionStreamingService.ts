/**
 * Gap Resolution Streaming Service
 * 
 * Generates content to address specific gaps using ai-sdk streaming.
 * Provides real-time updates as content is generated.
 */

import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { EvalsLogger } from './evalsLogger';
import type { Gap } from './gapTransformService';
import type { CoverLetterSection } from './coverLetterDraftService';

export interface StreamingOptions {
  onUpdate?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
  userId?: string; // For evals logging
}

export class GapResolutionStreamingService {
  private apiKey: string;
  private openai: ReturnType<typeof createOpenAI>;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

    if (!this.apiKey) {
      console.error('[GapResolutionStreamingService] No API key found');
    }

    this.openai = createOpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Stream content generation to address a gap
   */
  async streamGapResolution(
    gap: Gap,
    jobDescription: {
      role?: string;
      company?: string;
      coreRequirements?: string[];
      preferredRequirements?: string[];
    },
    options: StreamingOptions = {}
  ): Promise<string> {
    // Initialize evals logger if userId is available
    const evalsLogger = options.userId ? new EvalsLogger({
      userId: options.userId,
      stage: 'hil.gapResolution.stream',
    }) : null;
    
    evalsLogger?.start();
    
    try {
      const prompt = this.buildGapResolutionPrompt(gap, jobDescription);
      
      let fullContent = '';
      let firstChunkTime: number | null = null;

      const result = await streamText({
        model: this.openai('gpt-4'),
        prompt,
        temperature: 0.7,
        maxTokens: 800,
      });

      // Stream the content
      for await (const chunk of result.textStream) {
        if (!firstChunkTime) {
          firstChunkTime = Date.now();
        }
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      // Post-process: Remove wrapping quotes if LLM added them
      fullContent = this.stripWrappingQuotes(fullContent);

      // Log success to evals
      await evalsLogger?.success({
        model: 'gpt-4',
        ttfu_ms: firstChunkTime ? firstChunkTime - (evalsLogger as any).startTime : undefined,
      });

      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      
      // Log failure to evals
      await evalsLogger?.failure(err, { model: 'gpt-4' });
      
      options.onError?.(err);
      throw err;
    }
  }

  /**
   * Strip wrapping quotation marks from generated content
   */
  private stripWrappingQuotes(content: string): string {
    const trimmed = content.trim();

    // Remove wrapping double quotes
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).trim();
    }

    // Remove wrapping single quotes
    if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
      return trimmed.slice(1, -1).trim();
    }

    return trimmed;
  }

  /**
   * Build prompt for gap resolution
   */
  private buildGapResolutionPrompt(
    gap: Gap,
    jobDescription: {
      role?: string;
      company?: string;
      coreRequirements?: string[];
      preferredRequirements?: string[];
    }
  ): string {
    const { role, company, coreRequirements, preferredRequirements } = jobDescription;

    let prompt = `You are a professional cover letter writer helping a candidate address a gap in their cover letter.

**Job Context:**
- Role: ${role || 'Not specified'}
- Company: ${company || 'Not specified'}
- Core Requirements: ${coreRequirements?.join(', ') || 'Not specified'}
- Preferred Requirements: ${preferredRequirements?.join(', ') || 'Not specified'}

**Gap to Address:**
- Type: ${gap.type}
- Severity: ${gap.severity}
- Issue: ${gap.description}
- Suggestion: ${gap.suggestion}
- Section: ${gap.paragraphId || 'Not specified'}

**Existing Content (if any):**
${gap.existingContent ? `"${gap.existingContent}"` : 'No existing content for this section.'}

**Task:**
Generate compelling cover letter content that addresses this gap. The content should:
1. Be concise and professional (2-4 sentences)
2. Include specific, quantifiable examples where possible
3. Match the tone and style of a strong cover letter
4. Be ready to insert into the ${gap.paragraphId || 'experience'} section

CRITICAL: You must address ALL unmet items provided in this prompt:
- Requirement gaps (if provided)
- Content quality criteria (if provided)
- Standalone content issues described in the gap description/suggestion

If any item cannot be fully addressed due to missing facts, do NOT invent details. Instead, include a short placeholder like:
[NEEDS-INPUT: specific metric / example / proof point]

Incorporate keywords only when they truthfully map to the candidate's background; otherwise request the missing proof via [NEEDS-INPUT: ...].

`;

    // Add section-specific guidance
    if (gap.paragraphId === 'intro') {
      prompt += `
**Additional Guidance for Introduction:**
- Start strong with enthusiasm for the role
- Highlight 1-2 key qualifications
- Show knowledge of the company
- Be concise (3-4 sentences max)
`;
    } else if (gap.paragraphId === 'experience') {
      prompt += `
**Additional Guidance for Experience Section:**
- Lead with impact and achievements
- Include metrics (%, $, numbers)
- Connect experience to job requirements
- Use strong action verbs
- Be specific about technologies/methodologies
`;
    } else if (gap.paragraphId === 'closing') {
      prompt += `
**Additional Guidance for Closing:**
- Reinforce enthusiasm for the opportunity
- Mention company mission or values alignment
- Include a call to action
- Express confidence and professionalism
`;
    }

    // Add rating criteria context if present
    if (gap.ratingCriteriaGaps && gap.ratingCriteriaGaps.length > 0) {
      prompt += `
**Content Quality Criteria to Address:**
The following content quality criteria need improvement. Your generated content should help address these:
${gap.ratingCriteriaGaps.map((criterion, idx) => `${idx + 1}. ${criterion.title || criterion.id}: ${criterion.description}`).join('\n')}

When generating content, ensure it:
- Addresses the specific quality criteria listed above
- Improves the overall content quality score
- Incorporates best practices for cover letter writing
`;
    }

    // Add section attribution context if present (what's working vs what's missing)
    if (gap.sectionAttribution) {
      const { coreReqs, prefReqs, standards } = gap.sectionAttribution;

      // Calculate totals
      const totalCoreMet = coreReqs.met.length;
      const totalCoreUnmet = coreReqs.unmet.length;
      const totalPrefMet = prefReqs.met.length;
      const totalPrefUnmet = prefReqs.unmet.length;
      const totalStandardsMet = standards.met.length;
      const totalStandardsUnmet = standards.unmet.length;

      prompt += `
**Section Attribution Analysis:**

CRITICAL: This section already addresses some requirements successfully. Your enhanced content MUST preserve these matches while addressing gaps.

**✓ What's Working - PRESERVE THESE:**
`;

      // Core Requirements Met
      if (totalCoreMet > 0) {
        prompt += `
Core Requirements Met (${totalCoreMet}/${totalCoreMet + totalCoreUnmet}):
${coreReqs.met.map(req => `- ${req.label}\n  Evidence: ${req.evidence || 'Addressed in section'}`).join('\n')}
`;
      }

      // Preferred Requirements Met
      if (totalPrefMet > 0) {
        prompt += `
Preferred Requirements Met (${totalPrefMet}/${totalPrefMet + totalPrefUnmet}):
${prefReqs.met.map(req => `- ${req.label}\n  Evidence: ${req.evidence || 'Addressed in section'}`).join('\n')}
`;
      }

      // Content Standards Met
      if (totalStandardsMet > 0) {
        prompt += `
Content Standards Met (${totalStandardsMet}/${totalStandardsMet + totalStandardsUnmet}):
${standards.met.map(std => `- ${std.label}\n  Evidence: ${std.evidence || 'Standard satisfied'}`).join('\n')}
`;
      }

      prompt += `
**✗ What's Missing - ADDRESS THESE:**
`;

      // Core Requirements Unmet
      if (totalCoreUnmet > 0) {
        prompt += `
Core Requirements Not Yet Addressed:
${coreReqs.unmet.map(req => `- ${req.label}`).join('\n')}
`;
      }

      // Preferred Requirements Unmet
      if (totalPrefUnmet > 0) {
        prompt += `
Preferred Requirements Not Yet Addressed:
${prefReqs.unmet.map(req => `- ${req.label}`).join('\n')}
`;
      }

      // Content Standards Unmet
      if (totalStandardsUnmet > 0) {
        prompt += `
Content Standards Not Yet Met:
${standards.unmet.map(std => `- ${std.label}${std.suggestion ? `\n  Suggestion: ${std.suggestion}` : ''}`).join('\n')}
`;
      }

      prompt += `
**INSTRUCTIONS FOR ENHANCEMENT:**
1. PRESERVE: Keep content that satisfies the requirements/standards marked as "met" above
2. You may rephrase or improve met requirements, but DO NOT remove or invalidate the match
3. EXPAND: Add new content to address the unmet requirements/standards
4. INTEGRATE: Blend the preserved and new content into a cohesive, natural paragraph
5. DO NOT go backwards - if a requirement is marked as met, the enhanced content must still meet it

Treat all "met" items above as hard constraints: the revised paragraph must still contain the evidence signals that make them "met".
Do not remove named tools/skills/metrics already present unless replacing with an equivalent or stronger proof.
`;
    }

    prompt += `
Before finalizing, internally verify:
- Every requirement gap has a concrete proof point (or [NEEDS-INPUT: ...])
- Every content quality criterion gap is improved
- No "met" requirement/standard was lost
- The output stays within length/tone constraints

**Output Format:**
Provide ONLY the new/improved content paragraph. Output exactly 1 paragraph (no bullets, no headings). Do not include:
- Any meta-commentary or explanations
- Labels like "Introduction:" or "Content:"
- Quotation marks around the content
- Any formatting markers (except [NEEDS-INPUT: ...] placeholders when required)

Just output the raw, polished cover letter text ready to be inserted directly into the document.`;

    return prompt;
  }

  /**
   * Generate multiple variations for a gap
   */
  async generateVariations(
    gap: Gap,
    jobDescription: {
      role?: string;
      company?: string;
      coreRequirements?: string[];
      preferredRequirements?: string[];
    },
    count: number = 3
  ): Promise<string[]> {
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const content = await this.streamGapResolution(gap, jobDescription);
        variations.push(content);
      } catch (error) {
        console.error(`[GapResolutionStreamingService] Failed to generate variation ${i + 1}:`, error);
      }
    }

    return variations;
  }

  /**
   * Enhance existing content to address a gap
   */
  async enhanceExistingContent(
    existingContent: string,
    gap: Gap,
    jobDescription: {
      role?: string;
      company?: string;
      coreRequirements?: string[];
      preferredRequirements?: string[];
    },
    options: StreamingOptions = {}
  ): Promise<string> {
    const enhancedGap = {
      ...gap,
      existingContent,
      suggestion: `Enhance the existing content to address: ${gap.suggestion}`,
    };

    return this.streamGapResolution(enhancedGap, jobDescription, options);
  }

  /**
   * Check if API key is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
