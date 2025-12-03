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
      "roleSummary": "Extract verbatim from resume header/subheader. 1-2 sentences max."
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
      "content": "Full text exactly as written in resume",
      "problem": "Challenge or opportunity (optional)",
      "action": "What was done (optional)",
      "outcome": "What resulted (optional)",
      "tags": ["experimentation", "activation"],
      "linkedToRole": true,
      "company": "${roleContext.company}",
      "titleRole": "${roleContext.title}",
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

CRITICAL RULES:
1. Extract ONLY content for the TARGET ROLE (${roleContext.company} - ${roleContext.title})
2. Stories = any action with result/impact. Extract EVERY bullet as separate story.
3. Metrics in stories go in story.metrics[] ONLY (not in outcomeMetrics)
4. Standalone metrics (no story context) go in outcomeMetrics[]
5. NEVER duplicate metrics between outcomeMetrics and story.metrics
6. Extract verbatim - do NOT paraphrase or summarize
7. Story IDs: sequential within this role ("1", "2", "3", etc.)

Return ONLY valid JSON. No markdown, no explanations.`;
};

/**
 * Stage 3: Extract skills, education, contact info, certifications, projects
 * Expected output: ~300-800 tokens
 * Expected latency: 3-5 seconds
 */
export const buildSkillsAndEducationPrompt = (resumeText: string): string => {
  return `Extract skills, education, contact info, certifications, and projects from this resume.

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

