/**
 * PM Levels Profile Utilities
 * 
 * Provides helper functions for loading and shaping PM Levels profile data
 * used by streaming pipelines (JD analysis, goals and strengths).
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ============================================================================
// Types
// ============================================================================

/**
 * PM Levels profile summary - matches what the PM Levels UI expects
 */
export interface PMLevelsProfile {
  /** Current inferred level (e.g., "L4", "L5", "L6") */
  inferredLevel: string | null;
  
  /** Target level band for career progression (e.g., "L5-L6") */
  targetLevelBand: string | null;
  
  /** Human-readable title for inferred level */
  inferredLevelTitle: string | null;
  
  /** PM specializations (e.g., ["growth", "platform", "ai_ml"]) */
  specializations: string[];
  
  /** Confidence score for level inference (0-1) */
  confidence: number | null;
  
  /** When this profile was last analyzed */
  lastAnalyzedAt: string | null;
}

// ============================================================================
// Level Mapping Utilities
// ============================================================================

/**
 * Map level codes to human-readable display titles
 */
const LEVEL_DISPLAY_MAP: Record<string, string> = {
  'L3': 'Associate Product Manager',
  'L4': 'Product Manager',
  'L5': 'Senior Product Manager',
  'L6': 'Staff Product Manager',
  'M1': 'Group Product Manager',
  'M2': 'Director of Product',
};

/**
 * Derive target level band based on current level
 * Users typically target 1-2 levels above current
 */
function deriveTargetLevelBand(inferredLevel: string | null): string | null {
  if (!inferredLevel) return null;

  // IC progression path
  if (inferredLevel === 'L3') return 'L4-L5';
  if (inferredLevel === 'L4') return 'L5-L6';
  if (inferredLevel === 'L5') return 'L6';
  if (inferredLevel === 'L6') return 'M1-M2'; // IC to Manager or stay IC

  // Manager progression path
  if (inferredLevel === 'M1') return 'M2';
  if (inferredLevel === 'M2') return null; // At top of current ladder

  return null;
}

// ============================================================================
// Main Loader Function
// ============================================================================

/**
 * Load canonical PM Levels profile for a user
 * 
 * Returns the profile summary used by PM Levels UI and streaming insights.
 * Returns null-safe structure if profile not found - never throws on "not found".
 * 
 * @param supabase - Supabase client (with RLS context)
 * @param userId - User UUID
 * @returns PM Levels profile summary or null-safe default
 */
export async function getPMLevelsProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<PMLevelsProfile> {
  try {
    // Query canonical user_levels table
    const { data, error } = await (supabase as any)
      .from('user_levels')
      .select('inferred_level, role_type, confidence, last_run_timestamp')
      .eq('user_id', userId)
      .maybeSingle(); // Don't throw on missing row

    // Handle not found gracefully
    if (error) {
      if (error.code === 'PGRST116') {
        // PGRST116 = no rows found - expected for new users
        try {
          const { elog } = await import('./log.ts');
          elog.info(`[PM Levels] No profile found for user ${userId}`);
        } catch (_) {}
        return createEmptyProfile();
      }
      
      // Unexpected error - log but don't throw
      try {
        const { elog } = await import('./log.ts');
        elog.error(`[PM Levels] Error fetching profile for user ${userId}:`, error);
      } catch (_) {}
      return createEmptyProfile();
    }

    if (!data) {
      return createEmptyProfile();
    }

    // Shape data to profile summary
    const inferredLevel = data.inferred_level as string | null;
    const roleType = (data.role_type || []) as string[];
    const confidence = (data.confidence ?? null) as number | null;
    const lastAnalyzedAt = data.last_run_timestamp as string | null;

    const profile: PMLevelsProfile = {
      inferredLevel,
      targetLevelBand: deriveTargetLevelBand(inferredLevel),
      inferredLevelTitle: inferredLevel ? (LEVEL_DISPLAY_MAP[inferredLevel] || inferredLevel) : null,
      specializations: roleType,
      confidence,
      lastAnalyzedAt,
    };

    // Light dev logging on successful fetch
    try {
      const { elog } = await import('./log.ts');
      elog.info(`[PM Levels] Profile loaded for user ${userId}: ${inferredLevel || 'none'} (${roleType.join(', ') || 'no specializations'})`);
    } catch (_) {}

    return profile;
  } catch (error) {
    // Catch-all for unexpected errors - log and return empty profile
    try {
      const { elog } = await import('./log.ts');
      elog.error(`[PM Levels] Unexpected error in getPMLevelsProfile:`, error);
    } catch (_) {}
    return createEmptyProfile();
  }
}

/**
 * Create empty/null-safe profile structure
 */
function createEmptyProfile(): PMLevelsProfile {
  return {
    inferredLevel: null,
    targetLevelBand: null,
    inferredLevelTitle: null,
    specializations: [],
    confidence: null,
    lastAnalyzedAt: null,
  };
}

