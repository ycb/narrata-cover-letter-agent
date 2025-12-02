/**
 * Onboarding Streaming Pipeline
 * 
 * Stages:
 * 1. parseInputs (3-8s) - Extract basic job/profile data from resume/CL/LinkedIn
 * 2. skeletonProfile (8-20s) - Merge sources, identify core stories/skills/themes
 * 3. detailedProfile (20-60s) - Infer impact, suggest stories, confidence scoring
 */

import type { PipelineContext, PipelineStage } from '../pipeline-utils.ts';
import {
  executePipeline,
  callOpenAI,
  parseJSONResponse,
} from '../pipeline-utils.ts';
import { PipelineTelemetry } from '../telemetry.ts';

// ============================================================================
// Stage 0: LinkedIn Fetch (Fast - no LLM)
// ============================================================================

const linkedInFetchStage: PipelineStage = {
  name: 'linkedInFetch',
  timeout: 8000, // 8s timeout
  execute: async (ctx: PipelineContext) => {
    const { job } = ctx;
    const { linkedInData } = job.input || {};

    // No LLM: just summarize LI payload if provided
    const positions = Array.isArray(linkedInData?.positions) ? linkedInData.positions.length : 0;
    const headline = linkedInData?.headline ? String(linkedInData.headline) : null;
    const namePresent = !!(linkedInData?.firstName || linkedInData?.lastName);

    return {
      jobsCount: positions,
      skillsCount: Array.isArray(linkedInData?.skills) ? linkedInData.skills.length : 0,
      profileFieldsExtracted: [
        ...(namePresent ? ['name'] : []),
        ...(headline ? ['headline'] : []),
      ],
      headline: headline || undefined,
    };
  },
};

// ============================================================================
// Stage 1: Profile Structuring (LLM #1)
// ============================================================================

const profileStructuringStage: PipelineStage = {
  name: 'profileStructuring',
  timeout: 25000, // 25s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, openaiApiKey, supabase } = ctx;
    const { resumeText, coverLetterText } = job.input;

    const inputText = [resumeText, coverLetterText].filter(Boolean).join('\n\n');

    const prompt = `Create a skeleton profile from these documents:

${inputText}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "workHistoryItems": number (count of jobs to create),
  "storiesIdentified": number (count of achievement stories found),
  "coreThemes": string[] (3-5 core professional themes)
}

Focus on identifying key patterns and themes.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2000,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    // In a real implementation, we'd create skeleton work history items here
    // For MVP, we just return the counts

    return {
      workHistoryItems: result.workHistoryItems || 0,
      storiesIdentified: result.storiesIdentified || 0,
      coreThemes: result.coreThemes || [],
    };
  },
};

// ============================================================================
// Stage 2: Derived Artifacts (LLM #2)
// ============================================================================

const derivedArtifactsStage: PipelineStage = {
  name: 'derivedArtifacts',
  timeout: 70000, // 70s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, openaiApiKey, supabase } = ctx;
    const { resumeText, coverLetterText } = job.input;

    const inputText = [resumeText, coverLetterText].filter(Boolean).join('\n\n');

    const prompt = `Provide detailed analysis of this profile:

${inputText}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "impactScores": {
    "technical": number (0-100),
    "leadership": number (0-100),
    "strategic": number (0-100)
  },
  "suggestedStories": number (count of stories to suggest user writes),
  "confidenceScore": number (0-100, overall profile completeness)
}

Be thorough and analytical.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 3000,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    // In a real implementation, we'd:
    // - Create full profile record
    // - Generate suggested stories
    // - Calculate confidence scores

    return {
      impactScores: result.impactScores || { technical: 0, leadership: 0, strategic: 0 },
      suggestedStories: result.suggestedStories || 0,
      confidenceScore: result.confidenceScore || 0,
    };
  },
};

// ============================================================================
// Main Pipeline Executor
// ============================================================================

export async function executeOnboardingPipeline(
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

    // PERFORMANCE OPTIMIZATION: Run stages in optimal order
    // Stage 0: LinkedIn fetch (no LLM, fast)
    telemetry.startStage('linkedInFetch');
    const linkedInResult = await linkedInFetchStage.execute(context);
    telemetry.endStage(true); // success
    send('stage_complete', { stage: 'linkedInFetch', data: linkedInResult });

    // Stage 1 & 2: Run both LLM calls in PARALLEL
    // Both read from resumeText/coverLetterText and don't depend on each other
    // This saves 20-40s vs sequential execution
    const parallelStart = Date.now();
    console.log('[PERF] Starting parallel LLM stages: profileStructuring + derivedArtifacts');
    
    const [profileResult, derivedResult] = await Promise.all([
      profileStructuringStage.execute(context).then(result => {
        console.log(`[PERF] profileStructuring completed in ${Date.now() - parallelStart}ms`);
        send('stage_complete', { stage: 'profileStructuring', data: result });
        return result;
      }),
      derivedArtifactsStage.execute(context).then(result => {
        console.log(`[PERF] derivedArtifacts completed in ${Date.now() - parallelStart}ms`);
        send('stage_complete', { stage: 'derivedArtifacts', data: result });
        return result;
      }),
    ]);
    
    const parallelDuration = Date.now() - parallelStart;
    console.log(`[PERF] Both parallel LLM stages completed in ${parallelDuration}ms total (vs ~60-90s sequential)`);

    // Compile results
    const results = {
      linkedInFetch: linkedInResult,
      profileStructuring: profileResult,
      derivedArtifacts: derivedResult,
    };

  // In real implementation, we'd create the actual profile here
  // For MVP, we'll create a placeholder profile ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: job.user_id,
      first_name: 'Onboarded',
      last_name: 'User',
      headline: 'Profile created via streaming onboarding',
    })
    .select()
    .single();

  if (profileError) {
    console.error('Failed to create profile:', profileError);
    // Continue anyway for MVP
  }

  // Compile final result
  const finalResult = {
    profileId: profile?.id || 'placeholder',
    workHistoryCount: results.profileStructuring?.workHistoryItems || 0,
    storiesCount: results.profileStructuring?.storiesIdentified || 0,
    skillsCount: results.linkedInFetch?.skillsCount || 0,
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

