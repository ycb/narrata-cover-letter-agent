/**
 * Match Intelligence Service
 * 
 * Consolidated service that performs ALL match analysis in a single LLM call:
 * - Goals match
 * - Requirements match (draft coverage)
 * - Experience match (work history coverage)
 * - Differentiator analysis
 * - Gap identification
 * 
 * This replaces multiple separate LLM calls with one efficient multi-output invocation.
 */

import { LLMAnalysisService } from './openaiService';
import { buildMatchIntelligencePrompt } from '@/prompts/matchIntelligence';
import type { UserGoals } from '@/types/userGoals';
import type { GoalsMatchResult } from './goalsMatchService';
import type { RequirementsMatchResult } from './requirementsMatchService';
import type { ExperienceMatchResult } from './experienceMatchService';

export interface CTAHook {
  type: 'add-story' | 'edit-goals' | 'enhance-section' | 'add-metrics';
  label: string;
  requirement: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DifferentiatorAnalysis {
  summary: string;
  userPositioning: string;
  strengthAreas: string[];
  gapAreas: string[];
  ctaHooks: CTAHook[];
}

export interface GapFlags {
  missingGoalAlignment: Array<{
    goalType: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  missingRequirementsInDraft: Array<{
    requirement: string;
    type: 'core' | 'preferred';
    suggestion: string;
  }>;
  missingExperience: Array<{
    requirement: string;
    type: 'core' | 'preferred';
    confidence: 'high' | 'medium' | 'low';
    suggestion: string;
  }>;
}

export interface MatchIntelligenceResult {
  goalsMatch: GoalsMatchResult;
  requirementsMatch: RequirementsMatchResult;
  coreExperienceMatch: ExperienceMatchResult;
  preferredExperienceMatch: ExperienceMatchResult;
  differentiatorAnalysis: DifferentiatorAnalysis;
  gapFlags: GapFlags;
}

interface WorkItem {
  id: string;
  company: string;
  title: string;
  description: string | null;
  achievements: string[];
  startDate: string;
  endDate: string | null;
}

interface ApprovedContent {
  id: string;
  title: string;
  content: string;
  company?: string;
  role?: string;
}

interface CoverLetterSection {
  id: string;
  type: string;
  content: string;
}

interface JobContext {
  description: string;
  role: string;
  company: string;
  coreRequirements: string[];
  preferredRequirements: string[];
  differentiatorSummary: string;
}

export class MatchIntelligenceService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Perform comprehensive match analysis in a single LLM call
   * Returns all match metrics, differentiator analysis, and gap flags
   */
  async analyzeMatchIntelligence(
    jobContext: JobContext,
    userGoals: UserGoals | null | undefined,
    workItems: WorkItem[],
    approvedContent: ApprovedContent[],
    sections: CoverLetterSection[],
    goNoGoAnalysis?: any
  ): Promise<MatchIntelligenceResult> {
    try {
      // Build consolidated prompt
      const prompt = buildMatchIntelligencePrompt(
        jobContext.description,
        jobContext.coreRequirements,
        jobContext.preferredRequirements,
        jobContext.differentiatorSummary,
        jobContext.role,
        jobContext.company,
        userGoals,
        workItems,
        approvedContent,
        sections,
        goNoGoAnalysis
      );

      // Single LLM call with sufficient tokens for comprehensive analysis
      const response = await this.llmService.callOpenAI(prompt, 3000);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to analyze match intelligence');
      }

      // Parse and validate response
      const parsed = response.data as MatchIntelligenceResult;

      // Validate structure
      if (!this.isValidMatchIntelligenceResult(parsed)) {
        console.error('Invalid match intelligence result:', parsed);
        throw new Error('Invalid response structure from LLM');
      }

      // Enrich experience matches with human-readable references
      parsed.coreExperienceMatch = this.enrichExperienceMatches(
        parsed.coreExperienceMatch,
        workItems,
        approvedContent
      );

      parsed.preferredExperienceMatch = this.enrichExperienceMatches(
        parsed.preferredExperienceMatch,
        workItems,
        approvedContent
      );

      return parsed;
    } catch (error) {
      console.error('Error in match intelligence analysis:', error);

      // Return fallback result on error
      return this.getFallbackResult(
        jobContext,
        userGoals,
        workItems,
        approvedContent,
        sections
      );
    }
  }

  /**
   * Validate that the LLM returned a valid match intelligence result
   */
  private isValidMatchIntelligenceResult(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      data.goalsMatch &&
      Array.isArray(data.goalsMatch.matches) &&
      data.requirementsMatch &&
      Array.isArray(data.requirementsMatch.coreRequirements) &&
      Array.isArray(data.requirementsMatch.preferredRequirements) &&
      data.coreExperienceMatch &&
      Array.isArray(data.coreExperienceMatch.matches) &&
      data.preferredExperienceMatch &&
      Array.isArray(data.preferredExperienceMatch.matches) &&
      data.differentiatorAnalysis &&
      typeof data.differentiatorAnalysis.summary === 'string' &&
      data.gapFlags &&
      typeof data.gapFlags === 'object'
    );
  }

  /**
   * Enrich experience matches with human-readable references
   */
  private enrichExperienceMatches(
    experienceMatch: ExperienceMatchResult,
    workItems: WorkItem[],
    approvedContent: ApprovedContent[]
  ): ExperienceMatchResult {
    const enrichedMatches = experienceMatch.matches.map(match => {
      // Map work item IDs to readable info
      const matchedWorkItems = (match.matchedWorkItemIds || [])
        .map(id => {
          const workItem = workItems.find(w => w.id === id);
          if (workItem) {
            return { id, company: workItem.company, title: workItem.title };
          }
          return null;
        })
        .filter(Boolean) as Array<{ id: string; company: string; title: string }>;

      // Map story IDs to readable info
      const matchedStories = (match.matchedStoryIds || [])
        .map(id => {
          const story = approvedContent.find(s => s.id === id);
          if (story) {
            return { id, title: story.title, company: story.company };
          }
          return null;
        })
        .filter(Boolean) as Array<{ id: string; title: string; company?: string }>;

      return {
        ...match,
        matchedWorkItems,
        matchedStories,
      };
    });

    return {
      ...experienceMatch,
      matches: enrichedMatches,
    };
  }

  /**
   * Generate fallback result if LLM call fails
   * Uses simple heuristics to provide basic match analysis
   */
  private getFallbackResult(
    jobContext: JobContext,
    userGoals: UserGoals | null | undefined,
    workItems: WorkItem[],
    approvedContent: ApprovedContent[],
    sections: CoverLetterSection[]
  ): MatchIntelligenceResult {
    console.warn('Using fallback match intelligence result');

    // Simple heuristic-based analysis
    const allContent = sections.map(s => s.content).join(' ').toLowerCase();

    // Goals match fallback
    const goalsMatch: GoalsMatchResult = {
      matches: [],
      overallMatch: 'weak',
      metCount: 0,
      totalCount: 0,
    };

    // Requirements match fallback (simple keyword matching)
    const coreReqMatches = jobContext.coreRequirements.map((req, i) => ({
      id: `core-${i}`,
      requirement: req,
      demonstrated: allContent.includes(req.toLowerCase().substring(0, 20)),
      evidence: 'Fallback analysis',
      sectionIds: [],
    }));

    const preferredReqMatches = jobContext.preferredRequirements.map((req, i) => ({
      id: `preferred-${i}`,
      requirement: req,
      demonstrated: allContent.includes(req.toLowerCase().substring(0, 20)),
      evidence: 'Fallback analysis',
      sectionIds: [],
    }));

    const requirementsMatch: RequirementsMatchResult = {
      coreRequirements: coreReqMatches,
      preferredRequirements: preferredReqMatches,
      coreMetCount: coreReqMatches.filter(m => m.demonstrated).length,
      coreTotalCount: coreReqMatches.length,
      preferredMetCount: preferredReqMatches.filter(m => m.demonstrated).length,
      preferredTotalCount: preferredReqMatches.length,
    };

    // Experience match fallback
    const coreExpMatches = jobContext.coreRequirements.map(req => ({
      requirement: req,
      confidence: 'low' as const,
      matchedWorkItemIds: [],
      matchedStoryIds: [],
      evidence: 'Analysis unavailable',
      missingDetails: 'LLM analysis failed',
    }));

    const preferredExpMatches = jobContext.preferredRequirements.map(req => ({
      requirement: req,
      confidence: 'low' as const,
      matchedWorkItemIds: [],
      matchedStoryIds: [],
      evidence: 'Analysis unavailable',
      missingDetails: 'LLM analysis failed',
    }));

    const coreExperienceMatch: ExperienceMatchResult = {
      matches: coreExpMatches,
      overallMatch: 'weak',
      highConfidenceCount: 0,
      totalCount: coreExpMatches.length,
    };

    const preferredExperienceMatch: ExperienceMatchResult = {
      matches: preferredExpMatches,
      overallMatch: 'weak',
      highConfidenceCount: 0,
      totalCount: preferredExpMatches.length,
    };

    // Differentiator analysis fallback
    const differentiatorAnalysis: DifferentiatorAnalysis = {
      summary: jobContext.differentiatorSummary,
      userPositioning: 'Analysis unavailable - please review job requirements manually',
      strengthAreas: [],
      gapAreas: ['Analysis unavailable'],
      ctaHooks: [],
    };

    // Gap flags fallback
    const gapFlags: GapFlags = {
      missingGoalAlignment: [],
      missingRequirementsInDraft: [],
      missingExperience: [],
    };

    return {
      goalsMatch,
      requirementsMatch,
      coreExperienceMatch,
      preferredExperienceMatch,
      differentiatorAnalysis,
      gapFlags,
    };
  }
}

