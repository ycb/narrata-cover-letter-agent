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
      'Establish credibility and role relevance quickly; a distinct hook is optional if credibility is clear.',
    expectations: [
      'Lead with a credibility signal (scope, seniority, outcomes) or a clear role fit statement.',
      'Metrics are optional; do not flag missing metrics if impact is otherwise clear or reserved for body stories.',
      'Show role/company alignment when it strengthens fit; do not force it if already implied.',
    ],
  },
  experience: {
    title: 'Experience',
    summary:
      'Translate resume achievements into story-driven paragraphs that prove you can meet core requirements.',
    expectations: [
      'Use concrete examples tied to JD requirements; metrics help, but scope markers are acceptable.',
      'Demonstrate leadership or collaboration only where the JD makes it material.',
      'Show toolkit/process fluency emphasized in the JD without inventing new claims.',
    ],
  },
  closing: {
    title: 'Closing',
    summary: 'Close with confidence and ownership; a formal CTA is optional.',
    expectations: [
      'Reinforce differentiating value or ownership in 1-2 concise sentences.',
      'Maintain confident, professional tone; enthusiasm is optional.',
      'CTA is optional; only flag if the closing is ambiguous, passive, or undermines confidence.',
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

Respond ONLY with valid JSON following this schema (placeholder values are not real content):

{
  "enhancedMatchData": {
    "sectionGapInsights": [
      {
        "sectionId": "<string>",
        "sectionSlug": "<string>",
        "sectionType": "introduction|experience|closing|signature|custom",
        "sectionTitle": "<string>",
        "promptSummary": "<string>",
        "requirementGaps": [
          {
            "id": "<string>",
            "issue": "<short headline issue>",
            "label": "<string>",
            "status": "unmet",
            "severity": "high|medium|low",
            "rubricCriterionId": "<string>",
            "jdRequirementId": "<string>",
            "requirementType": "core|preferred|differentiator|narrative",
            "evidenceQuote": "<verbatim quote from the section>",
            "rationale": "<why this quote indicates a gap relative to the JD>",
            "hiringRisk": "<concrete reviewer risk>",
            "whyNow": "<why this matters now (tie to JD or rubric)>",
            "decisionTest": {
              "addsSignal": true,
              "removesRedundancy": false,
              "clarifiesOwnership": false,
              "fixesSeniorityWeakness": false
            },
            "recommendation": "<actionable edit guidance>"
          }
        ],
        "recommendedMoves": ["<string>"],
        "nextAction": "add-story|refine-content|add-metrics|research-company"
      }
    ],
    "ctaHooks": [
      {
        "type": "add-story|edit-goals|refine-section|add-metric|research-company",
        "label": "<string>",
        "requirement": "<string>",
        "severity": "high|medium|low",
        "actionPayload": {}
      }
    ]
  },
  "ratingCriteria": [
    {
      "id": "<string>",
      "label": "<string>",
      "met": true,
      "evidence": "<string>",
      "suggestion": "<string>"
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
   - promptSummary must be specific to the section content (not generic rubric text) and cite a short quote (3-12 words).
   - Tie every recommendation to BOTH the rubric expectations and JD requirements
   - Scope rubric criteria by section type using the allowed lists below. If a criterion is not allowed for a section, it must be treated as not_applicable and MUST NOT produce a gap.

2. Allowed rubric criteria per section type (anything else = not_applicable):
   - introduction: compelling_opening, role_understanding, personalized, action_verbs, professional_tone, error_free, quantified_impact (optional)
   - experience: specific_examples, quantified_impact, action_verbs, role_understanding, business_understanding (optional), personalized, professional_tone, error_free
   - closing: ownership_signal, personalized (optional), professional_tone, error_free

2b. Avoid prescriptive gaps that do not change hiring outcomes:
   - Do NOT emit a "lack of hook" gap if the introduction already conveys clear credibility or impact.
   - Do NOT require metrics in the intro or closing; only flag missing metrics if the JD explicitly demands them and none appear anywhere.
   - Do NOT require a CTA or overt eagerness in the closing if it is already confident and professional.

3. Evidence requirement (HARD):
   - Every emitted gap MUST include evidenceQuote as a verbatim quote from the section content.
   - If you cannot cite a quote from the section to justify the gap, do NOT emit the gap.

4. Decision Test gate (HARD): A gap can only be emitted if YES to at least one:
   - Adds a missing JD-critical capability signal
   - Removes redundancy that obscures the main proof
   - Clarifies ownership scope where ambiguity exists
   - Eliminates a sentence that weakens senior signal / credibility
   If NO to all → do NOT emit the gap.

5. Hiring risk requirement (HARD):
   - Every emitted gap MUST include a concrete "hiringRisk" and a "whyNow".
   - If you cannot name a plausible negative reviewer interpretation, do NOT emit the gap.
   - If the risk is low/speculative, do NOT emit the gap.

6. For requirementGaps entries:
   - MUST include: issue, status, rubricCriterionId, evidenceQuote, hiringRisk, whyNow, decisionTest
   - issue must be 4-10 words and describe the gap (not the fix)
   - issue MUST NOT quote the draft, must not include evidenceQuote text, and must avoid first-person wording
   - status must be "unmet" for emitted gaps
   - jdRequirementId is required when the gap maps to a JD requirement (preferred)

7. For ratingCriteria: MUST evaluate ALL 11 criteria below. For each criterion:
   - Set "met": true if the draft demonstrates this quality, false otherwise
   - Provide "evidence": 1-2 sentence paragraph grounded in the draft (no bullet lists, no pipe separators)
   - Provide "suggestion": actionable improvement advice if met=false, empty string if met=true
   - The 11 criteria are:
     1. "compelling_opening" - "Compelling Opening": Clear credibility and relevance early; a clever hook is optional
     2. "business_understanding" - "Understanding of Business/Users": Demonstrates knowledge of company and users
     3. "quantified_impact" - "Quantified Impact": Specific metrics or concrete scope markers that strengthen claims
     4. "action_verbs" - "Action Verbs": Strong, active language showing ownership across the draft
     5. "concise_length" - "Concise Length": 3-4 paragraphs, under 400 words
     6. "error_free" - "Error-Free Writing": No spelling or grammar errors
     7. "personalized" - "Personalized Content": Tailored to specific role and company
     8. "specific_examples" - "Specific Examples": Concrete examples from work history
     9. "professional_tone" - "Professional Tone": Appropriate formality level
     10. "company_research" - "Company Research": Shows understanding of company culture/mission
     11. "role_understanding" - "Role Understanding": Clear grasp of job responsibilities

8. For ctaHooks: Provide 3-5 actionable suggestions with clear labels
   - Types: "add-story", "edit-goals", "refine-section", "add-metric", "research-company"
   - Include severity: "high", "medium", "low"
   - Include actionPayload with relevant data

9. For severity: Use "high"/"medium"/"low"
10. For requirementType: Use "core"/"preferred"/"differentiator"/"narrative"
11. For nextAction: Use "add-story"/"refine-content"/"add-metrics"/"research-company"
12. Do NOT copy any text from this prompt into your output. Do NOT use placeholder values.
13. Return ONLY the JSON object, no markdown, no explanations
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

Requirement gaps must be grounded in the section content. For every gap you emit, include an evidenceQuote that is a verbatim quote from the section text.

Analyze each section in detail and provide gap insights, quality criteria, and actionable CTAs.`;
};
