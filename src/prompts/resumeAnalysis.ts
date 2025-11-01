// Resume analysis prompt with robust story, metric, and tag extraction
export const buildResumeAnalysisPrompt = (text: string): string => {
  return `
You are analyzing a resume to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

Resume Text:
${text}

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
      "title": "Job Title",  // MANDATORY: Extract the actual job title - this field is REQUIRED and MUST NEVER be empty. Example: "Senior Product Manager"
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",  // CRITICAL: Use null for "Present" or current positions
      "current": true,  // CRITICAL: Set true if endDate is null or position shows "Present" or "Current"
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],  // REQUIRED: Always include tags
      "roleTags": ["growth", "activation", "experimentation"],  // REQUIRED: Always include tags
      "roleSummary": "1-2 sentence overview of focus and impact in this role",  // REQUIRED: Never leave empty if role has bullets
      "roleMetrics": [  // Extract metrics WITHOUT story context (standalone metrics, no narrative). DO NOT duplicate metrics that appear in stories.
        {
          "value": "+22%",  // REQUIRED: Extract numeric value (e.g., "+22%", "-3.5%", "30+", "+10")
          "context": "Week-2 activation",  // REQUIRED: What this metric measures
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

1. STORIES (Most Important):
   - Stories explain actions, challenges and constraints leading to a result
   - A story has narrative structure: challenge/context → action → result
   - Examples: STAR format, Google format ("Accomplished X as measured by Y, by doing Z")
   - NOTE: Resumes are compact - stories are LESS COMMON here. Cover letters typically contain more narrative/story content where users expand on resume achievements.
   - If a bullet has BOTH a story AND a metric → extract as story with story.metrics[]
   - If a bullet has ONLY a metric (no story context) → it's a role-level metric, NOT a story
   - Extract stories per role and PLACE THEM IN THE workHistory[].stories[] ARRAY
   - Empty stories[] is OK if resume only has standalone metrics (users may expand role-level metrics into stories later, often in cover letters)
   - If a story cannot be linked to any work history entry, it should still be included but mark it as orphan by including "orphan": true
   - Each story should reference its parent role through context: include company name and title from the parent workHistory entry

2. METRICS (Story & Role Level):
   Story Metrics:
   - Extract ALL numbers: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M")
   - Each metric needs: value, context, type (increase/decrease/absolute), parentType ("story")
   - Example: {"value": "+22%", "context": "Week-2 activation", "type": "increase", "parentType": "story"}
   - These metrics belong to specific stories within a role
   
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

3. TAGS (Three Levels):
   Company Tags (2-3 tags):
   - Industry/domain: "SaaS", "B2B", "CRM", "PLG", "enterprise"
   - Company stage: "startup", "growth-stage", "established"
   
   Role Tags (3-5 tags):
   - Core competencies demonstrated in this role
   - Options: growth, activation, retention, experimentation, analytics, strategy, 
     execution, plg, process, onboarding, ux, lifecycle, alignment, enablement, adoption
   
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

EXAMPLE OUTPUT (FlowHub role from resume):
Resume text shows:
"FlowHub — Senior Product Manager (2021-05–Present) | San Francisco, CA
• Overhauled self-serve onboarding; Week‑2 activation +22% and trial→paid +11% across SMB.
• Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year.
• Defined analytics taxonomy and dashboards adopted by PMM/CS for lifecycle targeting."

Expected JSON:
{
  "company": "FlowHub",
  "title": "Senior Product Manager",  // REQUIRED: Must extract actual title regardless of format
  "startDate": "2021-05-01",
  "endDate": null,  // null because current = true
  "current": true,  // REQUIRED: Set true for "Present" or current positions
  "location": "San Francisco, CA",
  "companyTags": ["SaaS", "B2B", "PLG"],
  "roleTags": ["growth", "activation", "experimentation", "analytics", "process"],
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
   - RESUMES: Typically contain role-level metrics (standalone numbers, no narrative). Stories are less common in resumes.
   - COVER LETTERS: Typically contain stories (narrative format explaining achievements). Users expand on resume metrics here.
   - ROLE-LEVEL METRICS PURPOSE: These represent key accomplishments that can later be expanded into stories (users will add narrative context explaining how metrics were achieved).

Return ONLY the JSON object. No markdown, no explanations, no additional text.
`;
};
