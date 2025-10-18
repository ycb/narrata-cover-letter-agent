// Cover letter template creation prompt - extracts structure from user's best cover letter
export const buildTemplateCreationPrompt = (coverLetterText: string): string => {
  return `You are an expert at analyzing cover letters and extracting their structural template.

Your goal: Extract the STRUCTURAL PATTERNS from this cover letter to create a reusable template that captures the user's writing style and approach.

Cover Letter Text:
${coverLetterText}

Analyze the cover letter and extract:

1. PARAGRAPH STRUCTURE: How is the cover letter organized?
2. WRITING STYLE: What's the tone and approach?
3. CONTENT PATTERNS: What types of content appear in each paragraph?
4. NARRATIVE FLOW: How does the story progress?

Return ONLY valid JSON with this structure:

{
  "intro": {
    "structure": "Template for opening paragraph with placeholders",
    "keyElements": ["element1", "element2", "element3"],
    "tone": "professional|conversational|enthusiastic|formal",
    "length": "short|medium|long",
    "placeholderCount": 3
  },
  "bodyParagraphs": [
    {
      "id": "body_1",
      "structure": "Template for this body paragraph with placeholders",
      "keyElements": ["element1", "element2"],
      "contentType": "achievement|challenge|skills|experience",
      "tone": "professional|conversational|enthusiastic|formal",
      "length": "short|medium|long",
      "placeholderCount": 2
    }
  ],
  "closer": {
    "structure": "Template for closing paragraph with placeholders",
    "keyElements": ["element1", "element2"],
    "callToAction": "Template for call to action",
    "tone": "professional|conversational|enthusiastic|formal",
    "length": "short|medium|long",
    "placeholderCount": 1
  },
  "overallStructure": {
    "totalParagraphs": 4,
    "flow": ["intro", "body_1", "body_2", "closer"],
    "writingStyle": "achievement-focused|story-driven|skills-based|mixed",
    "personalizationLevel": "high|medium|low",
    "templateType": "traditional|modern|creative"
  }
}

CRITICAL INSTRUCTIONS:
- Extract the STRUCTURAL PATTERNS, not the specific content
- Focus on HOW the user writes, not WHAT they wrote
- Create templates with [PLACEHOLDER] text that can be filled later
- Identify the narrative flow and paragraph purposes
- Capture the writing style and tone
- Make it generic enough to be reusable but specific enough to maintain the user's voice
- Count placeholders to help with dynamic content insertion

Return valid JSON only, no markdown formatting.`;
};