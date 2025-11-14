/**
 * Job Description Analysis Prompt
 * 
 * Extracts structured data from job description text:
 * - Company name
 * - Role/title
 * - Requirements (core and preferred)
 * - Differentiator summary (what makes this role unique)
 */

export const buildJobDescriptionAnalysisPrompt = (text: string): string => {
  return `You are an expert at parsing job descriptions to extract structured data for a job application platform.

Your goal: Extract key information from the job description to enable matching and gap analysis.

Job Description Text:
${text}

Return ONLY valid JSON with this exact structure. ALL FIELDS ARE REQUIRED:

{
  "company": "Company Name",
  "role": "Job Title / Role Name",
  "requirements": [
    "Requirement 1 (e.g., '5+ years of product management experience')",
    "Requirement 2 (e.g., 'B2B SaaS background')",
    "Requirement 3 (e.g., 'SQL/Python proficiency')"
  ],
  "differentiatorSummary": "1-2 sentence summary of what makes this role unique or what the company is specifically seeking (e.g., 'Seeks PM with AI/ML experience and growth metrics focus')"
}

EXTRACTION RULES:

1. COMPANY:
   - Extract the company name exactly as written
   - If multiple companies mentioned, use the primary hiring company
   - Examples: "Acme Corp", "TechCorp Inc", "StartupXYZ"

2. ROLE:
   - Extract the exact job title/role name
   - Examples: "Senior Product Manager", "Product Manager - Growth", "Associate PM"

3. REQUIREMENTS:
   - Extract ALL requirements mentioned (both required and preferred)
   - Include: experience levels, skills, qualifications, education
   - Format as clear, standalone statements
   - Examples:
     * "5+ years of product management experience"
     * "B2B SaaS background"
     * "SQL/Python proficiency"
     * "MBA or equivalent experience"
     * "Experience with A/B testing and experimentation"
   - Minimum 3 requirements, maximum 15
   - Focus on concrete, measurable requirements

4. DIFFERENTIATOR SUMMARY:
   - Identify what makes this role unique or what the company specifically seeks
   - Look for: unique qualifications, special focus areas, company priorities
   - Examples:
     * "Seeks PM with AI/ML experience and growth metrics focus"
     * "Looking for PM with fintech background and regulatory compliance experience"
     * "Emphasizes experimentation culture and data-driven decision making"
   - Should be 1-2 sentences, specific and actionable
   - If no clear differentiator, summarize the top 2-3 most important requirements

CRITICAL:
- Return ONLY the JSON object
- No markdown formatting
- No explanations
- All fields are required (use empty string/array if truly missing)
- Requirements array must have at least 3 items
`;
};

