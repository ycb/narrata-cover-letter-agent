// Content tagging prompt for automatic story and metrics categorization
// TODO: As this grows, consider:
// - Parameterizing weighting (e.g., industries vs. business models)
// - Breaking into smaller functions (e.g., buildCompanyTagPrompt, buildRoleTagPrompt)
// - Adding configurable tag categories
import type { CompanyResearchResult } from '@/services/browserSearchService';

export interface GapContext {
  gapCategory?: string;
  gapType?: string;
  gapDescription?: string;
  suggestions?: any[];
}

export const buildContentTaggingPrompt = (
  content: string, 
  contentType: 'company' | 'role' | 'saved_section' | 'story',
  userGoals?: { industries?: string[]; businessModels?: string[] },
  companyResearch?: CompanyResearchResult | null,
  gapContext?: GapContext | null
): string => {
  const userContext = userGoals 
    ? `\n\nUSER PREFERENCES (HIGH PRIORITY - PRIORITIZE THESE):\n- Industries of interest: ${userGoals.industries?.join(', ') || 'none'}\n- Business models of interest: ${userGoals.businessModels?.join(', ') || 'none'}\n\nCRITICAL: When suggesting tags, prioritize tags that align with these preferences. If the content relates to these industries/business models, include them as high-confidence tags in the primaryTags array. Map industries to relevant role tags (e.g., "Fintech" → "financial products", "B2B SaaS" → "enterprise", "Healthcare" → "health tech").`
    : '';

  const companyContext = companyResearch
    ? `\n\nCOMPANY RESEARCH:\n- Industry: ${companyResearch.industry || 'unknown'}\n- Business Model: ${companyResearch.businessModel || 'unknown'}\n\nUSE researched industry/model as primary tags. Add 2-3 specific tags from company description.`
    : '';

  const gapContextSection = gapContext
    ? `\n\nGAP CONTEXT (This content addresses a specific gap):\n- Gap Category: ${gapContext.gapCategory || 'unknown'}\n- Gap Type: ${gapContext.gapType || 'unknown'}\n- Gap Description: ${gapContext.gapDescription || 'N/A'}\n- Suggestions: ${gapContext.suggestions?.map((s: any) => typeof s === 'string' ? s : s?.suggestion || s?.description || JSON.stringify(s)).join(', ') || 'N/A'}\n\nUse this gap context to inform tag suggestions. Tags should reflect what gap this content addresses and what competencies/skills it demonstrates.`
    : '';
  
  return `You are an expert at analyzing professional content and generating relevant tags for matching and categorization.
${userContext}${companyContext}${gapContextSection}

Content to analyze:
${content}

Content Type: ${contentType}

Your task: Generate relevant tags that will help match this content to job descriptions and opportunities.

For STORIES, focus on:
- Skills demonstrated
- Industry/domain
- Role level (entry, mid, senior, executive)
- Company size/type
- Project scope
- Leadership level
- Technical vs business focus
- Problem-solving approach

For METRICS, focus on:
- Metric type (revenue, cost, efficiency, growth, team size, etc.)
- Industry relevance
- Scale/scope
- Timeframe
- Impact level

For COMPANY tags, focus ONLY on:
- Business Model/Buyers (see examples below)
- Industry/Vertical (see examples below)

DO NOT include:
- Skills or competencies (those are for roles/stories)
- Role levels (entry, mid, senior, executive)
- Company stage or size (not needed for matching)

BUSINESS MODEL / BUYERS EXAMPLES:
B2B, B2C, D2C, B2B2C, Enterprise, SMB, Marketplace, Platform, Developer Tools, SaaS

VERTICAL / INDUSTRY EXAMPLES:

*Technology & Infrastructure*
- Software / SaaS
- AI / Machine Learning
- Cloud / DevOps
- Cybersecurity
- Data / Analytics
- Fintech / Payments / Crypto
- Telecommunications / Connectivity
- IoT / Edge Computing

*Health & Life Sciences*
- Healthcare / MedTech
- HealthTech / Digital Health
- Biotech / Pharma
- Wellness / Fitness

*Consumer & Commerce*
- E-commerce / Retail
- Consumer Goods / D2C
- FoodTech / AgTech
- Travel / Hospitality
- Media / Entertainment / Gaming

*Education & Work*
- EdTech / Learning Platforms
- HRTech / Future of Work
- Productivity / Collaboration
- Recruiting / Talent Platforms

*Financial & Professional Services*
- Banking / Insurance / Lending
- LegalTech / Compliance
- Accounting / ERP / Back Office
- Consulting / Services

For ROLE tags, focus on:
- Industry/domain
- Role level (entry, mid, senior, executive)
- Function (product management, engineering, sales, marketing, etc.)
- Key skills/technologies
- Leadership scope
- Competencies demonstrated
- Company maturity at tenure: Include ONE of "startup", "growth-stage", or "enterprise" 
  based on company description, role context, or explicit mentions. Infer from company 
  size, funding stage, or description if not explicitly stated.

IMPORTANT: Role-level tags should reflect demonstrated work and accomplishments shown in the stories provided. 
Tags should be substantiated by the actual work described in the stories, not just the job description.
If stories are provided, prioritize tags that align with the demonstrated achievements and impact.

For SAVED SECTIONS, focus on:
- Content theme (professional, passionate, technical, etc.)
- Use case (introduction, closer, signature, custom)
- Tone/style
- Key messaging

Return ONLY valid JSON with this structure for STREAMING support:

{
  "tags": [
    {
      "value": "tag name",
      "confidence": "high|medium|low",
      "category": "industry|business_model|skill|competency|other"
    }
  ]
}

CONFIDENCE LEVELS:
- "high": Well-established facts based on clear evidence (e.g., "SaaS" for a cloud software company, user goal industries)
- "medium": Likely but not certain (e.g., "Enterprise" inferred from company description without explicit confirmation)
- "low": Educated guess or inferred from limited context

CATEGORY TYPES:
- "industry": Vertical/industry tags (e.g., "Software / SaaS", "Fintech / Payments / Crypto")
- "business_model": Business model tags (e.g., "B2B", "B2C", "Enterprise", "Marketplace")
- "skill": Technical or soft skills (for role/story/saved_section only)
- "competency": Role levels, scope, leadership (for role/story/saved_section only)
- "other": General tags that don't fit above categories

For LEGACY support (non-streaming), also return:
{
  "primaryTags": ["tag1", "tag2", "tag3"],
  "businessModelTags": ["B2B", "SaaS"],
  "industryTags": ["industry1", "industry2"],
  "skillTags": ["skill1", "skill2"],
  "roleLevelTags": ["senior", "leadership"],
  "scopeTags": ["team-management", "cross-functional"],
  "contextTags": ["startup", "enterprise", "remote"],
  "matchingKeywords": ["keyword1", "keyword2", "keyword3"]
}

TAGGING RULES:
- Be specific but not overly narrow
- Focus on tags that would help match to job descriptions
- Include both technical and soft skills
- Consider industry and company context
- Generate 3-5 primary tags, 2-3 of each category
- Confidence should reflect how clear the content is for tagging
- Use the provided business model and vertical examples as reference for consistency
- Map industries to relevant role tags (e.g., "Fintech" → "financial products", "B2B SaaS" → "enterprise", "Healthcare" → "health tech")
- CRITICAL: Do NOT include duplicate tags. Each tag should appear only once across all arrays (primaryTags, industryTags, skillTags, etc.)
- Use consistent capitalization (e.g., "SaaS" not "Saas", "B2B" not "b2b")

TAGGING EXAMPLES:

Example 1 - Company Tags (Stripe):
{
  "tags": [
    {"value": "Fintech / Payments / Crypto", "confidence": "high", "category": "industry"},
    {"value": "B2B", "confidence": "high", "category": "business_model"},
    {"value": "Platform", "confidence": "high", "category": "business_model"},
    {"value": "Developer Tools", "confidence": "medium", "category": "business_model"}
  ],
  "primaryTags": ["B2B", "Platform"],
  "industryTags": ["Fintech / Payments / Crypto"],
  "businessModelTags": ["B2B", "Platform"],
  "skillTags": [],
  "roleLevelTags": [],
  "scopeTags": [],
  "contextTags": [],
  "matchingKeywords": ["payment processing", "economic infrastructure", "API"]
}

Example 2 - Role Tags (Product Manager at SaaS company):
{
  "tags": [
    {"value": "Software / SaaS", "confidence": "high", "category": "industry"},
    {"value": "B2B", "confidence": "high", "category": "business_model"},
    {"value": "product strategy", "confidence": "high", "category": "skill"},
    {"value": "roadmap planning", "confidence": "high", "category": "skill"},
    {"value": "senior", "confidence": "medium", "category": "competency"},
    {"value": "leadership", "confidence": "medium", "category": "competency"}
  ],
  "primaryTags": ["Product Management", "B2B SaaS", "Enterprise"],
  "industryTags": ["Software / SaaS"],
  "skillTags": ["product strategy", "roadmap planning", "stakeholder management"],
  "roleLevelTags": ["senior", "leadership"],
  "scopeTags": ["cross-functional", "team-management"],
  "contextTags": ["enterprise", "growth-stage"],
  "matchingKeywords": ["product", "SaaS", "B2B", "enterprise software"]
}

Example 3 - Saved Section Tags (Cover letter intro):
{
  "primaryTags": ["Professional", "Introduction", "Mission-aligned"],
  "industryTags": [],
  "skillTags": [],
  "roleLevelTags": [],
  "scopeTags": [],
  "contextTags": ["professional", "formal"],
  "matchingKeywords": ["introduction", "mission", "passion"],
  "confidence": "medium"
}

Return valid JSON only, no markdown formatting.`;
};

// Enhanced tagging for job description matching
export const buildJobMatchingTagsPrompt = (content: string, jobDescription: string): string => {
  return `You are an expert at matching professional content to job requirements.

Content:
${content}

Job Description:
${jobDescription}

Your task: Generate tags that will help match this content to the specific job requirements.

Focus on:
- Direct skill matches
- Experience level alignment
- Industry relevance
- Role compatibility
- Leadership scope match
- Technical requirements alignment

Return ONLY valid JSON:

{
  "matchScore": 85, // 0-100
  "skillMatches": ["skill1", "skill2"],
  "experienceMatches": ["senior-level", "team-leadership"],
  "industryMatches": ["saas", "fintech"],
  "roleMatches": ["product-management", "strategy"],
  "leadershipMatches": ["team-management", "cross-functional"],
  "technicalMatches": ["python", "data-analysis"],
  "gapAreas": ["area1", "area2"], // Where content doesn't match
  "strengthAreas": ["area1", "area2"], // Where content strongly matches
  "recommendedEmphasis": ["point1", "point2"] // What to highlight
}

MATCHING RULES:
- Score based on direct relevance to job requirements
- Identify both matches and gaps
- Focus on actionable insights
- Consider both hard and soft skills
- Weight recent experience higher
- Consider leadership and scope alignment

Return valid JSON only, no markdown formatting.`;
};
