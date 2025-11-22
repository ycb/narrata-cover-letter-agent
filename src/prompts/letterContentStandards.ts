/**
 * Letter-Level Content Standards Evaluation Prompts
 *
 * Evaluates entire cover letter against global content standards
 * Returns structured feedback for letter-scoped standards only (concise_length, error_free, professional_tone)
 */

import type { ContentStandardConfig } from '@/types/coverLetters';

/**
 * Build prompt for evaluating entire letter against letter-scoped standards
 *
 * @param fullLetterText - Complete cover letter text
 * @param letterScopedStandards - Global standards that apply to entire letter
 * @param wordCount - Word count of the letter
 * @param paragraphCount - Number of paragraphs
 * @returns LLM prompt for letter evaluation
 */
export function buildLetterStandardsPrompt(
  fullLetterText: string,
  letterScopedStandards: ContentStandardConfig[],
  wordCount?: number,
  paragraphCount?: number
): string {
  const stats = wordCount && paragraphCount
    ? `\n\nLetter Statistics:\n- Word Count: ${wordCount}\n- Paragraph Count: ${paragraphCount}`
    : '';

  return `You are an expert cover letter evaluator for product management roles.

Your task: Evaluate this complete cover letter against global content quality standards.

Full Cover Letter:
${fullLetterText}${stats}

Evaluation Standards (${letterScopedStandards.length} letter-level standards):

${letterScopedStandards.map((standard, idx) => `${idx + 1}. ${standard.label.toUpperCase()}
   ${standard.description}
   ${getLetterGuidance(standard.id, wordCount, paragraphCount)}`).join('\n\n')}

For each standard, evaluate:
1. Does this letter meet the standard? (met / not_met)
2. What specific evidence supports your evaluation?

Return ONLY valid JSON with this exact structure:

{
  "standards": [
    {
      "standardId": "concise_length",
      "status": "met" | "not_met",
      "evidence": "Specific explanation with metrics (e.g., '350 words, 4 paragraphs - concise and focused')"
    },
    {
      "standardId": "error_free",
      "status": "met" | "not_met",
      "evidence": "Specific issues found or confirmation of error-free writing"
    },
    {
      "standardId": "professional_tone",
      "status": "met" | "not_met",
      "evidence": "Assessment of formality and confidence level"
    }
  ]
}

Evaluation Guidelines:
- "met": Standard is clearly satisfied across the entire letter
- "not_met": Standard is violated or not met
- Be specific in evidence - cite examples or metrics
- Consider the letter holistically, not individual sections

Return ONLY the JSON object, no markdown formatting.`;
}

/**
 * Get letter-specific guidance for each standard
 */
function getLetterGuidance(
  standardId: string,
  wordCount?: number,
  paragraphCount?: number
): string {
  const guidance: Record<string, string> = {
    concise_length: `   Evaluation criteria:
   - Ideal: 3-4 paragraphs, under 400 words
   - Acceptable: 2-5 paragraphs, 300-450 words
   - Too short: <250 words or <3 paragraphs (lacks substance)
   - Too long: >500 words or >5 paragraphs (loses focus)${wordCount ? `\n   - Current: ${wordCount} words, ${paragraphCount || '?'} paragraphs` : ''}
   - Check for unnecessary fluff or repetition`,

    error_free: `   Evaluation criteria:
   - Check for spelling errors
   - Check for grammar errors (subject-verb agreement, tense consistency, etc.)
   - Check for punctuation issues
   - Professional language throughout (no slang or informal contractions)
   - Be strict: even 1-2 errors = not_met`,

    professional_tone: `   Evaluation criteria:
   - Appropriate formality level (professional but not stuffy)
   - Confident but not arrogant (avoid: "I'm the best candidate")
   - Enthusiastic but not desperate (avoid: "I would do anything for this role")
   - Authentic voice (not robotic or overly formal)
   - Consistent tone throughout (no jarring shifts)`,
  };

  return guidance[standardId] || '';
}
