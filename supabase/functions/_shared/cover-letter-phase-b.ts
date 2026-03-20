import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

type PhaseBMode = 'full' | 'section-gaps' | 'slots-only';
type PhaseBStageStatus = 'pending' | 'success' | 'error' | 'skipped';

type DraftSection = {
  id: string;
  templateSectionId: string | null;
  slug: string;
  title: string;
  type: 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing';
  order: number;
  content: string;
  source: {
    kind: string;
    entityId: string | null;
  };
  metadata: {
    requirementsMatched: string[];
    tags: string[];
    wordCount: number;
    storySelection?: Record<string, unknown>;
  };
  status: {
    hasGaps: boolean;
    gapIds: string[];
    isModified: boolean;
    lastUpdatedAt: string;
  };
  analytics: {
    matchScore?: number;
    atsScore?: number;
  };
};

type RequirementInsight = {
  id: string;
  label: string;
  detail?: string;
  priority?: string;
  keywords?: string[];
};

type JobDescriptionContext = {
  company: string;
  role: string;
  summary: string;
  content: string;
  standardRequirements: RequirementInsight[];
  preferredRequirements: RequirementInsight[];
  differentiatorRequirements: RequirementInsight[];
  differentiatorSignals: string[];
  keywords: string[];
};

type StoryRow = {
  id: string;
  title: string | null;
  content: string | null;
};

type WorkHistoryRow = {
  id: string;
  company: string;
  title: string;
  description: string;
  achievements: string[];
};

type PhaseBStageRecord = {
  status: PhaseBStageStatus;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  message?: string;
};

type PhaseBRecord = {
  status: PhaseBStageStatus;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  message?: string;
  slotFill?: PhaseBStageRecord;
  basicMetrics?: PhaseBStageRecord;
  requirementAnalysis?: PhaseBStageRecord;
  sectionGaps?: PhaseBStageRecord;
  contentStandards?: PhaseBStageRecord;
};

type ContentStandardConfig = {
  id: string;
  label: string;
  description: string;
  scope: 'section' | 'letter';
  aggregation: 'any_section' | 'all_sections' | 'global';
  applicability: 'all_sections' | 'intro_only' | 'body_only' | 'closing_only';
};

const OPENAI_MODEL = 'gpt-4o-mini';

const CONTENT_STANDARDS: ContentStandardConfig[] = [
  { id: 'compelling_opening', label: 'Compelling Opening', description: 'Clear credibility and relevance early; hook is optional.', scope: 'section', aggregation: 'any_section', applicability: 'intro_only' },
  { id: 'business_understanding', label: 'Understanding of Business/Users', description: 'Demonstrates knowledge of company products, users, or market.', scope: 'section', aggregation: 'any_section', applicability: 'all_sections' },
  { id: 'quantified_impact', label: 'Quantified Impact', description: 'Contains specific metrics or concrete scope markers.', scope: 'section', aggregation: 'any_section', applicability: 'all_sections' },
  { id: 'action_verbs', label: 'Action Verbs & Ownership', description: 'Uses strong action verbs and shows clear ownership.', scope: 'section', aggregation: 'all_sections', applicability: 'all_sections' },
  { id: 'star_format', label: 'STAR Format', description: 'Stories follow Situation-Task-Action-Result structure.', scope: 'section', aggregation: 'any_section', applicability: 'body_only' },
  { id: 'personalized', label: 'Personalized to Role', description: 'Clearly tailored to this specific job (not generic).', scope: 'section', aggregation: 'all_sections', applicability: 'all_sections' },
  { id: 'specific_examples', label: 'Specific Examples', description: 'Concrete examples from work history (not vague claims).', scope: 'section', aggregation: 'any_section', applicability: 'body_only' },
  { id: 'company_research', label: 'Company Research', description: 'Shows understanding of company culture, mission, or challenges.', scope: 'section', aggregation: 'any_section', applicability: 'all_sections' },
  { id: 'concise_length', label: 'Concise Length', description: '3-4 paragraphs, under 400 words, no unnecessary fluff.', scope: 'letter', aggregation: 'global', applicability: 'all_sections' },
  { id: 'error_free', label: 'Error-Free Writing', description: 'No spelling or grammar errors, professional language throughout.', scope: 'letter', aggregation: 'global', applicability: 'all_sections' },
  { id: 'professional_tone', label: 'Professional Tone', description: 'Appropriate formality level, confident but not arrogant.', scope: 'letter', aggregation: 'global', applicability: 'all_sections' },
];

const SECTION_GUIDANCE = {
  introduction: {
    title: 'Introduction',
    summary: 'Establish credibility and role relevance quickly; a distinct hook is optional if credibility is clear.',
    expectations: [
      'Lead with a credibility signal (scope, seniority, outcomes) or a clear role fit statement.',
      'Metrics are optional; do not flag missing metrics if impact is otherwise clear or reserved for body stories.',
      'Show role/company alignment when it strengthens fit; do not force it if already implied.',
    ],
  },
  experience: {
    title: 'Experience',
    summary: 'Translate resume achievements into story-driven paragraphs that prove you can meet core requirements.',
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

const BASIC_METRICS_SYSTEM_PROMPT = `You are an expert cover letter reviewer. Provide a QUICK high-level assessment focusing on top-level scores and summaries only.

Respond ONLY with valid JSON following this EXACT schema:

{
  "metrics": {
    "goals": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation for tooltip (2-3 sentences)"
    },
    "experience": {
      "strength": "strong|average|weak",
      "summary": "Brief 1-sentence summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "rating": {
      "score": 85,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "ats": {
      "score": 78,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "coreRequirements": {
      "met": 4,
      "total": 5,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    },
    "preferredRequirements": {
      "met": 2,
      "total": 3,
      "summary": "Brief summary",
      "tooltip": "Detailed explanation (2-3 sentences)"
    }
  }
}

CRITICAL RULES:
1. Be concise - this is a FAST preliminary assessment
2. Use "strong"/"average"/"weak" for strength ratings
3. Scores should be 0-100
4. Summaries should be 1 sentence max
5. Tooltips should be 2-3 sentences max
6. Count core requirements: how many of the CORE REQUIREMENTS are addressed in the draft?
7. Count preferred requirements: how many of the PREFERRED REQUIREMENTS are addressed in the draft?
8. Focus on what's IN THE DRAFT, not just work history
9. Return ONLY the JSON object, no markdown, no explanations`;

const REQUIREMENT_ANALYSIS_SYSTEM_PROMPT = `You are an expert career coach specializing in job-candidate alignment. Provide DETAILED requirement-by-requirement analysis.

Respond ONLY with valid JSON following this EXACT schema:

{
  "enhancedMatchData": {
    "goalMatches": [],
    "coreRequirementDetails": [],
    "preferredRequirementDetails": [],
    "coreExperienceDetails": [],
    "preferredExperienceDetails": [],
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
   - "Target Title" (goal-title)
   - "Minimum Salary" (goal-salary)
   - "Work Type" (goal-worktype)
   - "Preferred Location" (goal-cities)
   - "Company Maturity" (goal-maturity)
   - "Industry" (goal-industry)
   - "Business Model" (goal-business-model)
2. For requirement details: "demonstrated" means it's IN THE DRAFT, not just work history.
3. For sectionIds: Populate for all demonstrated requirements using exact draft section ids.
4. Return ONLY the JSON object, no markdown, no explanations.`;

const SECTION_GAPS_SYSTEM_PROMPT = `You are an expert cover letter editor providing DETAILED section-by-section feedback.

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
   If NO to all -> do NOT emit the gap.

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

function buildBasicMetricsUserPrompt(payload: {
  draft: string;
  sections: Array<{ slug: string; title: string; content: string; requirementsMatched: string[] }>;
  jobDescription: JobDescriptionContext;
}): string {
  return `=== JOB INFORMATION ===
Company: ${payload.jobDescription.company}
Role: ${payload.jobDescription.role}
Summary: ${payload.jobDescription.summary}

CORE REQUIREMENTS (must-have):
${payload.jobDescription.standardRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

PREFERRED REQUIREMENTS (nice-to-have):
${payload.jobDescription.preferredRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

DIFFERENTIATOR REQUIREMENTS:
${payload.jobDescription.differentiatorRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[${s.slug}] ${s.title}\n${s.content}`).join('\n\n')}

Provide a quick high-level assessment of this draft. Focus on top-level scores only.`;
}

function buildRequirementAnalysisUserPrompt(payload: {
  sections: Array<{ id: string; slug: string; title: string; content: string; requirementsMatched: string[] }>;
  jobDescription: JobDescriptionContext;
  workHistory: WorkHistoryRow[];
  approvedContent: StoryRow[];
}): string {
  const workHistorySection = payload.workHistory.length
    ? `\n\n=== USER'S WORK HISTORY ===
${payload.workHistory.map(w => `[${w.id}] ${w.title} at ${w.company}\nDescription: ${w.description || 'N/A'}\nAchievements: ${w.achievements.join('; ') || 'N/A'}`).join('\n\n')}`
    : '';

  const storiesSection = payload.approvedContent.length
    ? `\n\n=== USER'S APPROVED STORIES ===
${payload.approvedContent.map(s => `[${s.id}] "${s.title || ''}"\nContent: ${s.content || ''}`).join('\n\n')}`
    : '';

  return `=== JOB INFORMATION ===
Company: ${payload.jobDescription.company}
Role: ${payload.jobDescription.role}
Summary: ${payload.jobDescription.summary}

CORE REQUIREMENTS:
${payload.jobDescription.standardRequirements.map((req, i) => `[core-${i}] ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

PREFERRED REQUIREMENTS:
${payload.jobDescription.preferredRequirements.map((req, i) => `[pref-${i}] ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

DIFFERENTIATOR REQUIREMENTS:
${payload.jobDescription.differentiatorRequirements.map((req, i) => `${i + 1}. ${req.label}${req.detail ? ` - ${req.detail}` : ''}`).join('\n')}

Differentiator Signals: ${payload.jobDescription.differentiatorSignals.join(', ')}
${workHistorySection}${storiesSection}

=== COVER LETTER DRAFT ===
${payload.sections.map(s => `[id: ${s.id}] [slug: ${s.slug}] ${s.title}\n${s.content}`).join('\n\n')}

Analyze requirement-by-requirement alignment.`;
}

function buildSectionGapsUserPrompt(payload: {
  sections: Array<{ id: string; slug: string; title: string; content: string; requirementsMatched: string[]; sectionType?: string }>;
  jobDescription: JobDescriptionContext;
}): string {
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
${payload.sections.map(s => `[id: ${s.id}] [slug: ${s.slug}] ${s.title}\n${s.content}\nRequirements Matched: ${s.requirementsMatched.join(', ') || 'None'}`).join('\n\n')}

=== SECTION RUBRIC & EXPECTATIONS ===
${payload.sections.map(section => {
  const normalizedType =
    section.sectionType === 'introduction' || section.slug === 'introduction'
      ? 'introduction'
      : section.sectionType === 'closing' || section.slug === 'closing'
      ? 'closing'
      : 'experience';
  const guidance = SECTION_GUIDANCE[normalizedType as keyof typeof SECTION_GUIDANCE] ?? SECTION_GUIDANCE.experience;
  return `[${section.slug}] ${guidance.title}
Summary: ${guidance.summary}
Expectations:
- ${guidance.expectations.join('\n- ')}`;
}).join('\n\n')}

Requirement gaps must be grounded in the section content. For every gap you emit, include an evidenceQuote that is a verbatim quote from the section text.

Analyze each section in detail and provide gap insights, quality criteria, and actionable CTAs.`;
}

function buildSectionStandardsPrompt(
  sectionContent: string,
  sectionType: 'intro' | 'body' | 'closing',
  applicableStandards: ContentStandardConfig[],
  jobDescription?: string,
): string {
  const sectionTypeLabel = sectionType === 'intro' ? 'Introduction' : sectionType === 'body' ? 'Body Paragraph' : 'Closing';
  const jobContext = jobDescription
    ? `\n\nJob Description Context:\n${jobDescription.slice(0, 1000)}${jobDescription.length > 1000 ? '...' : ''}`
    : '';
  return `You are an expert cover letter evaluator for product management roles.

Your task: Evaluate this ${sectionTypeLabel} section against specific content quality standards.

Section Content:
${sectionContent}${jobContext}

Evaluation Standards (${applicableStandards.length} applicable to ${sectionType} sections):

${applicableStandards.map((standard, idx) => `${idx + 1}. ${standard.label.toUpperCase()}
   ${standard.description}`).join('\n\n')}

Return ONLY valid JSON with this exact structure:
{
  "standards": [
    {
      "standardId": "compelling_opening",
      "status": "met" | "not_met" | "not_applicable",
      "evidence": "Specific quote or explanation from the section"
    }
  ]
}`;
}

function buildLetterStandardsPrompt(
  fullLetterText: string,
  letterScopedStandards: ContentStandardConfig[],
  wordCount?: number,
  paragraphCount?: number,
): string {
  const stats = wordCount && paragraphCount
    ? `\n\nLetter Statistics:\n- Word Count: ${wordCount}\n- Paragraph Count: ${paragraphCount}`
    : '';
  return `You are an expert cover letter evaluator for product management roles.

Your task: Evaluate this complete cover letter against global content quality standards.

Full Cover Letter:
${fullLetterText}${stats}

Evaluation Standards (${letterScopedStandards.length} letter-level standards):

${letterScopedStandards.map((standard, idx) => `${idx + 1}. ${standard.label.toUpperCase()}
   ${standard.description}`).join('\n\n')}

Return ONLY valid JSON with this exact structure:
{
  "standards": [
    {
      "standardId": "concise_length",
      "status": "met" | "not_met",
      "evidence": "Specific explanation"
    }
  ]
}`;
}

function countWords(text: string): number {
  return (text || '').trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stableHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function parseLlmSlotTokens(text: string): Array<{ id: string; rawToken: string; label: string; instruction: string; index: number }> {
  if (!text) return [];
  const textHash = stableHash(text);
  const pattern = /\[(LLM|SLOT):([^\]]+)\]/g;
  const tokens: Array<{ rawToken: string; inner: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push({
      rawToken: match[0],
      inner: match[2] ?? '',
      index: match.index,
    });
  }
  return tokens.map(token => {
    const trimmed = token.inner.trim();
    const pipeIndex = trimmed.indexOf('|');
    const label = pipeIndex === -1 ? trimmed || 'slot' : trimmed.slice(0, pipeIndex).trim() || 'slot';
    const instruction = pipeIndex === -1 ? label : trimmed.slice(pipeIndex + 1).trim() || label;
    return {
      id: `llm_${stableHash(`${token.inner}:${token.index}:${textHash}`)}`,
      rawToken: token.rawToken,
      label,
      instruction,
      index: token.index,
    };
  });
}

function replaceSlotTokenWithPunctuation(text: string, token: string, replacement: string): string {
  if (!token) return text;
  const trailingPunctuation = /[.!?,;:]+$/;
  const leadingPunctuation = /^[.!?,;:]/;
  let result = '';
  let cursor = 0;
  let index = text.indexOf(token, cursor);
  while (index !== -1) {
    const nextSlice = text.slice(index + token.length);
    const nextChar = nextSlice[0] || '';
    const nextNonSpace = nextSlice.match(/\S/)?.[0] || '';
    let nextReplacement = replacement;
    if (nextChar && leadingPunctuation.test(nextChar) && trailingPunctuation.test(replacement)) {
      nextReplacement = replacement.replace(trailingPunctuation, '');
    } else if (nextNonSpace && !leadingPunctuation.test(nextNonSpace) && trailingPunctuation.test(replacement)) {
      nextReplacement = replacement.replace(trailingPunctuation, '');
    }
    result += text.slice(cursor, index) + nextReplacement;
    cursor = index + token.length;
    index = text.indexOf(token, cursor);
  }
  result += text.slice(cursor);
  return result;
}

function transformMetricPayload(metrics: Record<string, any>) {
  const lookup = [
    { key: 'goals', label: 'Match with Goals' },
    { key: 'experience', label: 'Match with Experience' },
    { key: 'rating', label: 'Cover Letter Rating' },
    { key: 'ats', label: 'ATS Score' },
    { key: 'coreRequirements', label: 'Core Requirements' },
    { key: 'preferredRequirements', label: 'Preferred Requirements' },
  ];

  return lookup
    .map(({ key, label }) => {
      const payload = metrics?.[key];
      if (!payload || typeof payload !== 'object') return null;
      const base = {
        key,
        label,
        tooltip: typeof payload.tooltip === 'string' ? payload.tooltip : '',
        differentiatorHighlights: Array.isArray(payload.differentiatorHighlights)
          ? payload.differentiatorHighlights.filter((item: unknown) => typeof item === 'string' && item.trim().length > 0)
          : [],
      };
      if (key === 'rating' || key === 'ats') {
        const score =
          typeof payload.score === 'number'
            ? Math.max(0, Math.min(100, payload.score))
            : typeof payload.percentage === 'number'
            ? Math.max(0, Math.min(100, payload.percentage))
            : 0;
        return { ...base, type: 'score', value: score, summary: typeof payload.summary === 'string' ? payload.summary : '' };
      }
      if (key === 'coreRequirements' || key === 'preferredRequirements') {
        return {
          ...base,
          type: 'requirement',
          met: typeof payload.met === 'number' ? payload.met : 0,
          total: typeof payload.total === 'number' ? payload.total : 0,
          summary: typeof payload.summary === 'string' ? payload.summary : '',
        };
      }
      const strength = payload.strength === 'strong' || payload.strength === 'average' || payload.strength === 'weak'
        ? payload.strength
        : 'average';
      return { ...base, type: 'strength', strength, summary: typeof payload.summary === 'string' ? payload.summary : '' };
    })
    .filter(Boolean);
}

function strengthToScore(strength: 'strong' | 'average' | 'weak'): number {
  switch (strength) {
    case 'strong': return 90;
    case 'average': return 70;
    case 'weak': return 45;
  }
}

async function fetchChatJson<T>(apiKey: string, system: string, user: string, maxTokens: number): Promise<T> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${details}`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('OpenAI response did not include content');
  }

  const cleaned = raw
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/i, '')
    .replace(/```$/, '')
    .trim();

  return JSON.parse(cleaned) as T;
}

function getSectionScopedStandards(sectionType: 'intro' | 'body' | 'closing') {
  return CONTENT_STANDARDS.filter((standard) => {
    if (standard.scope !== 'section') return false;
    if (standard.applicability === 'all_sections') return true;
    if (standard.applicability === 'intro_only') return sectionType === 'intro';
    if (standard.applicability === 'body_only') return sectionType === 'body';
    if (standard.applicability === 'closing_only') return sectionType === 'closing';
    return false;
  });
}

function mapDraftSectionType(type: DraftSection['type']): 'intro' | 'body' | 'closing' {
  if (type === 'static') return 'intro';
  if (type === 'closing') return 'closing';
  return 'body';
}

function aggregateContentStandards(
  sections: DraftSection[],
  perSection: Array<{ sectionId: string; standards: Array<{ standardId: string; status: string; evidence: string }> }>,
  perLetter: Array<{ standardId: string; status: 'met' | 'not_met'; evidence: string }>,
) {
  const aggregated = CONTENT_STANDARDS.map((standard) => {
    if (standard.scope === 'letter') {
      const letterResult = perLetter.find((item) => item.standardId === standard.id);
      return {
        standardId: standard.id,
        status: letterResult?.status ?? 'not_met',
        contributingSections: [] as string[],
        evidence: letterResult?.evidence ?? 'Not evaluated.',
      };
    }

    const applicableSections = sections.filter((section) => {
      const sectionType = mapDraftSectionType(section.type);
      if (standard.applicability === 'all_sections') return true;
      if (standard.applicability === 'intro_only') return sectionType === 'intro';
      if (standard.applicability === 'body_only') return sectionType === 'body';
      if (standard.applicability === 'closing_only') return sectionType === 'closing';
      return true;
    });

    const sectionResults = applicableSections.map((section) => {
      const sectionResult = perSection.find((item) => item.sectionId === section.id);
      const standardResult = sectionResult?.standards.find((item) => item.standardId === standard.id);
      return {
        sectionId: section.id,
        status: standardResult?.status ?? 'not_applicable',
        evidence: standardResult?.evidence ?? '',
      };
    });

    if (standard.aggregation === 'any_section') {
      const metSections = sectionResults.filter((item) => item.status === 'met');
      return {
        standardId: standard.id,
        status: metSections.length > 0 ? 'met' : 'not_met',
        contributingSections: metSections.map((item) => item.sectionId),
        evidence: metSections.length > 0
          ? metSections.map((item) => item.evidence).join(' | ')
          : sectionResults[0]?.evidence || 'Not demonstrated in any section.',
      };
    }

    const unmetSections = sectionResults.filter((item) => item.status !== 'met');
    return {
      standardId: standard.id,
      status: unmetSections.length === 0 && sectionResults.length > 0 ? 'met' : 'not_met',
      contributingSections: unmetSections.length === 0 ? sectionResults.map((item) => item.sectionId) : [],
      evidence: unmetSections.length === 0
        ? 'All sections meet this standard.'
        : `${unmetSections.length} section(s) do not meet this standard.`,
    };
  });

  const metCount = aggregated.filter((item) => item.status === 'met').length;
  return {
    perSection,
    perLetter,
    aggregated: {
      standards: aggregated,
      overallScore: aggregated.length > 0 ? Math.round((metCount / aggregated.length) * 100) : 0,
    },
  };
}

function normalizeSections(sections: unknown): DraftSection[] {
  if (Array.isArray(sections)) return sections as DraftSection[];
  if (sections && typeof sections === 'object') {
    const values = Object.values(sections as Record<string, unknown>);
    if (Array.isArray(values)) return values as DraftSection[];
  }
  return [];
}

type SlotFillResult = {
  id: string;
  status: 'FILLED' | 'NOT_FOUND';
  fill: string;
};

type SectionGapInsightRecord = {
  sectionId: string;
  sectionSlug: string;
  sectionType: 'introduction' | 'experience' | 'closing' | 'signature' | 'custom';
  sectionTitle: string;
  promptSummary: string;
  requirementGaps: unknown[];
  recommendedMoves: string[];
  nextAction?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function applySlotFillResponsesToSections(
  sections: DraftSection[],
  slotResponses: SlotFillResult[],
): { sections: DraftSection[]; unresolvedTokenCount: number } {
  const fillById = new Map(slotResponses.map((item) => [item.id, item]));
  let unresolvedTokenCount = 0;

  const updatedSections = sections.map((section) => {
    if (section.status?.isModified) return section;
    const sectionTokens = parseLlmSlotTokens(section.content || '');
    if (sectionTokens.length === 0) return section;

    let updatedContent = section.content || '';
    let changed = false;

    for (const token of sectionTokens) {
      const fill = fillById.get(token.id);
      if (!fill) continue;

      if (fill.status === 'FILLED' && isNonEmptyString(fill.fill)) {
        updatedContent = replaceSlotTokenWithPunctuation(updatedContent, token.rawToken, fill.fill.trim());
        changed = true;
        continue;
      }

      unresolvedTokenCount += 1;
    }

    if (!changed) return section;

    return {
      ...section,
      content: updatedContent,
      metadata: {
        ...(section.metadata || {}),
        wordCount: countWords(updatedContent),
      },
      status: {
        ...section.status,
        lastUpdatedAt: new Date().toISOString(),
      },
    };
  });

  return { sections: updatedSections, unresolvedTokenCount };
}

export function normalizeSectionGapInsightsForPersist(
  rawInsights: unknown,
  sections: DraftSection[],
): SectionGapInsightRecord[] | null {
  if (!Array.isArray(rawInsights) || rawInsights.length !== sections.length) {
    return null;
  }

  const insightById = new Map<string, SectionGapInsightRecord>();

  for (const rawInsight of rawInsights) {
    if (!rawInsight || typeof rawInsight !== 'object') {
      return null;
    }

    const insight = rawInsight as Record<string, unknown>;
    if (
      !isNonEmptyString(insight.sectionId) ||
      !isNonEmptyString(insight.sectionSlug) ||
      !isNonEmptyString(insight.sectionType) ||
      !isNonEmptyString(insight.sectionTitle) ||
      !Array.isArray(insight.requirementGaps)
    ) {
      return null;
    }

    insightById.set(insight.sectionId, {
      sectionId: insight.sectionId,
      sectionSlug: insight.sectionSlug,
      sectionType: insight.sectionType as SectionGapInsightRecord['sectionType'],
      sectionTitle: insight.sectionTitle,
      promptSummary: isNonEmptyString(insight.promptSummary) ? insight.promptSummary : '',
      requirementGaps: insight.requirementGaps,
      recommendedMoves: Array.isArray(insight.recommendedMoves)
        ? insight.recommendedMoves.filter(isNonEmptyString)
        : [],
      nextAction: isNonEmptyString(insight.nextAction) ? insight.nextAction : undefined,
    });
  }

  const normalized = sections.map((section) => insightById.get(section.id) ?? null);
  return normalized.every(Boolean) ? (normalized as SectionGapInsightRecord[]) : null;
}

function getJobDescriptionContext(row: any): JobDescriptionContext {
  return {
    company: row.company || 'Unknown Company',
    role: row.role || 'Product Manager',
    summary: row.summary || '',
    content: row.content || '',
    standardRequirements: Array.isArray(row.standard_requirements) ? row.standard_requirements : [],
    preferredRequirements: Array.isArray(row.preferred_requirements) ? row.preferred_requirements : [],
    differentiatorRequirements: Array.isArray(row.differentiator_requirements) ? row.differentiator_requirements : [],
    differentiatorSignals: Array.isArray(row.analysis?.differentiatorSignals) ? row.analysis.differentiatorSignals : [],
    keywords: Array.isArray(row.keywords) ? row.keywords : [],
  };
}

async function fetchWorkHistory(supabase: any, userId: string): Promise<WorkHistoryRow[]> {
  const { data, error } = await supabase
    .from('work_items')
    .select('id, company:companies(name), title, description, achievements')
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to load work history: ${error.message}`);
  return (data || []).map((item: any) => ({
    id: item.id,
    company: item.company?.name || 'Unknown',
    title: item.title || '',
    description: item.description || '',
    achievements: Array.isArray(item.achievements) ? item.achievements : [],
  }));
}

async function fetchStories(supabase: any, userId: string): Promise<StoryRow[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, content')
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to load stories: ${error.message}`);
  return (data || []).map((story: any) => ({
    id: story.id,
    title: story.title || '',
    content: story.content || '',
  }));
}

async function fillTemplateSlots(
  apiKey: string,
  sections: DraftSection[],
  jobDescription: JobDescriptionContext,
  workHistory: WorkHistoryRow[],
  approvedStories: StoryRow[],
) {
  const tokens = sections.flatMap(section => {
    const content = section.content || '';
    return parseLlmSlotTokens(content).map(token => {
      const before = content.slice(Math.max(0, token.index - 80), token.index);
      const after = content.slice(token.index + token.rawToken.length, token.index + token.rawToken.length + 80);
      return { ...token, context: { before, after } };
    });
  });

  if (tokens.length === 0) {
    return {
      sections,
      templateSlots: {
        filledAt: new Date().toISOString(),
        status: 'success',
        slots: [],
        unresolvedTokenCount: 0,
      },
    };
  }

  const requestPayload = {
    company: jobDescription.company,
    role: jobDescription.role,
    jobDescriptionText: jobDescription.content,
    workHistory: workHistory.slice(0, 12).map(item => ({
      company: item.company,
      title: item.title,
      description: (item.description || '').slice(0, 800),
      achievements: (item.achievements || []).slice(0, 8),
    })),
    approvedStories: approvedStories.slice(0, 12).map(item => ({
      title: item.title,
      content: (item.content || '').slice(0, 900),
    })),
    slots: tokens.slice(0, 20).map(token => ({
      id: token.id,
      label: token.label,
      instruction: token.instruction,
      rawToken: token.rawToken,
      context: token.context,
    })),
  };

  const system = [
    'You fill template placeholders in a cover letter draft.',
    'Each placeholder token is either [LLM:...] or [SLOT:...] and contains an instruction.',
    'For each slot, produce a short fill that can be inserted directly into the cover letter.',
    'If context.before/context.after are provided, ensure the fill fits grammatically between them.',
    'Do not include trailing punctuation if the surrounding text continues the sentence.',
    'Use job description ONLY to choose relevant capability themes; do not restate JD entities as candidate experience.',
    'Every fill must be grounded in work history or approved stories; do not invent facts.',
    'Never claim experience with specific companies, customers, or industries unless explicitly present in work history or stories.',
    'Prefer transferable capability phrasing over domain-specific claims.',
    'If you cannot confidently fill from the provided evidence, return status NOT_FOUND and an empty fill.',
    'Return ONLY valid JSON: {"slots":[{"id":"...","status":"FILLED"|"NOT_FOUND","fill":"...","evidence":{"jobDescription":[],"workHistory":[]}}]}.',
  ].join('\n');

  const parsed = await fetchChatJson<{ slots: SlotFillResult[] }>(
    apiKey,
    system,
    JSON.stringify(requestPayload),
    1200,
  );

  const { sections: updatedSections, unresolvedTokenCount } = applySlotFillResponsesToSections(
    sections,
    parsed.slots || [],
  );

  return {
    sections: updatedSections,
    templateSlots: {
      filledAt: new Date().toISOString(),
      slots: parsed.slots || [],
      unresolvedTokenCount,
      status: unresolvedTokenCount === 0 ? 'success' : 'partial',
      message: unresolvedTokenCount === 0 ? undefined : `${unresolvedTokenCount} template slot(s) could not be resolved.`,
    },
  };
}

async function calculateBasicMetrics(apiKey: string, sections: DraftSection[], jobDescription: JobDescriptionContext) {
  const payload = {
    draft: sections.sort((a, b) => a.order - b.order).map(section => section.content.trim()).filter(Boolean).join('\n\n'),
    sections: sections.map(section => ({
      slug: section.slug,
      title: section.title,
      content: section.content,
      requirementsMatched: section.metadata?.requirementsMatched ?? [],
    })),
    jobDescription,
  };
  const parsed = await fetchChatJson<{ metrics: Record<string, any> }>(
    apiKey,
    BASIC_METRICS_SYSTEM_PROMPT,
    buildBasicMetricsUserPrompt(payload),
    1500,
  );
  const metrics = transformMetricPayload(parsed.metrics || {});
  const atsMetric = metrics.find((metric: any) => metric.key === 'ats') as any;
  const atsScore =
    atsMetric?.type === 'score'
      ? Math.round(atsMetric.value)
      : atsMetric?.type === 'strength'
      ? strengthToScore(atsMetric.strength)
      : 0;
  return { metrics, raw: parsed.metrics || {}, atsScore };
}

async function calculateRequirementAnalysis(
  apiKey: string,
  sections: DraftSection[],
  jobDescription: JobDescriptionContext,
  workHistory: WorkHistoryRow[],
  approvedStories: StoryRow[],
) {
  const parsed = await fetchChatJson<{ enhancedMatchData: Record<string, unknown> }>(
    apiKey,
    REQUIREMENT_ANALYSIS_SYSTEM_PROMPT,
    buildRequirementAnalysisUserPrompt({
      sections: sections.map((section) => ({
        id: section.id,
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
      })),
      jobDescription,
      workHistory,
      approvedContent: approvedStories,
    }),
    2000,
  );
  return parsed.enhancedMatchData || {};
}

async function calculateSectionGaps(apiKey: string, sections: DraftSection[], jobDescription: JobDescriptionContext) {
  const parsed = await fetchChatJson<{ enhancedMatchData: Record<string, unknown>; ratingCriteria?: any[] }>(
    apiKey,
    SECTION_GAPS_SYSTEM_PROMPT,
    buildSectionGapsUserPrompt({
      sections: sections.map((section) => ({
        id: section.id,
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
        sectionType:
          section.slug === 'introduction' ? 'introduction' :
          section.slug === 'closing' ? 'closing' :
          section.slug === 'signature' ? 'signature' :
          'experience',
      })),
      jobDescription,
    }),
    2500,
  );

  const enhancedMatchData =
    parsed.enhancedMatchData && typeof parsed.enhancedMatchData === 'object'
      ? { ...parsed.enhancedMatchData }
      : {};
  const normalizedSectionGapInsights = normalizeSectionGapInsightsForPersist(
    (enhancedMatchData as Record<string, unknown>).sectionGapInsights,
    sections,
  );

  if (normalizedSectionGapInsights === null) {
    throw new Error('cover-letter-phase-b returned invalid sectionGapInsights payload');
  }

  (enhancedMatchData as Record<string, unknown>).sectionGapInsights = normalizedSectionGapInsights;
  return {
    enhancedMatchData,
    ratingCriteria: Array.isArray(parsed.ratingCriteria) ? parsed.ratingCriteria : [],
  };
}

async function calculateContentStandards(apiKey: string, sections: DraftSection[], jobDescription: JobDescriptionContext) {
  const fullLetterText = sections.sort((a, b) => a.order - b.order).map((section) => section.content.trim()).filter(Boolean).join('\n\n');
  const wordCount = countWords(fullLetterText);
  const paragraphCount = sections.length;
  const jobDescriptionText = `${jobDescription.company} - ${jobDescription.role}\n\n${jobDescription.summary}`;

  const perSection = await Promise.all(
    sections.map(async (section) => {
      const sectionType = mapDraftSectionType(section.type);
      const standards = getSectionScopedStandards(sectionType);
      const parsed = await fetchChatJson<{ standards: Array<{ standardId: string; status: string; evidence: string }> }>(
        apiKey,
        'You are an expert cover letter evaluator. Return only valid JSON.',
        buildSectionStandardsPrompt(section.content, sectionType, standards, jobDescriptionText),
        1200,
      );
      return {
        sectionId: section.id,
        standards: Array.isArray(parsed.standards) ? parsed.standards : [],
      };
    }),
  );

  const letterStandards = CONTENT_STANDARDS.filter((standard) => standard.scope === 'letter');
  const letterParsed = await fetchChatJson<{ standards: Array<{ standardId: string; status: 'met' | 'not_met'; evidence: string }> }>(
    apiKey,
    'You are an expert cover letter evaluator. Return only valid JSON.',
    buildLetterStandardsPrompt(fullLetterText, letterStandards, wordCount, paragraphCount),
    1000,
  );

  return aggregateContentStandards(sections, perSection, Array.isArray(letterParsed.standards) ? letterParsed.standards : []);
}

function buildPendingStage(startedAt: string): PhaseBStageRecord {
  return { status: 'pending', startedAt };
}

export async function runCoverLetterPhaseB(args: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userToken: string;
  userId: string;
  draftId: string;
  mode: PhaseBMode;
  openAiApiKey: string;
}) {
  const supabase = createClient(args.supabaseUrl, args.serviceRoleKey, {
    global: {
      headers: {
        Authorization: `Bearer ${args.userToken}`,
      },
    },
  });

  const { data: draftRow, error: draftError } = await supabase
    .from('cover_letters')
    .select('*')
    .eq('id', args.draftId)
    .maybeSingle();
  if (draftError || !draftRow) {
    throw new Error(draftError?.message || 'Draft not found');
  }
  if (draftRow.user_id !== args.userId) {
    throw new Error('Forbidden');
  }

  const { data: jobDescriptionRow, error: jdError } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('id', draftRow.job_description_id)
    .eq('user_id', args.userId)
    .maybeSingle();
  if (jdError || !jobDescriptionRow) {
    throw new Error(jdError?.message || 'Job description not found');
  }

  const existingFeedback =
    draftRow.llm_feedback && typeof draftRow.llm_feedback === 'object'
      ? draftRow.llm_feedback as Record<string, unknown>
      : {};
  const existingEnhanced =
    existingFeedback.enhancedMatchData && typeof existingFeedback.enhancedMatchData === 'object'
      ? existingFeedback.enhancedMatchData as Record<string, unknown>
      : {};
  const nowIso = new Date().toISOString();

  const sections = normalizeSections(draftRow.sections);
  const jobDescription = getJobDescriptionContext(jobDescriptionRow);

  let nextFeedback: Record<string, unknown> = { ...existingFeedback };
  let nextSections = sections;
  let nextMetrics = Array.isArray(draftRow.metrics) ? draftRow.metrics : [];
  let nextAnalytics =
    draftRow.analytics && typeof draftRow.analytics === 'object'
      ? draftRow.analytics as Record<string, unknown>
      : {};

  if (args.mode === 'full') {
    const pendingPhaseB: PhaseBRecord = {
      status: 'pending',
      startedAt: nowIso,
      slotFill: buildPendingStage(nowIso),
      basicMetrics: buildPendingStage(nowIso),
      requirementAnalysis: buildPendingStage(nowIso),
      sectionGaps: buildPendingStage(nowIso),
      contentStandards: buildPendingStage(nowIso),
    };
    nextFeedback.phaseB = pendingPhaseB;
    await supabase.from('cover_letters').update({
      llm_feedback: nextFeedback,
      updated_at: nowIso,
    }).eq('id', args.draftId);
  }

  if (args.mode === 'full' || args.mode === 'slots-only') {
    const [workHistory, approvedStories] = await Promise.all([
      fetchWorkHistory(supabase, args.userId),
      fetchStories(supabase, args.userId),
    ]);

    const slotResult = await fillTemplateSlots(args.openAiApiKey, nextSections, jobDescription, workHistory, approvedStories);
    nextSections = slotResult.sections;
    const slotCompletedAt = new Date().toISOString();
    const slotFillStatus: PhaseBStageRecord =
      slotResult.templateSlots?.unresolvedTokenCount && slotResult.templateSlots.unresolvedTokenCount > 0
        ? {
            status: 'error',
            startedAt: nowIso,
            failedAt: slotCompletedAt,
            message: String(slotResult.templateSlots.message || 'One or more template slots remain unresolved.'),
          }
        : {
            status: 'success',
            startedAt: nowIso,
            completedAt: slotCompletedAt,
          };
    nextFeedback = {
      ...nextFeedback,
      templateSlots: slotResult.templateSlots,
      phaseB: {
        ...(nextFeedback.phaseB && typeof nextFeedback.phaseB === 'object' ? nextFeedback.phaseB : {}),
        slotFill: slotFillStatus,
      },
    };

    await supabase.from('cover_letters').update({
      sections: nextSections as unknown as Record<string, unknown>,
      llm_feedback: nextFeedback,
      updated_at: new Date().toISOString(),
    }).eq('id', args.draftId);

    if (args.mode === 'slots-only') {
      return {
        ok: true,
        mode: args.mode,
        sectionsUpdated: true,
      };
    }

    const results = await Promise.allSettled([
      calculateBasicMetrics(args.openAiApiKey, nextSections, jobDescription),
      calculateRequirementAnalysis(args.openAiApiKey, nextSections, jobDescription, workHistory, approvedStories),
      calculateSectionGaps(args.openAiApiKey, nextSections, jobDescription),
      calculateContentStandards(args.openAiApiKey, nextSections, jobDescription),
    ]);

    const [basicMetricsResult, requirementResult, sectionGapResult, contentStandardsResult] = results;
    const completedAt = new Date().toISOString();

    const phaseB: PhaseBRecord = {
      status: results.every((result) => result.status === 'fulfilled') ? 'success' : 'error',
      startedAt: nowIso,
      completedAt,
      message: results.every((result) => result.status === 'fulfilled')
        ? undefined
        : 'One or more Phase B analyses failed.',
      slotFill: slotFillStatus,
      basicMetrics: basicMetricsResult.status === 'fulfilled'
        ? { status: 'success', startedAt: nowIso, completedAt }
        : { status: 'error', startedAt: nowIso, failedAt: completedAt, message: String(basicMetricsResult.reason?.message || basicMetricsResult.reason || 'Unknown error') },
      requirementAnalysis: requirementResult.status === 'fulfilled'
        ? { status: 'success', startedAt: nowIso, completedAt }
        : { status: 'error', startedAt: nowIso, failedAt: completedAt, message: String(requirementResult.reason?.message || requirementResult.reason || 'Unknown error') },
      sectionGaps: sectionGapResult.status === 'fulfilled'
        ? { status: 'success', startedAt: nowIso, completedAt }
        : { status: 'error', startedAt: nowIso, failedAt: completedAt, message: String(sectionGapResult.reason?.message || sectionGapResult.reason || 'Unknown error') },
      contentStandards: contentStandardsResult.status === 'fulfilled'
        ? { status: 'success', startedAt: nowIso, completedAt }
        : { status: 'error', startedAt: nowIso, failedAt: completedAt, message: String(contentStandardsResult.reason?.message || contentStandardsResult.reason || 'Unknown error') },
    };

    nextFeedback.phaseB = phaseB;

    if (basicMetricsResult.status === 'fulfilled') {
      nextFeedback.metrics = basicMetricsResult.value.raw;
      nextMetrics = basicMetricsResult.value.metrics as any[];
      nextAnalytics = {
        ...nextAnalytics,
        atsScore: basicMetricsResult.value.atsScore,
        overallScore:
          contentStandardsResult.status === 'fulfilled' && contentStandardsResult.value?.aggregated?.overallScore !== undefined
            ? contentStandardsResult.value.aggregated.overallScore
            : ((basicMetricsResult.value.metrics.find((metric: any) => metric.key === 'rating' && metric.type === 'score') as any)?.value ?? nextAnalytics.overallScore),
        generatedAt: completedAt,
      };
    }

    const mergedEnhanced = {
      ...existingEnhanced,
      ...(requirementResult.status === 'fulfilled' ? requirementResult.value : {}),
      ...(sectionGapResult.status === 'fulfilled' ? sectionGapResult.value.enhancedMatchData : {}),
    };

    nextFeedback.enhancedMatchData = mergedEnhanced;

    if (sectionGapResult.status === 'fulfilled' && Array.isArray(sectionGapResult.value.ratingCriteria)) {
      nextFeedback.rating = {
        criteria: sectionGapResult.value.ratingCriteria,
      };
    }

    if (contentStandardsResult.status === 'fulfilled') {
      nextFeedback.contentStandards = contentStandardsResult.value;
    }

    await supabase.from('cover_letters').update({
      sections: nextSections as unknown as Record<string, unknown>,
      llm_feedback: nextFeedback,
      metrics: nextMetrics as unknown as Record<string, unknown>,
      analytics: nextAnalytics as unknown as Record<string, unknown>,
      updated_at: completedAt,
    }).eq('id', args.draftId);

    return {
      ok: true,
      mode: args.mode,
      phaseB,
      metricsCalculated: basicMetricsResult.status === 'fulfilled',
      gapsCalculated: sectionGapResult.status === 'fulfilled',
    };
  }

  const sectionGapStartedAt = new Date().toISOString();
  const existingPhaseB = (existingFeedback.phaseB as Record<string, unknown> | undefined) ?? {};
  const pendingPhaseB: PhaseBRecord = {
    ...(existingPhaseB as PhaseBRecord),
    sectionGaps: buildPendingStage(sectionGapStartedAt),
  };
  nextFeedback.phaseB = pendingPhaseB;

  await supabase.from('cover_letters').update({
    llm_feedback: nextFeedback,
    updated_at: sectionGapStartedAt,
  }).eq('id', args.draftId);

  try {
    const gapResult = await calculateSectionGaps(args.openAiApiKey, nextSections, jobDescription);
    const completedAt = new Date().toISOString();
    const mergedEnhanced = {
      ...existingEnhanced,
      ...(gapResult.enhancedMatchData || {}),
    };
    nextFeedback = {
      ...nextFeedback,
      enhancedMatchData: mergedEnhanced,
      phaseB: {
        ...(pendingPhaseB as Record<string, unknown>),
        sectionGaps: {
          status: 'success',
          startedAt: sectionGapStartedAt,
          completedAt,
        },
      },
    };

    await supabase.from('cover_letters').update({
      llm_feedback: nextFeedback,
      updated_at: completedAt,
    }).eq('id', args.draftId);

    return {
      ok: true,
      mode: args.mode,
      gapsCalculated: true,
    };
  } catch (error) {
    const failedAt = new Date().toISOString();
    nextFeedback = {
      ...nextFeedback,
      phaseB: {
        ...(pendingPhaseB as Record<string, unknown>),
        sectionGaps: {
          status: 'error',
          startedAt: sectionGapStartedAt,
          failedAt,
          message: error instanceof Error ? error.message : String(error),
        },
      },
    };

    await supabase.from('cover_letters').update({
      llm_feedback: nextFeedback,
      updated_at: failedAt,
    }).eq('id', args.draftId);

    throw error;
  }
}
