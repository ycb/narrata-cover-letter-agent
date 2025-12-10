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
3. Analyze the writer's VOICE with DEPTH and ACTIONABLE GUIDANCE:
   - Analyze sentence structure, word choice, pacing, rhetorical patterns
   - Identify what makes this voice distinctive and credible
   - Provide specific, actionable writing guidance for future content
   - Focus on HOW they communicate, not just WHAT they say

CRITICAL RULES:
- Extract ALL stories that mention a company and describe work/impact
- Stories don't need perfect STAR format - extract what's available
- Stories don't need to match work history - set workItemId to null if no match
- If a story mentions a company not in work history, still extract it (set workItemId to null)
- For stories without clear metrics, describe qualitative impact in the result field
- Extract metrics exactly as written (don't invent or estimate)
- Better to extract too many stories than miss relevant ones

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
    "summary": "2-3 sentence characterization of the writer's distinctive voice and communication style",
    "tone": ["executive", "concise", "metric-forward", "mission-forward", "story-first", "friendly", "formal", "direct"],
    "stylePatterns": {
      "sentenceStructure": "e.g., 'Favors compound sentences with em-dashes; uses parallel construction for rhythm'",
      "wordChoice": "e.g., 'Prefers active verbs (led, drove, built) over passive; avoids jargon and buzzwords'",
      "rhetoric": "e.g., 'Opens with impact, builds credibility through specifics, closes with forward momentum'",
      "pacing": "e.g., 'Varies sentence length strategically: short for emphasis, longer for context'"
    },
    "credibilitySignals": [
      "List 3-5 specific techniques this writer uses to establish authority (e.g., 'Leads with quantified outcomes', 'Names recognizable companies/products', 'Demonstrates domain expertise through precise terminology')"
    ],
    "persona": ["leader", "IC", "founder", "player-coach"],
    "writingGuidance": "3-4 sentence actionable guide for replicating this voice in future content. Be specific: what should they do/avoid? What patterns should they maintain?"
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
- Set workItemId to null if no confident match found (story will still be extracted, just not linked)
- Extract stories even if company is not in work history (e.g., side projects, consulting)
- Include warning in metadata if matching is ambiguous

EXAMPLES OF EXTRACTABLE STORIES:
- "At Aurora Solar, I helped scale the platform..." → Extract even if metrics not explicit
- "Currently building Narrata..." → Extract even though not in work history
- "Earlier at HLI, I led UX..." → Extract even if dates/context unclear

VOICE ANALYSIS - BE SPECIFIC AND ACTIONABLE:

Analyze patterns like:
- Sentence length variation: Do they use short punchy sentences for impact? Long complex ones for nuance?
- Word choice: Concrete vs abstract? Technical vs accessible? Action-oriented vs passive?
- Rhetorical devices: Em-dashes for asides? Colons for emphasis? Parallel structure for rhythm?
- Opening strategy: Lead with outcome? Start with context? Hook with mission alignment?
- Credibility building: Metrics first? Name-dropping? Domain expertise signals?
- Audience awareness: How do they adapt for executive vs technical vs mission-driven readers?

BAD VOICE ANALYSIS (too generic):
"Professional tone, uses metrics, writes clearly"

GOOD VOICE ANALYSIS:
"Concise and metric-forward, with strategic use of em-dashes to layer context without losing momentum. Leads paragraphs with quantified outcomes (10× increase, 20M users), then unpacks the how. Avoids buzzwords; prefers concrete action verbs (scaled, introduced, drove). Credibility comes from specificity: names recognizable companies, cites exact metrics, demonstrates deep domain fluency. Voice is confident but unpretentious—respects reader intelligence by getting straight to substance. Optimal for executive/technical audiences who value clarity over flourish."

Your goal: Provide writing guidance specific enough that the user could hand it to another writer and they'd replicate the voice.

Return ONLY valid JSON matching this schema. No markdown, no prose.
`;
}
