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

⚠️ CRITICAL REQUIREMENT EXTRACTION RULES (READ FIRST) ⚠️

**INTELLIGENT EXTRACTION - Analyze the ENTIRE document, not just one section:**

1. **Look for requirements EVERYWHERE in the JD:**
   - Qualifications sections (explicit requirements)
   - Responsibilities sections (convert "You'll X" → "Experience with X")
   - Job description body (requirements mentioned in context)
   - "What we're looking for" sections
   - Any section that describes what the candidate needs

2. **Identify priority through signals:**
   - **Keywords**: "must", "required", "essential", "critical" → Core requirement
   - **Keywords**: "preferred", "nice to have", "bonus", "strong preference" → Preferred requirement
   - **Repetition**: If mentioned multiple times → Higher priority
   - **Position**: Earlier mentions often indicate higher priority
   - **Emphasis**: Bold text, bullet points, dedicated sections → Important

3. **Extract from responsibilities:**
   - "You'll define product vision" → "Experience defining product vision and strategy"
   - "You'll create roadmaps" → "Experience creating and maintaining product roadmaps"
   - "You'll manage teams" → "Experience managing cross-functional teams"
   - Convert action statements into experience requirements

4. **Break down compound requirements:**
   - "5+ years PM with strong preference for AI" → TWO items:
     * Core: "5+ years of product management experience"
     * Preferred: "AI/ML product experience"

5. **Look for patterns:**
   - If JD emphasizes a skill/technology multiple times → Extract as requirement
   - If JD has a dedicated section about requirements → Extract all items
   - If JD mentions something as "critical" or "essential" → Core requirement
   - If JD mentions something as "preferred" or "ideal" → Preferred requirement

**Goal: Extract ALL requirements mentioned anywhere in the JD, not just from one section.**

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
   - If JD explicitly says remote (or location type: remote), return "Remote" (or the exact remote variant)
   - Return null only if not mentioned in JD

8. LOCATION:
   - Extract the primary work location or office location
   - Look for: city, state, region mentioned
   - Examples: "Seattle, WA", "San Francisco Bay Area", "New York, NY", "Austin, TX"
   - Return null if not mentioned or if fully remote and no location is specified

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
   - Extract ALL MUST-HAVE requirements that are critical for the role
   - **ANALYZE THE ENTIRE JD** - Look for requirements in ALL sections, not just one
   - **Identify through signals:**
     * Keywords: "required", "must have", "essential", "critical", "mandatory"
     * Action statements: "You'll X", "You will X", "Responsibilities include X"
     * Dedicated sections: Qualifications, Requirements, What We're Looking For
     * Repetition: Skills/requirements mentioned multiple times
     * Emphasis: Bold text, bullet points, dedicated paragraphs
   - **Convert responsibilities to requirements:**
     * "You'll define product vision" → "Experience defining product vision and strategy"
     * "You'll create roadmaps" → "Experience creating and maintaining product roadmaps"
     * "You'll manage teams" → "Experience managing cross-functional teams"
   - **Break down compound requirements:**
     * "5+ years PM experience with AI preference" → Extract as 2 separate items
   - **Include ALL types of requirements found:**
     * Education requirements (degrees, certifications)
     * Experience levels (years, domain-specific)
     * Core functional skills (from any section)
     * Technical skills mentioned as essential
     * Domain expertise if required
     * Responsibilities converted to experience requirements
   - Format as clear, standalone statements (one skill/requirement per item)
   - Examples:
     * "Bachelor's degree in Computer Science, Engineering, or related field"
     * "5+ years of product management experience"
     * "B2B SaaS background"
     * "Experience defining product vision and strategy"
     * "Experience creating and maintaining product roadmaps"
     * "Experience conducting market research and analysis"
   - **Extract comprehensively** - If JD mentions 5 explicit qualifications + 7 responsibilities, extract ~10-12 core requirements
   - Default to core if requirement priority is ambiguous

12. PREFERRED REQUIREMENTS:
   - Extract ALL NICE-TO-HAVE requirements that strengthen candidacy but aren't dealbreakers
   - **ANALYZE THE ENTIRE JD** - Look for preferred requirements in ALL sections
   - **Identify through signals:**
     * Keywords: "preferred", "nice to have", "bonus", "plus", "ideal", "strong preference", "would be great"
     * Compound phrases: "with strong preference for X", "ideally with X", "X is a plus"
     * Context clues: Advanced skills mentioned but not required
     * Repetition: Skills mentioned multiple times but not as mandatory
   - **Break down compound requirements:**
     * If a core requirement says "with strong preference for X" → Extract X separately as preferred
     * Example: "5+ years PM with strong preference for AI" → Extract TWO items:
       - Core: "5+ years of product management experience"
       - Preferred: "AI/ML product experience"
   - **Include ALL types of preferred requirements found:**
     * Advanced skills (e.g., "SQL/Python proficiency")
     * Specific technical expertise (e.g., "Experience with AI/ML technologies")
     * Education preferences (e.g., "MBA or equivalent experience")
     * Domain expertise (e.g., "Experience in fintech/legal tech/healthcare")
     * Specialized tools, frameworks, or methodologies
     * Soft skills mentioned as preferred
     * Advanced responsibilities that imply preferred skills
   - Format as clear, standalone statements (one skill/requirement per item)
   - Examples:
     * "SQL/Python proficiency"
     * "MBA or equivalent experience"
     * "Experience with AI/ML technologies"
     * "AI/ML product experience" (extracted from compound requirement)
     * "Knowledge of legal tech or healthcare industry"
   - **Extract comprehensively** - If JD mentions preferences, extract them all
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

**INTELLIGENT REQUIREMENT EXTRACTION:**
- **Analyze the ENTIRE JD** - Don't limit yourself to one section
- **Look for requirements EVERYWHERE:**
  * Explicit qualification sections
  * Responsibility/role description sections
  * Job description body text
  * "What we're looking for" sections
  * Any section describing candidate needs
- **Identify priority through signals:**
  * Keywords ("must", "required", "essential" → core; "preferred", "nice to have" → preferred)
  * Repetition (mentioned multiple times → higher priority)
  * Position (earlier mentions → often higher priority)
  * Emphasis (bold, bullets, dedicated sections → important)
- **Convert responsibilities to requirements:**
  * "You'll X" or "You will X" → "Experience with X"
  * Action statements → Experience requirements
- **Break down compound requirements:**
  * "5+ years PM with strong preference for AI" → Extract as 2 separate items
- **Extract comprehensively:**
  * Don't stop at minimums - extract every requirement mentioned
  * If JD has multiple sections with requirements, extract from all of them
  * If JD mentions skills/requirements in body text, extract those too
- **Preserve order and keywords:**
  * List requirements in order they appear (earlier = typically higher priority)
  * Keep important keywords in requirement text
- **Expected counts:**
  * Comprehensive JDs typically have 5-12 core requirements
  * JDs with preferences typically have 2-5 preferred requirements
  * Total requirements (core + preferred) should typically be 7-15 items
- Each requirement should be a single, specific skill or qualification
- Requirements will be automatically ranked by priority based on keywords, position, repetition, and uniqueness
`;
};
