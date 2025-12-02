// Resume analysis prompt with robust story, metric, and tag extraction
// Now supports cover letter context for enhanced tag extraction
export const buildResumeAnalysisPrompt = (resumeText: string, coverLetterText?: string): string => {
  const coverLetterSection = coverLetterText 
    ? `\n\nCover Letter Text:
${coverLetterText}

IMPORTANT: Use cover letter content to enhance role tag extraction.
Cover letters often expand on resume achievements with more detail and context.
When extracting roleTags, consider both:
1. Resume bullets (concise, metric-focused)
2. Cover letter stories that reference each role (narrative, detailed)

If a cover letter story references a specific role (company + title), use that story's context to enhance the roleTags for that role.
Cover letter stories provide richer context about competencies, skills, and impact demonstrated in each role.
` 
    : '';

  return `
You are analyzing a resume${coverLetterText ? ' and cover letter' : ''} to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

Resume Text:
${resumeText}${coverLetterSection}

Return ONLY valid JSON with this exact structure. ALL FIELDS ARE REQUIRED:

{
  "contactInfo": {
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "linkedin": "https://linkedin.com/in/username or null",
    "website": "https://website.com or null",
    "github": "https://github.com/username or null",
    "substack": "https://username.substack.com or null"
  },
  "location": "City, State, Country or null",  // Geographic location (NOT contact info)
  "summary": "Professional summary (1-2 sentences) or empty string",
  "workHistory": [
    {
      "id": "1",
      "company": "Company Name",
      "companyDescription": "REQUIRED: 1-2 sentences describing what this company does. ALWAYS provide this field - NEVER leave empty. Extract from: resume header, role context, or general knowledge. If not explicit, infer from company name, industry, or role descriptions. Examples: 'Electric vehicle and clean energy company', 'SaaS platform for customer engagement', 'Healthcare insurance provider'. For startups, describe their product/service.",  // MANDATORY: Company description must always be provided
      "title": "Job Title",  // MANDATORY: Extract the actual job title - this field is REQUIRED and MUST NEVER be empty. Example: "Senior Product Manager"
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",  // CRITICAL: Use null for "Present" or current positions
      "current": true,  // CRITICAL: Set true if endDate is null or position shows "Present" or "Current"
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],  // REQUIRED: Always include tags
      "roleTags": ["growth", "activation", "experimentation", "startup"],  // REQUIRED: Always include tags. Include ONE maturity tag: "startup", "growth-stage", or "enterprise" based on company stage during tenure.
      "roleSummary": "1-2 sentence overview of focus and impact in this role",  // REQUIRED: Never leave empty if role has bullets
      "roleMetrics": [  // Extract metrics WITHOUT story context (standalone metrics, no narrative). DO NOT duplicate metrics that appear in stories.
        {
          "value": "+22%",  // REQUIRED: Extract numeric value (e.g., "+22%", "-3.5%", "30+", "+10")
          "context": "Week-2 activation improvement",  // REQUIRED: Complete, self-explanatory phrase. BAD: "revenue" or "team". GOOD: "year-over-year revenue growth" or "team size increase". Must make sense without seeing original resume.
          "type": "increase",  // REQUIRED: "increase" | "decrease" | "absolute"
          "parentType": "role"  // REQUIRED: Always "role" for roleMetrics
        }
      ],
      // CRITICAL: If a metric appears in a story.metrics[], do NOT also include it in roleMetrics[] (no duplication)
      "stories": [  // REQUIRED: Extract 1-3+ stories per role and place them HERE in this array
        {
          "id": "1",
          "title": "Brief story title (5-8 words)",
          "content": "Full text exactly as written",
          "problem": "What challenge or opportunity (optional)",
          "action": "What was done (optional)",
          "outcome": "What resulted (optional)",
          "tags": ["experimentation", "activation", "analytics"],
          "linkedToRole": true,  // true if story clearly belongs to this workHistory entry
          "company": "Company Name",  // Reference to parent company (same as workHistory.company)
          "titleRole": "Job Title",  // Reference to parent title (same as workHistory.title)
          "metrics": [
            {
              "value": "+22%",
              "context": "Week-2 activation", 
              "type": "increase",
              "parentType": "story"
            }
          ]
        }
      ]
    }
  ],
  "education": [
    {
      "id": "1",
      "institution": "University Name",
      "degree": "MS/BS/PhD/etc",
      "field": "Major/Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA or null"
    }
  ],
  "skills": [
    {
      "category": "Product Management",
      "items": ["A/B Testing", "Data Analysis", "Product Strategy"]
    }
  ],
  "certifications": [],
  "projects": []
}

CRITICAL EXTRACTION RULES:

1. STORIES (Most Important - Extract Aggressively):
   CRITICAL: Extract EVERY distinct achievement/accomplishment as a separate story, regardless of formatting.
   
   What is a Story?
   - ANY action with a result or impact (even if brief)
   - Examples: "Led team of 6", "Drove $100K revenue", "Launched new feature", "Improved conversion by 10%"
   - Format variations: bullets (•), dashes (-), paragraphs, semicolons, line breaks
   - STAR format is ideal but NOT required - extract even short achievement statements
   
   Extraction Rules:
   - ONE achievement = ONE story (do NOT collapse multiple achievements into one description)
   - Example: "• Led X • Managed Y • Increased Z" = 3 separate stories, not 1
   - Example: "Led X and managed Y, resulting in Z" = 2-3 stories (leadership + management + result)
   - Empty stories[] should be RARE - most roles have 2-5+ achievements
   - Place stories in workHistory[].stories[] array
   
   Story vs Metric:
   - If has action + result = STORY (e.g., "Led team of 6" or "Drove 25% growth")
   - If only metric with no action = role-level metric (e.g., just "25% YoY growth" in summary)
   - When in doubt: Extract as story. Granular data is better.
   
   Story Structure (flexible):
   - Minimum: action + result (e.g., "Increased activation by 22%")
   - Ideal: problem/context + action + outcome (STAR format)
   - Each story references parent role via company name and title

2. METRICS (Story & Role Level):
   Story Metrics:
   - Extract ALL numbers: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M")
   - Each metric needs: value, context, type (increase/decrease/absolute), parentType ("story")
   - Example: {"value": "+22%", "context": "Week-2 activation improvement", "type": "increase", "parentType": "story"}
   - These metrics belong to specific stories within a role
   
   CONTEXT FIELD (CRITICAL):
   - Must be a COMPLETE, SELF-EXPLANATORY phrase
   - Include: what was measured + direction/outcome
   - BAD: "revenue", "team", "activation" (too vague, missing direction)
   - GOOD: "year-over-year revenue growth", "team size increase during tenure", "Week-2 activation improvement"
   - The context should make sense WITHOUT seeing the original resume
   
   Role Metrics vs Story Metrics (CRITICAL - DO NOT DUPLICATE):
   
   Role-Level Metrics:
   - Extract metrics that appear WITHOUT a story/narrative context
   - Common in resumes: brief bullet points with just numbers (e.g., "Increased revenue by 25%")
   - If a bullet has a metric but no story structure (no challenge/action/context), it's a role-level metric
   - Examples of role-level metrics:
     * "Increased revenue by 25%"
     * "Reduced churn by 3.5%"
     * "Launched 30+ features per year"
   - Place these in roleMetrics[] array
   - Each metric needs: value, context, type (increase/decrease/absolute), parentType ("role")
   
   Story-Level Metrics:
   - Extract metrics that appear WITHIN a story/narrative (STAR format, Google format, etc.)
   - If a bullet tells a story (challenge → action → result with metric), it's a STORY with a metric
   - Examples of story-level metrics (embedded in stories):
     * "Faced declining activation rates, so I redesigned onboarding flows, resulting in +22% Week-2 activation"
     * "Accomplished 30+ tests per year as measured by experimentation cadence, by implementing weekly triage process"
   - Place these in story.metrics[] array (NOT in roleMetrics)
   - Each metric needs: value, context, type, parentType ("story")
   
   CRITICAL RULE: A metric should appear in EITHER roleMetrics OR story.metrics, NEVER BOTH.
   - If metric has story context → story.metrics only
   - If metric is standalone/narrative-free → roleMetrics only

3. COMPANY DESCRIPTION (MANDATORY - NEVER SKIP):
   CRITICAL: ALWAYS provide a company description. NEVER leave this field empty.
   
   Extraction Priority:
   1. Role header taglines (e.g., "industry-leading SaaS platform", "healthcare startup")
   2. Explicit mentions in resume header or role context
   3. Infer from company name if well-known (e.g., "Meta" → "Social media and technology company")
   4. Infer from industry/product mentions in role description
   5. Infer from tags (SaaS, B2B, PLG → "B2B SaaS platform")
   6. For obscure companies: describe the product/service based on role context
   
   INCLUDE FUNDING/STAGE when mentioned:
   - If header says "Series A to C" → include in description (e.g., "Solar SaaS platform, Series A to C during tenure")
   
   Quality Standards:
   - Length: 1-2 sentences describing what the company does
   - Focus: Company's business/product/industry, NOT the specific role
   - Examples:
     * "Electric vehicle manufacturer and clean energy company"
     * "No-code platform for building 3D simulations and mixed reality applications"
     * "Solar software provider for residential and commercial installations"
     * "Enterprise CRM and cloud software provider"
   
   Same Description Rule:
   - If multiple roles at same company → use IDENTICAL companyDescription for all
   - This is company-level info, not role-specific

4. TAGS (Three Levels):
   Company Tags (2-3 tags):
   - Industry/domain: "SaaS", "B2B", "CRM", "PLG", "enterprise"
   - Company stage: "startup", "growth-stage", "established"
   
   Role Tags (3-5 tags):
   - Core competencies demonstrated in this role
   - Options: growth, activation, retention, experimentation, analytics, strategy, 
     execution, plg, process, onboarding, ux, lifecycle, alignment, enablement, adoption
   - Company maturity at tenure: Include ONE of "startup", "growth-stage", or "enterprise" 
     based on company description, role context, or explicit mentions (e.g., "Series A startup", 
     "enterprise software", "growth-stage company"). Infer from company size, funding stage, 
     or description if not explicitly stated.
   
   Story Tags (2-3 tags per story):
   - Specific themes of that achievement
   - Use same vocabulary as role tags

4. FIELD NAMES:
   - Use "title" for job title - THIS FIELD IS REQUIRED AND MUST NEVER BE EMPTY
   - Use "field" for education major
   - Current jobs: endDate = null, current = true

5. DATES AND CURRENT STATUS:
   - Format: "YYYY-MM-DD" (use -01-01 for year-only, -12-31 for end years)
   - If endDate shows "Present", "Current", or no end date, set endDate = null AND current = true
   
6. JOB TITLE EXTRACTION (CRITICAL):
   - EVERY resume entry includes both company name AND job title
   - The job title appears immediately after the company name (e.g., "FlowHub — Senior Product Manager")
   - You MUST extract the title regardless of formatting (dash, pipe, parentheses, etc.)
   - The "title" field is MANDATORY - if you cannot extract it, you have made an error
   - Examples: "Senior Product Manager", "Product Manager", "Associate Product Manager"
   - DO NOT leave title empty or null under any circumstances

7. ROLE SUMMARY:
   - 1-2 sentences summarizing: area of ownership, why it matters, top result
   - Example: "Owned onboarding, experimentation cadence, and analytics taxonomy to drive activation and conversion. Led 30+ A/B tests yearly."
   - This should be distinct from stories. Purpose is to explain areas of responsibility, scope, team size, etc -- not the specific actions taken or results.
   
   INCLUDE IN ROLE SUMMARY:
   - Role positioning from headers (e.g., "First product hire", "Founding team member")
   - Scope indicators (team size, budget, ownership areas)
   - High-level context not captured in individual stories
   - Company stage context if relevant to role (e.g., "joined pre-Series A, scaled through Series C")

8. ROLE HEADER CONTEXT:
   Resume entries often contain rich context in headers/subheaders beyond company + title:
   - Funding/stage: "Series A", "Pre-IPO", "Fortune 500", "Seed to Series B"
   - Growth multipliers: "2X revenue", "10X team", "3X ARR"
   - Role positioning: "First hire", "Founding team", "Employee #5"
   - Company descriptors: "leading SaaS platform", "healthcare startup"
   
   EXTRACTION RULES:
   - Company descriptors → companyDescription field
   - Funding/stage → include in companyTags AND companyDescription
   - Growth multipliers → roleMetrics[] with FULL context (e.g., "2X" + "year-over-year revenue growth")
   - Role positioning → include in roleSummary (e.g., "First product hire...")
   
   DO NOT lose header context just because it's not in bullet format.

EXAMPLE OUTPUT (FlowHub role from resume):
Resume text shows:
"FlowHub — Senior Product Manager (2021-05–Present) | San Francisco, CA
• Overhauled self-serve onboarding; Week‑2 activation +22% and trial→paid +11% across SMB.
• Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year.
• Defined analytics taxonomy and dashboards adopted by PMM/CS for lifecycle targeting."

Expected JSON:
{
  "company": "FlowHub",
  "companyDescription": "SaaS platform for workflow automation and team collaboration",  // REQUIRED: Company-level description
  "title": "Senior Product Manager",  // REQUIRED: Must extract actual title regardless of format
  "startDate": "2021-05-01",
  "endDate": null,  // null because current = true
  "current": true,  // REQUIRED: Set true for "Present" or current positions
  "location": "San Francisco, CA",
  "companyTags": ["SaaS", "B2B", "PLG"],
  "roleTags": ["growth", "activation", "experimentation", "analytics", "process", "growth-stage"],
  "roleSummary": "Owned onboarding optimization and experimentation cadence for PLG SaaS platform, driving activation and trial conversion across SMB segment.",
  "roleMetrics": [  // CRITICAL: Extract ALL 3 metrics from the bullets above
    {"value": "+22%", "context": "Week-2 activation", "type": "increase", "parentType": "role"},
    {"value": "+11%", "context": "trial-to-paid conversion", "type": "increase", "parentType": "role"},
    {"value": "30+", "context": "tests per year", "type": "absolute", "parentType": "role"}
  ],
  "stories": [
    {
      "id": "1",
      "title": "Overhauled self-serve onboarding for SMB activation",
      "content": "Overhauled self-serve onboarding; Week-2 activation +22% and trial→paid +11% across SMB",
      "tags": ["onboarding", "activation", "growth"],
      "metrics": [
        {"value": "+22%", "context": "Week-2 activation", "type": "increase", "parentType": "story"},
        {"value": "+11%", "context": "trial-to-paid conversion", "type": "increase", "parentType": "story"}
      ]
    },
    {
      "id": "2",
      "title": "Built experimentation cadence with weekly triage",
      "content": "Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year",
      "tags": ["experimentation", "process"],
      "metrics": [
        {"value": "30+", "context": "tests per year", "type": "absolute", "parentType": "story"}
      ]
    },
    {
      "id": "3",
      "title": "Defined analytics taxonomy for lifecycle targeting",
      "content": "Defined analytics taxonomy and dashboards adopted by PMM/CS for lifecycle targeting",
      "tags": ["analytics", "alignment", "lifecycle"],
      "metrics": []
    }
  ]
}

CRITICAL REMINDERS:

1. Contact Info: Only include email, phone, and external URLs (linkedin, website, github, substack). Do NOT include location here.

2. Location: Extract geographic location separately (City, State, Country). This is NOT contact information.

3. stories[] array: Extract achievements with narrative context (challenge/action/result, STAR format, etc.). If a bullet tells a story, extract it as a story.

4. Metrics Duplication Rule (MOST IMPORTANT):
   - If a metric appears WITHIN a story (story.metrics[]) → DO NOT also put it in roleMetrics[]
   - If a metric appears WITHOUT a story context (standalone bullet) → Put it in roleMetrics[] only
   - Resumes are compact: Most metrics will be role-level (no story context)
   - Stories with metrics (STAR format, Google format) → story.metrics[] only
   - NEVER duplicate the same metric in both roleMetrics[] and story.metrics[]

5. Resume vs Cover Letter Context:
   - RESUMES: Contain achievements in compact format (bullets, short sentences). Extract EACH as a story.
   - COVER LETTERS: Contain expanded narratives with more context. Often elaborates on resume achievements.
   - BOTH contain stories - resumes have more (but shorter), cover letters have fewer (but longer)
   - Extract aggressively from resumes - users rely on this data for cover letter generation.

Return ONLY the JSON object. No markdown, no explanations, no additional text.
`;
};
