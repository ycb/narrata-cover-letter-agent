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
      "position": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],
      "roleTags": ["growth", "activation", "experimentation"],
      "roleSummary": "1-2 sentence overview of focus and impact in this role",
      "roleMetrics": [
        {
          "value": "+22%",
          "context": "Week-2 activation",
          "type": "increase"
        }
      ],
      "stories": [
        {
          "id": "1",
          "title": "Brief story title (5-8 words)",
          "content": "Full bullet text exactly as written",
          "problem": "What challenge or opportunity (optional)",
          "action": "What was done (optional)",
          "outcome": "What resulted (optional)",
          "tags": ["experimentation", "activation", "analytics"],
          "metrics": [
            {
              "value": "+22%",
              "context": "Week-2 activation", 
              "type": "increase"
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
   - Each bullet point under a job = ONE story
   - ALWAYS create 3-5 stories per role (more if available)
   - Include the main responsibility/description as story #1
   - Each subsequent achievement/bullet = separate story
   - Use EXACT text from resume for story.content
   - Extract title as first 5-8 words of the bullet

2. METRICS (Story & Role Level):
   Story Metrics:
   - Extract ALL numbers: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M")
   - Each metric needs: value, context, type (increase/decrease/absolute)
   - Example: "+22%" with context "Week-2 activation" and type "increase"
   
   Role Metrics:
   - Aggregate the top 3-5 metrics across all stories for this role
   - These show overall impact of the role

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
   - Use "position" not "title" for job title
   - Use "field" not "fieldOfStudy" for education major
   - Current jobs: endDate = null (NOT "Present" string)

5. DATES:
   - Format: "YYYY-MM-DD" (use -01-01 for year-only, -12-31 for end years)
   - Current position: endDate = null

6. ROLE SUMMARY:
   - 1-2 sentences summarizing: area of ownership, why it matters, top result
   - Example: "Owned onboarding, experimentation cadence, and analytics taxonomy to drive activation and conversion. Led 30+ A/B tests yearly."

EXAMPLE OUTPUT (FlowHub role from resume):
{
  "company": "FlowHub",
  "position": "Senior Product Manager",
  "startDate": "2021-05-01",
  "endDate": null,
  "location": "San Francisco, CA",
  "companyTags": ["SaaS", "B2B", "PLG"],
  "roleTags": ["growth", "activation", "experimentation", "analytics", "process"],
  "roleSummary": "Owned onboarding optimization and experimentation cadence for PLG SaaS platform, driving activation and trial conversion across SMB segment.",
  "roleMetrics": [
    {"value": "+22%", "context": "Week-2 activation", "type": "increase"},
    {"value": "+11%", "context": "trial-to-paid conversion", "type": "increase"},
    {"value": "30+", "context": "tests per year", "type": "absolute"}
  ],
  "stories": [
    {
      "id": "1",
      "title": "Overhauled self-serve onboarding for SMB activation",
      "content": "Overhauled self-serve onboarding; Week-2 activation +22% and trial→paid +11% across SMB",
      "tags": ["onboarding", "activation", "growth"],
      "metrics": [
        {"value": "+22%", "context": "Week-2 activation", "type": "increase"},
        {"value": "+11%", "context": "trial-to-paid conversion", "type": "increase"}
      ]
    },
    {
      "id": "2",
      "title": "Built experimentation cadence with weekly triage",
      "content": "Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year",
      "tags": ["experimentation", "process"],
      "metrics": [
        {"value": "30+", "context": "tests per year", "type": "absolute"}
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

Return ONLY the JSON object. No markdown, no explanations, no additional text.
`;
};
