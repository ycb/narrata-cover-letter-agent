// Dynamic content matching prompt for job-specific content selection
export const buildDynamicMatchingPrompt = (
  jobDescription: string,
  contentLibrary: any,
  templateStructure: any
): string => {
  return `You are an expert at matching professional content to job requirements.

Job Description:
${jobDescription}

Available Content Library:
${JSON.stringify(contentLibrary, null, 2)}

Template Structure:
${JSON.stringify(templateStructure, null, 2)}

Your task: Select the best content from the library to fill the dynamic paragraphs of the cover letter template.

For each dynamic paragraph, you need to:
1. Analyze the job requirements
2. Find the most relevant content from the library
3. Adapt the content to fit the paragraph structure
4. Ensure the content flows naturally with the template

Return ONLY valid JSON with this structure:

{
  "intro": {
    "selectedContent": "Adapted content for introduction",
    "sourceStory": "story_id_from_library",
    "matchScore": 85,
    "adaptations": ["change1", "change2"]
  },
  "bodyParagraphs": [
    {
      "id": "body_1",
      "selectedContent": "Adapted content for this body paragraph",
      "sourceStory": "story_id_from_library",
      "matchScore": 90,
      "adaptations": ["change1", "change2"],
      "reasoning": "Why this content was selected"
    }
  ],
  "closer": {
    "selectedContent": "Adapted content for closing",
    "sourceStory": "story_id_from_library",
    "matchScore": 80,
    "adaptations": ["change1", "change2"]
  },
  "overallMatch": {
    "totalScore": 85,
    "strengthAreas": ["area1", "area2"],
    "gapAreas": ["area1", "area2"],
    "recommendations": ["suggestion1", "suggestion2"]
  }
}

MATCHING RULES:
- Prioritize content that directly addresses job requirements
- Consider the paragraph's purpose in the template
- Ensure content flows naturally with the template structure
- Adapt content to match the job's tone and requirements
- Score based on relevance and fit
- Provide reasoning for content selection
- Identify both strengths and gaps

Return valid JSON only, no markdown formatting.`;
};

// Content library analysis prompt
export const buildContentLibraryAnalysisPrompt = (contentLibrary: any): string => {
  return `You are an expert at analyzing professional content libraries for coverage and gaps.

Content Library:
${JSON.stringify(contentLibrary, null, 2)}

Your task: Analyze the content library to identify:
1. What types of content are well-covered
2. What gaps exist in the library
3. What content would be most valuable to add
4. How to organize the library for better matching

Return ONLY valid JSON:

{
  "coverageAnalysis": {
    "skillCoverage": ["skill1", "skill2", "skill3"],
    "industryCoverage": ["industry1", "industry2"],
    "roleLevelCoverage": ["entry", "mid", "senior"],
    "leadershipCoverage": ["team-lead", "manager", "director"]
  },
  "gapAreas": [
    {
      "area": "area_name",
      "description": "What's missing",
      "priority": "high|medium|low",
      "suggestions": ["suggestion1", "suggestion2"]
    }
  ],
  "libraryStrengths": [
    {
      "area": "area_name",
      "description": "What's well-covered",
      "contentCount": 5,
      "quality": "high|medium|low"
    }
  ],
  "organizationSuggestions": [
    {
      "category": "category_name",
      "description": "How to organize",
      "tags": ["tag1", "tag2"],
      "priority": "high|medium|low"
    }
  ],
  "overallAssessment": {
    "libraryCompleteness": "high|medium|low",
    "organizationQuality": "high|medium|low",
    "matchingPotential": "high|medium|low",
    "recommendations": ["rec1", "rec2", "rec3"]
  }
}

ANALYSIS RULES:
- Focus on practical coverage for job matching
- Identify actionable gaps and improvements
- Consider both content quality and organization
- Provide specific, actionable recommendations
- Assess the library's potential for dynamic matching

Return valid JSON only, no markdown formatting.`;
};
