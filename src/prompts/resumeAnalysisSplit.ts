// Split resume analysis prompts for faster, staged processing
// Stage 1: Work history skeleton (~5-8s)
// Stage 2: Stories per role (parallelizable, ~3-5s each)
// Stage 3: Skills + education + contact (~3-5s)

/**
 * Stage 1: Extract work history skeleton (companies, titles, dates)
 * Expected output: ~500-1000 tokens
 * Expected latency: 5-8 seconds
 */
export const buildWorkHistorySkeletonPrompt = (resumeText: string): string => {
  return `Extract work history from this resume. Return ONLY the structural data, NOT stories or detailed descriptions.

CRITICAL: TWO-PASS PROCESSING

PASS 1: Identify global resume header
- The TOP of resume often has a 1-2 sentence career summary
- This is NOT a role description - do not use it for ANY role's roleSummary

PASS 2: Extract each role independently
- For EACH role, extract roleSummary from THAT ROLE'S section ONLY
- Use role-specific text (header under company/title, or first bullet)
- FORBIDDEN: Using global summary as roleSummary for any role
- FORBIDDEN: Copying the same roleSummary to multiple roles
- If no role-specific text exists → roleSummary = ""

VALIDATION BEFORE RETURNING:
✓ No two roles have the same non-empty roleSummary
✓ Global summary text does NOT appear in any roleSummary
✓ If check fails → fix it before returning

Resume:
${resumeText}

Return JSON with this exact structure:
{
  "workHistory": [
    {
      "id": "1",
      "company": "Company Name",
      "companyDescription": "1-2 sentences about what the company does. Infer from context if not explicit.",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "current": true,
      "location": "City, State or null",
      "companyTags": ["SaaS", "B2B"],
      "roleTags": ["growth", "activation"],
      "roleSummary": "Extract verbatim from THIS ROLE'S header/subheader or first bullet. NOT from global summary."
    }
  ]
}

Rules:
1. Extract EVERY role from the resume
2. Use sequential IDs: "1", "2", "3", etc.
3. For current roles: endDate = null, current = true
4. Date format: YYYY-MM-DD (use -01-01 for year-only)
5. companyDescription is REQUIRED - infer from context if not explicit
6. title is REQUIRED - extract actual job title
7. DO NOT extract stories, metrics, or detailed content - just structure

Return ONLY valid JSON. No markdown, no explanations.`;
};

/**
 * Stage 2: Extract stories and metrics for a specific role
 * Expected output: ~500-2000 tokens per role (depending on role complexity)
 * Expected latency: 3-5 seconds per role (can parallelize across roles)
 */
export const buildRoleStoriesPrompt = (
  resumeText: string,
  roleContext: { company: string; title: string; id: string }
): string => {
  return `Extract stories and metrics for ONE specific role from this resume.

METRIC ISOLATION (CRITICAL):

You are extracting for ${roleContext.company} - ${roleContext.title} ONLY.

Mental Model:
- Imagine each role is on a SEPARATE PAGE
- You can ONLY see THIS role's page right now
- Metrics from other roles' pages CANNOT appear here

Processing Steps:
1. Locate the section for ${roleContext.company} in the resume text
2. Identify the START and END of this role's section (usually ends before next company/role)
3. Extract metrics ONLY from text between START and END
4. Do NOT look at other roles' sections

Common Error (FORBIDDEN):
❌ "This role has no metrics, but I'll borrow from another role"
✅ "This role has no metrics → outcomeMetrics: [], story.metrics: []"

Resume:
${resumeText}

TARGET ROLE:
- Company: ${roleContext.company}
- Title: ${roleContext.title}
- ID: ${roleContext.id}

Return JSON with this exact structure:
{
  "roleId": "${roleContext.id}",
  "outcomeMetrics": [
    {
      "value": "extract from resume",
      "context": "complete self-explanatory phrase",
      "type": "increase|decrease|absolute",
      "parentType": "role"
    }
  ],
  "stories": [
    {
      "id": "1",
      "title": "Brief story title (5-8 words)",
      "content": "Full text exactly as written in resume for THIS ROLE",
      "problem": "Challenge or opportunity (optional)",
      "action": "What was done (optional)",
      "outcome": "What resulted (optional)",
      "tags": ["tag1", "tag2"],
      "linkedToRole": true,
      "company": "${roleContext.company}",
      "titleRole": "${roleContext.title}",
      "metrics": [
        {
          "value": "extract from resume",
          "context": "complete phrase",
          "type": "increase|decrease|absolute",
          "parentType": "story"
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Extract ONLY content from ${roleContext.company}'s section in the resume
2. Find the boundaries: where does this role's section start/end?
3. Extract EVERY bullet for this role as a separate story
4. Metrics: Can I find this exact number in THIS role's section?
   - YES → Include it
   - NO → Do NOT include it
5. Extract verbatim - do NOT paraphrase or summarize
6. Story IDs: sequential ("1", "2", "3", etc.)

VALIDATION:
- Every metric in outcomeMetrics appears in THIS role's section? YES/NO
- Every metric in stories[].metrics appears in THIS role's section? YES/NO
- If NO to either → remove that metric

Return ONLY valid JSON. No markdown, no explanations.`;
};

/**
 * Stage 3: Extract skills, education, contact info, certifications, projects
 * Expected output: ~300-800 tokens
 * Expected latency: 3-5 seconds
 */
export const buildSkillsAndEducationPrompt = (resumeText: string): string => {
  return `Extract skills, education, contact info, certifications, and projects from this resume.

SUMMARY EXTRACTION:
- The "summary" field is the global career overview from the TOP of the resume
- Extract it verbatim (1-2 sentences)
- This is different from role-specific descriptions

Resume:
${resumeText}

Return JSON with this exact structure:
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
  "certifications": [
    {
      "id": "1",
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "YYYY-MM-DD"
    }
  ],
  "projects": [
    {
      "id": "1",
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["Tech1", "Tech2"],
      "url": "https://project.url or null"
    }
  ]
}

Rules:
1. Contact Info: Only email, phone, and external URLs. NOT location.
2. Location: Geographic location separately (City, State, Country)
3. Skills: Group by category if possible
4. Education: Use sequential IDs, date format YYYY-MM-DD
5. Certifications/Projects: Include if present, empty array if not

Return ONLY valid JSON. No markdown, no explanations.`;
};

/**
 * Type definitions for split parsing results
 */
export interface WorkHistorySkeleton {
  workHistory: Array<{
    id: string;
    company: string;
    companyDescription: string;
    title: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    location: string | null;
    companyTags: string[];
    roleTags: string[];
    roleSummary: string;
  }>;
}

export interface RoleStoriesResult {
  roleId: string;
  outcomeMetrics: Array<{
    value: string;
    context: string;
    type: 'increase' | 'decrease' | 'absolute';
    parentType: 'role';
  }>;
  stories: Array<{
    id: string;
    title: string;
    content: string;
    problem?: string;
    action?: string;
    outcome?: string;
    tags: string[];
    linkedToRole: boolean;
    company: string;
    titleRole: string;
    metrics: Array<{
      value: string;
      context: string;
      type: 'increase' | 'decrease' | 'absolute';
      parentType: 'story';
    }>;
  }>;
}

export interface SkillsAndEducationResult {
  contactInfo: {
    email: string | null;
    phone: string | null;
    linkedin: string | null;
    website: string | null;
    github: string | null;
    substack: string | null;
  };
  location: string | null;
  summary: string;
  education: Array<{
    id: string;
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string;
    gpa: string | null;
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  certifications: Array<{
    id: string;
    name: string;
    issuer: string;
    date: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    description: string;
    technologies: string[];
    url: string | null;
  }>;
}

