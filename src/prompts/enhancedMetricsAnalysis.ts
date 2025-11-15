/**
 * Enhanced Metrics Analysis Prompt
 * 
 * Agent C: Consolidated match intelligence prompt for cover letter evaluation
 * Returns detailed breakdowns, differentiator analysis, and CTA hooks in a single LLM call
 */

export const ENHANCED_METRICS_SYSTEM_PROMPT = `You are an expert cover letter reviewer and career coach. Your task is to provide a COMPREHENSIVE match analysis that evaluates:

1. GOALS MATCH: How well the job aligns with user's career goals
2. EXPERIENCE MATCH: What user has demonstrated in their work history (not draft)
3. DRAFT QUALITY: How well the cover letter addresses requirements
4. ATS OPTIMIZATION: Keyword coverage and formatting
5. DIFFERENTIATOR POSITIONING: How user can stand out for this specific role
6. ACTIONABLE CTAs: Specific improvement suggestions

Respond ONLY with valid JSON following this EXACT schema:

{
  "metrics": {
    "goals": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation for tooltip (2-3 sentences)",
      "differentiatorHighlights": ["highlight1", "highlight2"]
    },
    "experience": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation",
      "differentiatorHighlights": ["highlight1"]
    },
    "rating": {
      "score": 85,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation"
    },
    "ats": {
      "score": 78,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation",
      "differentiatorHighlights": ["highlight1"]
    },
    "coreRequirements": {
      "met": 4,
      "total": 5,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation",
      "differentiatorHighlights": ["highlight1"]
    },
    "preferredRequirements": {
      "met": 2,
      "total": 3,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation",
      "differentiatorHighlights": ["highlight1"]
    }
  },
  "enhancedMatchData": {
    "goalMatches": [
      {
        "id": "goal-title",
        "goalType": "Target Title",
        "userValue": "Senior PM, Lead PM",
        "jobValue": "Product Manager",
        "met": true,
        "evidence": "Job title matches target",
        "requiresManualVerification": false
      },
      {
        "id": "goal-salary",
        "goalType": "Minimum Salary",
        "userValue": "$180,000",
        "jobValue": null,
        "met": false,
        "evidence": "Salary not specified in JD",
        "requiresManualVerification": false
      },
      {
        "id": "goal-worktype",
        "goalType": "Work Type",
        "userValue": null,
        "jobValue": null,
        "met": false,
        "evidence": "Work type not specified in career goals",
        "emptyState": "goal-not-set",
        "requiresManualVerification": false
      }
    ],
    "coreRequirementDetails": [
      {
        "id": "core-0",
        "requirement": "5+ years PM experience",
        "demonstrated": true,
        "evidence": "Mentioned in experience section",
        "sectionIds": ["experience"]
      }
    ],
    "preferredRequirementDetails": [
      {
        "id": "pref-0",
        "requirement": "SQL proficiency",
        "demonstrated": false,
        "evidence": "Not mentioned in draft",
        "sectionIds": []
      }
    ],
    "coreExperienceDetails": [
      {
        "requirement": "5+ years PM experience",
        "confidence": "high",
        "matchedWorkItemIds": ["work-1"],
        "matchedStoryIds": ["story-1"],
        "evidence": "User has 8 years PM experience",
        "missingDetails": null
      }
    ],
    "preferredExperienceDetails": [
      {
        "requirement": "SQL proficiency",
        "confidence": "low",
        "matchedWorkItemIds": [],
        "matchedStoryIds": [],
        "evidence": "No SQL mentioned in work history",
        "missingDetails": "Consider highlighting any data analysis work"
      }
    ],
    "differentiatorAnalysis": {
      "summary": "This role seeks AI/ML product experience with growth focus",
      "userPositioning": "Emphasize AI/ML background and metrics-driven approach",
      "strengthAreas": ["AI/ML experience", "Growth metrics", "B2B SaaS"],
      "gapAreas": ["Limited fintech exposure"]
    },
    "ctaHooks": [
      {
        "type": "add-story",
        "label": "Add story about AI/ML product work",
        "requirement": "AI/ML product experience",
        "severity": "high",
        "actionPayload": {"suggestedTags": ["AI", "ML", "product"]}
      },
      {
        "type": "edit-goals",
        "label": "Update career goals to include fintech interest",
        "requirement": "Industry alignment",
        "severity": "medium"
      }
    ]
  }
}

CRITICAL RULES:
1. Be thorough but concise - focus on actionable insights
2. Use "high"/"medium"/"low" for confidence and severity
3. Use "strong"/"average"/"weak" for strength ratings
4. Scores should be 0-100
5. For goalMatches: MUST include ALL 7 goal categories in this exact order:
   - "Target Title" (goal-title) - jobValue from JD role
   - "Minimum Salary" (goal-salary) - jobValue from JD salary field if present
   - "Work Type" (goal-worktype) - jobValue from JD workType field (Remote/Hybrid/In-person)
   - "Preferred Location" (goal-cities) - jobValue from JD location field
   - "Company Maturity" (goal-maturity) - jobValue from JD companyMaturity field
   - "Industry" (goal-industry) - jobValue from JD companyIndustry field
   - "Business Model" (goal-business-model) - jobValue from JD companyBusinessModel field
   
   IMPORTANT: Use the JD structured data (salary, workType, location, companyMaturity, companyIndustry, companyBusinessModel) 
   to populate jobValue fields. These were extracted during JD parsing.
   For goals not set by user: set userValue=null, met=false, emptyState="goal-not-set"
6. For requirement details: "demonstrated" means it's IN THE DRAFT, not just in work history
7. For experience details: Check work history and stories, reference IDs
8. For differentiatorAnalysis: Focus on what makes THIS role unique
9. For CTAs: Provide 3-5 actionable suggestions with clear labels
10. Return ONLY the JSON object, no markdown, no explanations
`;

export const buildEnhancedMetricsUserPrompt = (payload: {
  draft: string;
  sections: Array<{
    slug: string;
    title: string;
    content: string;
    requirementsMatched: string[];
  }>;
  jobDescription: {
    company: string;
    role: string;
    summary: string;
    standardRequirements: any[];
    preferredRequirements: any[];
    differentiatorRequirements: any[];
    differentiatorSignals: string[];
  };
  userGoals: any;
  workHistory?: Array<{
    id: string;
    company: string;
    title: string;
    description: string;
    achievements: string[];
  }>;
  approvedContent?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}): string => {
  const workHistorySection = payload.workHistory && payload.workHistory.length > 0
    ? `\n\n=== USER'S WORK HISTORY ===
${payload.workHistory.map(w => `[${w.id}] ${w.title} at ${w.company}
Description: ${w.description || 'N/A'}
Achievements: ${w.achievements.join('; ') || 'N/A'}`).join('\n\n')}`
    : '';

  const storiesSection = payload.approvedContent && payload.approvedContent.length > 0
    ? `\n\n=== USER'S APPROVED STORIES ===
${payload.approvedContent.map(s => `[${s.id}] "${s.title}"
Content: ${s.content}`).join('\n\n')}`
    : '';

  return `=== JOB INFORMATION ===
Company: ${payload.jobDescription.company}
Role: ${payload.jobDescription.role}
Summary: ${payload.jobDescription.summary}

CORE REQUIREMENTS (must-have):
${payload.jobDescription.standardRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

PREFERRED REQUIREMENTS (nice-to-have):
${payload.jobDescription.preferredRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

DIFFERENTIATOR REQUIREMENTS (what makes this role unique):
${payload.jobDescription.differentiatorRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

Differentiator Signals: ${payload.jobDescription.differentiatorSignals.join(', ')}

=== USER'S CAREER GOALS ===
${payload.userGoals ? JSON.stringify(payload.userGoals, null, 2) : 'No career goals specified'}
${workHistorySection}
${storiesSection}

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[${s.slug}] ${s.title}
${s.content}
Requirements Matched: ${s.requirementsMatched.join(', ') || 'None'}`).join('\n\n')}

Analyze this cover letter draft comprehensively and return the structured JSON response.`;
};

