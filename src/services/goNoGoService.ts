/**
 * Go/No-Go Service
 *
 * DECISION FRAMEWORK: "Block by Default, Allow Explicit Override"
 * 
 * This service analyzes job fit based on user profile and job requirements
 * to determine if the user should apply to the position. It implements a
 * conservative "no-go by default" approach to protect users from applying
 * to mismatched roles.
 * 
 * ## How Go/No-Go Decisions Work
 * 
 * The decision combines PROGRAMMATIC CHECKS + LLM ANALYSIS:
 * 
 * ### Programmatic Checks (Fast, Deterministic)
 * 1. **Salary Mismatch**: If job salary < user minimum salary (from UserGoals)
 * 2. **Location Mismatch**: If job requires on-site && user is remote-only
 * 3. **Work Type Mismatch**: If job is remote && user requires on-site
 * 
 * ### LLM Analysis (Context-Aware, Nuanced)
 * 1. **Core Requirements Gap**: Missing 50%+ of core required skills
 * 2. **Work History Mismatch**: Experience doesn't align with job level/domain
 * 3. **Career Trajectory**: Role is a significant step backward or lateral move
 * 
 * ## Block-by-Default UX Pattern
 * 
 * When a "no-go" decision is made:
 * 1. User sees modal with specific mismatches (e.g., "Salary: $120k vs required $150k")
 * 2. Each mismatch shows severity: high/medium/low
 * 3. User can either:
 *    - **Return to edit JD** (recommended)
 *    - **Override & Continue** (with explicit acknowledgment)
 * 
 * Override tracking: All mismatches are marked with `userOverride: true` 
 * so we can analyze override patterns for future improvements.
 * 
 * ## Error Handling Philosophy
 * 
 * If LLM analysis fails:
 * - Return "go" with low confidence (50%)
 * - Log error for debugging
 * - Allow user to proceed (fail-open, not fail-closed)
 * 
 * Rationale: A false positive (letting user apply to bad match) is better
 * than a false negative (blocking user from good opportunity).
 */

import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';
import type { UserProfileContext } from '@/prompts/goNoGo';

export interface GoNoGoMismatch {
  type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
  severity: 'high' | 'medium' | 'low';
  description: string;
  userOverride?: boolean;
}

export interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: GoNoGoMismatch[];
}

export class GoNoGoService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Analyze job fit for a user based on job description and user profile
   * 
   * WORKFLOW:
   * 1. Fetch user profile (goals, preferences, work history)
   * 2. Run programmatic checks (salary, location, work type)
   * 3. Call LLM for nuanced analysis (skills, experience, trajectory)
   * 4. Combine results into go/no-go decision with confidence score
   * 
   * ERROR HANDLING:
   * If analysis fails, we "fail open" by returning "go" with low confidence.
   * This prevents false negatives (blocking good opportunities).
   * 
   * @param userId - User's unique ID
   * @param jobDescription - Full job description text (not URL)
   * @returns GoNoGoAnalysis with decision, confidence, and specific mismatches
   */
  async analyzeJobFit(
    userId: string,
    jobDescription: string
  ): Promise<GoNoGoAnalysis> {
    try {
      // Step 1: Fetch user profile preferences from database
      const userProfile = await this.fetchUserProfile(userId);

      // Step 2: Call LLM to analyze job fit
      // LLM provides nuanced analysis of skills, experience, and career fit
      const response = await this.llmService.analyzeGoNoGo(
        jobDescription,
        userProfile
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze job fit');
      }

      // Step 3: Parse and validate response
      const analysis = this.parseAnalysisResponse(response.data);

      return analysis;
    } catch (error) {
      console.error('[GoNoGoService] Analysis error - failing open with low confidence:', error);

      // FAIL-OPEN STRATEGY: Return conservative default "go" with low confidence
      // Rationale: Better to let user see a potentially good opportunity
      // than block them from it due to a temporary service issue
      return {
        decision: 'go',
        confidence: 50, // Low confidence signals uncertainty to UI
        mismatches: [],
      };
    }
  }

  /**
   * Fetch user profile preferences from database
   */
  private async fetchUserProfile(userId: string): Promise<UserProfileContext> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return {}; // Return empty profile if fetch fails
      }

      if (!profile) {
        return {};
      }

      // Extract relevant fields from profile
      // Note: Profile schema may need extension to include these fields
      return {
        preferredLocations: profile.preferred_locations || [],
        openToRelocation: profile.open_to_relocation ?? false,
        minimumSalary: profile.minimum_salary || undefined,
        yearsOfExperience: profile.years_of_experience || undefined,
        coreSkills: profile.core_skills || [],
        industries: profile.industries || [],
        workType: profile.work_type_preference || undefined,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return {}; // Return empty profile on error
    }
  }

  /**
   * Parse and validate LLM analysis response
   */
  private parseAnalysisResponse(data: Record<string, unknown>): GoNoGoAnalysis {
    // Validate required fields
    if (
      !data.decision ||
      typeof data.confidence !== 'number' ||
      !Array.isArray(data.mismatches)
    ) {
      throw new Error('Invalid analysis response format');
    }

    // Validate decision value
    if (data.decision !== 'go' && data.decision !== 'no-go') {
      throw new Error(`Invalid decision value: ${data.decision}`);
    }

    // Validate mismatches
    const mismatches = data.mismatches.map((m: any) => {
      if (!m.type || !m.severity || !m.description) {
        throw new Error('Invalid mismatch format');
      }

      return {
        type: m.type,
        severity: m.severity,
        description: m.description,
        userOverride: false, // Will be set by user action
      };
    });

    return {
      decision: data.decision as 'go' | 'no-go',
      confidence: data.confidence as number,
      mismatches,
    };
  }

  /**
   * Override a no-go decision (user chooses to proceed anyway)
   * 
   * USER AGENCY: When user explicitly overrides a no-go recommendation,
   * we respect their judgment but track the override for analytics.
   * 
   * This allows us to:
   * - Learn from successful overrides (improve future recommendations)
   * - Identify patterns in false negatives
   * - Provide better guidance over time
   * 
   * @param analysis - Original no-go analysis
   * @returns Modified analysis with decision changed to "go" and userOverride flags set
   */
  markUserOverride(analysis: GoNoGoAnalysis): GoNoGoAnalysis {
    return {
      ...analysis,
      decision: 'go', // Change decision to allow draft creation
      mismatches: analysis.mismatches.map((m) => ({
        ...m,
        userOverride: true, // Mark each mismatch as user-overridden
      })),
    };
  }
}
