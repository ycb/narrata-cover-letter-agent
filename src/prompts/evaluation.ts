// LLM judge evaluation prompt
export const buildEvaluationPrompt = (structuredData: any, originalText: string, type: string): string => {
  return `You are an evaluator of AI-generated structured data from ${type} analysis.

Definitions:
- Accuracy: all facts match the original text and are properly extracted
- Relevance: data is relevant to the document type and purpose
- Personalization: data is specific to the individual (not generic)
- Clarity & Tone: data is clear, well-structured, and professional
- Framework Compliance: follows expected structure for ${type} data
- Go/No-Go: overall quality is sufficient for use

Labels:
✅ Accurate / ⚠ Partially Accurate / ❌ Inaccurate
✅ Relevant / ⚠ Somewhat Relevant / ❌ Not Relevant
✅ Personalized / ⚠ Weak Personalization / ❌ Generic
✅ Clear & Professional / ⚠ Minor Issues / ❌ Unclear or Fluffy
✅ Structured / ⚠ Partial / ❌ Not Structured
✅ Go / ❌ No-Go

Original Text (first 500 chars): ${originalText.substring(0, 500)}

Structured Data: ${JSON.stringify(structuredData, null, 2)}

Respond in JSON only:

{
  "accuracy": "✅ Accurate",
  "relevance": "⚠ Somewhat Relevant", 
  "personalization": "❌ Generic",
  "clarity_tone": "✅ Clear & Professional",
  "framework": "⚠ Partial",
  "go_nogo": "❌ No-Go",
  "rationale": "Brief explanation of the evaluation"
}`;
};

// Enhanced evaluation prompt for unified work history and templates
export const buildEnhancedEvaluationPrompt = (
  structuredData: any, 
  originalText: string, 
  type: string,
  hasUnifiedWorkHistory: boolean = false,
  hasTemplate: boolean = false
): string => {
  let additionalCriteria = '';
  
  if (hasUnifiedWorkHistory) {
    additionalCriteria += `
- Work History Deduplication: entries are properly merged without duplicates
- Metrics Extraction: quantifiable results and achievements are captured
- Story Structure: achievements are organized into coherent narratives`;
  }
  
  if (hasTemplate) {
    additionalCriteria += `
- Template Quality: structure is well-designed and logical
- Template Reusability: can be easily adapted for different positions
- Template Completeness: all necessary sections are included`;
  }

  return `You are an evaluator of AI-generated structured data from ${type} analysis.

Definitions:
- Accuracy: all facts match the original text and are properly extracted
- Relevance: data is relevant to the document type and purpose
- Personalization: data is specific to the individual (not generic)
- Clarity & Tone: data is clear, well-structured, and professional
- Framework Compliance: follows expected structure for ${type} data
- Go/No-Go: overall quality is sufficient for use${additionalCriteria}

Labels:
✅ Accurate / ⚠ Partially Accurate / ❌ Inaccurate
✅ Relevant / ⚠ Somewhat Relevant / ❌ Not Relevant
✅ Personalized / ⚠ Weak Personalization / ❌ Generic
✅ Clear & Professional / ⚠ Minor Issues / ❌ Unclear or Fluffy
✅ Structured / ⚠ Partial / ❌ Not Structured
✅ Go / ❌ No-Go${hasUnifiedWorkHistory ? `
✅ Merged / ⚠ Partial / ❌ Duplicates (Work History Deduplication)
✅ Complete / ⚠ Limited / ❌ Missing (Metrics Extraction)
✅ Clear / ⚠ Weak / ❌ Unclear (Story Structure)` : ''}${hasTemplate ? `
✅ Excellent / ⚠ Good / ❌ Poor (Template Quality)
✅ Highly Reusable / ⚠ Somewhat Reusable / ❌ Not Reusable (Template Reusability)
✅ Complete / ⚠ Partial / ❌ Incomplete (Template Completeness)` : ''}

Original Text (first 500 chars): ${originalText.substring(0, 500)}

Structured Data: ${JSON.stringify(structuredData, null, 2)}

Respond in JSON only:

{
  "accuracy": "✅ Accurate",
  "relevance": "⚠ Somewhat Relevant", 
  "personalization": "❌ Generic",
  "clarity_tone": "✅ Clear & Professional",
  "framework": "⚠ Partial",
  "go_nogo": "❌ No-Go"${hasUnifiedWorkHistory ? `,
  "workHistoryDeduplication": "✅ Merged",
  "metricsExtraction": "✅ Complete",
  "storyStructure": "✅ Clear"` : ''}${hasTemplate ? `,
  "templateQuality": "✅ Excellent",
  "templateReusability": "✅ Highly Reusable",
  "templateCompleteness": "✅ Complete"` : ''},
  "rationale": "Brief explanation of the evaluation"
}`;
};
