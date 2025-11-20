/**
 * Match Intelligence Prompt
 * 
 * Consolidated analysis that returns ALL match metrics in a single LLM call:
 * - Goals match (alignment with career goals)
 * - Requirements match (what's in the draft)
 * - Experience match (what's in work history)
 * - Differentiator summary (what makes this role unique)
 * - Gap flags (mismatches and missing coverage)
 */

import type { UserGoals } from '@/types/userGoals';

interface WorkItem {
  id: string;
  company: string;
  title: string;
  description: string | null;
  achievements: string[];
  startDate: string;
  endDate: string | null;
}

interface ApprovedContent {
  id: string;
  title: string;
  content: string;
  company?: string;
  role?: string;
}

interface CoverLetterSection {
  id: string;
  type: string;
  content: string;
}

export const buildMatchIntelligencePrompt = (
  jobDescription: string,
  coreRequirements: string[],
  preferredRequirements: string[],
  differentiatorSummary: string,
  jobRole: string,
  jobCompany: string,
  userGoals: UserGoals | null | undefined,
  workItems: WorkItem[],
  approvedContent: ApprovedContent[],
  sections: CoverLetterSection[],
  goNoGoAnalysis?: any
): string => {
  // Combine all draft content for analysis
  const fullDraftText = sections.map(s => s.content).join('\n\n');

  // Format work items as readable text
  const formattedWorkItems = workItems.map(w => 
    `[${w.id}] ${w.title} at ${w.company} (${w.startDate} - ${w.endDate || 'Present'})
Description: ${w.description || 'N/A'}
Achievements: ${w.achievements.join('; ') || 'N/A'}`
  ).join('\n\n');

  // Format approved content (stories) as readable text
  const formattedStories = approvedContent.map(s =>
    `[${s.id}] "${s.title}"${s.company ? ` at ${s.company}` : ''}
Content: ${s.content}`
  ).join('\n\n');

  // Format user goals for analysis
  const formattedGoals = userGoals ? `
Target Titles: ${userGoals.targetTitles?.join(', ') || 'Not specified'}
Minimum Salary: ${userGoals.minimumSalary ? `$${userGoals.minimumSalary.toLocaleString()}` : 'Not specified'}
Work Type: ${userGoals.workType?.join(', ') || 'Not specified'}
Preferred Cities: ${userGoals.preferredCities?.join(', ') || 'Not specified'}
Company Maturity: ${userGoals.companyMaturity?.join(', ') || 'Not specified'}
Industries: ${userGoals.industries?.join(', ') || 'Not specified'}
Business Models: ${userGoals.businessModels?.join(', ') || 'Not specified'}
Deal-breakers: ${JSON.stringify(userGoals.dealBreakers || {})}
` : 'No career goals specified';

  return `You are an expert career coach and job application analyst. Your task is to provide a COMPREHENSIVE match analysis that covers ALL aspects of job fit in a single analysis.

=== JOB INFORMATION ===
Company: ${jobCompany}
Role: ${jobRole}
Differentiator: ${differentiatorSummary}

CORE REQUIREMENTS (must-have):
${coreRequirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

PREFERRED REQUIREMENTS (nice-to-have):
${preferredRequirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

=== USER'S CAREER GOALS ===
${formattedGoals}

${goNoGoAnalysis ? `=== GO/NO-GO ANALYSIS ===
Decision: ${goNoGoAnalysis.decision}
Confidence: ${goNoGoAnalysis.confidence}
Mismatches: ${JSON.stringify(goNoGoAnalysis.mismatches, null, 2)}
` : ''}

=== USER'S WORK HISTORY ===
${formattedWorkItems || 'No work history available'}

=== USER'S APPROVED CONTENT (STORIES) ===
${formattedStories || 'No approved content available'}

=== COVER LETTER DRAFT ===
${fullDraftText}

=== YOUR TASK ===
Analyze ALL of the following aspects and return a SINGLE comprehensive JSON response:

1. GOALS MATCH: How well does this job align with the user's career goals?
2. REQUIREMENTS MATCH (DRAFT): Which requirements are addressed in the cover letter draft?
3. EXPERIENCE MATCH (WORK HISTORY): Which requirements does the user have experience with (regardless of draft)?
4. DIFFERENTIATOR MESSAGING: How can user position themselves for this role's unique aspects?
5. GAP FLAGS: What's missing or mismatched?

Return ONLY valid JSON with this EXACT structure:

{
  "goalsMatch": {
    "matches": [
      {
        "id": "goal-title",
        "goalType": "Target Title",
        "userValue": "Senior PM, Lead PM",
        "jobValue": "Product Manager",
        "met": true,
        "evidence": "Job title 'Product Manager' matches target 'Senior PM'",
        "requiresManualVerification": false,
        "emptyState": null
      }
    ],
    "overallMatch": "strong",
    "metCount": 5,
    "totalCount": 7
  },
  "requirementsMatch": {
    "coreRequirements": [
      {
        "id": "core-0",
        "requirement": "5+ years product management experience",
        "demonstrated": true,
        "evidence": "Mentioned in experience section: '8 years of product management'",
        "sectionIds": ["experience"]
      }
    ],
    "preferredRequirements": [
      {
        "id": "preferred-0",
        "requirement": "SQL proficiency",
        "demonstrated": false,
        "evidence": "Not mentioned in cover letter",
        "sectionIds": []
      }
    ],
    "coreMetCount": 4,
    "coreTotalCount": 5,
    "preferredMetCount": 2,
    "preferredTotalCount": 4
  },
  "coreExperienceMatch": {
    "matches": [
      {
        "requirement": "5+ years product management experience",
        "confidence": "high",
        "matchedWorkItemIds": ["work-1"],
        "matchedStoryIds": ["story-1", "story-2"],
        "evidence": "User has 8 years of PM experience across 3 companies",
        "missingDetails": null
      }
    ],
    "overallMatch": "strong",
    "highConfidenceCount": 4,
    "totalCount": 5
  },
  "preferredExperienceMatch": {
    "matches": [
      {
        "requirement": "SQL proficiency",
        "confidence": "low",
        "matchedWorkItemIds": [],
        "matchedStoryIds": [],
        "evidence": "No SQL experience mentioned in work history",
        "missingDetails": "Consider adding SQL coursework or projects if applicable"
      }
    ],
    "overallMatch": "average",
    "highConfidenceCount": 2,
    "totalCount": 4
  },
  "differentiatorAnalysis": {
    "summary": "${differentiatorSummary}",
    "userPositioning": "Emphasize AI/ML product experience from TechCorp role and growth metrics expertise",
    "strengthAreas": ["AI/ML background", "Growth focus", "B2B SaaS experience"],
    "gapAreas": ["Limited fintech exposure"],
    "ctaHooks": [
      {
        "type": "add-story",
        "label": "Add story covering AI/ML product work",
        "requirement": "AI/ML product experience",
        "severity": "high"
      },
      {
        "type": "edit-goals",
        "label": "Update career goals to align with fintech",
        "requirement": "Industry alignment",
        "severity": "medium"
      }
    ]
  },
  "gapFlags": {
    "missingGoalAlignment": [
      {
        "goalType": "Minimum Salary",
        "issue": "Job does not list salary; requires manual verification",
        "severity": "medium"
      }
    ],
    "missingRequirementsInDraft": [
      {
        "requirement": "SQL proficiency",
        "type": "preferred",
        "suggestion": "Add a sentence about SQL usage in analytics or reporting"
      }
    ],
    "missingExperience": [
      {
        "requirement": "Fintech experience",
        "type": "preferred",
        "confidence": "low",
        "suggestion": "Highlight any financial product work or add relevant coursework"
      }
    ]
  }
}

RULES:
1. Be thorough but concise in evidence strings
2. For goalsMatch: Include all goal types (title, salary, work type, location, maturity, industry, business model)
3. For requirementsMatch: ONLY check what's in the DRAFT (not work history)
4. For experienceMatch: Check work history AND approved content, reference IDs in matchedWorkItemIds/matchedStoryIds
5. For differentiatorAnalysis: Focus on ACTIONABLE positioning based on the differentiator
6. For gapFlags: Identify TOP 3-5 gaps per category, prioritize by severity
7. Use "high"/"medium"/"low" for confidence and severity
8. Use "strong"/"average"/"weak" for overallMatch
9. For CTA hooks: Provide specific, actionable suggestions with clear labels
10. Return ONLY the JSON object, no markdown, no explanations

IMPORTANT:
- If userGoals is null/empty, set goalsMatch.totalCount = 0 and include a helpful message in evidence
- If work history is empty, set experience match confidence to "low" with appropriate evidence
- Be realistic: Not every requirement will have a match
- Focus on QUALITY of matches over quantity
`;
};

