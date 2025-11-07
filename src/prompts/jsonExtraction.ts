/**
 * System prompt for JSON extraction
 */
export const JSON_EXTRACTION_SYSTEM_PROMPT = `You are an expert at parsing structured data and extracting information. You must return ONLY valid JSON with no additional text, no markdown formatting, no code blocks, and no explanations. The response must be parseable by JSON.parse().`;

/**
 * System prompt for simple JSON extraction
 */
export const SIMPLE_JSON_EXTRACTION_PROMPT = `You are a JSON extraction tool. Return ONLY valid JSON with no additional text.`;

/**
 * Builds a prompt for extracting structured data from text
 */
export function buildExtractionPrompt(
  originalPrompt: string,
  textType: 'resume' | 'coverLetter' | 'caseStudy' | 'generic' = 'generic'
): string {
  const basePrompt = `Extract the following information from this ${textType} text and return ONLY valid JSON:`;
  
  // Extract the relevant part of the prompt based on the text type
  let content = '';
  if (originalPrompt.includes('Resume Text:')) {
    content = originalPrompt.split('Resume Text:')[1] || originalPrompt;
  } else if (originalPrompt.includes('Cover Letter Text:')) {
    content = originalPrompt.split('Cover Letter Text:')[1] || originalPrompt;
  } else if (originalPrompt.includes('Case Study Text:')) {
    content = originalPrompt.split('Case Study Text:')[1] || originalPrompt;
  } else {
    content = originalPrompt;
  }

  return `${basePrompt}\n\n${content.trim()}`;
}
