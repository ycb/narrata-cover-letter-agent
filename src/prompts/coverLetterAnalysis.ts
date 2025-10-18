// Cover letter analysis prompt
export const buildCoverLetterAnalysisPrompt = (text: string): string => {
  return `
Analyze this cover letter text and extract structured data. Return ONLY valid JSON with no additional text.

Cover Letter Text:
${text}

Extract the following information and return as JSON:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Job description",
      "achievements": ["achievement1", "achievement2"],
      "location": "City, State",
      "current": true/false
    }
  ],
  "education": [],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number if mentioned",
    "location": "City, State",
    "website": "website if mentioned",
    "linkedin": "linkedin if mentioned"
  },
  "summary": "Brief summary of the cover letter and its key points"
}

Instructions:
- Extract work experience and achievements mentioned in the cover letter
- Focus on specific accomplishments and metrics mentioned
- Include any skills or technologies referenced
- Extract any contact information if mentioned
- Create a summary highlighting the key points and achievements
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Return valid JSON only, no markdown formatting
`;
};
