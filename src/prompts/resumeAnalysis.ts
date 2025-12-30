import { SHARED_STORY_GUIDANCE } from './sharedStoryGuidance.ts';

// Resume analysis prompt with robust story, metric, and tag extraction (RESUME ONLY)
export const buildResumeAnalysisPrompt = (resumeText: string): string => {
  return `
You are analyzing a resume to extract structured data for a job application platform.
Your goal is to create a rich, searchable profile with stories, metrics, and thematic tags.

PROCESSING MODEL (CRITICAL - READ FIRST):

You will process this resume in TWO PASSES:

PASS 1: Extract global resume header
- The TOP of the resume often has a 1-2 sentence career summary
- Extract this as the "summary" field ONLY
- This text is OFF-LIMITS for all role-level fields

PASS 2: Extract each role independently
- For EACH role, only look at that role's section (title, dates, bullets)
- Extract roleSummary from THIS ROLE'S header/first bullet ONLY
- FORBIDDEN: Using global summary text in roleSummary
- FORBIDDEN: Copying the same roleSummary to multiple roles
- If no role-specific header exists → roleSummary = ""

VALIDATION CHECKPOINT:
Before returning JSON, verify:
✓ "summary" ≠ any "roleSummary" 
✓ All non-empty "roleSummary" values are unique
✓ If check fails → you made an error, fix it

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
- If something isn't in the resume, leave the corresponding content value empty ("") or null as specified below.
  
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
      "roleSummary": "EXTRACTED verbatim from this role's header/subheader or first bullet (see rules below).",
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

1. METRIC ISOLATION (MOST CRITICAL RULE):

   Mental Model:
   - Imagine each role is on a SEPARATE PAGE
   - You cannot see other pages while processing this page
   - Metrics on one page cannot appear on another page

   Processing Rules:
   1. Process each role in STRICT ISOLATION
   2. Before extracting metrics for Role N:
      a) Identify the START and END of Role N's section in the resume text
      b) Extract metrics ONLY from text between START and END
      c) Do NOT look at other roles' sections
   3. A metric can appear in ONLY ONE role (the role where it appears in the resume)

   Common Error Pattern (FORBIDDEN):
   ❌ "This role has no metrics, but I'll copy metrics from another role to fill it out"
   ✅ "This role has no metrics in its section → outcomeMetrics: [], stories with metrics: []"

   VALIDATION PER ROLE:
   - Can I find this exact metric text in THIS role's section?
     - YES → Include it
     - NO → Do NOT include it (even if it appears in another role)

   Story-Level Metrics:
   - Extract ALL numeric values that appear inside a story/narrative bullet for THIS ROLE.
   - Examples: percentages ("+22%", "-3.5%"), counts ("30+"), money ("$2M", "$100K").

   Role-Level Metrics (outcomeMetrics):
   - Pure outcomes without described action → outcomeMetrics[] for THIS ROLE only

   CONTEXT FIELD (CRITICAL):
   - Must be a COMPLETE, SELF-EXPLANATORY phrase.
   - BAD: "revenue", "team", "activation".
   - GOOD: "year-over-year revenue growth", "team size increase during tenure", "Week-2 activation improvement".

   NO DUPLICATION RULE (MOST IMPORTANT):
   - A metric appears in EITHER outcomeMetrics OR story.metrics, never both.
   - NEVER duplicate a metric across roles. Each role's metrics must come exclusively from that role's text.

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

7. ROLE HEADER CONTEXT:

   - Resume entries often contain rich context in each role's header/subheader (not the global resume summary).
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
   - For each role, use ONLY the text from that role's section to create stories.
   - Each story:
     - content: full bullet or paragraph text verbatim from the resume.
     - title: a short 5–8 word label you create summarizing the achievement.
     - metrics: any numeric values tied to this story, following the metric rules above (and NEVER copied from other roles).
   - linkedToRole should be true for all stories derived from this role's section.
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

ANTI-CONTAMINATION CHECKLIST (Run before returning JSON):

For each role R in workHistory:
□ roleSummary for R is either:
  - Text found in R's own section, OR
  - Empty string ""
  - NOT text from global summary
  - NOT text copied from another role

□ All metrics in R.outcomeMetrics appear in R's section
□ All metrics in R.stories[].metrics appear in R's section
□ No metric appears in both R and any other role

If ANY checkbox fails → FIX THE ERROR before returning

CRITICAL REMINDERS:

1. Do NOT paraphrase content fields. Stories, summaries, and roleSummaries must use exact resume text.
2. summary comes from the global top-of-resume profile only; roleSummary comes from each specific role section.
3. It is an error if two different roles share the same non-empty roleSummary text unless the resume explicitly repeats that text.
4. companyDescription may be lightly generated at a high level but must not invent specific facts not clearly implied by the resume.
5. Return ONLY the JSON object. BEFORE RETURNING: Verify that "summary" ≠ any "roleSummary" AND all non-empty "roleSummary" values are unique. No markdown, no explanations, no additional text.
`;
}
