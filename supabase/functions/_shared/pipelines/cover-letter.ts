/**
 * Cover Letter Streaming Pipeline - ANALYSIS ONLY (Phase 1)
 * 
 * This pipeline provides progressive analysis for the UI skeleton.
 * It does NOT generate or save draft content - that's done by generateDraft().
 * 
 * Stages:
 * 1. basicMetrics (5-10s) - Quick metrics for immediate feedback
 * 2. requirementAnalysis (10-25s) - Detailed requirement matching
 * 3. sectionGaps (25-45s) - Section-level gap analysis
 * 
 * REMOVED (Phase 1):
 * 4. draftGeneration - Now handled by generateDraft() service method
 */

import type { PipelineContext, PipelineStage } from '../pipeline-utils.ts';
import {
  executePipeline,
  callOpenAI,
  parseJSONResponse,
  fetchJobDescription,
  fetchWorkHistory,
  fetchStories,
} from '../pipeline-utils.ts';
import { PipelineTelemetry } from '../telemetry.ts';

// ============================================================================
// Stage 1: Basic Metrics (Fast - 5-10s)
// ============================================================================

const basicMetricsStage: PipelineStage = {
  name: 'basicMetrics',
  timeout: 15000, // 15s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;
    const { jobDescriptionId } = job.input;

    // Fetch job description
    const jd = await fetchJobDescription(supabase, jobDescriptionId);

    // Simplified prompt for quick analysis
    const prompt = `Analyze this job description and provide quick metrics.

JOB DESCRIPTION:
${jd.raw_text || jd.content}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "atsScore": number (0-100, keywords match),
  "goalsMatch": number (0-100, career goals alignment),
  "experienceMatch": number (0-100, experience fit),
  "topThemes": ["theme1", "theme2", "theme3"],
  "initialFitScore": number (0-100, overall fit)
}

Be concise. Focus on quick analysis. Return ONLY the JSON object.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 1500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      atsScore: result.atsScore || 0,
      goalsMatch: result.goalsMatch || 0,
      experienceMatch: result.experienceMatch || 0,
      topThemes: result.topThemes || [],
      initialFitScore: result.initialFitScore || 0,
    };
  },
};

// ============================================================================
// Stage 2: Requirement Analysis (Medium - 10-25s)
// ============================================================================

const requirementAnalysisStage: PipelineStage = {
  name: 'requirementAnalysis',
  timeout: 30000, // 30s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;
    const { jobDescriptionId } = job.input;

    // Fetch data
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);

    // Build context
    const workHistoryText = workHistory
      .map((wh: any) => `${wh.title} at ${wh.company}: ${wh.description || ''}`)
      .join('\n');

    const storiesText = stories
      .map((s: any) => `${s.title}: ${s.content}`)
      .join('\n');

    const prompt = `Analyze requirements for this job and match against the candidate's background.

JOB DESCRIPTION:
${jd.raw_text || jd.content}

CANDIDATE WORK HISTORY:
${workHistoryText}

CANDIDATE STORIES:
${storiesText}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "coreRequirements": [
    {
      "id": "core-1",
      "text": "requirement text",
      "met": boolean,
      "evidence": "specific evidence from background (if met)"
    }
  ],
  "preferredRequirements": [
    {
      "id": "pref-1", 
      "text": "requirement text",
      "met": boolean,
      "evidence": "specific evidence (if met)"
    }
  ],
  "requirementsMet": number (count of met requirements),
  "totalRequirements": number (total count)
}

Extract 5-10 core and 3-5 preferred requirements. Be specific with evidence.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      coreRequirements: result.coreRequirements || [],
      preferredRequirements: result.preferredRequirements || [],
      requirementsMet: result.requirementsMet || 0,
      totalRequirements: result.totalRequirements || 0,
    };
  },
};

// ============================================================================
// Stage 3: Section Gaps (Slow - 25-45s)
// ============================================================================

const sectionGapsStage: PipelineStage = {
  name: 'sectionGaps',
  timeout: 50000, // 50s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey } = ctx;
    const { jobDescriptionId, templateId } = job.input;

    // Fetch data
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    
    // Fetch template if provided
    let template = null;
    if (templateId) {
      const { data } = await supabase
        .from('cover_letter_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = data;
    }

    const prompt = `Analyze gaps for cover letter sections for this job.

JOB DESCRIPTION:
${jd.raw_text || jd.content}

${template ? `TEMPLATE STRUCTURE:\n${JSON.stringify(template.sections, null, 2)}` : ''}

For standard cover letter sections (intro, experience paragraphs, closing), identify gaps:

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "sections": [
    {
      "id": "section-intro",
      "title": "Introduction",
      "gaps": [
        {
          "type": "missing_hook" | "weak_connection" | "missing_differentiator",
          "description": "what's missing or weak",
          "suggestion": "how to fix it"
        }
      ]
    }
  ],
  "totalGaps": number
}

Focus on 2-4 sections with 1-3 gaps each.`;

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 3500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      sections: result.sections || [],
      totalGaps: result.totalGaps || 0,
    };
  },
};

// ============================================================================
// PHASE 1: Draft Generation Stage REMOVED
// ============================================================================
//
// This stage has been removed per STREAMING_FINALIZATION Phase 1.
// Draft generation now happens ONLY via generateDraft() in coverLetterDraftService.
// This pipeline provides ONLY analysis: metrics, requirements, and gaps.
//
// Reason: The draftGenerationStage was creating malformed drafts with:
// - Single section containing entire letter (wrong structure)
// - No proper section types (intro/body/closing)
// - No enhancedMatchData or gap analysis
// - No template structure preservation
//
// The frontend will call both:
// 1. createJob() -> streams analysis (this pipeline)
// 2. generateDraft() -> produces proper draft with sections
//
// ============================================================================

// ============================================================================
// Main Pipeline Executor
// ============================================================================

export async function executeCoverLetterPipeline(
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

    // Define pipeline stages (PHASE 1: Analysis only, no draft generation)
    const stages: PipelineStage[] = [
      basicMetricsStage,
      requirementAnalysisStage,
      sectionGapsStage,
      // draftGenerationStage REMOVED - see Phase 1 comment above
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
    try { const { elog } = await import('../log.ts'); elog.info('[executeCoverLetterPipeline] Starting executePipeline with ' + stages.length + ' stages'); } catch (_) {}
    const results = await executePipeline(stages, context);
    try { const { elog } = await import('../log.ts'); elog.info('[executeCoverLetterPipeline] Pipeline complete, results: ' + Object.keys(results).join(',')); } catch (_) {}

  // Compile final result (PHASE 1: Analysis only, no draftId)
  const finalResult = {
    // draftId removed - drafts are created by generateDraft(), not this pipeline
    metrics: [
      {
        key: 'ats',
        label: 'ATS Score',
        type: 'score',
        value: results.basicMetrics?.atsScore || 0,
        summary: `ATS keyword match score`,
        tooltip: 'Based on keyword matching with job description',
      },
      {
        key: 'experienceMatch',
        label: 'Experience Match',
        type: 'score',
        value: results.basicMetrics?.experienceMatch || 0,
        summary: `Experience alignment score`,
        tooltip: 'How well your experience matches the role',
      },
      {
        key: 'goalsMatch',
        label: 'Goals Match',
        type: 'score',
        value: results.basicMetrics?.goalsMatch || 0,
        summary: `Career goals alignment`,
        tooltip: 'How well this role aligns with your goals',
      },
      {
        key: 'requirementsMet',
        label: 'Requirements Met',
        type: 'count',
        value: results.requirementAnalysis?.requirementsMet || 0,
        summary: `${results.requirementAnalysis?.requirementsMet || 0} of ${results.requirementAnalysis?.totalRequirements || 0} requirements met`,
        tooltip: 'Number of job requirements you meet',
      },
      {
        key: 'rating',
        label: 'Overall Rating',
        type: 'score',
        value: 0, // TODO: Calculate from other metrics
        summary: 'Overall cover letter quality',
        tooltip: 'Composite score based on all metrics',
      },
    ],
    gapCount: results.sectionGaps?.totalGaps || 0,
    // Include raw stage results for frontend to use (Phase 3 data priority rules)
    basicMetrics: results.basicMetrics || null,
    requirements: results.requirementAnalysis || null,
    sectionGaps: results.sectionGaps || null,
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

    // PHASE 1: No draft update - this pipeline doesn't create drafts
    // Drafts are created by generateDraft() which has its own metrics

    // Mark telemetry as complete
    telemetry.complete(true);

    return finalResult;
  } catch (error) {
    // Mark telemetry as failed
    telemetry.complete(false, error.message);
    throw error;
  }
}

