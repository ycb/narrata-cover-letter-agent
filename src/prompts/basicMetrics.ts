/**
 * Basic Metrics Prompt - Phase 2: Progressive LLM Streaming
 *
 * FAST CALL (10-15s) - Returns only top-level metrics for immediate UI feedback
 * Parallel Call 1 of 3
 *
 * Returns: Basic scores and summaries (goals, experience, rating, ats, requirements)
 * Skips: Detailed breakdowns, section gaps, rating criteria, CTA hooks
 */

export const BASIC_METRICS_SYSTEM_PROMPT = `You are an expert cover letter reviewer. Provide a QUICK high-level assessment focusing on top-level scores and summaries only.

Respond ONLY with valid JSON following this EXACT schema:

{
  "metrics": {
    "goals": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation for tooltip (2-3 sentences)"
    },
    "experience": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "rating": {
      "score": 85,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "ats": {
      "score": 78,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "coreRequirements": {
      "met": 4,
      "total": 5,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "preferredRequirements": {
      "met": 2,
      "total": 3,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    }
  }
}

CRITICAL RULES:
1. Be concise - this is a FAST preliminary assessment
2. Use "strong"/"average"/"weak" for strength ratings
3. Scores should be 0-100
4. Summaries should be 1 sentence max
5. Tooltips should be 2-3 sentences max
6. Count core requirements: how many of the CORE REQUIREMENTS are addressed in the draft?
7. Count preferred requirements: how many of the PREFERRED REQUIREMENTS are addressed in the draft?
8. Focus on what's IN THE DRAFT, not just work history
9. Return ONLY the JSON object, no markdown, no explanations
`;

export const buildBasicMetricsUserPrompt = (payload: {
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
    standardRequirements: Array<{ id: string; label: string; detail?: string }>;
    preferredRequirements: Array<{ id: string; label: string; detail?: string }>;
    differentiatorRequirements: Array<{ id: string; label: string; detail?: string }>;
  };
  userGoals: any;
}): string => {
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

=== USER'S CAREER GOALS ===
${payload.userGoals ? JSON.stringify(payload.userGoals, null, 2) : 'No career goals specified'}

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[${s.slug}] ${s.title}
${s.content}`).join('\n\n')}

Provide a quick high-level assessment of this draft. Focus on top-level scores only.`;
};
