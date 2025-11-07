// Content tagging prompt for automatic story and metrics categorization
// TODO: As this grows, consider:
// - Parameterizing weighting (e.g., industries vs. business models)
// - Breaking into smaller functions (e.g., buildCompanyTagPrompt, buildRoleTagPrompt)
// - Adding configurable tag categories
import type { CompanyResearchResult } from '@/services/browserSearchService';

export const buildContentTaggingPrompt = (
  content: string, 
  contentType: 'company' | 'role' | 'saved_section',
  userGoals?: { industries?: string[]; businessModels?: string[] },
  companyResearch?: CompanyResearchResult | null
): string => {
  const userContext = userGoals 
    ? `\n\nUSER PREFERENCES (HIGH PRIORITY - PRIORITIZE THESE):\n- Industries of interest: ${userGoals.industries?.join(', ') || 'none'}\n- Business models of interest: ${userGoals.businessModels?.join(', ') || 'none'}\n\nCRITICAL: When suggesting tags, prioritize tags that align with these preferences. If the content relates to these industries/business models, include them as high-confidence tags in the primaryTags array. Map industries to relevant role tags (e.g., "Fintech" → "financial products", "B2B SaaS" → "enterprise", "Healthcare" → "health tech").`
    : '';

  const companyContext = companyResearch
    ? `\n\nCOMPANY RESEARCH (FROM WEB SEARCH):\n- Industry: ${companyResearch.industry || 'unknown'}\n- Business Model: ${companyResearch.businessModel || 'unknown'}\n- Company Stage: ${companyResearch.companyStage || 'unknown'}\n- Company Size: ${companyResearch.companySize || 'unknown'}\n- Description: ${companyResearch.description || 'N/A'}\n- Key Products: ${companyResearch.keyProducts?.join(', ') || 'N/A'}\n\nUse this research data to enhance tag suggestions. Prioritize tags that match the researched industry and business model.`
    : '';
  
  return `You are an expert at analyzing professional content and generating relevant tags for matching and categorization.
${userContext}${companyContext}

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

For SAVED SECTIONS, focus on:
- Content theme (professional, passionate, technical, etc.)
- Use case (introduction, closer, signature, custom)
- Tone/style
- Key messaging

Return ONLY valid JSON with this structure:

{
  "primaryTags": ["tag1", "tag2", "tag3"],
  "skillTags": ["skill1", "skill2"],
  "industryTags": ["industry1", "industry2"],
  "roleLevelTags": ["senior", "leadership"],
  "scopeTags": ["team-management", "cross-functional"],
  "contextTags": ["startup", "enterprise", "remote"],
  "matchingKeywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": "high|medium|low"
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

TAGGING EXAMPLES:

Example 1 - Company Tags (Stripe):
{
  "primaryTags": ["B2B", "Platform"],
  "industryTags": ["Fintech / Payments / Crypto"],
  "businessModelTags": ["B2B", "Platform"],
  "skillTags": [],
  "roleLevelTags": [],
  "scopeTags": [],
  "contextTags": [],
  "matchingKeywords": ["payment processing", "economic infrastructure", "API"],
  "confidence": "high"
}

Example 2 - Role Tags (Product Manager at SaaS company):
{
  "primaryTags": ["Product Management", "B2B SaaS", "Enterprise"],
  "industryTags": ["Software / SaaS"],
  "skillTags": ["product strategy", "roadmap planning", "stakeholder management"],
  "roleLevelTags": ["senior", "leadership"],
  "scopeTags": ["cross-functional", "team-management"],
  "contextTags": ["enterprise", "growth-stage"],
  "matchingKeywords": ["product", "SaaS", "B2B", "enterprise software"],
  "confidence": "high"
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
