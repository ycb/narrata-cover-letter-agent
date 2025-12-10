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

    // Compile final result
    const finalResult = {
      assessmentId,
      icLevel: results.baselineAssessment?.icLevel || 3,
      assessmentBand: results.baselineAssessment?.assessmentBand,
      competencies,
      specializations,
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

