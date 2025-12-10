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
    1. Split the cover letter into individual PARAGRAPHS.
    2. For each paragraph, identify its FUNCTION (intro | story | closer | other).
    3. Describe its PURPOSE (e.g., mission-alignment, demonstrating relevant experience, addressing requirements, showing leadership, explaining motivation, etc.).
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
        "company": "string|null",  // Company name from work history if story references a specific role; otherwise null
        "titleRole": "string|null",  // Job title/position from work history if story references a specific role; otherwise null
        "dateRange": { "start": "YYYY-MM-DD|null", "end": "YYYY-MM-DD|null", "current": true|false|null },  // Date range if story can be linked to a specific role period
        "linkedToWorkHistory": false,  // REQUIRED: Always false for cover letters (they don’t provide full work history)
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
            // METRIC EXTRACTION RULES (STORY-LEVEL):
            // - Only include a numeric value when that exact number appears in the cover letter text for this story.
            // - If no explicit number is present, set value: null and unit/direction/period: null.
            // - Never invent, estimate, or transform metrics.
            // - Never reuse or copy example metrics from this prompt.
          }
        ],
        "skills": ["product-management", "user-centered-design", "web-platforms", "mobile-apps", "experimentation"],
        // CRITICAL: Use a single "skills" array. Include:
        // - Technical skills (e.g., "web-platforms", "mobile-apps", "api-design")
        // - Domain knowledge (e.g., "b2b2c", "fintech", "healthtech") - be specific, not generic "tech"
        // - Competencies (e.g., "experimentation", "design-systems", "user-research")
        // - Methodologies (e.g., "agile", "plg", "data-driven")
        // Skills are matched to story or role level based on context
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
    // CRITICAL: Single array of skills. Be specific about domains:
    // - Use "web-platforms" not "tech"
    // - Use "mobile-apps" not "tech"
    // - Use "b2b2c" not generic terms
    // - Extract actual domains mentioned: "cleantech", "fintech", "devtools", "ai-ml", "healthtech"
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
        "company": "Company Name",  // REQUIRED: Must match existing work history
        "titleRole": "Job Title",  // REQUIRED: Must match existing work history role
        "metrics": [
          {
            "name": "e.g., Revenue, Conversion, Churn",
            "value": "number|null",
            "unit": "%|$|users|…|null",
            "direction": "up|down|null",
            "context": "Brief description of the metric context",
            "parentType": "role"
            // METRIC EXTRACTION RULES (ROLE-LEVEL):
            // - Only include a numeric value when that exact number appears in the cover letter text for this company + role.
            // - If the metric text lacks a number, set value: null and unit/direction: null.
            // - If you are unsure which role a metric belongs to, omit it instead of guessing.
            // - Never invent, estimate, or reuse example metrics from this prompt.
          }
        ],
        "summary": "Role-level summary of responsibility, team structure, overall impact, challenges overcome"
      }
    ],
    "entityRefs": {
      "educationRefs": []
    },
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
    • Metrics must be strictly extractive: only include numeric values that appear digit-for-digit in the cover letter text for that story or role.
    • Never copy, imitate, or reuse any example phrases or metrics from this prompt; examples are illustrative only and must not appear in output.
    • Normalize tags to lowercase canonical forms (e.g., "plg", "xai", "nlp", "derms", "vpp").
    • CRITICAL: All metrics in stories must include "parentType": "story" field.
  
  CRITICAL DISTINCTIONS:
  
  STORY EXTRACTION:
    • Treat any paragraph or sentence that describes a concrete achievement (clear actions and outcomes) as a candidate story.
    • When the text explicitly mentions a company and/or role for that achievement, copy those into company and titleRole.
    • If company and/or role are not clearly specified, STILL extract the story and set company and/or titleRole to null.
    • Do NOT invent or guess company or titleRole values that are not clearly implied by the cover letter text.
  
  ROLE-LEVEL METRICS:
    • Quantified achievements that update existing work_items (not new stories).
    • Must include company and titleRole that match existing work history.
    • Only extract a role-level metric if BOTH a numeric value and its company/role context appear explicitly in the cover letter.
    • If either the number or the role context is missing or ambiguous, omit the metric (or set value: null and log a warning in metadata.warnings).
    • Use roleLevelMetrics array for these, not stories array.
  
  PROFILE DATA:
    • Career goals, values, preferences, voice, writing style.
    • Skills mentioned without work history context.
    • Relocation preferences, industry focus, leadership style.
    • Store in profileData object.
    • Extract tone/voice/style from overall letter structure.
    • Keep everything concise, accurate, and JSON-valid.
    • Return ONLY valid JSON matching this schema.
  `;
};