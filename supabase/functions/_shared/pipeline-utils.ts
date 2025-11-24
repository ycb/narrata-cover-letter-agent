/**
 * Shared utilities for streaming pipeline execution
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { PipelineTelemetry } from './telemetry.ts';

// ============================================================================
// Types
// ============================================================================

export type SSESender = (event: string, data: any) => void;

export interface PipelineContext {
  job: any;
  supabase: SupabaseClient;
  send: SSESender;
  openaiApiKey: string;
  telemetry?: PipelineTelemetry;
}

export interface PipelineStage {
  name: string;
  execute: (ctx: PipelineContext) => Promise<any>;
  timeout?: number;
}

// ============================================================================
// OpenAI Utilities
// ============================================================================

export async function callOpenAI(params: {
  apiKey: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string };
}): Promise<any> {
  const {
    apiKey,
    model = 'gpt-4',
    messages,
    temperature = 0.7,
    maxTokens = 4000,
    responseFormat,
  } = params;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat && { response_format: responseFormat }),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}

export function parseJSONResponse(content: string): any {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse JSON from response');
  }
}

// ============================================================================
// Pipeline Executor
// ============================================================================

export async function executePipeline(
  stages: PipelineStage[],
  context: PipelineContext
): Promise<any> {
  const results: Record<string, any> = {};
  const telemetry = context.telemetry;

  for (const stage of stages) {
    try {
      console.log(`[Pipeline] Executing stage: ${stage.name}`);
      
      // Start telemetry for this stage
      if (telemetry) {
        telemetry.startStage(stage.name);
      }

      // Execute stage with timeout
      const stagePromise = stage.execute(context);
      const timeoutPromise = stage.timeout
        ? new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Stage ${stage.name} timed out after ${stage.timeout}ms`)),
              stage.timeout
            )
          )
        : null;

      const result = timeoutPromise
        ? await Promise.race([stagePromise, timeoutPromise])
        : await stagePromise;

      // End telemetry for this stage
      if (telemetry) {
        telemetry.endStage(true);
      }

      // Store result
      results[stage.name] = result;

      // Send progress event
      context.send('progress', {
        jobId: context.job.id,
        stage: stage.name,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`[Pipeline] Stage ${stage.name} failed:`, error);
      
      // End telemetry with error
      if (telemetry) {
        telemetry.endStage(false, error.message);
      }
      
      throw new PipelineError(
        `Stage ${stage.name} failed: ${error.message}`,
        stage.name,
        error
      );
    }
  }

  return results;
}

// ============================================================================
// Database Utilities
// ============================================================================

export async function fetchJobDescription(supabase: SupabaseClient, jobDescriptionId: string) {
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('id', jobDescriptionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch job description: ${error.message}`);
  }

  return data;
}

export async function fetchUserProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data;
}

export async function fetchWorkHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('work_history')
    .select('*')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch work history: ${error.message}`);
  }

  return data || [];
}

export async function fetchStories(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch stories: ${error.message}`);
  }

  return data || [];
}

// ============================================================================
// Error Handling
// ============================================================================

export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export function wrapStageError(stage: string, error: Error): PipelineError {
  return new PipelineError(
    `Stage ${stage} failed: ${error.message}`,
    stage,
    error
  );
}

