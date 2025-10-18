// Template evaluation prompt
export const buildTemplateEvaluationPrompt = (template: any): string => {
  return `You are an expert at evaluating cover letter templates for quality and reusability.

Template to evaluate:
${JSON.stringify(template, null, 2)}

Evaluate this template on these criteria:

1. STRUCTURE QUALITY: Is the template well-structured and logical?
2. STORY DIVERSITY: Are the story types diverse and complementary?
3. PERSONALIZATION LEVEL: Does it capture the user's unique voice and approach?
4. REUSABILITY: Can this template be easily adapted for different positions?
5. TEMPLATE COMPLETENESS: Are all necessary sections included?

Return ONLY valid JSON:

{
  "structureQuality": "✅ Excellent|⚠ Good|❌ Poor",
  "storyDiversity": "✅ Diverse|⚠ Limited|❌ Repetitive", 
  "personalizationLevel": "✅ High|⚠ Medium|❌ Low",
  "reusability": "✅ Highly Reusable|⚠ Somewhat Reusable|❌ Not Reusable",
  "templateCompleteness": "✅ Complete|⚠ Partial|❌ Incomplete",
  "rationale": "Brief explanation of the evaluation"
}

Focus on:
- Template structure and flow
- Story diversity and narrative arc
- Personalization vs generic content
- Reusability for different positions
- Completeness of all sections

Return valid JSON only, no markdown formatting.`;
};
