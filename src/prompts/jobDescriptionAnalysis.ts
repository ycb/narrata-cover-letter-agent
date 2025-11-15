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
  "salary": "Salary range (e.g., '$160,000-200,000', '$180K-220K', '180-200k') or null",
  "companyIndustry": "Industry name (e.g., 'Legal Tech', 'Fintech', 'Healthcare SaaS') or null",
  "companyBusinessModel": "Business model (e.g., 'B2B SaaS', 'B2C Marketplace', 'Enterprise Platform') or null",
  "companyMaturity": "startup|growth-stage|late-stage|enterprise or null",
  "companyMission": "Company mission statement or purpose (1-2 sentences) or null",
  "companyValues": ["value 1", "value 2", "value 3"] or [],
  "workType": "Work arrangement (e.g., 'Remote', 'Hybrid', 'In-person', 'Remote (US only)') or null",
  "location": "Primary location (e.g., 'Seattle, WA', 'San Francisco Bay Area', 'New York, NY') or null",
  "coreRequirements": [
    "Requirement 1 (e.g., '5+ years of product management experience')",
    "Requirement 2 (e.g., 'B2B SaaS background')"
  ],
  "preferredRequirements": [
    "Requirement 1 (e.g., 'SQL/Python proficiency')",
    "Requirement 2 (e.g., 'MBA or equivalent experience')",
    "Requirement 3 (e.g., 'Experience with AI/ML technologies')"
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

3. SALARY:
   - Extract the salary range exactly as stated in the JD
   - Look for: "base salary", "compensation", "salary range", "$XXX,XXX"
   - Preserve the format (e.g., "$160,000-200,000" or "$180K-220K")
   - Include only base salary, not total comp (unless base is not specified)
   - Return null if not mentioned in JD

4. COMPANY INDUSTRY:
   - Extract the industry or sector the company operates in
   - Look for: company description, "about us", industry mentions, mission statement, product descriptions
   - Infer from context clues: e.g., "Legal AI for Personal Injury Firms" → "Legal Tech", "helping injured people" → "Legal Tech"
   - Examples: "Legal Tech", "Fintech", "Healthcare SaaS", "E-commerce", "Developer Tools"
   - Be specific (e.g., "Legal Tech" not just "Technology", "Healthcare SaaS" not just "Healthcare")
   - If the company builds AI/ML products for a specific industry, name the industry (e.g., "Legal Tech" not "AI")
   - Return null ONLY if no industry clues exist anywhere in the JD

5. COMPANY BUSINESS MODEL:
   - Extract how the company makes money or their customer model
   - Look for: B2B/B2C, SaaS/Platform/Marketplace mentions
   - Examples: "B2B SaaS", "B2C Marketplace", "Enterprise Platform", "Developer Platform"
   - Return null if not mentioned in JD

6. COMPANY MATURITY:
   - Determine company stage based on context clues
   - Look for: funding stage, company size, years in business, "startup"/"established" mentions
   - Options: "startup" (early-stage, seed/Series A), "growth-stage" (Series B/C, scaling), 
     "late-stage" (Series D+, pre-IPO), "enterprise" (public company, large established)
   - Return null if not enough information

7. WORK TYPE:
   - Extract the work arrangement or location flexibility
   - Look for: "remote", "hybrid", "in-office", "on-site", "flexible"
   - Examples: "Remote", "Hybrid", "In-person", "Remote (US only)", "Hybrid (2 days/week)"
   - Return null if not mentioned in JD

8. LOCATION:
   - Extract the primary work location or office location
   - Look for: city, state, region mentioned
   - Examples: "Seattle, WA", "San Francisco Bay Area", "New York, NY", "Austin, TX"
   - Return null if not mentioned or if fully remote

9. COMPANY MISSION:
   - Extract the company's mission statement or purpose
   - Look for: "about us", "our mission", "we exist to", "our purpose is", mission-like statements
   - Should be 1-2 sentences describing what the company aims to achieve or why they exist
   - Examples: "We exist to ensure that evidence is never missed and justice is never compromised", "Our mission is to make financial services accessible to everyone"
   - Extract verbatim if possible, or summarize if mission is implied across multiple statements
   - Return null if no mission statement exists in JD

10. COMPANY VALUES:
   - Extract stated company values or cultural principles
   - Look for: "our values", "we believe", "our principles", "culture" sections, repeated themes
   - Can be explicitly listed (e.g., "Innovation, Integrity, Impact") or inferred from descriptions
   - Return as array of concise value statements (e.g., ["Customer-first", "Data-driven", "Move fast"])
   - Maximum 5 values
   - Return empty array [] if no values are stated or clearly implied

11. CORE REQUIREMENTS:
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

12. PREFERRED REQUIREMENTS:
   - Extract NICE-TO-HAVE requirements that strengthen candidacy but aren't dealbreakers
   - Look for keywords: "preferred", "nice to have", "bonus", "plus", "ideal", "strong preference"
   - Include:
     * Advanced skills (e.g., "SQL/Python proficiency")
     * Specific technical expertise (e.g., "Experience with AI/ML technologies", "Knowledge of LLMs")
     * Education preferences (e.g., "MBA or equivalent experience")
     * Domain expertise (e.g., "Experience in fintech/legal tech/healthcare")
     * Specialized tools or frameworks
   - Format as clear, standalone statements
   - Examples:
     * "SQL/Python proficiency"
     * "MBA or equivalent experience"
     * "Experience with A/B testing and experimentation"
     * "Experience with AI/ML technologies"
     * "Strong preference for experience in AI"
     * "Knowledge of legal tech or healthcare industry"
   - IMPORTANT: If JD emphasizes AI, ML, or other advanced tech as "strong preference" or "differentiator", include it here
   - Minimum 1 preferred requirement, maximum 10
   - Can be empty array if JD lists no preferred requirements

13. DIFFERENTIATOR SUMMARY:
   - Identify what makes this role unique or what the company specifically seeks
   - Look for: unique qualifications, special focus areas, company priorities, company mission/vision
   - Examples:
     * "Seeks PM with AI/ML experience and growth metrics focus"
     * "Looking for PM with fintech background and regulatory compliance experience"
     * "Emphasizes experimentation culture and data-driven decision making"
     * "Company builds Legal AI for personal injury firms, seeking PM passionate about access to justice"
   - Should be 1-2 sentences, specific and actionable
   - If no clear differentiator, summarize the top 2-3 most important requirements

CRITICAL:
- Return ONLY the JSON object
- No markdown formatting
- No explanations
- All fields are required (use null for missing strings, [] for missing arrays)
- companyValues should be [] if no values found
- coreRequirements array must have at least 2 items
- preferredRequirements array must have at least 1 item (or empty array if none found)
- Total requirements (core + preferred) should be between 3-15 items
- If JD mentions AI/ML/advanced tech as important, ensure it appears in preferredRequirements
`;
};

