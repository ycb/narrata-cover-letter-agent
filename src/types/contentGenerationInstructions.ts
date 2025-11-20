/**
 * Content Generation Instructions
 * User-customizable instructions for content generation behavior
 */

export interface ContentGenerationInstructions {
  prompt: string;
  lastUpdated: string;
}

export const DEFAULT_CONTENT_GENERATION_INSTRUCTIONS = `Use ONLY facts from the provided work history - NO hallucinations or fabrications.
Maintain the user's authentic voice and tone.
Follow STAR format: Situation, Task, Action, Result.
Include specific, quantifiable metrics when available.
Keep content concise (2-4 sentences).
Emphasize measurable outcomes over responsibilities.
If you cannot address a gap with available facts, say "Insufficient information in work history to address this gap".`;

