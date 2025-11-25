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
  executePipeline,
  callOpenAI,
  parseJSONResponse,
  fetchWorkHistory,
  fetchStories,
} from '../pipeline-utils.ts';
import { PipelineTelemetry } from '../telemetry.ts';

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
      .map((wh: any) => `${wh.title} at ${wh.company} (${wh.start_date} - ${wh.end_date || 'Present'})`)
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
- IC3: Entry PM (0-2 years)
- IC4: Mid-level PM (2-4 years)
- IC5: Senior PM (4-7 years)
- IC6: Staff PM (7-10 years)
- IC7: Senior Staff PM (10-15 years)
- IC8: Principal PM (15+ years)
- IC9: Distinguished PM (rare, 20+ years)

Be conservative and evidence-based.`;

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

    // Build context
    const workHistoryText = workHistory
      .map((wh: any) => `${wh.title} at ${wh.company}: ${wh.description || ''}`)
      .join('\n');

    const storiesText = stories
      .map((s: any) => `${s.title}: ${s.content}`)
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

    // Build context
    const workHistoryText = workHistory
      .map((wh: any) => `${wh.title} at ${wh.company}: ${wh.description || ''}`)
      .join('\n');

    const storiesText = stories
      .map((s: any) => `${s.title}: ${s.content}`)
      .join('\n');

    const prompt = `Assess PM specializations for this profile:

WORK HISTORY:
${workHistoryText}

ACHIEVEMENT STORIES:
${storiesText}

Rate these PM specializations (0-10 scale, 0 = no evidence):

1. **Growth PM**: Growth loops, metrics, experimentation, acquisition/retention
2. **Platform PM**: APIs, developer experience, infrastructure, multi-sided markets
3. **AI/ML PM**: ML products, data pipelines, AI features, model productization
4. **Founding PM**: 0-1, startups, entrepreneurship, building from scratch

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "growth": number (0-10, omit if no evidence),
  "platform": number (0-10, omit if no evidence),
  "aiMl": number (0-10, omit if no evidence),
  "founding": number (0-10, omit if no evidence)
}

Only include specializations with clear evidence. Be selective.`;

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

    // Define pipeline stages
    const stages: PipelineStage[] = [
      baselineAssessmentStage,
      competencyBreakdownStage,
      specializationAssessmentStage,
    ];

    // Create pipeline context
    const context: PipelineContext = {
      job,
      supabase,
      send,
      openaiApiKey,
      telemetry,
    };

    // Execute pipeline
    const results = await executePipeline(stages, context);

  // Compile competencies for storage
  const competencies = {
    execution: results.competencyBreakdown?.execution || 0,
    strategy: results.competencyBreakdown?.strategy || 0,
    customerInsight: results.competencyBreakdown?.customerInsight || 0,
    influence: results.competencyBreakdown?.influence || 0,
  };

  // Compile specializations (only those with scores)
  const specializations: string[] = [];
  const specData = results.specializationAssessment || {};
  if (specData.growth && specData.growth > 5) specializations.push('growth');
  if (specData.platform && specData.platform > 5) specializations.push('platform');
  if (specData.aiMl && specData.aiMl > 5) specializations.push('aiMl');
  if (specData.founding && specData.founding > 5) specializations.push('founding');

  // In real implementation, we'd save to a PM levels assessment table
  // For MVP, we'll use a placeholder
  const assessmentId = `assessment-${job.id}`;

  // Compile final result
  const finalResult = {
    assessmentId,
    icLevel: results.baselineAssessment?.icLevel || 3,
    competencies,
    specializations,
  };

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
    telemetry.complete(false, error.message);
    throw error;
  }
}

