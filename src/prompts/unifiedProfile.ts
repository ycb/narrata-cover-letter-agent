// Unified profile creation prompt
export const buildUnifiedProfilePrompt = (
  resumeData: any, 
  linkedinData: any, 
  coverLetterData?: any
): string => {
  return `You are an expert at merging professional data from multiple sources to create a unified, comprehensive profile.

Your goal: Create a SINGLE, deduplicated work history that combines the best information from resume, LinkedIn, and cover letter data.

Resume Data:
${JSON.stringify(resumeData, null, 2)}

LinkedIn Data:
${JSON.stringify(linkedinData, null, 2)}

${coverLetterData ? `Cover Letter Data (for additional context):
${JSON.stringify(coverLetterData, null, 2)}` : ''}

CRITICAL TASKS:

1. DEDUPLICATION: Identify and merge duplicate roles (same company + overlapping dates)
2. METRICS EXTRACTION: Extract quantifiable results and achievements
3. STORY STRUCTURE: Organize achievements into coherent stories
4. SOURCE INTEGRATION: Combine the best information from all sources
5. COMPLETENESS: Ensure no important information is lost

For each work history entry, extract:
- Company name and description
- Role and responsibilities  
- Start/end dates
- Key achievements with metrics
- Impact stories with context
- Source confidence (high/medium/low)

Return ONLY valid JSON with this structure:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "companyDescription": "Brief company description if available",
      "role": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Comprehensive job description combining all sources",
      "achievements": ["achievement1", "achievement2"],
      "metrics": ["increased revenue by 25%", "led team of 8", "saved $50K"],
      "stories": [
        {
          "id": "story_1",
          "type": "achievement|challenge|impact|leadership|innovation",
          "description": "Detailed story of a key achievement",
          "metrics": ["specific metric 1", "specific metric 2"],
          "context": "Background and situation"
        }
      ],
      "location": "City, State",
      "current": true/false,
      "sourceConfidence": "high|medium|low",
      "sourceDetails": {
        "resume": true/false,
        "linkedin": true/false,
        "combined": true/false
      }
    }
  ],
  "education": [
    {
      "id": "unique_id",
      "institution": "University Name",
      "degree": "Degree Type",
      "fieldOfStudy": "Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA if mentioned",
      "location": "City, State",
      "sourceConfidence": "high|medium|low",
      "sourceDetails": {
        "resume": true/false,
        "linkedin": true/false
      }
    }
  ],
  "skills": [
    {
      "skill": "Skill Name",
      "proficiency": "beginner|intermediate|advanced|expert",
      "source": "resume|linkedin|both",
      "context": "Context where skill was demonstrated"
    }
  ],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State",
    "website": "website URL",
    "linkedin": "LinkedIn URL",
    "sourceConfidence": "high|medium|low"
  },
  "summary": "Comprehensive professional summary",
  "overallMetrics": {
    "totalExperience": 5.5,
    "companiesWorked": 3,
    "rolesHeld": 4,
    "keyAchievements": 12,
    "quantifiableResults": 8
  }
}

DEDUPLICATION RULES:
- Same company + overlapping dates = merge into single entry
- Use the most complete description
- Combine achievements from all sources
- Use the most recent/accurate dates
- Mark source confidence based on data quality

METRICS EXTRACTION:
- Look for numbers, percentages, dollar amounts
- Extract quantifiable results and impact
- Include team sizes, project scopes, timeframes
- Focus on business impact and outcomes

STORY STRUCTURE:
- Organize achievements into coherent narratives
- Include context, action, and result
- Categorize by type (achievement, challenge, impact, etc.)
- Ensure each story demonstrates specific competencies

Return valid JSON only, no markdown formatting.`;
};
