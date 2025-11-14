/**
 * Gap Resolution Streaming Service
 * 
 * Generates content to address specific gaps using ai-sdk streaming.
 * Provides real-time updates as content is generated.
 */

import { streamText } from 'ai';
import { openai } from '@openai/ai-sdk-provider';
import type { Gap } from './gapTransformService';
import type { CoverLetterSection } from './coverLetterDraftService';

export interface StreamingOptions {
  onUpdate?: (content: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export class GapResolutionStreamingService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('[GapResolutionStreamingService] No API key found');
    }
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
    try {
      const prompt = this.buildGapResolutionPrompt(gap, jobDescription);
      
      let fullContent = '';

      const result = await streamText({
        model: openai('gpt-4'),
        prompt,
        temperature: 0.7,
        maxTokens: 800,
      });

      // Stream the content
      for await (const chunk of result.textStream) {
        fullContent += chunk;
        options.onUpdate?.(fullContent);
      }

      options.onComplete?.(fullContent);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error during streaming');
      options.onError?.(err);
      throw err;
    }
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
3. Naturally incorporate relevant keywords: ${gap.addresses?.join(', ') || 'the requirement'}
4. Match the tone and style of a strong cover letter
5. Be ready to insert into the ${gap.paragraphId || 'experience'} section

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

    prompt += `
**Output Format:**
Provide ONLY the new/improved content paragraph. Do not include any meta-commentary, explanations, or labels like "Introduction:" or "Content:". Just the polished cover letter text.`;

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

