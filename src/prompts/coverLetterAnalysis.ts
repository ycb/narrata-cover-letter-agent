// Cover letter → Modular Template + Stories (no tokens, no JD)
// Focus: paragraph structure, purpose labeling, reusable stories, tone/style inference

// Alias for backwards compatibility
export const buildCoverLetterAnalysisPrompt = (coverLetterText: string): string => {
  return buildCoverLetterTemplatizationPrompt(coverLetterText);
};

export const buildCoverLetterTemplatizationPrompt = (coverLetterText: string): string => {
  return `
You are parsing a COVER LETTER to produce (1) a MODULAR TEMPLATE (paragraph-level structure) and (2) REUSABLE STORIES.
Return ONLY valid JSON. No prose, no markdown.

COVER LETTER:
${coverLetterText}

OBJECTIVES:
1) Split the cover letter into individual PARAGRAPHS.
2) For each paragraph, identify its FUNCTION (intro | story | closer | other).
3) Describe its PURPOSE (e.g., mission-alignment, demonstrating relevant experience, addressing requirements, showing leadership, explaining motivation, etc.).
4) Summarize what the paragraph accomplishes and why it matters.
5) Extract any STORIES (distinct examples or accomplishments) in STAR form for reuse elsewhere.
6) Infer the writer’s tone, voice, and style.

OUTPUT JSON SCHEMA:
{
  "paragraphs": [
    {
      "index": 0,
      "rawText": "Original paragraph text",
      "function": "intro|story|closer|other",
      "purposeSummary": "Brief explanation of what this paragraph is doing (e.g., introducing background, showing domain fit, demonstrating leadership, etc.)",
      "purposeTags": ["mission-alignment","requirements","credibility","leadership","growth","ai-ml","plg","customer-obsession","culture","other"],
      "linkedStoryId": "story_<hash>|null",
      "notes": "Helpful comments for the user (e.g., strong opener, transition paragraph, high clarity, metric-forward, etc.)",
      "confidence": 0.0-1.0
    }
  ],
  "stories": [
    {
      "id": "story_<hash>",
      "title": "Short, human-readable title",
      "company": "string|null",
      "titleRole": "string|null",
      "dateRange": { "start": "YYYY-MM-DD|null", "end": "YYYY-MM-DD|null", "current": true|false|null },
      "summary": "1–2 sentence abstract of the story outcome and impact",
      "star": {
        "situation": "Context or problem",
        "task": "Goal or responsibility",
        "action": "Key actions or decisions",
        "result": "Measurable outcome or qualitative impact"
      },
      "metrics": [
        {
          "name": "e.g., MAUs, Revenue, Conversion",
          "value": "number|null",
          "unit": "%|$|users|...|null",
          "direction": "up|down|null",
          "period": "e.g., 30d|Q1 2024|YoY|null",
          "confidence": 0.0-1.0
        }
      ],
      "tags": {
        "skills": ["normalized_skill_slug"],
        "domains": ["cleantech","fintech","devtools","ai-ml","healthtech"],
        "functions": ["growth","platform","support","sales-enablement"],
        "competencies": ["experimentation","explainability","plg","design-systems"],
        "pmLevelSignals": ["0-1","growth","scale","team-lead","org-design"]
      },
      "evidence": {
        "quotes": ["Brief verbatim fragments from the letter"],
        "spans": [{"start": number, "end": number, "label": "S|T|A|R|METRIC"}],
        "source": "cover_letter",
        "confidence": 0.0-1.0
      }
    }
  ],
  "templateSignals": {
    "tone": ["executive","concise","metric-forward","mission-forward","story-first","friendly","formal","direct"],
    "persona": ["leader","IC","founder","player-coach"],
    "structure": {
      "paraCount": number,
      "usesBullets": true|false,
      "storyDensity": "high|medium|low",
      "metricDensity": "high|medium|low"
    },
    "styleHints": {
      "sentenceLength": "short|mixed|long",
      "voice": "active|passive|mixed",
      "readingLevel": "grade or CEFR level",
      "lengthChars": number
    }
  },
  "skillsMentioned": ["deduped lowercase slugs"],
  "entityRefs": {
    "workHistoryRefs": [
      { "company": "string|null", "title": "string|null", "dateRange": { "start": "YYYY-MM-DD|null", "end": "YYYY-MM-DD|null", "current": true|false|null } }
    ],
    "educationRefs": []
  },
  "metadata": { 
    "warnings": ["strings"], 
    "parsingConfidence": 0.0-1.0, 
    "source": "cover_letter" 
  }
}

RULES:
- Each paragraph must have a clear function and purpose summary.
- Identify which paragraphs narrate concrete examples (function="story") and link them to extracted stories.
- Focus on purpose labeling and readability, not tokenization.
- Do NOT invent metrics or companies; use null where unclear and include a warning.
- Normalize tags to lowercase canonical forms (e.g., "plg", "xai", "nlp", "derms", "vpp").
- Keep everything concise, accurate, and JSON-valid.
- Return ONLY valid JSON matching this schema.
`;
};