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
      "achievements": ["achievement1", "achievement2"],
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
`;
};
