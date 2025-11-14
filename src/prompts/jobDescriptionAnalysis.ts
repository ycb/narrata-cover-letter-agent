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
  "coreRequirements": [
    "Requirement 1 (e.g., '5+ years of product management experience')",
    "Requirement 2 (e.g., 'B2B SaaS background')"
  ],
  "preferredRequirements": [
    "Requirement 1 (e.g., 'SQL/Python proficiency')",
    "Requirement 2 (e.g., 'MBA or equivalent experience')"
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

3. CORE REQUIREMENTS:
   - Extract MUST-HAVE requirements that are critical for the role
   - Look for keywords: "required", "must have", "essential", "critical"
   - Include fundamental experience levels and core skills
   - Format as clear, standalone statements
   - Examples:
     * "5+ years of product management experience"
     * "B2B SaaS background"
     * "Experience leading cross-functional teams"
   - Minimum 2 core requirements, maximum 10
   - Default to core if requirement priority is ambiguous

4. PREFERRED REQUIREMENTS:
   - Extract NICE-TO-HAVE requirements that strengthen candidacy but aren't dealbreakers
   - Look for keywords: "preferred", "nice to have", "bonus", "plus", "ideal"
   - Include advanced skills, specific tools, or education preferences
   - Format as clear, standalone statements
   - Examples:
     * "SQL/Python proficiency"
     * "MBA or equivalent experience"
     * "Experience with A/B testing and experimentation"
     * "Knowledge of specific industry (fintech, healthcare, etc.)"
   - Minimum 1 preferred requirement, maximum 8
   - Can be empty array if JD lists no preferred requirements

5. DIFFERENTIATOR SUMMARY:
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
- coreRequirements array must have at least 2 items
- preferredRequirements array must have at least 1 item (or empty array if none found)
- Total requirements (core + preferred) should be between 3-15 items
`;
};

