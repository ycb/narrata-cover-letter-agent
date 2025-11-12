// PM Levels Service LLM Prompts
// Temperature ≤ 0.3 for deterministic outputs

export const EXTRACT_SIGNALS_PROMPT = `You are a product management expert analyzing career content to extract objective signals for level assessment.

Analyze the following content and extract structured signals. Focus on factual evidence, not interpretation.

Content:
{content}

Extract and return a JSON object with this exact structure:
{
  "scope": {
    "teams": <number of teams worked with/cross-functional teams>,
    "revenueImpact": <estimated revenue impact in dollars, or null>,
    "usersImpact": <number of users affected, or null>,
    "orgSize": <organization size if mentioned, or null>
  },
  "impact": {
    "metrics": [<array of specific metrics mentioned>],
    "quantified": <boolean - true if metrics include numbers>,
    "scale": <"feature" | "team" | "org" | "company">
  },
  "influence": {
    "crossFunctional": <boolean - worked with multiple teams>,
    "executive": <boolean - presented to executives/leadership>,
    "external": <boolean - worked with external partners/customers>,
    "teamSize": <number of people managed/led, or null>
  },
  "teamSize": <size of team if mentioned, or null>,
  "metrics": [<array of all metrics/numbers mentioned>]
}

Rules:
- Only extract facts that are explicitly stated or clearly implied
- Use null for missing information
- Be conservative with estimates
- Focus on the most impactful signals mentioned
`;

export const RATE_COMPETENCIES_PROMPT = `You are a product management expert rating competencies on a 0-3 scale based on content evidence.

Content:
{content}

Rate each competency dimension (0-3) where:
- 0 = No evidence
- 1 = Limited evidence / entry-level
- 2 = Solid evidence / mid-level
- 3 = Strong evidence / senior-level

Return a JSON object with this exact structure:
{
  "execution": <0-3 score based on delivery consistency, quality, technical depth>,
  "customer_insight": <0-3 score based on user research, market understanding, validation>,
  "strategy": <0-3 score based on problem definition, goal setting, business alignment>,
  "influence": <0-3 score based on cross-functional leadership, stakeholder management, team building>
}

Scoring Guidelines:
- Execution: Look for delivery track record, technical depth, quality metrics
- Customer Insight: Look for research methods, user interviews, validation approaches
- Strategy: Look for problem framing, OKRs, business outcomes, pivots
- Influence: Look for team leadership, stakeholder alignment, cross-functional collaboration

Be objective and evidence-based.`;

export const DERIVE_BUSINESS_MATURITY_PROMPT = `Analyze company information to determine business maturity stage.

Company Information:
{companyInfo}

Return a JSON object with this structure:
{
  "maturity": <"early" | "growth" | "late">,
  "confidence": <0-1>,
  "reasoning": "<brief explanation>"
}

Classification:
- "early": Seed to Series A, <50 employees, <3 years old
- "growth": Series B-D, 50-1000 employees, 3-10 years old
- "late": Series E+, public, or >1000 employees, >10 years old

If information is insufficient, use "growth" as default with low confidence.`;

export const GENERATE_RECOMMENDATIONS_PROMPT = `Generate actionable recommendations to help a PM progress from their current level to their target level.

Current Level: {currentLevel}
Target Level: {targetLevel}
Competency Gaps: {gaps}
Delta Summary: {deltaSummary}

Generate 3-5 specific, actionable recommendations. Return a JSON array:
[
  {
    "type": <"add-story" | "quantify-metrics" | "strengthen-competency" | "expand-scope">,
    "priority": <"high" | "medium" | "low">,
    "title": "<short title>",
    "description": "<what's missing or needs improvement>",
    "competency": <"execution" | "customer_insight" | "strategy" | "influence" | null>,
    "suggestedAction": "<specific action the user should take>"
  }
]

Focus on:
- Specific, measurable improvements
- Clear actions the user can take
- Priority based on impact to level progression
- Address gaps in weakest competencies first`;

