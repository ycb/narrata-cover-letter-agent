import { SHARED_STORY_GUIDANCE } from './sharedStoryGuidance';

// Resume analysis prompt with robust story, metric, and tag extraction (RESUME ONLY)
export const buildResumeAnalysisPrompt = (resumeText: string): string => {
  return `
You are analyzing a resume to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

CRITICAL: EXTRACTION ONLY FOR CONTENT FIELDS
- Extract text VERBATIM from the resume. Do NOT paraphrase, summarize, or rewrite.
- Preserve exact numbers: "20m users" stays "20m users", NOT "millions of users".
- Preserve exact phrasing for all content fields (summary, roleSummary, stories, etc.).
- The ONLY allowed "creation" is:
  - tags (companyTags, roleTags, story tags),
  - companyDescription (high-level description of what the company does),
  - story titles (5–8 word labels),
  - date formatting (e.g., "2021-05-01"),
  - metric type classification ("increase" | "decrease" | "absolute").
- Do NOT invent specific factual details (e.g., revenue, user counts, funding stages) unless explicitly stated in the resume.
- If something isn’t in the resume, leave the corresponding content value empty ("") or null as specified below.

SUMMARY VS ROLE SUMMARY (DO NOT CONFUSE - CRITICAL)
- "summary" (top-level field) = global career overview from TOP of resume
- "roleSummary" (per workHistory entry) = text from THAT SPECIFIC ROLE'S section only
  
ANTI-DUPLICATION RULES:
1. NEVER copy "summary" into any "roleSummary"
2. NEVER copy the same text into multiple roles' "roleSummary" fields
3. Each "roleSummary" must be UNIQUE or empty ("")
4. If no role-specific header exists, use roleSummary = ""

VALIDATION: Before returning JSON, verify no two roles share the same non-empty roleSummary.
  
SHARED STORY GUIDANCE:
${SHARED_STORY_GUIDANCE}

IMPORTANT (RESUME-SPECIFIC OVERRIDE):
- For resumes, you must still EXTRACT stories even when the resume bullets are concise and not written in full
  "Situation/Task/Action/Result" form.
- A "story" is any concrete achievement or responsibility described in a bullet or sentence for THIS ROLE.
- It is acceptable and expected that many stories will have problem/action/outcome as empty strings when the
  resume does not separate them explicitly. Do NOT skip story extraction just because STAR fields are incomplete.
- If SHARED_STORY_GUIDANCE above conflicts with any instructions in THIS prompt, THIS prompt takes priority.

Missing Data Handling:
- Keep the JSON shape and field names exactly as specified.
- If a field has no source in the resume, use:
  - "" for missing strings (e.g., summary, roleSummary),
  - null for missing scalar values (e.g., email, phone, gpa, website),
  - [] for arrays with no items (e.g., outcomeMetrics, stories, certifications, projects).

Resume Text:
${resumeText}

Return ONLY valid JSON with this exact structure. ALL FIELDS MUST EXIST, BUT MAY BE EMPTY/NULL AS SPECIFIED:

{
  "contactInfo": {
    "email": "email@example.com or null",
    "phone": "phone number or null",
    "linkedin": "https://linkedin.com/in/username or null",
    "website": "https://website.com or null",
    "github": "https://github.com/username or null",
    "substack": "https://username.substack.com or null"
  },
  "location": "City, State, Country or null",
  "summary": "Professional summary (1-2 sentences) or empty string",
  "workHistory": [
    {
      "id": "1",
      "company": "Company Name",
      "companyDescription": "REQUIRED: 1–2 sentences describing what this company does. ALWAYS provide this field. You may generate this at a high level using only information clearly implied by the resume. Focus on product/industry, not detailed facts.",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "current": true,
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B", "PLG"],
      "roleTags": ["growth", "activation", "experimentation", "startup"],
      "roleSummary": "EXTRACTED verbatim from this role’s header/subheader or first bullet (see rules below).",
      "outcomeMetrics": [
        {
          "value": "+22%",
          "context": "Week-2 activation improvement",
          "type": "increase",
          "parentType": "role"
        }
      ],
      "stories": [
        {
          "id": "1",
          "title": "Brief story title (5-8 words)",
          "content": "Full text exactly as written in the resume for this achievement.",
          "problem": "What challenge or opportunity (optional, verbatim if present, else empty string)",
          "action": "What was done (optional, verbatim if present, else empty string)",
          "outcome": "What resulted (optional, verbatim if present, else empty string)",
          "tags": ["experimentation", "activation", "analytics"],
          "linkedToRole": true,
          "company": "Company Name",
          "titleRole": "Job Title",
          "metrics": [
            {
              "value": "+22%",
              "context": "Week-2 activation improvement",
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

1. METRICS (Story-Level vs Role-Level):

   PER-ROLE ISOLATION (MOST IMPORTANT):
   - You MUST process each workHistory role INDEPENDENTLY.
   - For a given role, you may ONLY use text from that role’s own section (its header/subheader and its bullets)
     when extracting:
       - outcomeMetrics for that role, and
       - stories[].metrics for that role.
   - NEVER copy, move, or share metrics from one role to another.
     - Example: If a metric appears only under the Enact role, it MUST NOT appear in Aurora’s outcomeMetrics
       or stories[].metrics unless that metric text is explicitly repeated in Aurora’s section.
   - Metrics that appear ONLY in the global top-of-resume summary MUST NOT be assigned to any specific role
     unless the same metric text is clearly repeated in that role’s section.
     - In most cases, metrics in the global summary should be omitted from role-level outcomeMetrics and story.metrics.

   Story-Level Metrics:
   - Extract ALL numeric values that appear inside a story/narrative bullet for THIS ROLE.
   - Examples: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M", "$100K").
   - Each story-level metric needs:
     - value (e.g., "+22%"),
     - context (complete, self-explanatory phrase),
     - type: "increase" | "decrease" | "absolute",
     - parentType: "story".
   - Example:
     {
       "value": "+22%",
       "context": "Week-2 activation improvement",
       "type": "increase",
       "parentType": "story"
     }

   Role-Level Metrics (outcomeMetrics):
   - Role-level metrics are metrics that appear WITHOUT a described action in the same bullet for THIS ROLE.
   - They are pure outcomes like:
     - "Increased revenue by 25%"
     - "Reduced churn by 3.5%"
     - "Launched 30+ features per year"
   - If a bullet only states the outcome, with no detail on what was done, treat this as a role-level metric.
   - Place these in outcomeMetrics[] (NOT in story.metrics) for THIS ROLE only.

   Distinguishing Rule (CRITICAL):
   - If a bullet/narrative for this role clearly describes an action and the result together, treat it as a STORY
     with story-level metrics (see shared story guidance above).
   - If a bullet/narrative only states the outcome (e.g., "Increased revenue by 25%") without describing what was done,
     treat it as a ROLE-LEVEL metric.

   CONTEXT FIELD (CRITICAL):
   - Must be a COMPLETE, SELF-EXPLANATORY phrase.
   - Include: what was measured + direction/outcome.
   - BAD: "revenue", "team", "activation".
   - GOOD: "year-over-year revenue growth", "team size increase during tenure", "Week-2 activation improvement".

   NO DUPLICATION RULE (MOST IMPORTANT):
   - A metric must appear in EITHER outcomeMetrics OR story.metrics, NEVER BOTH.
   - If a metric has story context (action + result), put it ONLY in story.metrics.
   - If a metric appears as a standalone outcome, put it ONLY in outcomeMetrics.
   - NEVER duplicate a metric across roles. Each role’s metrics must come exclusively from that role’s text.

2. COMPANY DESCRIPTION (MANDATORY - NEVER SKIP):

   CRITICAL: ALWAYS provide a companyDescription. NEVER leave this field empty.

   What companyDescription is:
   - A 1–2 sentence, high-level description of what the company does: product, service, industry.
   - Example patterns:
     - "Solar software provider for residential and commercial installations."
     - "Electric vehicle and clean energy company."
     - "No-code platform for building 3D simulations and mixed reality applications."
     - "Enterprise CRM and cloud software provider."

   Allowed Inference (Exception to Extraction-Only Rule):
   - You may infer a high-level description from:
     - Company name if well-known,
     - Industry or product mentions in the role bullets,
     - Resume context around this company.
   - Do NOT invent specific quantitative facts (revenue, user counts, funding) that the resume does not clearly imply.

   Consistency:
   - If multiple roles exist for the same company, use IDENTICAL companyDescription for all roles at that company.

3. TAGS (Company, Role, Story):

   Company Tags (companyTags, 2–4 tags):
   - Industry/domain (e.g., "SaaS", "B2B", "CRM", "healthcare", "fintech").
   - Stage: include exactly one maturity tag at the company level such as "startup", "growth-stage", or "enterprise".

   Role Tags (roleTags, 3–7 tags):
   - Core competencies demonstrated in this role:
     - growth, activation, retention, experimentation, analytics, strategy,
       execution, plg, process, onboarding, ux, lifecycle, alignment,
       enablement, adoption, leadership, platform, ai-ml, etc.
   - Include exactly ONE maturity tag for the company at the time of this role:
     - "startup" | "growth-stage" | "enterprise".
   - You may infer maturity from context (e.g., "Series A startup", "Fortune 500", "enterprise software company"), but do not invent details.

   Story Tags (stories[].tags, 2–3 per story):
   - Specific themes for that achievement.
   - Use the same vocabulary set as roleTags, focusing only on what is clearly implied by the story text.

4. FIELD NAMES AND MISSING DATA:

   - Use "title" for the job title (this field is REQUIRED and must NEVER be empty; if you cannot find it, you have made an error).
   - Use "field" for education major.
   - Current jobs: endDate = null, current = true.
   - If a value is missing:
     - Strings → "" (empty string).
     - email, phone, website, github, substack, gpa → null if missing.
     - Arrays (outcomeMetrics, stories, certifications, projects) → [] if empty.

5. DATES AND CURRENT STATUS:

   - Date format: "YYYY-MM-DD".
   - If only a year is available, use:
     - Start: "YYYY-01-01"
     - End: "YYYY-12-31"
   - If the end date is labeled "Present", "Current", or missing:
     - endDate = null,
     - current = true.

6. ROLE SUMMARY (EXTRACTION ONLY, PER ROLE):

   - roleSummary is a SHORT, VERBATIM extract attached to THIS SPECIFIC ROLE.
   - Acceptable sources for roleSummary, in priority order:
     1) Role-level header/subheader text immediately attached to this job entry
        (on the same line as, or directly under, the company + title).
     2) If no role-level header/subheader exists, use the first sentence of the first bullet for this role, verbatim.
     3) If neither exists, set roleSummary to "" (empty string).

   CRITICAL: NEVER use the global resume header as roleSummary. NEVER duplicate roleSummary across roles.   - NEVER use the global resume header/profile summary at the top of the resume as roleSummary.
   - NEVER copy the same non-empty global summary text into roleSummary for multiple roles.
   - Do NOT copy the same non-empty roleSummary text into multiple roles unless the resume explicitly repeats
     that exact text under each of those roles. In most resumes, each role should have a distinct roleSummary.
   - If you cannot find any role-specific header/subheader or first-bullet sentence for a role, leave roleSummary = "".

7. ROLE HEADER CONTEXT:

   - Resume entries often contain rich context in each role’s header/subheader (not the global resume summary).
     Examples:
     - Funding/stage: "Series A to C", "Pre-IPO".
     - Growth multipliers: "2X revenue", "10X team".
     - Role positioning: "Founding PM", "First product hire".
     - Company descriptors: "leading SaaS platform", "healthcare startup".

   Extraction Rules:
   - Use role-level descriptors in:
     - companyDescription, when they describe the company.
     - roleSummary, when they describe role positioning.
   - If growth multipliers appear as bare outcomes (with no described action), treat them as outcomeMetrics FOR THAT ROLE ONLY.
   - Do NOT treat the top-of-resume global summary/profile as a role header.

8. CONTACT INFO AND LOCATION:

   - contactInfo should include ONLY:
     - email, phone, linkedin, website, github, substack (if present).
   - Do NOT put geographic location in contactInfo.
   - location (top-level field) is the geographic location (City, State, Country) for the candidate if provided.

9. STORIES ARRAY (PER ROLE):

   - stories[] should capture individual achievements for THIS ROLE, following the SHARED STORY GUIDANCE above.
   - For each role, use ONLY the text from that role’s section to create stories.
   - Each story:
     - content: full bullet or paragraph text verbatim from the resume.
     - title: a short 5–8 word label you create summarizing the achievement.
     - metrics: any numeric values tied to this story, following the metric rules above (and NEVER copied from other roles).
   - linkedToRole should be true for all stories derived from this role’s section.
   - Each story must reference its parent role via company and titleRole.
   - In a typical resume, most roles will have multiple achievements. For any role that contains concrete bullets
  (ownership, improvements, launches, measurable impact), it is an error to leave stories: [].
- When in doubt between "no story" and "a story with empty problem/action/outcome and metrics: []",
  you MUST choose to extract the story.

EXAMPLE OUTPUT (FlowHub role from resume):

Resume text shows:
"FlowHub — Senior Product Manager (2021-05–Present) | San Francisco, CA
• Overhauled self-serve onboarding; Week-2 activation +22% and trial→paid +11% across SMB.
• Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year.
• Defined analytics taxonomy and dashboards adopted by PMM/CS for lifecycle targeting."

Expected JSON snippet for this role (illustrative, but follows all rules):

{
  "company": "FlowHub",
  "companyDescription": "SaaS platform for workflow automation and team collaboration.",
  "title": "Senior Product Manager",
  "startDate": "2021-05-01",
  "endDate": null,
  "current": true,
  "location": "San Francisco, CA",
  "companyTags": ["SaaS", "B2B", "PLG", "growth-stage"],
  "roleTags": ["growth", "activation", "experimentation", "analytics", "process", "growth-stage"],
  "roleSummary": "Overhauled self-serve onboarding; Week-2 activation +22% and trial→paid +11% across SMB.",
  "outcomeMetrics": [],
  "stories": [
    {
      "id": "1",
      "title": "Overhauled self-serve onboarding for SMB",
      "content": "Overhauled self-serve onboarding; Week-2 activation +22% and trial→paid +11% across SMB.",
      "problem": "",
      "action": "",
      "outcome": "",
      "tags": ["onboarding", "activation", "growth"],
      "linkedToRole": true,
      "company": "FlowHub",
      "titleRole": "Senior Product Manager",
      "metrics": [
        {"value": "+22%", "context": "Week-2 activation improvement", "type": "increase", "parentType": "story"},
        {"value": "+11%", "context": "trial-to-paid conversion improvement", "type": "increase", "parentType": "story"}
      ]
    },
    {
      "id": "2",
      "title": "Built experimentation cadence with reviews",
      "content": "Built experimentation cadence (weekly triage, monthly reviews); 30+ tests/year.",
      "problem": "",
      "action": "",
      "outcome": "",
      "tags": ["experimentation", "process"],
      "linkedToRole": true,
      "company": "FlowHub",
      "titleRole": "Senior Product Manager",
      "metrics": [
        {"value": "30+", "context": "experiments run per year", "type": "absolute", "parentType": "story"}
      ]
    },
    {
      "id": "3",
      "title": "Defined analytics taxonomy for lifecycle",
      "content": "Defined analytics taxonomy and dashboards adopted by PMM/CS for lifecycle targeting.",
      "problem": "",
      "action": "",
      "outcome": "",
      "tags": ["analytics", "alignment", "lifecycle"],
      "linkedToRole": true,
      "company": "FlowHub",
      "titleRole": "Senior Product Manager",
      "metrics": []
    }
  ]
}

CRITICAL REMINDERS:

1. Do NOT paraphrase content fields. Stories, summaries, and roleSummaries must use exact resume text.
2. A metric appears in EITHER outcomeMetrics OR story.metrics, never both.
3. Metrics must NEVER be shared or copied between roles. Each role’s metrics must come ONLY from that role’s own text.
4. summary comes from the global top-of-resume profile only; roleSummary comes from each specific role section.
5. It is an error if two different roles share the same non-empty roleSummary text unless the resume explicitly repeats that text.
6. companyDescription may be lightly generated at a high level but must not invent specific facts not clearly implied by the resume.
7. Return ONLY the JSON object. BEFORE RETURNING: Verify that "summary" ≠ any "roleSummary" AND all non-empty "roleSummary" values are unique. No markdown, no explanations, no additional text.
`;
}