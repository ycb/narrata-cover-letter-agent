/**
 * PM Levels Streaming Pipeline
 * 
 * Stages:
 * 1. baselineAssessment (5-10s) - Role-to-level mapping, IC band
 * 2. competencyBreakdown (10-30s) - Execution, Strategy, Customer Insight, Influence
 * 3. specializationAssessment (30-45s) - Growth, Platform, AI/ML, Founding
 */

import type { PipelineContext, PipelineStage } from '../pipeline-utils.ts';
import {
  callOpenAI,
  parseJSONResponse,
  fetchWorkHistory,
  fetchStories,
} from '../pipeline-utils.ts';
import { PipelineTelemetry } from '../telemetry.ts';
import { voidLogEval } from '../evals/log.ts';
import {
  validatePMLevelsResult,
  calculateQualityScore,
} from '../evals/validators.ts';

// ============================================================================
// Stage 1: Baseline Assessment (Fast - 5-10s)
// ============================================================================

const baselineAssessmentStage: PipelineStage = {
  name: 'baselineAssessment',
  timeout: 15000, // 15s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;
    const { targetRole } = job.input;

    // Fetch user data
    const workHistory = await fetchWorkHistory(supabase, job.user_id);

    // Build context
    const workHistoryText = workHistory
      .map((wh: any) => `${wh.title} at ${wh.companies?.name || 'Unknown'} (${wh.start_date} - ${wh.end_date || 'Present'})`)
      .join('\n');

    const prompt = `Assess PM level for this profile:

WORK HISTORY:
${workHistoryText}

${targetRole ? `TARGET ROLE: ${targetRole}` : ''}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "icLevel": number (1-9, IC level assessment based on Meta/FAANG scale),
  "roleToLevelMapping": {
    "role_title": number (level)
  },
  "assessmentBand": string ("IC3-IC4", "IC5-IC6", etc.)
}

Use this scale:
- IC3: Entry PM (0-2 years, Associate Product Manager)
- IC4: Mid-level PM (2-4 years, Product Manager)
- IC5: Senior PM (4-7 years, Senior Product Manager)
- IC6: Staff PM (7-10 years, Staff/Principal Product Manager)
- IC7: Senior Staff PM (10-15 years, Senior Staff PM)
- IC8: Principal PM (15+ years, Principal/Distinguished PM)
- IC9: Distinguished PM (rare, 20+ years, Fellow/VP level IC)
- M1: Group PM / Director (10+ years, managing PMs)
- M2: VP of Product (12+ years, leading product org)

IMPORTANT: 
- VP of Product, Head of Product, Director of Product → typically M1-M2 (management track)
- Principal/Staff PM with company-level impact → IC6-IC8 range
- Look for years of experience AND scope of impact (feature → product → company)

Be evidence-based but recognize leadership titles appropriately.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 1500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      icLevel: result.icLevel || 3,
      roleToLevelMapping: result.roleToLevelMapping || {},
      assessmentBand: result.assessmentBand || 'IC3-IC4',
    };
  },
};

// ============================================================================
// Stage 2: Competency Breakdown (Medium - 10-30s)
// ============================================================================

const competencyBreakdownStage: PipelineStage = {
  name: 'competencyBreakdown',
  timeout: 35000, // 35s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;

    // Fetch user data
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);
    // Sort most recent roles first for progression display
    workHistory.sort((a: any, b: any) => {
      const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
      const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
      return bDate - aDate;
    });

    // Build context - include tags for better competency assessment
    const workHistoryText = workHistory
      .map((wh: any) => {
        const tags = wh.tags && Array.isArray(wh.tags) && wh.tags.length > 0 
          ? ` [Tags: ${wh.tags.join(', ')}]` 
          : '';
        return `${wh.title} at ${wh.companies?.name || 'Unknown'}${tags}: ${wh.description || ''}`;
      })
      .join('\n');

    const storiesText = stories
      .map((s: any) => {
        const tags = s.tags && Array.isArray(s.tags) && s.tags.length > 0 
          ? ` [Tags: ${s.tags.join(', ')}]` 
          : '';
        return `${s.title}${tags}: ${s.content}`;
      })
      .join('\n');

    const prompt = `Assess PM competencies for this profile:

WORK HISTORY:
${workHistoryText}

ACHIEVEMENT STORIES:
${storiesText}

Rate these core PM competencies (0-10 scale):

1. **Execution**: Delivering products on time, managing roadmaps, coordinating teams
2. **Strategy**: Vision, market analysis, long-term planning, competitive positioning
3. **Customer Insight**: User research, empathy, customer development, insights
4. **Influence**: Stakeholder management, leadership without authority, communication

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "execution": number (0-10),
  "strategy": number (0-10),
  "customerInsight": number (0-10),
  "influence": number (0-10)
}

Be specific and evidence-based. Consider scope and impact.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2000,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      execution: result.execution || 0,
      strategy: result.strategy || 0,
      customerInsight: result.customerInsight || 0,
      influence: result.influence || 0,
    };
  },
};

// ============================================================================
// Stage 3: Specialization Assessment (Slow - 30-45s)
// ============================================================================

const specializationAssessmentStage: PipelineStage = {
  name: 'specializationAssessment',
  timeout: 50000, // 50s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;

    // Fetch user data
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);

    // Build context - include tags for specialization detection
    const workHistoryText = workHistory
      .map((wh: any) => {
        const tags = wh.tags && Array.isArray(wh.tags) && wh.tags.length > 0 
          ? ` [Tags: ${wh.tags.join(', ')}]` 
          : '';
        return `${wh.title} at ${wh.companies?.name || 'Unknown'}${tags}: ${wh.description || ''}`;
      })
      .join('\n');

    const storiesText = stories
      .map((s: any) => {
        const tags = s.tags && Array.isArray(s.tags) && s.tags.length > 0 
          ? ` [Tags: ${s.tags.join(', ')}]` 
          : '';
        return `${s.title}${tags}: ${s.content}`;
      })
      .join('\n');

    const prompt = `Assess PM specializations for this profile:

WORK HISTORY:
${workHistoryText}

ACHIEVEMENT STORIES:
${storiesText}

Rate these PM specializations (0-10 scale, 0 = no evidence):

1. **Growth PM**: Growth loops, metrics, experimentation, acquisition/retention, activation, conversion, funnel optimization
   - Look for tags: growth, activation, retention, experimentation, conversion, metrics, analytics, a/b-testing
   
2. **Platform PM**: APIs, developer experience, infrastructure, multi-sided markets, SDK development
   - Look for tags: platform, api, sdk, developer-experience, infrastructure, ecosystem
   
3. **AI/ML PM**: ML products, data pipelines, AI features, model productization, machine learning systems
   - Look for tags: ai, ml, machine-learning, ai-ml, nlp, computer-vision, recommendation
   
4. **Founding PM**: 0-1, startups, entrepreneurship, building from scratch, early-stage product development
   - Look for tags: founding, 0-1, startup, launch, mvp, early-stage, pre-seed, seed

IMPORTANT: Pay close attention to the [Tags: ...] annotations in the work history and stories above. 
These tags are strong indicators of specialization areas.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "growth": number (0-10, omit if no evidence),
  "platform": number (0-10, omit if no evidence),
  "aiMl": number (0-10, omit if no evidence),
  "founding": number (0-10, omit if no evidence)
}

Only include specializations with clear evidence. Be selective but not overly conservative - 
a score of 6-7 indicates solid evidence, 8-9 indicates strong specialization, 10 is exceptional depth.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      growth: result.growth,
      platform: result.platform,
      aiMl: result.aiMl,
      founding: result.founding,
    };
  },
};

// ============================================================================
// Main Pipeline Executor
// ============================================================================

export async function executePMLevelsPipeline(
  job: any,
  supabase: any,
  send: (event: string, data: any) => void
) {
  // Initialize telemetry
  const telemetry = new PipelineTelemetry(job.id, job.type);

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create pipeline context
    const context: PipelineContext = {
      job,
      supabase,
      send,
      openaiApiKey,
      telemetry,
    };

    const results: Record<string, any> = {};

    // =========================================================================
    // STAGE 1: Baseline Assessment
    // =========================================================================
    const baselineStart = Date.now();
    try {
      telemetry?.startStage('baselineAssessment');
      results.baselineAssessment = await baselineAssessmentStage.execute(context);
      telemetry?.endStage(true);
      
      // Log eval metrics
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'baselineAssessment',
        user_id: job.user_id,
        started_at: new Date(baselineStart),
        completed_at: new Date(),
        duration_ms: Date.now() - baselineStart,
        success: true,
        result_subset: {
          icLevel: results.baselineAssessment?.icLevel,
          assessmentBand: results.baselineAssessment?.assessmentBand,
        },
      });
    } catch (error) {
      telemetry?.endStage(false);
      
      // Log eval failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'baselineAssessment',
        user_id: job.user_id,
        started_at: new Date(baselineStart),
        completed_at: new Date(),
        duration_ms: Date.now() - baselineStart,
        success: false,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }

    // =========================================================================
    // STAGE 2: Competency Breakdown
    // =========================================================================
    const competencyStart = Date.now();
    try {
      telemetry?.startStage('competencyBreakdown');
      results.competencyBreakdown = await competencyBreakdownStage.execute(context);
      telemetry?.endStage(true);
      
      // Log eval metrics
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'competencyBreakdown',
        user_id: job.user_id,
        started_at: new Date(competencyStart),
        completed_at: new Date(),
        duration_ms: Date.now() - competencyStart,
        success: true,
        result_subset: {
          execution: results.competencyBreakdown?.execution,
          strategy: results.competencyBreakdown?.strategy,
          customerInsight: results.competencyBreakdown?.customerInsight,
          influence: results.competencyBreakdown?.influence,
        },
      });
    } catch (error) {
      telemetry?.endStage(false);
      
      // Log eval failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'competencyBreakdown',
        user_id: job.user_id,
        started_at: new Date(competencyStart),
        completed_at: new Date(),
        duration_ms: Date.now() - competencyStart,
        success: false,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }

    // =========================================================================
    // STAGE 3: Specialization Assessment
    // =========================================================================
    const specializationStart = Date.now();
    try {
      telemetry?.startStage('specializationAssessment');
      results.specializationAssessment = await specializationAssessmentStage.execute(context);
      telemetry?.endStage(true);
      
      // Log eval metrics
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'specializationAssessment',
        user_id: job.user_id,
        started_at: new Date(specializationStart),
        completed_at: new Date(),
        duration_ms: Date.now() - specializationStart,
        success: true,
        result_subset: {
          growth: results.specializationAssessment?.growth,
          platform: results.specializationAssessment?.platform,
          aiMl: results.specializationAssessment?.aiMl,
          founding: results.specializationAssessment?.founding,
        },
      });
    } catch (error) {
      telemetry?.endStage(false);
      
      // Log eval failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'pmLevels',
        stage: 'specializationAssessment',
        user_id: job.user_id,
        started_at: new Date(specializationStart),
        completed_at: new Date(),
        duration_ms: Date.now() - specializationStart,
        success: false,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      });
      
      throw error;
    }

    // Fetch data for evidence construction
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);

    // Compile competencies for storage
    const competencies = {
      executionDelivery: results.competencyBreakdown?.execution || 0,
      leadershipInfluence: results.competencyBreakdown?.influence || 0,
      productStrategy: results.competencyBreakdown?.strategy || 0,
      technicalDepth: results.competencyBreakdown?.customerInsight || 0, // Map to validator expectation
    };

    // Compile specializations (only those with scores)
    const specializations: string[] = [];
    const specData = results.specializationAssessment || {};
    if (specData.growth && specData.growth > 5) specializations.push('Growth PM');
    if (specData.platform && specData.platform > 5) specializations.push('Platform PM');
    if (specData.aiMl && specData.aiMl > 5) specializations.push('AI/ML PM');
    if (specData.founding && specData.founding > 5) specializations.push('Founding PM');

    // In real implementation, we'd save to a PM levels assessment table
    // For MVP, we'll use a placeholder
    const assessmentId = `assessment-${job.id}`;

    // Build evidence (deterministic, no LLM)
    const evidenceByCompetency = buildCompetencyEvidence(workHistory, stories, competencies);
    const levelEvidence = buildLevelEvidence(
      workHistory,
      stories,
      results.baselineAssessment?.icLevel || 3,
      specializations,
      competencies
    );
    const roleArchetypeEvidence = buildRoleEvidence(workHistory, stories, specializations);

    // Compile final result
    const finalResult = {
      assessmentId,
      icLevel: results.baselineAssessment?.icLevel || 3,
      assessmentBand: results.baselineAssessment?.assessmentBand,
      competencies,
      specializations,
      evidenceByCompetency,
      levelEvidence,
      roleArchetypeEvidence,
    };

    // =========================================================================
    // STRUCTURAL VALIDATION: Run deterministic quality checks
    // =========================================================================
    const structuralValidation = validatePMLevelsResult(finalResult);
    const qualityScore = calculateQualityScore(structuralValidation);
    
    // Log structural validation results
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'pmLevels',
      stage: 'structural_checks',
      user_id: job.user_id,
      started_at: new Date(),
      completed_at: new Date(),
      duration_ms: 0, // Structural checks are near-instant
      success: structuralValidation.passed,
      quality_checks: structuralValidation,
      quality_score: qualityScore,
    });

    // Save final result to job
    await supabase
      .from('jobs')
      .update({
        status: 'complete',
        result: finalResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Mark telemetry as complete
  telemetry.complete(true);

  return finalResult;
} catch (error) {
  // Mark telemetry as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    telemetry.complete(false, errorMessage);
  throw error;
}
}

// -----------------------------------------------------------------------------
// Evidence builders (deterministic, no LLM) to match client-side structures
// -----------------------------------------------------------------------------

function buildCompetencyEvidence(
  workHistory: any[],
  stories: any[],
  competencies: Record<string, number>
) {
  const dimensions = ['execution', 'customer_insight', 'strategy', 'influence'] as const;
  const keywordMap: Record<typeof dimensions[number], string[]> = {
    execution: ['launched', 'shipped', 'delivered', 'implemented', 'built', 'executed', 'released', 'rollout', 'experiment', 'a/b', 'conversion', 'retention'],
    customer_insight: ['user', 'customer', 'research', 'feedback', 'interview', 'survey', 'persona', 'ux', 'analytics'],
    strategy: ['roadmap', 'vision', 'strategy', 'okr', 'kpi', 'goal', 'market', 'competitive', 'framework'],
    influence: ['stakeholder', 'alignment', 'executive', 'cross-functional', 'buy-in', 'presentation', 'collaboration', 'negotiation'],
  };

  const evidence: any = {};
  for (const dim of dimensions) {
    const matched: any[] = [];
    const matchedTags = new Set<string>();
    stories.forEach((story: any) => {
      const content = `${story.title || ''} ${story.content || ''}`.toLowerCase();
      const hits = keywordMap[dim].filter((k) => content.includes(k));
      if (hits.length > 0) {
        matched.push({
          id: story.id,
          title: story.title,
          content: story.content,
          tags: story.tags || [],
          sourceRole: story.work_item_title || story.title || '',
          sourceCompany: story.company || '',
          lastUsed: story.updated_at || story.created_at,
          timesUsed: 1,
          confidence: hits.length > 3 ? 'high' : hits.length > 1 ? 'medium' : 'low',
          outcomeMetrics: Array.isArray(story.metrics) ? story.metrics.map((m: any) => `${m.value || ''} ${m.context || ''}`.trim()).filter(Boolean) : [],
          levelAssessment: 'meets',
        });
        hits.forEach((h) => matchedTags.add(h));
      }
    });
    evidence[dim] = {
      competency: dim,
      evidence: matched.slice(0, 10),
      matchedTags: Array.from(matchedTags),
      overallConfidence: competencies[dim] && competencies[dim] >= 6 ? 'high' : competencies[dim] >= 4 ? 'medium' : 'low',
    };
  }
  return evidence;
}

function buildLevelEvidence(
  workHistory: any[],
  stories: any[],
  icLevel: number,
  specializations: string[],
  competencies: Record<string, number>
) {
  const roles = Array.isArray(workHistory) ? [...workHistory] : [];
  // Most recent → oldest to match desired progression direction
  roles.sort((a: any, b: any) => {
    const aDate = a.start_date ? new Date(a.start_date).getTime() : 0;
    const bDate = b.start_date ? new Date(b.start_date).getTime() : 0;
    return bDate - aDate;
  });

  const seenCompanies = new Set<string>();
  const companyScale: string[] = [];
  const roleTitles: string[] = [];
  let totalMonths = 0;
  let pmMonths = 0;

  const isPMRole = (title = '') => {
    const lower = title.toLowerCase();
    return (
      lower.includes('product') ||
      lower.includes('pm') ||
      lower.includes('ux') ||
      lower.includes('founder') ||
      lower.includes('co-founder')
    );
  };

  roles.forEach((role: any) => {
    if (role.title) roleTitles.push(role.title);
    const companyName = role.companies?.name || role.company;
    if (companyName && !seenCompanies.has(companyName)) {
      companyScale.push(companyName);
      seenCompanies.add(companyName);
    }
    const start = role.start_date ? new Date(role.start_date).getTime() : null;
    const end = role.end_date ? new Date(role.end_date).getTime() : Date.now();
    if (start) {
      const months = Math.max(0, (end - start) / (1000 * 60 * 60 * 24 * 30));
      totalMonths += months;
      if (isPMRole(role.title)) pmMonths += months;
    }
  });

  // Tag density from all stories
  const tagCounts = new Map<string, number>();
  (stories || []).forEach((story: any) => {
    (story.tags || []).forEach((tag: string) => {
      if (!tag) return;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  const tagDensity = Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // Story evidence with context
  const storiesWithContext = (stories || []).slice(0, 25).map((s: any) => {
    const role = roles.find((r: any) => r.id === s.work_item_id);
    const metrics =
      Array.isArray(s.metrics)
        ? s.metrics
            .map((m: any) => `${m.value || ''} ${m.context || ''}`.trim())
            .filter(Boolean)
        : [];
    return {
      id: s.id,
      title: s.title,
      content: s.content,
      tags: s.tags || [],
      sourceRole: role?.title || s.work_item_title || '',
      sourceCompany: role?.companies?.name || role?.company || '',
      lastUsed: s.updated_at || s.created_at,
      timesUsed: 1,
      confidence: metrics.length > 0 ? 'high' : 'medium',
      outcomeMetrics: metrics,
      levelAssessment: 'meets',
    };
  });

  // Outcome metrics pulled from roles and stories
  const roleLevelMetrics: string[] = [];
  roles.forEach((role: any) => {
    if (Array.isArray(role.metrics)) {
      role.metrics.forEach((m: any) => {
        const text = `${m.value || ''} ${m.context || ''}`.trim();
        if (text) roleLevelMetrics.push(text);
      });
    }
    if (Array.isArray(role.achievements)) {
      role.achievements.forEach((a: string) => a && roleLevelMetrics.push(a));
    }
  });
  const storyLevelMetrics = storiesWithContext.flatMap((s: any) => s.outcomeMetrics || []);

  // Competency-based criteria
  const execScore = competencies.executionDelivery ?? 0;
  const stratScore = competencies.productStrategy ?? 0;
  const custScore = competencies.technicalDepth ?? 0;
  const inflScore = competencies.leadershipInfluence ?? 0;
  const avgScore = (execScore + stratScore + custScore + inflScore) / 4 || 0;
  const confidencePct = Math.min(95, Math.max(50, Math.round((avgScore / 10) * 100)));

  const criteria = [
    { criterion: 'Execution: ability to ship products', met: execScore >= 5 },
    { criterion: 'Customer Insight: user research depth', met: custScore >= 5 },
    { criterion: 'Strategy: vision and roadmap thinking', met: stratScore >= 5 },
    { criterion: 'Influence: cross-functional leadership', met: inflScore >= 5 },
  ];

  const gaps: Array<{ area: string; description: string; examples: string[] }> = [];
  if (execScore < 5) gaps.push({ area: 'Execution', description: 'Add launches with quantified impact', examples: ['Ship outcomes with metrics', 'Highlight rollout scale'] });
  if (stratScore < 5) gaps.push({ area: 'Strategy', description: 'Show vision/roadmap ownership', examples: ['Roadmap artifacts', 'Cross-org strategy inputs'] });
  if (custScore < 5) gaps.push({ area: 'Customer Insight', description: 'Add research depth', examples: ['User studies', 'Analytics-driven insights'] });
  if (inflScore < 5) gaps.push({ area: 'Influence', description: 'Demonstrate exec and XFN influence', examples: ['Steering committees', 'C-suite reviews'] });

  const nextLevel = icLevel >= 7 ? 'VP of Product' : icLevel >= 6 ? 'Group PM / Director' : 'Senior PM';

  return {
    currentLevel: mapLevel(icLevel).displayLevel,
    nextLevel,
    confidence: confidencePct >= 75 ? 'high' : confidencePct >= 60 ? 'medium' : 'low',
    resumeEvidence: {
      roleTitles,
      duration: `${Math.round(totalMonths / 12)} years total / ${Math.round(pmMonths / 12)} years PM & adjacent experience`,
      companyScale,
    },
    storyEvidence: {
      totalStories: stories.length,
      relevantStories: stories.length,
      tagDensity,
      stories: storiesWithContext,
    },
    levelingFramework: {
      framework: 'PM Level Assessment',
      criteria: criteria.map((c) => c.criterion),
      match: `${confidencePct}% confident`,
      confidencePercentage: confidencePct,
      metCriteria: criteria,
    },
    gaps,
    outcomeMetrics: {
      roleLevel: roleLevelMetrics.slice(0, 25),
      storyLevel: storyLevelMetrics.slice(0, 25),
      analysis: {
        totalMetrics: roleLevelMetrics.length + storyLevelMetrics.length,
        impactLevel: icLevel >= 7 ? 'company' : icLevel >= 6 ? 'org' : icLevel >= 5 ? 'team' : 'feature',
        keyAchievements: [...roleLevelMetrics, ...storyLevelMetrics].slice(0, 6),
      },
    },
  };
}

function mapLevel(score: number) {
  if (score >= 9) return { levelCode: 'M2', displayLevel: 'VP of Product' };
  if (score >= 7) return { levelCode: 'M1', displayLevel: 'Group Product Manager' };
  if (score >= 6) return { levelCode: 'L6', displayLevel: 'Staff Product Manager' };
  if (score >= 5) return { levelCode: 'L5', displayLevel: 'Senior Product Manager' };
  if (score >= 4) return { levelCode: 'L4', displayLevel: 'Product Manager' };
  return { levelCode: 'L3', displayLevel: 'Associate Product Manager' };
}

function buildRoleEvidence(workHistory: any[], stories: any[], specializations: string[]) {
  const specPatterns: Record<string, { patterns: string[]; description: string; industryPatterns: string[] }> = {
    growth: {
      patterns: ['growth', 'activation', 'retention', 'conversion', 'experimentation', 'a/b', 'funnel', 'acquisition'],
      description: 'Focuses on acquisition, activation, retention, and monetization',
      industryPatterns: ['Product-led growth', 'Experimentation culture', 'Acquisition funnels'],
    },
    platform: {
      patterns: ['platform', 'api', 'sdk', 'developer', 'infrastructure', 'integration'],
      description: 'Builds developer-facing products, APIs, SDKs, and shared infrastructure',
      industryPatterns: ['Platform reliability', 'Ecosystem integrations', 'Developer experience'],
    },
    ai_ml: {
      patterns: ['ai', 'ml', 'machine', 'model', 'data', 'nlp', 'vision', 'recommendation'],
      description: 'Develops AI/ML-powered products and features',
      industryPatterns: ['Model performance', 'Data quality', 'Responsible AI'],
    },
    founding: {
      patterns: ['founding', 'startup', '0-1', 'zero to one', 'mvp', 'seed', 'early'],
      description: '0-1 builder with end-to-end ownership in startup environments',
      industryPatterns: ['0-1 product building', 'Fundraising stage', 'Scrappy execution'],
    },
  };

  const tagIndex = new Map<string, string[]>();
  (stories || []).forEach((story: any) => {
    (story.tags || []).forEach((tag: string) => {
      if (!tag) return;
      const lower = tag.toLowerCase();
      tagIndex.set(lower, [...(tagIndex.get(lower) || []), story.title || '']);
    });
  });

  const evidence: Record<string, any> = {};

  specializations.forEach((spec) => {
    const key = spec.toLowerCase().includes('growth')
      ? 'growth'
      : spec.toLowerCase().includes('platform')
      ? 'platform'
      : spec.toLowerCase().includes('ai')
      ? 'ai_ml'
      : spec.toLowerCase().includes('founding')
      ? 'founding'
      : spec.toLowerCase();

    const patternConfig = specPatterns[key] || { patterns: [], description: spec, industryPatterns: [] };

    // Match counts
    let tagHitCount = 0;
    const matchedTags: Record<string, number> = {};

    // Work history relevance
    const workHistoryEvidence = (workHistory || []).map((role: any) => {
      const description = `${role.title || ''} ${role.description || ''}`.toLowerCase();
      const matches = patternConfig.patterns.filter((p) => description.includes(p));
      matches.forEach((m) => {
        matchedTags[m] = (matchedTags[m] || 0) + 1;
        tagHitCount += 1;
      });
      return {
        company: role.companies?.name || role.company || 'Unknown',
        role: role.title || 'Unknown',
        relevance: matches.length >= 3 ? 'High Relevance' : matches.length > 0 ? 'Medium Relevance' : 'Low Relevance',
        tags: role.tags || [],
      };
    });

    // Story matches
    const matchedStories = (stories || []).filter((story: any) =>
      (story.tags || []).some((tag: string) =>
        patternConfig.patterns.some((p) => (tag || '').toLowerCase().includes(p))
      )
    );
    matchedStories.forEach((story: any) => {
      (story.tags || []).forEach((tag: string) => {
        const lower = tag.toLowerCase();
        if (patternConfig.patterns.some((p) => lower.includes(p))) {
          matchedTags[lower] = (matchedTags[lower] || 0) + 1;
          tagHitCount += 1;
        }
      });
    });

    const tagAnalysis = Object.entries(matchedTags)
      .map(([tag, count]) => ({
        tag,
        count,
        relevance: Math.min(100, count * 20 + 40),
        examples: (tagIndex.get(tag) || []).slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const roleLevelMetrics: string[] = [];
    (workHistory || []).forEach((role: any) => {
      (role.metrics || []).forEach((m: any) => {
        const text = `${m.value || ''} ${m.context || ''}`.trim();
        if (text) roleLevelMetrics.push(text);
      });
      (role.achievements || []).forEach((a: string) => a && roleLevelMetrics.push(a));
    });
    const storyLevelMetrics: string[] = [];
    matchedStories.forEach((story: any) => {
      (story.metrics || []).forEach((m: any) => {
        const text = `${m.value || ''} ${m.context || ''}`.trim();
        if (text) storyLevelMetrics.push(text);
      });
    });

    const industryPatterns = (patternConfig.industryPatterns || []).map((p) => ({
      pattern: p,
      match: tagHitCount > 0,
      examples: tagAnalysis.slice(0, 2).map((t) => t.tag),
    }));

    const matchScore = Math.min(95, 60 + tagHitCount * 10 + tagAnalysis.length * 3);

    const gaps: Array<{ area: string; description: string; suggestions: string[] }> = [];
    if (tagHitCount < 2) {
      gaps.push({
        area: 'Evidence',
        description: 'Add more tagged stories for this specialization',
        suggestions: ['Tag stories with specialization keywords', 'Add recent outcomes and metrics'],
      });
    }

    evidence[key] = {
      roleType: spec,
      matchScore,
      description: patternConfig.description,
      industryPatterns,
      problemComplexity: {
        level: storyLevelMetrics.length > 3 ? 'High' : 'Medium',
        examples: matchedStories.slice(0, 3).map((s: any) => s.title || 'Story'),
        evidence: storyLevelMetrics.slice(0, 5),
      },
      workHistory: workHistoryEvidence.slice(0, 6),
      tagAnalysis,
      gaps,
      outcomeMetrics: {
        roleLevel: roleLevelMetrics.slice(0, 15),
        storyLevel: storyLevelMetrics.slice(0, 15),
        analysis: {
          totalMetrics: roleLevelMetrics.length + storyLevelMetrics.length,
          impactLevel: storyLevelMetrics.length > 5 ? 'org' : 'team',
          keyAchievements: [...roleLevelMetrics, ...storyLevelMetrics].slice(0, 5),
        },
      },
    };
  });

  return evidence;
}
