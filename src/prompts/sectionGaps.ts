/**
 * Section Gap Analysis Prompt - Phase 2: Progressive LLM Streaming
 *
 * SLOW CALL (20-30s) - Granular per-section feedback with quality criteria
 * Parallel Call 3 of 3
 *
 * Returns: Section-by-section gaps, rating criteria with evidence, CTA hooks
 * Skips: Basic metrics (already computed in Call 1)
 */

export const SECTION_GUIDANCE = {
  introduction: {
    title: 'Introduction',
    summary:
      'Open strong with credibility, highlight the sharpest achievement, and connect it to the company/mission.',
    expectations: [
      'Lead with a compelling hook (achievement, insight, or company tie-in).',
      'Establish domain credibility and 1-2 quantifiable proof points.',
      'Show mission/product alignment tied to the JD.',
    ],
  },
  experience: {
    title: 'Experience',
    summary:
      'Translate resume achievements into story-driven paragraphs that prove you can meet core requirements.',
    expectations: [
      'Highlight relevant projects with metrics tied to JD requirements.',
      'Demonstrate cross-functional leadership/collaboration as needed.',
      'Show toolkit/process fluency (data, experimentation, PM craft) emphasized in the JD.',
    ],
  },
  closing: {
    title: 'Closing',
    summary: 'Summarize the value, express enthusiasm, and include a confident call-to-action.',
    expectations: [
      'Reinforce differentiating value (1-2 proof points).',
      'State clear enthusiasm tied to company mission or product.',
      'Close with a confident CTA about next steps.',
    ],
  },
  signature: {
    title: 'Signature',
    summary: 'Keep it professional and actionable.',
    expectations: [
      'Use a concise, professional sign-off.',
      'Optionally restate contact info or availability if missing elsewhere.',
    ],
  },
} as const;

export const SECTION_GAPS_SYSTEM_PROMPT = `You are an expert cover letter editor providing DETAILED section-by-section feedback.

Respond ONLY with valid JSON following this EXACT schema:

{
  "enhancedMatchData": {
    "sectionGapInsights": [
      {
        "sectionId": "section-1-static",
        "sectionSlug": "introduction",
        "sectionType": "introduction",
        "sectionTitle": "Introduction",
        "promptSummary": "Intro must open with credibility, metrics, and mission alignment.",
        "requirementGaps": [
          {
            "id": "intro-credibility",
            "label": "Professional summary to establish credibility",
            "severity": "high",
            "requirementType": "narrative",
            "rationale": "No metrics or seniority indicators mentioned in first paragraph.",
            "recommendation": "Start with strongest leadership metric (e.g., 40% growth) to anchor expertise."
          }
        ],
        "recommendedMoves": [
          "Open with quantified career highlight (growth metric or launch stat).",
          "Reference Company X's mission or latest milestone to show research."
        ],
        "nextAction": "add-story"
      }
    ],
    "ctaHooks": [
      {
        "type": "add-story",
        "label": "Add story about AI/ML product work",
        "requirement": "AI/ML product experience",
        "severity": "high",
        "actionPayload": {"suggestedTags": ["AI", "ML", "product"]}
      }
    ]
  },
  "ratingCriteria": [
    {
      "id": "compelling_opening",
      "label": "Compelling Opening",
      "met": true,
      "evidence": "Opening paragraph starts with a strong hook: 'I am an accomplished product manager...'",
      "suggestion": ""
    }
  ]
}

CRITICAL RULES:
1. For sectionGapInsights:
   - Return one entry per section (in draft order)
   - CRITICAL: You MUST include ALL of these fields for EVERY section:
     * "sectionId": copy the exact "id" value from the draft (e.g., "section-1-1")
     * "sectionSlug": copy the exact "slug" value from the draft (e.g., "introduction")
     * "sectionType": copy the section type from the draft
     * "sectionTitle": copy the exact title from the draft
   - These fields are MANDATORY - the system cannot function without them
   - Without sectionId, the gaps will not display correctly
   - Tie every recommendation to BOTH the rubric expectations and JD requirements

2. For ratingCriteria: MUST evaluate ALL 11 criteria below. For each criterion:
   - Set "met": true if the draft demonstrates this quality, false otherwise
   - Provide "evidence": specific text from the draft that supports your evaluation (quote relevant sentences/phrases)
   - Provide "suggestion": actionable improvement advice if met=false, empty string if met=true
   - The 11 criteria are:
     1. "compelling_opening" - "Compelling Opening": Strong hook that captures attention in first paragraph
     2. "business_understanding" - "Understanding of Business/Users": Demonstrates knowledge of company and users
     3. "quantified_impact" - "Quantified Impact": Specific metrics and achievements (%, $, numbers)
     4. "action_verbs" - "Action Verbs": Strong, active language showing ownership
     5. "concise_length" - "Concise Length": 3-4 paragraphs, under 400 words
     6. "error_free" - "Error-Free Writing": No spelling or grammar errors
     7. "personalized" - "Personalized Content": Tailored to specific role and company
     8. "specific_examples" - "Specific Examples": Concrete examples from work history
     9. "professional_tone" - "Professional Tone": Appropriate formality level
     10. "company_research" - "Company Research": Shows understanding of company culture/mission
     11. "role_understanding" - "Role Understanding": Clear grasp of job responsibilities

3. For ctaHooks: Provide 3-5 actionable suggestions with clear labels
   - Types: "add-story", "edit-goals", "refine-section", "add-metric", "research-company"
   - Include severity: "high", "medium", "low"
   - Include actionPayload with relevant data

4. For severity: Use "high"/"medium"/"low"
5. For requirementType: Use "core"/"preferred"/"differentiator"/"narrative"
6. For nextAction: Use "add-story"/"refine-content"/"add-metrics"/"research-company"
7. Return ONLY the JSON object, no markdown, no explanations
`;

export const buildSectionGapsUserPrompt = (payload: {
  draft: string;
  sections: Array<{
    id: string;
    slug: string;
    title: string;
    content: string;
    requirementsMatched: string[];
    sectionType?: string;
  }>;
  jobDescription: {
    company: string;
    role: string;
    summary: string;
    standardRequirements: Array<{ id: string; label: string; detail?: string }>;
    preferredRequirements: Array<{ id: string; label: string; detail?: string }>;
    differentiatorRequirements: Array<{ id: string; label: string; detail?: string }>;
    differentiatorSignals: string[];
  };
  sectionGuidance?: typeof SECTION_GUIDANCE;
}): string => {
  const guidanceMap = payload.sectionGuidance ?? SECTION_GUIDANCE;

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

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[id: ${s.id}] [slug: ${s.slug}] ${s.title}
${s.content}
Requirements Matched: ${s.requirementsMatched.join(', ') || 'None'}`).join('\n\n')}

=== SECTION RUBRIC & EXPECTATIONS ===
${payload.sections.map(section => {
  const normalizedType =
    (section.sectionType as keyof typeof guidanceMap) ??
    ((section.slug as keyof typeof guidanceMap) in guidanceMap
      ? (section.slug as keyof typeof guidanceMap)
      : 'experience');
  const guidance = guidanceMap[normalizedType] ?? guidanceMap.experience;
  return `[${section.slug}] ${guidance.title}
Summary: ${guidance.summary}
Expectations:
- ${guidance.expectations.join('\n- ')}
`;
}).join('\n')}

=== CONTENT QUALITY EVALUATION ===
Evaluate the cover letter draft against these 11 quality criteria. For each criterion:
- Determine if it's met (true/false) based on the draft content
- Provide specific evidence: quote the exact text from the draft that supports your evaluation
- If not met, provide a concrete suggestion for improvement

The 11 criteria to evaluate:
1. Compelling Opening - Does the opening paragraph have a strong hook that captures attention?
2. Understanding of Business/Users - Does it demonstrate knowledge of the company and its users?
3. Quantified Impact - Are there specific metrics and achievements (%, $, numbers)?
4. Action Verbs - Does it use strong, active language showing ownership?
5. Concise Length - Is it 3-4 paragraphs and under 400 words?
6. Error-Free Writing - Are there no spelling or grammar errors?
7. Personalized Content - Is it tailored to the specific role and company?
8. Specific Examples - Are there concrete examples from work history?
9. Professional Tone - Is the formality level appropriate?
10. Company Research - Does it show understanding of company culture/mission?
11. Role Understanding - Does it demonstrate clear grasp of job responsibilities?

Analyze each section in detail and provide gap insights, quality criteria, and actionable CTAs.`;
};
