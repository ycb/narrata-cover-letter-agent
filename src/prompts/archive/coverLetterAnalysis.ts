// Archived prompt: Cover Letter Analysis (templatization + stories)
// Status: Deprecated (cover letter parsing is now programmatic and no longer uses LLMs).
// Kept for historical reference; do not import into production code.

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
    1. Split the cover letter into individual PARAGRAPHS.
    2. For each paragraph, identify its FUNCTION (intro | story | closer | other).
    3. Describe its PURPOSE (e.g., mission-alignment, demonstrating relevant experience, addressing requirements, showing leadership, etc.).
    4. Summarize what the paragraph accomplishes and why it matters.
    5. Extract any STORIES (distinct examples or accomplishments) in STAR form for reuse elsewhere. When the text clearly mentions a specific company and/or role for a story, include them. Otherwise, set company and titleRole to null.
    6. Distinguish between:
       • STORIES: Concrete examples (actions + outcomes). Prefer stories that can be linked to specific work history roles when the company/role are explicitly mentioned.
       • ROLE-LEVEL METRICS: Quantified impact/achievements for a role (update work_items, not stories).
       • PROFILE DATA: Goals, values, preferences, voice, skills without work history context.
    7. Infer the writer’s tone, voice, and style (profile-level data).
  
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
        "linkedToWorkHistory": false,
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
            "unit": "%|$|users|…|null",
            "direction": "up|down|null",
            "period": "e.g., 30d|Q1 2024|YoY|null",
            "confidence": 0.0-1.0,
            "parentType": "story"
          }
        ],
        "skills": ["product-management", "user-centered-design", "web-platforms", "mobile-apps", "experimentation"],
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
    "skillsMentioned": ["deduped lowercase skill slugs"],
    "profileData": {
      "goals": ["Career goal 1", "Relocation preference", "Industry focus", "etc."],
      "voice": {
        "tone": ["executive", "concise", "metric-forward", "mission-forward", "story-first", "friendly", "formal", "direct"],
        "style": "Brief description of writing style and communication preferences",
        "persona": ["leader", "IC", "founder", "player-coach"]
      },
      "preferences": ["B2B2C", "mobile apps", "leadership roles", "relocation to NYC", "etc."]
    },
    "roleLevelMetrics": [
      {
        "company": "Company Name",
        "titleRole": "Job Title",
        "metrics": [
          {
            "name": "e.g., Revenue, Conversion, Churn",
            "value": "number|null",
            "unit": "%|$|users|…|null",
            "direction": "up|down|null",
            "context": "Brief description of the metric context",
            "parentType": "role"
          }
        ],
        "summary": "Role-level summary of responsibility, team structure, overall impact, challenges overcome"
      }
    ],
    "entityRefs": { "educationRefs": [] },
    "metadata": {
      "warnings": ["strings"],
      "parsingConfidence": 0.0-1.0,
      "source": "cover_letter"
    }
  }
  
  RULES:
    • Each paragraph must have a clear function and purpose summary.
    • Identify which paragraphs narrate concrete examples (function="story") and link them to extracted stories where possible.
    • Focus on purpose labeling and readability, not tokenization.
    • Do NOT invent metrics or companies; use null where unclear and include a warning.
    • Metrics must be strictly extractive.
    • Normalize tags to lowercase canonical forms.
    • CRITICAL: All metrics in stories must include "parentType": "story" field.
  
  CRITICAL DISTINCTIONS:
    • STORIES: concrete achievements; include company/titleRole only when explicitly stated.
    • ROLE-LEVEL METRICS: quantified achievements tied to existing work history roles; only when both number and role context appear.
    • PROFILE DATA: goals, preferences, voice/style; skills without work-history context.
  `;
};
