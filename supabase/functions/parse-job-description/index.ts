/**
 * Parse Job Description Edge Function
 * 
 * Replaces client-side job description parsing with secure server-side implementation.
 * Uses the same prompt as jobDescriptionService.parseJobDescription() but runs on the server.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Imported from client-side prompt (src/prompts/jobDescriptionAnalysis.ts)
const buildJobDescriptionAnalysisPrompt = (text: string): string => {
  return `You are an expert at parsing job descriptions to extract structured data for a job application platform.

Your goal: Extract key information from the job description to enable matching and gap analysis.

Job Description Text:
${text}

⚠️ CRITICAL REQUIREMENT EXTRACTION RULES (READ FIRST) ⚠️

**INTELLIGENT EXTRACTION - Analyze the ENTIRE document, not just one section:**

1. **Look for requirements EVERYWHERE in the JD:**
   - Qualifications sections (explicit requirements)
   - Responsibilities sections (convert "You'll X" → "Experience with X")
   - Job description body (requirements mentioned in context)
   - "What we're looking for" sections
   - Any section that describes what the candidate needs

2. **Identify priority through signals:**
   - **Keywords**: "must", "required", "essential", "critical" → Core requirement
   - **Keywords**: "preferred", "nice to have", "bonus", "strong preference" → Preferred requirement
   - **Repetition**: If mentioned multiple times → Higher priority
   - **Position**: Earlier mentions often indicate higher priority
   - **Emphasis**: Bold text, bullet points, dedicated sections → Important

3. **Extract from responsibilities:**
   - "You'll define product vision" → "Experience defining product vision and strategy"
   - "You'll create roadmaps" → "Experience creating and maintaining product roadmaps"
   - "You'll manage teams" → "Experience managing cross-functional teams"
   - Convert action statements into experience requirements

4. **Break down compound requirements:**
   - "5+ years PM with strong preference for AI" → TWO items:
     * Core: "5+ years of product management experience"
     * Preferred: "AI/ML product experience"

5. **Look for patterns:**
   - If JD emphasizes a skill/technology multiple times → Extract as requirement
   - If JD has a dedicated section about requirements → Extract all items
   - If JD mentions something as "critical" or "essential" → Core requirement
   - If JD mentions something as "preferred" or "ideal" → Preferred requirement

**Goal: Extract ALL requirements mentioned anywhere in the JD, not just from one section.**

Return ONLY valid JSON with this exact structure. ALL FIELDS ARE REQUIRED:

{
  "company": "Company Name",
  "role": "Job Title / Role Name",
  "salary": "Salary range (e.g., '$160,000-200,000', '$180K-220K', '180-200k') or null",
  "companyIndustry": "Industry name (e.g., 'Legal Tech', 'Fintech', 'Healthcare SaaS') or null",
  "companyVertical": "Sub-industry or vertical (e.g., 'Solar SaaS', 'Construction Tech', 'Retail Analytics') or null",
  "companyBusinessModel": "Business model (e.g., 'B2B SaaS', 'B2C Marketplace', 'Enterprise Platform') or null",
  "buyerSegment": "Primary buyer segment(s) (e.g., 'SMB', 'Mid-market', 'Enterprise', 'Consumer') or null",
  "userSegment": "Primary end-user segment(s) (e.g., 'Installers', 'Operations teams', 'Consumers') or null",
  "companyMaturity": "startup|growth-stage|late-stage|enterprise or null",
  "companyMission": "Company mission statement or purpose (1-2 sentences) or null",
  "companyValues": ["value 1", "value 2", "value 3"] or [],
  "workType": "Work arrangement (e.g., 'Remote', 'Hybrid', 'In-person', 'Remote (US only)') or null",
  "location": "Primary location (e.g., 'Seattle, WA', 'San Francisco Bay Area', 'New York, NY') or null",
  "coreRequirements": [
    "Requirement 1 (e.g., '5+ years of product management experience')",
    "Requirement 2 (e.g., 'B2B SaaS background')"
  ],
  "preferredRequirements": [
    "Requirement 1 (e.g., 'SQL/Python proficiency')",
    "Requirement 2 (e.g., 'MBA or equivalent experience')",
    "Requirement 3 (e.g., 'Experience with AI/ML technologies')"
  ],
  "differentiatorSummary": "1-2 sentence summary of what makes this role unique or what the company is specifically seeking (e.g., 'Seeks PM with AI/ML experience and growth metrics focus')"
}

EXTRACTION RULES:

1. COMPANY: Extract the company name exactly as written
2. ROLE: Extract the exact job title/role name
3. SALARY: Extract the salary range exactly as stated (null if not mentioned)
4. COMPANY INDUSTRY: Extract the industry or sector (be specific, e.g., "Legal Tech" not "Technology")
5. COMPANY VERTICAL: Extract specific vertical/sub-industry (null if already maximally specific)
6. COMPANY BUSINESS MODEL: How company makes money (e.g., "B2B SaaS", null if not mentioned)
7. BUYER SEGMENT: Primary buyer segment(s), infer from context when possible
8. USER SEGMENT: Primary end-users, infer from product descriptions
9. COMPANY MATURITY: startup|growth-stage|late-stage|enterprise (null if unclear)
10. WORK TYPE: Work arrangement ("Remote", "Hybrid", "In-person", null if not mentioned)
11. LOCATION: Primary work location (null if not mentioned or fully remote)
12. COMPANY MISSION: Mission statement or purpose (1-2 sentences, null if not found)
13. COMPANY VALUES: Stated values or cultural principles (empty array if none)
14. CORE REQUIREMENTS: ALL must-have requirements (analyze entire JD, convert responsibilities)
15. PREFERRED REQUIREMENTS: ALL nice-to-have requirements (break down compound requirements)
16. DIFFERENTIATOR SUMMARY: What makes role unique (1-2 sentences)

CRITICAL:
- Return ONLY the JSON object
- No markdown formatting
- No explanations
- All fields are required (use null for missing strings, [] for missing arrays)
- Extract comprehensively from the ENTIRE JD
- Convert "You'll X" responsibilities to "Experience with X" requirements
- Break down compound requirements into separate items
`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('[parse-job-description] Auth failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid auth token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();
    const { content } = requestData;

    if (!content || typeof content !== 'string' || content.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: 'Job description content must be at least 50 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[parse-job-description] Parsing JD for user:', user.id, 'length:', content.length);

    // Build prompt
    const prompt = buildJobDescriptionAnalysisPrompt(content.trim());

    // Call OpenAI with streaming
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        stream: false, // Non-streaming for simplicity
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[parse-job-description] OpenAI error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API error', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await openaiResponse.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (!responseContent) {
      console.error('[parse-job-description] No content in OpenAI response');
      return new Response(
        JSON.stringify({ error: 'Empty response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean and parse JSON response
    const cleaned = responseContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    let parsedJson;
    try {
      parsedJson = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('[parse-job-description] JSON parse error:', parseError, 'content:', cleaned.slice(0, 200));
      return new Response(
        JSON.stringify({ error: 'Failed to parse job description analysis', details: 'Invalid JSON response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[parse-job-description] Successfully parsed JD');

    return new Response(
      JSON.stringify({
        success: true,
        parsed: parsedJson,
        raw: parsedJson,
        usage: data.usage,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[parse-job-description] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
