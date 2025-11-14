/**
 * Go/No-Go Service
 *
 * Analyzes job fit based on user profile and job requirements
 * to determine if the user should apply to the position.
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
   */
  async analyzeJobFit(
    userId: string,
    jobDescription: string
  ): Promise<GoNoGoAnalysis> {
    try {
      // Fetch user profile preferences
      const userProfile = await this.fetchUserProfile(userId);

      // Call LLM to analyze job fit
      const response = await this.llmService.analyzeGoNoGo(
        jobDescription,
        userProfile
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze job fit');
      }

      // Parse and validate response
      const analysis = this.parseAnalysisResponse(response.data);

      return analysis;
    } catch (error) {
      console.error('Go/No-Go analysis error:', error);

      // Return conservative default: go with low confidence
      return {
        decision: 'go',
        confidence: 50,
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
   */
  markUserOverride(analysis: GoNoGoAnalysis): GoNoGoAnalysis {
    return {
      ...analysis,
      decision: 'go', // Override to go
      mismatches: analysis.mismatches.map((m) => ({
        ...m,
        userOverride: true,
      })),
    };
  }
}
