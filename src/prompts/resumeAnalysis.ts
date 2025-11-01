// Resume analysis prompt with robust story, metric, and tag extraction
export const buildResumeAnalysisPrompt = (text: string): string => {
  return `
You are analyzing a resume to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

Resume Text:
${text}

Return ONLY valid JSON with this exact structure:

{
  "contactInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number or null",
    "location": "City, State, Country",
    "linkedin": "https://linkedin.com/in/username or null"
  },
  "summary": "Professional summary (1-2 sentences) or empty string",
  "workHistory": [
    {
      "id": "1",
      "company": "Company Name",
      "position": "Job Title",  // CRITICAL: Extract the actual job title (e.g., "Senior Product Manager", "Product Manager")
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",  // CRITICAL: Use null for "Present" or current positions
      "current": true,  // CRITICAL: Set true if endDate is null or position shows "Present" or "Current"
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],
      "roleTags": ["growth", "activation", "experimentation"],
      "roleSummary": "1-2 sentence overview of focus and impact in this role",
      "roleMetrics": [
        {
          "value": "+22%",
          "context": "Week-2 activation",
          "type": "increase",
          "parentType": "role"
        }
      ],
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
          "position": "Job Title",  // Reference to parent position (same as workHistory.position)
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
   - Ideally all stories have an associated metric, but this is not universal
   - If a story has a metric, the metric is associated on the story level
   - Metrics can also be associated on the role level
   - Extract ALL unique stories per role and PLACE THEM IN THE workHistory[].stories[] ARRAY for that specific role
   - Use EXACT text from resume for story.content
   - EVERY work history entry MUST include a stories[] array (even if empty, though you should extract at least 1-3 stories per role)
   - CRITICAL: Stories MUST be placed in the stories[] array of the workHistory entry they belong to (same company/role)
   - If a story cannot be linked to any work history entry, it should still be included but mark it as orphan by including "orphan": true
   - Each story should reference its parent role through context: include company name and position from the parent workHistory entry

2. METRICS (Story & Role Level):
   Story Metrics:
   - Extract ALL numbers: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M")
   - Each metric needs: value, context, type (increase/decrease/absolute), parentType ("story")
   - Example: {"value": "+22%", "context": "Week-2 activation", "type": "increase", "parentType": "story"}
   - These metrics belong to specific stories within a role
   
   Role Metrics:
   - A user may often summarize metrics at the role level. If found, use these as role-level metrics.
   - Each metric needs: value, context, type (increase/decrease/absolute), parentType ("role")
   - Example: {"value": "+22%", "context": "Week-2 activation", "type": "increase", "parentType": "role"}
   - These are important top-level metrics that show overall impact in a role
   - CRITICAL: Always include "parentType" field set to "role" for roleMetrics and "story" for story metrics

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
   - Use "position" for job title
   - Use "field" for education major
   - Current jobs: endDate = null, current = true

5. DATES AND CURRENT STATUS:
   - Format: "YYYY-MM-DD" (use -01-01 for year-only, -12-31 for end years)
   - If endDate shows "Present", "Current", or no end date, set endDate = null AND current = true
   - Extract the job title from the resume - it is always present and must be extracted

6. ROLE SUMMARY:
   - 1-2 sentences summarizing: area of ownership, why it matters, top result
   - Example: "Owned onboarding, experimentation cadence, and analytics taxonomy to drive activation and conversion. Led 30+ A/B tests yearly."
   - This should be distinct from stories. Purpose is to explain areas of responsibility, scope, team size, etc -- not the specific actions taken or results.

EXAMPLE OUTPUT (FlowHub role from resume):
{
  "company": "FlowHub",
  "position": "Senior Product Manager",  // REQUIRED: Must extract actual title regardless of format
  "startDate": "2021-05-01",
  "endDate": null,  // null because current = true
  "current": true,  // REQUIRED: Set true for "Present" or current positions
  "location": "San Francisco, CA",
  "companyTags": ["SaaS", "B2B", "PLG"],
  "roleTags": ["growth", "activation", "experimentation", "analytics", "process"],
  "roleSummary": "Owned onboarding optimization and experimentation cadence for PLG SaaS platform, driving activation and trial conversion across SMB segment.",
  "roleMetrics": [
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

CRITICAL REMINDER: Each workHistory entry MUST include populated stories[] arrays. Extract 1-3+ stories per role from the resume text and place them in workHistory[].stories[].

Return ONLY the JSON object. No markdown, no explanations, no additional text.
`;
};
