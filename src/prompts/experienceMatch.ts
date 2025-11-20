/**
 * Experience Match Prompt
 *
 * LLM prompt to map job requirements to user's work history
 * Returns structured JSON matching requirements to specific work items
 */

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

export const buildExperienceMatchPrompt = (
  requirements: string[],
  workItems: WorkItem[],
  approvedContent: ApprovedContent[]
): string => {
  // Format work history for prompt
  const formattedWorkItems = workItems.map((item, idx) => {
    const dateRange = `${item.startDate} to ${item.endDate || 'Present'}`;
    const achievements = item.achievements.length > 0
      ? `\n  Achievements:\n  - ${item.achievements.join('\n  - ')}`
      : '';

    return `Work Item ${idx + 1} (ID: ${item.id}):
  Company: ${item.company}
  Role: ${item.title}
  Dates: ${dateRange}
  Description: ${item.description || 'N/A'}${achievements}`;
  }).join('\n\n');

  const formattedStories = approvedContent.map((story, idx) => {
    const context = story.company && story.role
      ? `(${story.role} @ ${story.company})`
      : '';

    return `Story ${idx + 1} (ID: ${story.id}):
  Title: ${story.title} ${context}
  Content: ${story.content}`;
  }).join('\n\n');

  return `You are an expert at matching job requirements to work history.

Your task: Map each job requirement to the candidate's work history items and stories that demonstrate that requirement.

Job Requirements:
${requirements.map((req, idx) => `${idx + 1}. "${req}"`).join('\n')}

Candidate's Work History:
${formattedWorkItems || 'No work history available'}

Candidate's Approved Stories/Content:
${formattedStories || 'No stories available'}

Instructions:
1. For EACH requirement, identify which work items or stories demonstrate it
2. Extract specific evidence (quotes, achievements, or paraphrased examples)
3. Assign confidence level: "high" (clear match), "medium" (partial match), "low" (weak/no match)
4. If no match found, explain what's missing

Return ONLY valid JSON with this exact structure:

{
  "matches": [
    {
      "requirement": "The exact requirement text",
      "confidence": "high" | "medium" | "low",
      "matchedWorkItemIds": ["work_item_id_1", "work_item_id_2"],
      "matchedStoryIds": ["story_id_1"],
      "evidence": "Specific evidence from work history, e.g., 'Led B2B platform at Acme Corp with 50k users (Work Item 1)' or 'No clear experience with this requirement'",
      "missingDetails": "What's missing if confidence is not high, or empty string if high confidence"
    }
  ]
}

Rules:
- EVERY requirement must have a match entry (even if confidence is "low")
- Include ALL requirement IDs in the same order as listed above
- Evidence should be specific and cite which work item or story it comes from
- Use work item/story IDs exactly as provided
- Be honest about gaps - don't inflate matches

Return ONLY the JSON object, no markdown formatting.`;
};
