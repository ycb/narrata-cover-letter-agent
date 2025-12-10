import { SHARED_STORY_GUIDANCE } from './sharedStoryGuidance';

/**
 * Simplified LLM prompt for cover letter analysis
 * ONLY extracts: Stories + Voice
 * NO paragraph parsing, NO template extraction (done by rule-based parser)
 */

export interface WorkHistoryContext {
  id: string;
  company: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
}

export function buildCoverLetterStoryExtractionPrompt(
  coverLetterText: string,
  workHistory: WorkHistoryContext[]
): string {
  const workHistoryList = workHistory.length > 0
    ? workHistory.map(w => 
        `- ${w.company} | ${w.title} | ${w.startDate || '?'} - ${w.endDate || 'Present'} | ID: ${w.id}`
      ).join('\n')
    : 'No work history available - stories will not be linked';

  return `You are extracting STORIES and VOICE from a cover letter.

COVER LETTER:
${coverLetterText}

EXISTING WORK HISTORY (for linking stories):
${workHistoryList}

${SHARED_STORY_GUIDANCE}

TASK:
1. Identify any STORIES (concrete examples/accomplishments) in the cover letter
2. For each story:
   - Extract STAR format (Situation, Task, Action, Result)
   - Extract any metrics mentioned (%, $, numbers)
   - Extract skills demonstrated
   - Link to work history by matching company + role name
3. Infer the writer's VOICE (tone, style, persona)

CRITICAL RULES:
- Stories MUST mention a specific company and role to be extractable
- If a paragraph describes an accomplishment but lacks company/role context → skip it
- Only extract stories where you can confidently match to work history
- Use null for company/role if not identifiable (story won't be linked)
- Extract metrics exactly as written (don't invent or estimate)

OUTPUT JSON SCHEMA:
{
  "stories": [
    {
      "workItemId": "uuid-from-work-history|null",
      "company": "Company Name|null",
      "titleRole": "Job Title|null",
      "title": "Short, human-readable story title",
      "summary": "1-2 sentence summary of story outcome and impact",
      "star": {
        "situation": "Context or problem",
        "task": "Goal or responsibility",
        "action": "Key actions or decisions",
        "result": "Measurable outcome or qualitative impact"
      },
      "metrics": [
        {
          "name": "e.g., Revenue, MAUs, Conversion",
          "value": "number|null",
          "unit": "%|$|users|...|null",
          "direction": "up|down|null",
          "period": "e.g., Q1 2024, YoY, 30d|null",
          "confidence": 0.0-1.0,
          "parentType": "story"
        }
      ],
      "skills": ["product-management", "user-research", "api-design"],
      "confidence": 0.0-1.0
    }
  ],
  "voice": {
    "tone": ["executive", "concise", "metric-forward", "mission-forward", "story-first", "friendly", "formal", "direct"],
    "style": "Brief description of writing style and communication preferences",
    "persona": ["leader", "IC", "founder", "player-coach"]
  },
  "metadata": {
    "totalParagraphs": 4,
    "storiesExtracted": 2,
    "averageConfidence": 0.85,
    "warnings": ["List any issues or ambiguities encountered"]
  }
}

SKILLS GUIDANCE:
- Be specific about domains: "web-platforms", "mobile-apps", "b2b2c", "fintech", "healthtech" (not generic "tech")
- Include technical skills: "api-design", "data-pipelines", "machine-learning"
- Include competencies: "user-research", "experimentation", "stakeholder-management"
- Include methodologies: "agile", "plg", "data-driven"

MATCHING GUIDANCE:
- Match company names flexibly (e.g., "Acme Corp" matches "Acme Corporation")
- If multiple work items match company, use date range or title to disambiguate
- Set workItemId to null if no confident match found
- Include warning in metadata if matching is ambiguous

Return ONLY valid JSON matching this schema. No markdown, no prose.
`;
}
