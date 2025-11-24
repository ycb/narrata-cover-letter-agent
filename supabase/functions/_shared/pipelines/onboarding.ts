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
// Stage 1: Parse Inputs (Fast - 3-8s)
// ============================================================================

const parseInputsStage: PipelineStage = {
  name: 'parseInputs',
  timeout: 12000, // 12s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, openaiApiKey } = ctx;
    const { resumeText, coverLetterText, linkedInData } = job.input;

    // Build combined input text
    const inputText = [
      resumeText && `RESUME:\n${resumeText}`,
      coverLetterText && `COVER LETTER:\n${coverLetterText}`,
      linkedInData && `LINKEDIN DATA:\n${JSON.stringify(linkedInData, null, 2)}`,
    ]
      .filter(Boolean)
      .join('\n\n---\n\n');

    const prompt = `Extract structured information from these documents:

${inputText}

Provide a JSON response with:
{
  "jobsCount": number (number of distinct jobs/roles found),
  "skillsCount": number (number of distinct skills found),
  "profileFieldsExtracted": string[] (fields extracted: name, email, location, etc.)
}

Be quick and approximate. This is for initial progress indication.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 1000,
      responseFormat: { type: 'json_object' },
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      jobsCount: result.jobsCount || 0,
      skillsCount: result.skillsCount || 0,
      profileFieldsExtracted: result.profileFieldsExtracted || [],
    };
  },
};

// ============================================================================
// Stage 2: Skeleton Profile (Medium - 8-20s)
// ============================================================================

const skeletonProfileStage: PipelineStage = {
  name: 'skeletonProfile',
  timeout: 25000, // 25s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, openaiApiKey, supabase } = ctx;
    const { resumeText, coverLetterText } = job.input;

    const inputText = [resumeText, coverLetterText].filter(Boolean).join('\n\n');

    const prompt = `Create a skeleton profile from these documents:

${inputText}

Provide a JSON response with:
{
  "workHistoryItems": number (count of jobs to create),
  "storiesIdentified": number (count of achievement stories found),
  "coreThemes": string[] (3-5 core professional themes)
}

Focus on identifying key patterns and themes.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2000,
      responseFormat: { type: 'json_object' },
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
// Stage 3: Detailed Profile (Slow - 20-60s)
// ============================================================================

const detailedProfileStage: PipelineStage = {
  name: 'detailedProfile',
  timeout: 70000, // 70s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, openaiApiKey, supabase } = ctx;
    const { resumeText, coverLetterText } = job.input;

    const inputText = [resumeText, coverLetterText].filter(Boolean).join('\n\n');

    const prompt = `Provide detailed analysis of this profile:

${inputText}

Provide a JSON response with:
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
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 3000,
      responseFormat: { type: 'json_object' },
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

    // Define pipeline stages
    const stages: PipelineStage[] = [
      parseInputsStage,
      skeletonProfileStage,
      detailedProfileStage,
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
    workHistoryCount: results.skeletonProfile?.workHistoryItems || 0,
    storiesCount: results.skeletonProfile?.storiesIdentified || 0,
    skillsCount: results.parseInputs?.skillsCount || 0,
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

