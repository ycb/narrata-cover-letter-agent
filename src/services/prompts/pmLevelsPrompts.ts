/**
 * PM Levels Service Prompts
 * 
 * Prompts for extracting signals, scoring competencies, deriving business maturity,
 * and generating recommendations for PM level inference.
 */

/**
 * Extract signals from user content (scope, impact, influence)
 */
export const EXTRACT_SIGNALS_PROMPT = (content: string): string => {
  return `You are an expert at analyzing product management experience to extract leveling signals.

Analyze the following professional content (resume, cover letter, LinkedIn, stories) and extract signals that indicate PM level:

${content}

Extract the following signals:

1. SCOPE SIGNALS:
   - Number of teams worked with/cross-functional teams
   - Revenue impact (if quantified: $ amount, % growth)
   - Users/impact scale (if quantified: number of users, % adoption)
   - Organization size (team size, company size)

2. IMPACT SIGNALS:
   - Metrics mentioned (revenue, users, engagement, efficiency, etc.)
   - Whether metrics are quantified (numbers, percentages, dollar amounts)
   - Scale of impact: 'feature' (single feature), 'team' (cross-team), 'org' (organization-wide), 'company' (company-wide)

3. INFLUENCE SIGNALS:
   - Cross-functional collaboration (worked with engineering, design, sales, etc.)
   - Executive influence (presented to executives, worked with VP+, influenced strategy)
   - External influence (spoke at conferences, wrote articles, open source contributions)
   - Team size led or influenced

4. METRICS:
   - List all quantifiable metrics mentioned
   - Extract numbers, percentages, dollar amounts

Return ONLY valid JSON with this structure:
{
  "scope": {
    "teams": <number of teams/cross-functional teams>,
    "revenueImpact": <revenue impact in $ or null>,
    "usersImpact": <number of users impacted or null>,
    "orgSize": <organization/company size or null>
  },
  "impact": {
    "metrics": [<array of metric strings>],
    "quantified": <true if metrics have numbers, false otherwise>,
    "scale": <"feature" | "team" | "org" | "company">
  },
  "influence": {
    "crossFunctional": <true if worked across functions, false otherwise>,
    "executive": <true if worked with executives, false otherwise>,
    "external": <true if external influence (conferences, articles, etc.), false otherwise>,
    "teamSize": <size of team led/influenced or null>
  },
  "teamSize": <average or largest team size or null>,
  "metrics": [<array of all metrics mentioned as strings>]
}

Return valid JSON only, no markdown formatting.`;
};

/**
 * Rate competencies on 0-3 scale
 */
export const RATE_COMPETENCIES_PROMPT = (
  content: string,
  roleTypes: string[],
  businessMaturity: string
): string => {
  return `You are an expert at evaluating product management competencies.

Analyze the following professional content and rate competencies on a 0-3 scale:

${content}

Role Types: ${roleTypes.join(', ') || 'general'}
Business Maturity: ${businessMaturity}

Rate each competency dimension (0-3 scale):
- 0: No evidence or minimal evidence
- 1: Basic evidence, entry-level
- 2: Strong evidence, solid performance
- 3: Exceptional evidence, expert-level

COMPETENCY DIMENSIONS:

1. EXECUTION (0-3):
   - Delivering products on time and within scope
   - Managing product development lifecycle
   - Shipping features with measurable impact
   - Technical understanding and collaboration with engineering

2. CUSTOMER_INSIGHT (0-3):
   - User research and understanding customer needs
   - Data analysis and metrics-driven decisions
   - Market validation and product-market fit
   - User feedback integration

3. STRATEGY (0-3):
   - Product vision and roadmap planning
   - Market analysis and competitive positioning
   - Business model understanding
   - Long-term thinking and planning

4. INFLUENCE (0-3):
   - Cross-functional leadership
   - Stakeholder management
   - Executive communication
   - Team building and mentorship

Return ONLY valid JSON with this structure:
{
  "execution": <0-3>,
  "customer_insight": <0-3>,
  "strategy": <0-3>,
  "influence": <0-3>
}

Return valid JSON only, no markdown formatting.`;
};

/**
 * Derive business maturity from company metadata
 */
export const DERIVE_BUSINESS_MATURITY_PROMPT = (companies: Array<{
  name: string;
  size?: number;
  fundingStage?: string;
  yearsActive?: number;
}>): string => {
  return `You are an expert at determining business maturity from company information.

Analyze the following company metadata and determine business maturity:

${JSON.stringify(companies, null, 2)}

Business Maturity Levels:
- "early": Seed/Series A, <50 employees, <3 years old
- "growth": Series B/C, 50-500 employees, 3-10 years old
- "late": Series D+, public, or >500 employees, >10 years old

For each company, determine maturity based on:
1. Funding stage (seed/Series A = early, Series B/C = growth, Series D+/public = late)
2. Company size (<50 = early, 50-500 = growth, >500 = late)
3. Years active (<3 = early, 3-10 = growth, >10 = late)

If multiple companies, use the most mature one (highest level).

Return ONLY valid JSON with this structure:
{
  "maturity": <"early" | "growth" | "late">,
  "value": <0.8 for early, 1.0 for growth, 1.2 for late>,
  "reasoning": <brief explanation>
}

Return valid JSON only, no markdown formatting.`;
};

/**
 * Generate actionable recommendations
 */
export const GENERATE_RECOMMENDATIONS_PROMPT = (
  currentLevel: string,
  targetLevel: string | undefined,
  competencyScores: { execution: number; customer_insight: number; strategy: number; influence: number },
  signals: any
): string => {
  return `You are an expert at providing actionable recommendations for PM career growth.

Current Level: ${currentLevel}
${targetLevel ? `Target Level: ${targetLevel}` : 'No target level specified'}

Competency Scores (0-3 scale):
- Execution: ${competencyScores.execution}
- Customer Insight: ${competencyScores.customer_insight}
- Strategy: ${competencyScores.strategy}
- Influence: ${competencyScores.influence}

Signals:
${JSON.stringify(signals, null, 2)}

Generate actionable recommendations to:
1. Strengthen weak competencies (scores < 2.0)
2. Expand scope (if scope is limited)
3. Add quantifiable metrics (if metrics are missing)
4. Build stories that demonstrate target level competencies

Recommendation Types:
- "add-story": Need to add more stories demonstrating competency
- "quantify-metrics": Need to add numbers/percentages to existing stories
- "strengthen-competency": Need to develop specific competency
- "expand-scope": Need to work on larger scope projects

Return ONLY valid JSON array with this structure:
[
  {
    "id": <unique id>,
    "type": <"add-story" | "quantify-metrics" | "strengthen-competency" | "expand-scope">,
    "priority": <"high" | "medium" | "low">,
    "title": <short title>,
    "description": <detailed description>,
    "competency": <"execution" | "customer_insight" | "strategy" | "influence" | null>,
    "suggestedAction": <specific actionable step>,
    "relatedStories": [<array of story IDs if applicable>]
  }
]

Prioritize recommendations:
- High: Competency score < 1.5 or critical gap to target level
- Medium: Competency score 1.5-2.0 or moderate gap
- Low: Competency score > 2.0 or minor improvements

Return valid JSON only, no markdown formatting.`;
};

