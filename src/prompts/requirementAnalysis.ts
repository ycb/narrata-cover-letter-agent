/**
 * Requirement Analysis Prompt - Phase 2: Progressive LLM Streaming
 *
 * MEDIUM CALL (15-20s) - Detailed requirement matching and goal alignment
 * Parallel Call 2 of 3
 *
 * Returns: Goal matches, requirement details, experience analysis, differentiator positioning
 * Skips: Section gaps, rating criteria, CTA hooks
 */

export const REQUIREMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert career coach specializing in job-candidate alignment. Provide DETAILED requirement-by-requirement analysis.

Respond ONLY with valid JSON following this EXACT schema:

{
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
      }
    ],
    "coreRequirementDetails": [
      {
        "id": "core-0",
        "requirement": "5+ years PM experience",
        "demonstrated": true,
        "evidence": "Mentioned in experience section",
        "sectionIds": ["experience"],
        "severity": "critical"
      }
    ],
    "preferredRequirementDetails": [
      {
        "id": "pref-0",
        "requirement": "SQL proficiency",
        "demonstrated": false,
        "evidence": "Not mentioned in draft",
        "sectionIds": [],
        "severity": "nice-to-have"
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
    }
  }
}

CRITICAL RULES:
1. For goalMatches: MUST include ALL 7 goal categories in this exact order:
   - "Target Title" (goal-title) - jobValue from JD role
   - "Minimum Salary" (goal-salary) - jobValue from JD salary field if present
   - "Work Type" (goal-worktype) - jobValue from JD workType field (Remote/Hybrid/In-person)
   - "Preferred Location" (goal-cities) - jobValue from JD location field
   - "Company Maturity" (goal-maturity) - jobValue from JD companyMaturity field
   - "Industry" (goal-industry) - jobValue from JD companyIndustry field
   - "Business Model" (goal-business-model) - jobValue from JD companyBusinessModel field

   For goals not set by user: set userValue=null, met=false, emptyState="goal-not-set"

2. For requirement details: "demonstrated" means it's IN THE DRAFT, not just in work history

3. For sectionIds: CRITICAL - Populate this field for ALL demonstrated requirements
   - Use the section slugs from the draft (e.g., "introduction", "experience", "closing")
   - If a requirement is addressed in multiple sections, include ALL relevant slugs
   - If a requirement is NOT demonstrated, leave sectionIds as empty array []

4. For experience details: Check work history and stories, reference IDs

5. For differentiatorAnalysis: Focus on what makes THIS role unique vs similar roles

6. Use "high"/"medium"/"low" for confidence
7. Use "critical"/"important"/"nice-to-have" for severity
8. Return ONLY the JSON object, no markdown, no explanations
`;

export const buildRequirementAnalysisUserPrompt = (payload: {
  draft: string;
  sections: Array<{
    id: string;
    slug: string;
    title: string;
    content: string;
    requirementsMatched: string[];
  }>;
  jobDescription: {
    company: string;
    role: string;
    summary: string;
    standardRequirements: Array<{ id: string; label: string; detail?: string; priority?: string }>;
    preferredRequirements: Array<{ id: string; label: string; detail?: string; priority?: string }>;
    differentiatorRequirements: Array<{ id: string; label: string; detail?: string }>;
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
${payload.jobDescription.standardRequirements.map((req, i) => `[core-${i}] ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

PREFERRED REQUIREMENTS (nice-to-have):
${payload.jobDescription.preferredRequirements.map((req, i) => `[pref-${i}] ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

DIFFERENTIATOR REQUIREMENTS (what makes this role unique):
${payload.jobDescription.differentiatorRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

Differentiator Signals: ${payload.jobDescription.differentiatorSignals.join(', ')}

=== USER'S CAREER GOALS ===
${payload.userGoals ? JSON.stringify(payload.userGoals, null, 2) : 'No career goals specified'}
${workHistorySection}
${storiesSection}

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[id: ${s.id}] [slug: ${s.slug}] ${s.title}
${s.content}`).join('\n\n')}

Analyze requirement-by-requirement alignment. For each core and preferred requirement, check:
1. Is it demonstrated IN THE DRAFT? (not just work history)
2. Which section(s) address it?
3. What's the evidence from work history?
4. What's missing or could be strengthened?

Also analyze goal alignment across all 7 goal categories and differentiator positioning.`;
};
