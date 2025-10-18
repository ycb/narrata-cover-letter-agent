// Content tagging prompt for automatic story and metrics categorization
export const buildContentTaggingPrompt = (content: string, contentType: 'story' | 'metrics' | 'workHistory'): string => {
  return `You are an expert at analyzing professional content and generating relevant tags for matching and categorization.

Content to analyze:
${content}

Content Type: ${contentType}

Your task: Generate relevant tags that will help match this content to job descriptions and opportunities.

For STORIES, focus on:
- Skills demonstrated
- Industry/domain
- Role level (entry, mid, senior, executive)
- Company size/type
- Project scope
- Leadership level
- Technical vs business focus
- Problem-solving approach

For METRICS, focus on:
- Metric type (revenue, cost, efficiency, growth, team size, etc.)
- Industry relevance
- Scale/scope
- Timeframe
- Impact level

For WORK HISTORY, focus on:
- Industry
- Company type/size
- Role level
- Function (engineering, sales, marketing, etc.)
- Key skills/technologies
- Leadership scope

Return ONLY valid JSON with this structure:

{
  "primaryTags": ["tag1", "tag2", "tag3"],
  "skillTags": ["skill1", "skill2"],
  "industryTags": ["industry1", "industry2"],
  "roleLevelTags": ["senior", "leadership"],
  "scopeTags": ["team-management", "cross-functional"],
  "contextTags": ["startup", "enterprise", "remote"],
  "matchingKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": "high|medium|low"
}

TAGGING RULES:
- Be specific but not overly narrow
- Focus on tags that would help match to job descriptions
- Include both technical and soft skills
- Consider industry and company context
- Generate 3-5 primary tags, 2-3 of each category
- Confidence should reflect how clear the content is for tagging

Return valid JSON only, no markdown formatting.`;
};

// Enhanced tagging for job description matching
export const buildJobMatchingTagsPrompt = (content: string, jobDescription: string): string => {
  return `You are an expert at matching professional content to job requirements.

Content:
${content}

Job Description:
${jobDescription}

Your task: Generate tags that will help match this content to the specific job requirements.

Focus on:
- Direct skill matches
- Experience level alignment
- Industry relevance
- Role compatibility
- Leadership scope match
- Technical requirements alignment

Return ONLY valid JSON:

{
  "matchScore": 85, // 0-100
  "skillMatches": ["skill1", "skill2"],
  "experienceMatches": ["senior-level", "team-leadership"],
  "industryMatches": ["saas", "fintech"],
  "roleMatches": ["product-management", "strategy"],
  "leadershipMatches": ["team-management", "cross-functional"],
  "technicalMatches": ["python", "data-analysis"],
  "gapAreas": ["area1", "area2"], // Where content doesn't match
  "strengthAreas": ["area1", "area2"], // Where content strongly matches
  "recommendedEmphasis": ["point1", "point2"] // What to highlight
}

MATCHING RULES:
- Score based on direct relevance to job requirements
- Identify both matches and gaps
- Focus on actionable insights
- Consider both hard and soft skills
- Weight recent experience higher
- Consider leadership and scope alignment

Return valid JSON only, no markdown formatting.`;
};
