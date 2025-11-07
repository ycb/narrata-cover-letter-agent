/**
 * Prompt for analyzing resume and cover letter together
 */
export const RESUME_COVER_LETTER_ANALYSIS_PROMPT = `Analyze the following resume and cover letter together. Extract structured data for each document and return a JSON object with separate "resume" and "coverLetter" sections.

IMPORTANT: Cross-reference information between documents. If the cover letter mentions work experiences, metrics, or stories not fully detailed in the resume, include them in the resume section's workHistory with appropriate annotations.

Resume Text:
{{resumeText}}

Cover Letter Text:
{{coverLetterText}}

Instructions:
1. Extract all work experiences, education, and skills
2. Include any metrics or achievements mentioned
3. Note any inconsistencies between the documents
4. Return valid JSON with proper formatting`;

/**
 * Prompt for case study analysis
 */
export const CASE_STUDY_ANALYSIS_PROMPT = `Case Study Text:
{{text}}

Extract the following information and return as JSON:

{
  "workHistory": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD | null",
      "description": "Detailed description",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": ["Skill 1", "Skill 2"],
  "metrics": ["Metric 1", "Metric 2"]
}

Guidelines:
- Focus on technical skills, problem-solving approaches, and measurable results
- Include any specific metrics, tools, or technologies mentioned
- Extract any work experience or project context
- Create a summary highlighting the key outcomes and learnings
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Return valid JSON only, no markdown formatting`;
