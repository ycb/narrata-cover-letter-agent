// Unified profile evaluation prompt
export const buildUnifiedProfileEvaluationPrompt = (profile: any): string => {
  return `You are an expert at evaluating unified professional profiles for quality and completeness.

Profile to evaluate:
${JSON.stringify(profile, null, 2)}

Evaluate this unified profile on these criteria:

1. DEDUPLICATION QUALITY: Are duplicate entries properly merged?
2. DATA COMPLETENESS: Is all important information captured?
3. METRICS EXTRACTION: Are quantifiable results properly extracted?
4. STORY STRUCTURE: Are achievements organized into coherent stories?
5. SOURCE INTEGRATION: Are multiple sources seamlessly combined?
6. OVERALL QUALITY: Is this a comprehensive, professional profile?

Return ONLY valid JSON:

{
  "deduplicationQuality": "✅ Excellent|⚠ Good|❌ Poor",
  "dataCompleteness": "✅ Complete|⚠ Partial|❌ Incomplete",
  "metricsExtraction": "✅ Comprehensive|⚠ Limited|❌ Missing",
  "storyStructure": "✅ Clear|⚠ Weak|❌ Unclear",
  "sourceIntegration": "✅ Seamless|⚠ Partial|❌ Conflicting",
  "overallQuality": "✅ High|⚠ Medium|❌ Low",
  "rationale": "Brief explanation of the evaluation"
}

Focus on:
- Proper deduplication of work history
- Completeness of data from all sources
- Quality of metrics and quantifiable results
- Coherence of story structure
- Seamless integration of multiple sources
- Overall professional quality

Return valid JSON only, no markdown formatting.`;
};
