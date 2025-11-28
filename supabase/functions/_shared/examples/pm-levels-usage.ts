/**
 * Usage Examples: PM Levels Profile Loader
 * 
 * Shows how to use getPMLevelsProfile in streaming pipeline stages
 * (JD analysis, goals and strengths, etc.)
 */

import type { PipelineContext } from '../pipeline-utils.ts';
import { getPMLevelsProfile } from '../pipeline-utils.ts';

// ============================================================================
// Example 1: Use in JD Analysis Stage
// ============================================================================

/**
 * Example stage that includes PM Levels alignment in JD analysis
 */
export async function jdAnalysisWithPMLevels(ctx: PipelineContext) {
  const { job, supabase, send } = ctx;
  const userId = job.user_id;
  
  // Load PM Levels profile
  const pmProfile = await getPMLevelsProfile(supabase, userId);
  
  // Build analysis context
  const analysisContext = {
    jobDescription: job.input.jobDescription || '',
    userLevel: pmProfile.inferredLevel,
    userSpecializations: pmProfile.specializations,
    targetLevelBand: pmProfile.targetLevelBand,
  };
  
  // Example: Stream PM Levels role alignment insight
  if (pmProfile.inferredLevel) {
    await send('progress', {
      jobId: job.id,
      stage: 'jdAnalysis',
      insight: 'pmLevelAlignment',
      data: {
        userLevel: pmProfile.inferredLevel,
        userLevelTitle: pmProfile.inferredLevelTitle,
        targetBand: pmProfile.targetLevelBand,
        specializations: pmProfile.specializations,
        confidence: pmProfile.confidence,
      },
      timestamp: new Date().toISOString(),
    });
  }
  
  // Continue with LLM call using analysisContext...
  return analysisContext;
}

// ============================================================================
// Example 2: Use in Goals & Strengths Stage
// ============================================================================

/**
 * Example stage that includes PM Levels insights in goals analysis
 */
export async function goalsAnalysisWithPMLevels(ctx: PipelineContext) {
  const { job, supabase, send } = ctx;
  const userId = job.user_id;
  
  // Load PM Levels profile
  const pmProfile = await getPMLevelsProfile(supabase, userId);
  
  // Example: Build prompt context with level-specific guidance
  let levelGuidance = '';
  if (pmProfile.inferredLevel) {
    levelGuidance = `User is currently at ${pmProfile.inferredLevelTitle} (${pmProfile.inferredLevel}).`;
    if (pmProfile.targetLevelBand) {
      levelGuidance += ` Target progression band: ${pmProfile.targetLevelBand}.`;
    }
    if (pmProfile.specializations.length > 0) {
      levelGuidance += ` Specializations: ${pmProfile.specializations.join(', ')}.`;
    }
  }
  
  // Stream insight
  await send('progress', {
    jobId: job.id,
    stage: 'goalsAnalysis',
    insight: 'pmLevelContext',
    data: {
      levelGuidance,
      profile: pmProfile,
    },
    timestamp: new Date().toISOString(),
  });
  
  // Use levelGuidance in LLM prompt for goals extraction...
  return { levelGuidance, profile: pmProfile };
}

// ============================================================================
// Example 3: Null-Safe Handling
// ============================================================================

/**
 * Example showing null-safe handling when profile doesn't exist
 */
export async function safeProfileUsage(ctx: PipelineContext) {
  const { job, supabase } = ctx;
  
  const pmProfile = await getPMLevelsProfile(supabase, job.user_id);
  
  // Safe to use - never throws, always returns a valid structure
  const hasProfile = pmProfile.inferredLevel !== null;
  
  if (hasProfile) {
    console.log(`User has PM Level: ${pmProfile.inferredLevel}`);
    console.log(`Specializations: ${pmProfile.specializations.join(', ') || 'none'}`);
  } else {
    console.log('User has not completed PM Levels assessment yet');
    // Continue without PM Levels context - no error
  }
  
  // Safe to check fields
  const specializations = pmProfile.specializations; // Always an array
  const confidence = pmProfile.confidence ?? 0; // Use default if null
  
  return { hasProfile, specializations, confidence };
}

