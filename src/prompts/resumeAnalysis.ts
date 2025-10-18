// Resume analysis prompt
export const buildResumeAnalysisPrompt = (text: string): string => {
  return `
Analyze this resume text and extract structured data. Return ONLY valid JSON with no additional text.

Resume Text:
${text}

Extract the following information and return as JSON. IMPORTANT: Extract ALL work history entries, education entries, certifications, and projects mentioned in the resume - do not filter or select only the most recent or relevant ones.

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Job description",
      "achievements": ["achievement1", "achievement2", "achievement3"],
      "stories": [
        {
          "id": "story_1",
          "title": "Story title or brief description",
          "description": "Detailed story description with context, action, and result",
          "metrics": ["specific metric 1", "specific metric 2"],
          "impact": "high|medium|low",
          "type": "achievement|challenge|leadership|innovation|problem-solving"
        }
      ],
      "metrics": ["increased revenue by 25%", "led team of 8", "saved $50K"],
      "location": "City, State",
      "current": true/false
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
      "location": "City, State"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State",
    "website": "website URL",
    "linkedin": "LinkedIn URL"
  },
  "summary": "Professional summary if present",
  "certifications": [
    {
      "id": "unique_id",
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "issueDate": "YYYY-MM-DD",
      "expiryDate": "YYYY-MM-DD or null if no expiry",
      "credentialId": "Credential ID if mentioned"
    }
  ],
  "projects": [
    {
      "id": "unique_id",
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"],
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if ongoing",
      "url": "Project URL if mentioned"
    }
  ]
}

Rules:
- Use realistic dates (convert relative dates like "2020-2022" to "2020-01-01" and "2022-12-31")
- Extract ALL information explicitly mentioned in the text - completeness is critical
- Include every work history entry, education entry, certification, and project found in the resume
- If information is not available, use null or empty array
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Be conservative with achievements - only include clear accomplishments
- Skills should be specific and technical when possible
- Return valid JSON only, no markdown formatting
- Do not skip or filter any entries based on relevance or recency

STORY EXTRACTION RULES:
- Extract ALL unique stories and achievements from each role - do not limit to a specific number
- Each story should have: context (situation), action (what was done), result (outcome)
- Include specific metrics and quantifiable results in story metrics
- Categorize stories by type: achievement, challenge, leadership, innovation, problem-solving
- Stories should demonstrate specific competencies and impact
- Focus on stories that would be relevant for job applications
- Extract every distinct achievement, project, or accomplishment mentioned
- Do not combine or summarize multiple achievements into single stories
- Each bullet point or achievement should become its own story if it contains distinct value

CRITICAL: You MUST extract stories into the "stories" array for each work history entry. Do not leave stories arrays empty. Each bullet point in the job description should become a story with:
- title: Brief description of the achievement
- description: Full context, action, and result
- metrics: Specific numbers and outcomes mentioned
- impact: high/medium/low based on the significance
- type: achievement/challenge/leadership/innovation/problem-solving

ALSO CRITICAL: You MUST populate the "achievements" array for each work history entry. Extract each bullet point as a separate achievement. Do not leave achievements arrays empty.
`;
};
