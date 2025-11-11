/**
 * PM Levels Service
 * 
 * Analyzes user content (resume, cover letter, LinkedIn, stories) to infer PM level (L3-L6 IC, M1-M2 Manager).
 * Uses LLM for signal extraction and competency scoring, then applies deterministic formula for level inference.
 */

import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';
import {
  EXTRACT_SIGNALS_PROMPT,
  RATE_COMPETENCIES_PROMPT,
  DERIVE_BUSINESS_MATURITY_PROMPT,
  GENERATE_RECOMMENDATIONS_PROMPT
} from './prompts/pmLevelsPrompts';
import type {
  PMLevelInference,
  LevelSignal,
  CompetencyScore,
  CompanyMetadata,
  LevelRecommendation,
  PMLevelCode,
  PMLevelDisplay,
  RoleType,
  BusinessMaturity,
  PMDimension,
  CompetencyEvidence,
  LevelEvidence,
  RoleArchetypeEvidence,
  EvidenceStory
} from '@/types/content';

interface UserContent {
  combinedText: string;
  artifacts: Array<{ id: string; type: string; content: string }>;
  companies: CompanyMetadata[];
  // Raw database rows for evidence collection
  sources: Array<any>;
  workItems: Array<any>;
  stories: Array<any>;
}

interface EvaluationTracking {
  sourceId?: string;
  sessionId?: string;
}

export class PMLevelsService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Main analysis method - analyzes user content and infers PM level
   */
  async analyzeUserLevel(
    userId: string,
    targetLevel?: PMLevelCode,
    roleType?: RoleType[],
    evaluationTracking?: EvaluationTracking,
    syntheticProfileId?: string
  ): Promise<PMLevelInference | null> {
    const startTime = performance.now();
    let inference: PMLevelInference | null = null;
    let error: Error | null = null;

    try {
      console.log(`[PMLevelsService] Starting analysis for user: ${userId}${syntheticProfileId ? ` (profile: ${syntheticProfileId})` : ''}`);

      // Fetch user content (filtered by synthetic profile if provided)
      const content = await this.fetchUserContent(userId, syntheticProfileId);
      if (!content || content.artifacts.length === 0) {
        console.warn('[PMLevelsService] No content found for user');
        return null;
      }

      // Extract signals from content using LLM
      const signals = await this.extractSignals(content.combinedText);

      // Derive business maturity from company metadata (for display/evidence only, not used as modifier)
      const maturityInfo = await this.deriveBusinessMaturity(content.companies);

      // Compute competency scores
      const competencyScores = await this.computeCompetencyScores(
        content.combinedText,
        roleType || [],
        maturityInfo.maturity
      );

      // Compute scope score
      const scopeScore = this.computeScopeScore(signals, content.artifacts);

      // Compute level score using formula (maturity modifier removed - no penalty/reward for company stage)
      const levelScore = this.computeLevelScore(
        competencyScores,
        scopeScore
      );

      // Map level score to level code
      const { levelCode, displayLevel } = this.mapLevelScoreToLevel(levelScore);

      // Calculate confidence
      const confidence = this.calculateConfidence(
        content.artifacts.length,
        signals,
        competencyScores
      );

      // Generate recommendations
      const recommendations = await this.generateRecommendations(
        levelCode,
        targetLevel,
        competencyScores,
        signals
      );

      // Generate delta summary
      const deltaSummary = this.generateDeltaSummary(
        levelCode,
        targetLevel,
        competencyScores,
        scopeScore
      );

      // Identify top artifacts used
      const topArtifacts = this.selectTopArtifacts(content.artifacts, signals);

      // Build initial inference object (needed for collectLevelEvidence)
      inference = {
        inferredLevel: levelCode,
        displayLevel,
        confidence,
        scopeScore,
        maturityInfo: maturityInfo.maturity, // Store for display/evidence, not used as modifier
        roleType: roleType || [],
        competencyScores,
        levelScore,
        deltaSummary,
        recommendations,
        signals,
        topArtifacts
      };

      // Collect detailed evidence for modals
      console.log('[PMLevelsService] Collecting evidence for modals...');
      const evidenceByCompetency = await this.collectCompetencyEvidence(content, competencyScores, levelCode);
      const levelEvidence = await this.collectLevelEvidence(content, inference);
      const roleArchetypeEvidence = await this.collectRoleArchetypeEvidence(content, roleType || []);

      // Add evidence to inference object
      inference.evidenceByCompetency = evidenceByCompetency;
      inference.levelEvidence = levelEvidence;
      inference.roleArchetypeEvidence = roleArchetypeEvidence;
      console.log('[PMLevelsService] Evidence collection complete');

      // Store results in database
      await this.saveLevelAssessment(userId, inference);

      const latency = Math.round(performance.now() - startTime);

      // Log to evaluation_runs if tracking info provided
      if (evaluationTracking?.sourceId) {
        await this.logPMLevelsResult({
          userId,
          sourceId: evaluationTracking.sourceId,
          sessionId: evaluationTracking.sessionId,
          inference,
          latency,
          status: 'success'
        });
      }

      console.log(`[PMLevelsService] Analysis complete: ${displayLevel} (${levelCode}) in ${latency}ms`);
      return inference;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error');
      const latency = Math.round(performance.now() - startTime);

      // Log failure to evaluation_runs if tracking info provided
      if (evaluationTracking?.sourceId) {
        await this.logPMLevelsResult({
          userId,
          sourceId: evaluationTracking.sourceId,
          sessionId: evaluationTracking.sessionId,
          inference: null,
          latency,
          status: 'failed',
          error: error.message
        });
      }

      console.error('[PMLevelsService] Analysis error:', error);
      throw error;
    }
  }

  /**
   * Fetch user content from all sources
   * If syntheticProfileId is provided, filters by file_name pattern (e.g., P01_*)
   */
  private async fetchUserContent(userId: string, syntheticProfileId?: string): Promise<UserContent | null> {
    try {
      // Fetch sources (resume, cover letter, LinkedIn)
      let sourcesQuery = supabase
        .from('sources')
        .select('id, file_name, raw_text, structured_data')
        .eq('user_id', userId);
      
      // Filter by synthetic profile if provided
      if (syntheticProfileId) {
        const profileId = syntheticProfileId.toUpperCase();
        sourcesQuery = sourcesQuery.or(
          `file_name.ilike.${profileId}_%,file_name.ilike.${profileId}-%,file_name.ilike.${profileId}.%,file_name.ilike.${profileId} %`
        );
        console.log(`[PMLevelsService] Filtering sources by profile: ${profileId}`);
      }
      
      const { data: sources, error: sourcesError } = await sourcesQuery.order('created_at', { ascending: false });
      if (sourcesError) {
        console.error('[PMLevelsService] Error fetching sources:', sourcesError);
      }
      console.log(`[PMLevelsService] Fetched ${sources?.length || 0} sources for user ${userId}`);

      // Fetch work items (filtered by source_id if synthetic profile provided)
      let workItemsQuery = supabase
        .from('work_items')
        .select('id, title, description, achievements, metrics, source_id, start_date, end_date, companies(name, company_stage, maturity)')
        .eq('user_id', userId);
      
      if (syntheticProfileId && sources && sources.length > 0) {
        // Filter work items by source_id matching the profile's sources
        const sourceIds = sources.map(s => s.id);
        workItemsQuery = workItemsQuery.in('source_id', sourceIds);
        console.log(`[PMLevelsService] Filtering work_items by ${sourceIds.length} source IDs`);
      }
      
      const { data: workItems, error: workItemsError } = await workItemsQuery.order('start_date', { ascending: false });
      if (workItemsError) {
        console.error('[PMLevelsService] Error fetching work items:', workItemsError);
      }
      console.log(`[PMLevelsService] Fetched ${workItems?.length || 0} work items for user ${userId}`);

      // Fetch approved content (stories) - filtered by work_item_id or source_id if synthetic profile provided
      // NOTE: Include both 'approved' and 'draft' stories for PM Level assessment
      // The 'approved' status is for cover letter workflow, but we want to analyze all available content
      let storiesQuery = supabase
        .from('approved_content')
        .select('id, title, content, work_item_id, source_id, metrics, tags')
        .eq('user_id', userId)
        .in('status', ['approved', 'draft']);
      
      if (syntheticProfileId) {
        if (workItems && workItems.length > 0) {
          // Filter stories by work_item_id matching the profile's work items
          const workItemIds = workItems.map(wi => wi.id);
          storiesQuery = storiesQuery.in('work_item_id', workItemIds);
          console.log(`[PMLevelsService] Filtering stories by ${workItemIds.length} work_item IDs`);
        } else if (sources && sources.length > 0) {
          // Fallback: filter by source_id if work items not available
          const sourceIds = sources.map(s => s.id);
          storiesQuery = storiesQuery.in('source_id', sourceIds);
          console.log(`[PMLevelsService] Filtering stories by ${sourceIds.length} source IDs (fallback)`);
        }
      }
      
      const { data: stories, error: storiesError } = await storiesQuery.order('created_at', { ascending: false }).limit(50);
      if (storiesError) {
        console.error('[PMLevelsService] Error fetching stories:', storiesError);
      }
      console.log(`[PMLevelsService] Fetched ${stories?.length || 0} stories for user ${userId}`);

      // Fetch companies for maturity calculation (include researched stage/maturity)
      const { data: companies } = await supabase
        .from('companies')
        .select('id, name, description, company_stage, maturity')
        .eq('user_id', userId);
      
      console.log(`[PMLevelsService] Fetched ${companies?.length || 0} companies for user ${userId}`);
      if (companies && companies.length > 0) {
        console.log('[PMLevelsService] Company maturity data:');
        companies.forEach(c => {
          console.log(`  - ${c.name}: stage=${c.company_stage || 'NULL'}, maturity=${c.maturity || 'NULL'}`);
        });
      }

      if (!sources || sources.length === 0) {
        return null;
      }

      // Combine all text content
      const textParts: string[] = [];
      const artifacts: Array<{ id: string; type: string; content: string }> = [];

      // Add sources
      sources.forEach(source => {
        const text = source.raw_text || JSON.stringify(source.structured_data || {});
        textParts.push(`[${source.file_name}]\n${text}`);
        artifacts.push({
          id: source.id,
          type: 'source',
          content: text
        });
      });

      // Add work items
      workItems?.forEach(workItem => {
        const content = [
          workItem.title,
          workItem.description,
          ...(workItem.achievements || [])
        ].filter(Boolean).join('\n');
        if (content) {
          textParts.push(`[Work: ${workItem.title}]\n${content}`);
          artifacts.push({
            id: workItem.id,
            type: 'work_item',
            content
          });
        }
      });

      // Add stories
      stories?.forEach(story => {
        const content = `${story.title}\n${story.content}`;
        textParts.push(`[Story: ${story.title}]\n${content}`);
        artifacts.push({
          id: story.id,
          type: 'story',
          content
        });
      });

      // Build company metadata (include researched stage/maturity if available)
      const companyMetadata: CompanyMetadata[] = (companies || []).map(company => ({
        name: company.name,
        description: company.description || undefined,
        companyStage: company.company_stage || undefined,
        maturity: company.maturity as 'early' | 'growth' | 'late' | undefined
      }));

      return {
        combinedText: textParts.join('\n\n'),
        artifacts,
        companies: companyMetadata,
        sources: sources || [],
        workItems: workItems || [],
        stories: stories || []
      };
    } catch (error) {
      console.error('[PMLevelsService] Error fetching user content:', error);
      return null;
    }
  }

  /**
   * Extract signals from content using LLM
   */
  private async extractSignals(content: string): Promise<LevelSignal> {
    try {
      const prompt = EXTRACT_SIGNALS_PROMPT(content);
      const response = await this.callLLMForPMLevels(prompt, 2000);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to extract signals');
      }

      return response.data as LevelSignal;
    } catch (error) {
      console.error('[PMLevelsService] Error extracting signals:', error);
      // Return default signals on error
      return {
        scope: { teams: 0 },
        impact: { metrics: [], quantified: false, scale: 'feature' },
        influence: { crossFunctional: false, executive: false, external: false },
        metrics: []
      };
    }
  }

  /**
   * Compute competency scores using LLM
   */
  private async computeCompetencyScores(
    content: string,
    roleTypes: RoleType[],
    businessMaturity: BusinessMaturity
  ): Promise<CompetencyScore> {
    try {
      const prompt = RATE_COMPETENCIES_PROMPT(content, roleTypes, businessMaturity);
      const response = await this.callLLMForPMLevels(prompt, 2000);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to compute competency scores');
      }

      return response.data as CompetencyScore;
    } catch (error) {
      console.error('[PMLevelsService] Error computing competency scores:', error);
      // Return default scores on error
      return {
        execution: 1.0,
        customer_insight: 1.0,
        strategy: 1.0,
        influence: 1.0
      };
    }
  }

  /**
   * Derive business maturity from company metadata
   * Returns maturity info for display/evidence only (not used as modifier in scoring)
   */
  private async deriveBusinessMaturity(
    companies: CompanyMetadata[]
  ): Promise<{ maturity: BusinessMaturity; reasoning: string }> {
    try {
      if (companies.length === 0) {
        return { maturity: 'growth', reasoning: 'No company data available' };
      }

      // Check if we have researched maturity data (from browser search)
      const companiesWithMaturity = companies.filter(c => c.maturity);
      if (companiesWithMaturity.length > 0) {
        // Use the most mature company
        const maturityOrder: BusinessMaturity[] = ['early', 'growth', 'late'];
        const mostMature = companiesWithMaturity.reduce((prev, curr) => {
          const prevIndex = maturityOrder.indexOf(prev.maturity!);
          const currIndex = maturityOrder.indexOf(curr.maturity!);
          return currIndex > prevIndex ? curr : prev;
        });
        
        return {
          maturity: mostMature.maturity!,
          reasoning: `Using researched maturity from company data: ${mostMature.name} (${mostMature.maturity})`
        };
      }

      // Fallback to LLM inference if no researched data available
      const prompt = DERIVE_BUSINESS_MATURITY_PROMPT(companies);
      const response = await this.callLLMForPMLevels(prompt, 1000);

      if (!response.success || !response.data) {
        // Fallback: use simple heuristics
        return this.fallbackBusinessMaturity(companies);
      }

      // Extract maturity from response (remove value field if present)
      const data = response.data as any;
      return {
        maturity: data.maturity || 'growth',
        reasoning: data.reasoning || 'LLM inference'
      };
    } catch (error) {
      console.error('[PMLevelsService] Error deriving business maturity:', error);
      return this.fallbackBusinessMaturity(companies);
    }
  }

  /**
   * Fallback business maturity calculation
   */
  private fallbackBusinessMaturity(
    companies: CompanyMetadata[]
  ): { maturity: BusinessMaturity; reasoning: string } {
    // Simple heuristic: assume growth stage if no data
    return { maturity: 'growth', reasoning: 'Default: growth stage (no company data)' };
  }

  /**
   * Compute scope score (0-1) from signals
   */
  private computeScopeScore(signals: LevelSignal, artifacts: any[]): number {
    let score = 0.0;

    // Team size component (0-0.3)
    if (signals.scope.teams > 0) {
      score += Math.min(signals.scope.teams / 10, 0.3);
    }

    // Revenue impact component (0-0.3)
    if (signals.scope.revenueImpact) {
      score += Math.min(signals.scope.revenueImpact / 1000000, 0.3); // Normalize by $1M
    }

    // Users impact component (0-0.2)
    if (signals.scope.usersImpact) {
      score += Math.min(signals.scope.usersImpact / 1000000, 0.2); // Normalize by 1M users
    }

    // Impact scale component (0-0.2)
    const scaleMap: Record<string, number> = {
      feature: 0.05,
      team: 0.1,
      org: 0.15,
      company: 0.2
    };
    score += scaleMap[signals.impact.scale] || 0.05;

    return Math.min(score, 1.0);
  }

  /**
   * Compute level score using formula:
   * Level Score = (Σ competency_scores × weights) × (1 + scope_score × 0.3)
   * Note: Maturity modifier removed - no automatic penalty/reward for company stage
   */
  private computeLevelScore(
    competencyScores: CompetencyScore,
    scopeScore: number
  ): number {
    // Competency weights (sum to 1.0)
    const weights = {
      execution: 0.3,
      customer_insight: 0.25,
      strategy: 0.25,
      influence: 0.2
    };

    // Weighted sum of competencies (0-3 scale)
    const weightedSum =
      competencyScores.execution * weights.execution +
      competencyScores.customer_insight * weights.customer_insight +
      competencyScores.strategy * weights.strategy +
      competencyScores.influence * weights.influence;

    // Apply scope multiplier (1.0 to 1.3)
    const scopeMultiplier = 1 + scopeScore * 0.3;

    // Final score (maturity modifier removed)
    const finalScore = weightedSum * scopeMultiplier;

    return finalScore;
  }

  /**
   * Map level score to level code
   */
  private mapLevelScoreToLevel(score: number): {
    levelCode: PMLevelCode;
    displayLevel: PMLevelDisplay;
  } {
    // Level thresholds (based on score ranges)
    if (score < 1.5) {
      return { levelCode: 'L3', displayLevel: 'Associate Product Manager' };
    } else if (score < 2.5) {
      return { levelCode: 'L4', displayLevel: 'Product Manager' };
    } else if (score < 3.5) {
      return { levelCode: 'L5', displayLevel: 'Senior Product Manager' };
    } else if (score < 4.5) {
      return { levelCode: 'L6', displayLevel: 'Staff Product Manager' };
    } else {
      // Manager levels (M1/M2) would need additional signals (team size, direct reports)
      // For now, default to L6 for high scores
      return { levelCode: 'L6', displayLevel: 'Principal Product Manager' };
    }
  }

  /**
   * Calculate confidence score (0-1)
   * 
   * Confidence is primarily driven by whether criteria are met, since that's the assessment outcome.
   * Artifacts, metrics, and tags are inputs that help determine if criteria are met, but once we know
   * criteria status, that should be the main confidence driver.
   */
  private calculateConfidence(
    artifactCount: number,
    signals: LevelSignal,
    competencyScores: CompetencyScore
  ): number {
    // Count how many criteria are met (score >= 2.5)
    const criteriaMet = [
      competencyScores.execution >= 2.5,
      competencyScores.customer_insight >= 2.5,
      competencyScores.strategy >= 2.5,
      competencyScores.influence >= 2.5
    ].filter(Boolean).length;

    // PRIMARY FACTOR: Criteria met drives base confidence
    // If all criteria are met, we're confident in the assessment
    // If few/no criteria are met, we're less confident
    let confidence: number;
    if (criteriaMet === 4) {
      confidence = 0.75; // High base confidence when all criteria met
    } else if (criteriaMet === 3) {
      confidence = 0.60; // Moderate confidence when 3/4 criteria met
    } else if (criteriaMet === 2) {
      confidence = 0.45; // Lower confidence when only 2/4 criteria met
    } else if (criteriaMet === 1) {
      confidence = 0.35; // Low confidence when only 1/4 criteria met
    } else {
      confidence = 0.25; // Very low confidence when no criteria met
    }

    // SECONDARY FACTORS: Evidence quality/quantity adjusts confidence
    // More artifacts = more data to assess = slightly higher confidence
    if (artifactCount >= 20) confidence += 0.10;
    else if (artifactCount >= 10) confidence += 0.08;
    else if (artifactCount >= 5) confidence += 0.05;
    else if (artifactCount < 3) confidence -= 0.10; // Penalty for very few artifacts

    // Quantified metrics = stronger evidence = slightly higher confidence
    if (signals.impact.quantified) confidence += 0.08;
    else if (signals.impact.metrics.length === 0) confidence -= 0.05; // Penalty if no metrics at all

    // Strong average competency scores = additional validation
    const avgCompetency = (
      competencyScores.execution +
      competencyScores.customer_insight +
      competencyScores.strategy +
      competencyScores.influence
    ) / 4;
    if (avgCompetency >= 2.5) confidence += 0.05;
    else if (avgCompetency < 1.5) confidence -= 0.05; // Penalty for very low scores

    return Math.min(Math.max(confidence, 0.0), 1.0); // Clamp between 0 and 1
  }

  /**
   * Generate recommendations using LLM
   */
  private async generateRecommendations(
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined,
    competencyScores: CompetencyScore,
    signals: LevelSignal
  ): Promise<LevelRecommendation[]> {
    try {
      const prompt = GENERATE_RECOMMENDATIONS_PROMPT(
        currentLevel,
        targetLevel,
        competencyScores,
        signals
      );
      const response = await this.callLLMForPMLevels(prompt, 3000);

      if (!response.success || !response.data) {
        return [];
      }

      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[PMLevelsService] Error generating recommendations:', error);
      return [];
    }
  }

  /**
   * Generate delta summary (human-readable gap description)
   */
  private generateDeltaSummary(
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined,
    competencyScores: CompetencyScore,
    scopeScore: number
  ): string {
    if (!targetLevel) {
      return `Current level: ${currentLevel}. Focus on strengthening competencies and expanding scope.`;
    }

    const levelOrder: PMLevelCode[] = ['L3', 'L4', 'L5', 'L6', 'M1', 'M2'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    const targetIndex = levelOrder.indexOf(targetLevel);

    if (targetIndex > currentIndex) {
      const gaps: string[] = [];
      const avgCompetency = (
        competencyScores.execution +
        competencyScores.customer_insight +
        competencyScores.strategy +
        competencyScores.influence
      ) / 4;

      if (avgCompetency < 2.0) {
        gaps.push('strengthen core competencies');
      }
      if (scopeScore < 0.5) {
        gaps.push('expand scope of impact');
      }
      if (competencyScores.strategy < 2.0) {
        gaps.push('develop strategic thinking');
      }
      if (competencyScores.influence < 2.0) {
        gaps.push('build organizational influence');
      }

      return `To reach ${targetLevel}, focus on: ${gaps.join(', ')}.`;
    } else if (targetIndex < currentIndex) {
      return `You are already at or above ${targetLevel}. Consider targeting a higher level.`;
    } else {
      return `You are at ${currentLevel}. Continue building on your strengths.`;
    }
  }

  /**
   * Collect evidence by competency dimension
   * Maps each competency to the stories that demonstrate it
   */
  private async collectCompetencyEvidence(
    content: UserContent,
    competencyScores: CompetencyScore,
    levelCode: PMLevelCode
  ): Promise<Record<PMDimension, CompetencyEvidence>> {
    console.log(`[collectCompetencyEvidence] Starting evidence collection for ${content.stories.length} stories`);
    const dimensions: PMDimension[] = ['execution', 'customer_insight', 'strategy', 'influence'];
    const evidenceByCompetency: Record<PMDimension, CompetencyEvidence> = {} as any;

    // Map stories to competencies based on tags and content analysis
    for (const dimension of dimensions) {
      const relevantStories: EvidenceStory[] = [];
      const matchedTags = new Set<string>();

      // Analyze each story for competency relevance
      for (const story of content.stories) {
        // Simple heuristic: check tags and content for competency keywords
        const relevance = this.assessStoryCompetencyRelevance(story, dimension);

        // Lower threshold to 0.05 (at least 1 keyword match) to capture more stories
        if (relevance.score > 0.05) {
          // Find work item and company info
          const workItem = content.workItems.find(wi => wi.id === story.work_item_id);
          const companyName = workItem?.companies?.name || 'Unknown Company';
          const roleTitle = workItem?.title || 'Unknown Role';

          // Extract tags from story (would need to fetch from approved_content_tags table)
          const tags: string[] = []; // TODO: Fetch tags from approved_content_tags join

          // Extract story-level metrics
          const storyMetrics: string[] = [];
          if (story.metrics && Array.isArray(story.metrics)) {
            for (const metric of story.metrics) {
              // Only include story-level metrics (parentType: 'story' or no parentType for backward compatibility)
              if (!metric.parentType || metric.parentType === 'story') {
                const metricText = this.formatMetric(metric);
                if (metricText) storyMetrics.push(metricText);
              }
            }
          }

          // Always set levelAssessment (never undefined)
          const levelAssessment = this.assessStoryLevelExpectation(
            story, 
            levelCode, 
            dimension, 
            competencyScores[dimension]
          );

          relevantStories.push({
            id: story.id,
            title: story.title,
            content: story.content,
            tags,
            sourceRole: roleTitle,
            sourceCompany: companyName,
            lastUsed: story.updated_at || story.created_at,
            timesUsed: 1, // Could track in database
            confidence: relevance.confidence,
            outcomeMetrics: storyMetrics,
            levelAssessment // Always set, never undefined
          });

          // Add matched tags
          relevance.matchedKeywords.forEach(keyword => matchedTags.add(keyword));
        }
      }

      evidenceByCompetency[dimension] = {
        competency: dimension,
        evidence: relevantStories.slice(0, 10), // Top 10 stories per competency
        matchedTags: Array.from(matchedTags),
        overallConfidence: this.scoreToConfidence(competencyScores[dimension])
      };

      console.log(`[collectCompetencyEvidence] ${dimension}: Found ${relevantStories.length} relevant stories, ${matchedTags.size} matched tags`);
    }

    console.log(`[collectCompetencyEvidence] Evidence collection complete`);
    return evidenceByCompetency;
  }

  /**
   * Assess story relevance to a competency dimension
   */
  private assessStoryCompetencyRelevance(story: any, dimension: PMDimension): {
    score: number;
    confidence: 'high' | 'medium' | 'low';
    matchedKeywords: string[];
  } {
    const content = `${story.title} ${story.content}`.toLowerCase();
    const matchedKeywords: string[] = [];

    // Keyword mapping for each dimension
    const dimensionKeywords: Record<PMDimension, string[]> = {
      execution: ['launched', 'shipped', 'delivered', 'implemented', 'built', 'developed', 'executed', 'completed', 'milestone', 'sprint', 'agile', 'scrum', 'deployed', 'released', 'rolled out', 'activation', 'conversion', 'retention', 'growth', 'experiment', 'test', 'a/b test', 'iteration'],
      customer_insight: ['user research', 'customer', 'user', 'feedback', 'interview', 'survey', 'persona', 'user story', 'empathy', 'pain point', 'need', 'insights', 'usability', 'ux', 'behavior', 'analytics', 'data', 'research'],
      strategy: ['roadmap', 'vision', 'strategy', 'strategic', 'priorit', 'goal', 'objective', 'metric', 'kpi', 'okr', 'business case', 'market', 'taxonomy', 'framework', 'defined', 'established', 'initiative', 'opportunity', 'competitive'],
      influence: ['stakeholder', 'cross-functional', 'leadership', 'alignment', 'buy-in', 'executive', 'partner', 'collaboration', 'negotiat', 'influence', 'communication', 'presenting', 'advocat', 'consensus', 'team', 'adoption']
    };

    const keywords = dimensionKeywords[dimension] || [];
    let score = 0;

    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        matchedKeywords.push(keyword);
        score += 0.1;
      }
    }

    // Normalize score (0-1 range)
    score = Math.min(score, 1.0);

    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (score >= 0.5) confidence = 'high';
    else if (score >= 0.3) confidence = 'medium';

    return { score, confidence, matchedKeywords };
  }

  /**
   * Assess if story meets/exceeds/below level expectations
   */
  private assessStoryLevelExpectation(
    story: any,
    levelCode: PMLevelCode,
    dimension: PMDimension,
    competencyScore: number
  ): 'exceeds' | 'meets' | 'below' {
    // If competency score is high (>2.5), stories likely exceed expectations
    if (competencyScore >= 2.5) return 'exceeds';
    if (competencyScore >= 2.0) return 'meets';
    return 'below';
  }

  /**
   * Collect level evidence (resume, LinkedIn, story breakdowns)
   */
  private async collectLevelEvidence(
    content: UserContent,
    inference: PMLevelInference
  ): Promise<LevelEvidence> {
    console.log(`[collectLevelEvidence] Starting with ${content.workItems.length} work items, ${content.stories.length} stories`);

    // Extract resume evidence from sources
    const roleTitlesWithDates: Array<{ title: string; startDate: string | null }> = [];
    const companiesWithDates: Array<{ name: string; startDate: string | null }> = [];
    let totalDuration = 0;

    // Extract role-level metrics from work items
    const roleLevelMetrics: string[] = [];
    
    // Parse work items for role titles, company info, and metrics
    // Helper function to check if role is PM-related
    const isPMRole = (title: string): boolean => {
      const titleLower = title.toLowerCase();
      return titleLower.includes('product manager') || 
             titleLower.includes('product management') ||
             titleLower.includes('pm') ||
             titleLower.includes('associate pm') ||
             titleLower.includes('senior pm') ||
             titleLower.includes('staff pm') ||
             titleLower.includes('principal pm');
    };

    let totalPMDuration = 0; // PM-specific experience
    
    // Track unique roles to avoid double-counting duplicates
    const seenRoles = new Set<string>();
    
    for (const workItem of content.workItems) {
      if (workItem.title) {
        roleTitlesWithDates.push({
          title: workItem.title,
          startDate: workItem.start_date || null
        });
      }
      
      // Collect company names with dates (use most recent date for each company)
      if (workItem.companies?.name) {
        const companyName = workItem.companies.name;
        const existingCompany = companiesWithDates.find(c => c.name === companyName);
        if (existingCompany) {
          // Update with more recent date if this work item is more recent
          if (workItem.start_date && (!existingCompany.startDate || 
              new Date(workItem.start_date) > new Date(existingCompany.startDate))) {
            existingCompany.startDate = workItem.start_date;
          }
        } else {
          companiesWithDates.push({
            name: companyName,
            startDate: workItem.start_date || null
          });
        }
      }
      
      // Calculate duration if dates available (handle current roles where end_date is null)
      if (workItem.start_date) {
        // Create unique key for deduplication (title + company + start_date)
        const roleKey = `${workItem.title || ''}_${workItem.companies?.name || ''}_${workItem.start_date}`;
        
        // Skip if we've already counted this exact role
        if (seenRoles.has(roleKey)) {
          continue;
        }
        seenRoles.add(roleKey);
        
        const start = new Date(workItem.start_date);
        const end = workItem.end_date ? new Date(workItem.end_date) : new Date(); // Use current date if end_date is null
        
        // Validate dates (prevent negative or unrealistic durations)
        if (end < start) {
          console.warn(`[collectLevelEvidence] Invalid date range for ${workItem.title} at ${workItem.companies?.name}: ${workItem.start_date} to ${workItem.end_date}`);
          continue;
        }
        
        const durationYears = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        totalDuration += durationYears;
        
        // Calculate PM-specific experience
        if (isPMRole(workItem.title)) {
          totalPMDuration += durationYears;
        }
      }
      
      // Extract metrics from structured JSONB metrics field (preferred)
      if (workItem.metrics && Array.isArray(workItem.metrics)) {
        for (const metric of workItem.metrics) {
          // Only include role-level metrics (parentType: 'role' or no parentType for backward compatibility)
          if (!metric.parentType || metric.parentType === 'role') {
            const metricText = this.formatMetric(metric);
            if (metricText) roleLevelMetrics.push(metricText);
          }
        }
      }
      
      // Fallback to achievements field (legacy TEXT[] format)
      if (workItem.achievements && Array.isArray(workItem.achievements)) {
        roleLevelMetrics.push(...workItem.achievements.filter(Boolean));
      }
    }

    // Tag density analysis - collect tags from stories
    const tagCounts = new Map<string, number>();
    for (const story of content.stories) {
      if (story.tags && Array.isArray(story.tags)) {
        for (const tag of story.tags) {
          if (tag) {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
          }
        }
      }
    }

    const tagDensity = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Determine next level (APM -> PM -> Senior PM -> Staff/Principal PM -> Manager)
    const levelOrder: PMLevelCode[] = ['L3', 'L4', 'L5', 'L6', 'M1', 'M2'];
    const currentIndex = levelOrder.indexOf(inference.inferredLevel);
    
    // Ensure next level is always higher than current (never go backwards)
    let nextLevel: PMLevelCode;
    if (currentIndex >= 0 && currentIndex < levelOrder.length - 1) {
      nextLevel = levelOrder[currentIndex + 1];
    } else if (currentIndex === -1) {
      // If current level not found in order, default to next IC level
      console.warn(`[PMLevelsService] Current level ${inference.inferredLevel} not in levelOrder, defaulting to L4`);
      nextLevel = 'L4'; // Default to PM as next level
    } else {
      // Already at highest level
      nextLevel = inference.inferredLevel;
    }

    // Build gaps to next level
    const gaps: { area: string; description: string; examples: string[] }[] = [];
    if (inference.competencyScores.execution < 2.5) {
      gaps.push({
        area: 'Execution',
        description: 'Need stronger evidence of shipping complex products end-to-end',
        examples: ['Add more stories with clear launch outcomes', 'Quantify delivery metrics']
      });
    }
    if (inference.competencyScores.strategy < 2.5) {
      gaps.push({
        area: 'Strategy',
        description: 'Show more strategic thinking and long-term planning',
        examples: ['Document vision-setting work', 'Add roadmap planning examples']
      });
    }

    // Sort roles by chronological order (oldest first, most recent last)
    const sortedRoleTitles = roleTitlesWithDates
      .sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1; // No date goes to end
        if (!b.startDate) return -1; // No date goes to end
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime(); // Oldest first
      })
      .map(item => item.title)
      .slice(0, 5);
    
    // Sort companies by chronological order (oldest first, most recent last)
    const sortedCompanies = companiesWithDates
      .sort((a, b) => {
        if (!a.startDate && !b.startDate) return 0;
        if (!a.startDate) return 1; // No date goes to end
        if (!b.startDate) return -1; // No date goes to end
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime(); // Oldest first
      })
      .map(item => item.name)
      .slice(0, 5);

    const levelEvidence = {
      currentLevel: inference.displayLevel,
      nextLevel: this.mapLevelCodeToDisplay(nextLevel),
      confidence: this.scoreToConfidence(inference.confidence),
      resumeEvidence: {
        roleTitles: sortedRoleTitles,
        duration: totalDuration > 0 ? `${totalDuration.toFixed(1)} years total / ${totalPMDuration.toFixed(1)} years Product Manager experience` : '0 years',
        companyScale: sortedCompanies
      },
      storyEvidence: {
        totalStories: content.stories.length,
        relevantStories: content.stories.length, // All stories are relevant for PM Level assessment
        tagDensity
      },
      levelingFramework: {
        framework: 'PM Level Assessment',
        criteria: [
          'Execution: ability to ship products',
          'Customer Insight: user research depth',
          'Strategy: vision and roadmap thinking',
          'Influence: cross-functional leadership'
        ],
        match: `${Math.round(inference.confidence * 100)}% confident`,
        confidencePercentage: Math.round(inference.confidence * 100),
        metCriteria: [
          { criterion: 'Execution: ability to ship products', met: inference.competencyScores.execution >= 2.5 },
          { criterion: 'Customer Insight: user research depth', met: inference.competencyScores.customer_insight >= 2.5 },
          { criterion: 'Strategy: vision and roadmap thinking', met: inference.competencyScores.strategy >= 2.5 },
          { criterion: 'Influence: cross-functional leadership', met: inference.competencyScores.influence >= 2.5 }
        ]
      },
      gaps,
      outcomeMetrics: {
        roleLevel: roleLevelMetrics.slice(0, 20), // Top 20 role-level metrics
        storyLevel: this.extractStoryLevelMetrics(content.stories),
        analysis: {
          totalMetrics: roleLevelMetrics.length + this.extractStoryLevelMetrics(content.stories).length,
          impactLevel: inference.signals.impact.scale,
          keyAchievements: roleLevelMetrics.slice(0, 5) // Use only role-level metrics, avoid duplication
        }
      }
    };

    console.log(`[collectLevelEvidence] Complete - ${sortedRoleTitles.length} roles, ${totalDuration.toFixed(1)} years, ${content.stories.length} total stories`);
    return levelEvidence;
  }

  /**
   * Collect role archetype evidence (specialization matches)
   */
  private async collectRoleArchetypeEvidence(
    content: UserContent,
    roleTypes: RoleType[]
  ): Promise<Record<RoleType, RoleArchetypeEvidence>> {
    const evidenceByRole: Record<RoleType, RoleArchetypeEvidence> = {} as any;

    for (const roleType of roleTypes) {
      // Extract role-level metrics for this role type
      const roleLevelMetrics: string[] = [];
      
      // Analyze work history for role type match
      const workHistory = content.workItems.map(wi => {
        // Extract metrics from this work item if it matches the role type
        if (wi.metrics && Array.isArray(wi.metrics)) {
          for (const metric of wi.metrics) {
            if (!metric.parentType || metric.parentType === 'role') {
              const metricText = this.formatMetric(metric);
              if (metricText) roleLevelMetrics.push(metricText);
            }
          }
        }
        if (wi.achievements && Array.isArray(wi.achievements)) {
          roleLevelMetrics.push(...wi.achievements.filter(Boolean));
        }
        
        return {
        company: wi.companies?.name || 'Unknown',
        role: wi.title || 'Unknown',
        relevance: this.assessRoleRelevance(wi, roleType),
          tags: wi.tags || [] // Extract tags from work item
        };
      });

      // Industry patterns for each role type
      const industryPatterns = this.getIndustryPatterns(roleType);

      evidenceByRole[roleType] = {
        roleType: this.formatRoleType(roleType),
        matchScore: Math.random() * 40 + 60, // TODO: Calculate real match score
        description: this.getRoleTypeDescription(roleType),
        industryPatterns,
        problemComplexity: {
          level: 'Medium-High',
          examples: ['Product launches', 'Feature development', 'User research'],
          evidence: content.stories.slice(0, 3).map(s => s.title)
        },
        workHistory: workHistory.slice(0, 5),
        tagAnalysis: [], // TODO: Implement tag analysis
        gaps: [],
        outcomeMetrics: {
          roleLevel: roleLevelMetrics.slice(0, 20), // Top 20 role-level metrics for this role type
          storyLevel: this.extractStoryLevelMetrics(content.stories),
          analysis: {
            totalMetrics: roleLevelMetrics.length + this.extractStoryLevelMetrics(content.stories).length,
            impactLevel: 'team' as const,
            keyAchievements: roleLevelMetrics.slice(0, 5)
          }
        }
      };
    }

    return evidenceByRole;
  }

  /**
   * Assess work item relevance to role type
   */
  private assessRoleRelevance(workItem: any, roleType: RoleType): string {
    // Simple heuristic based on role type keywords
    const description = `${workItem.title} ${workItem.description || ''}`.toLowerCase();

    const roleKeywords: Record<RoleType, string[]> = {
      growth: ['growth', 'acquisition', 'retention', 'funnel', 'conversion'],
      platform: ['platform', 'infrastructure', 'api', 'sdk', 'developer'],
      ai_ml: ['ai', 'ml', 'machine learning', 'model', 'algorithm'],
      founding: ['founding', 'startup', '0-1', 'first', 'launch'],
      technical: ['technical', 'engineering', 'architecture', 'system'],
      general: ['product', 'feature', 'user', 'customer']
    };

    const keywords = roleKeywords[roleType] || [];
    const matches = keywords.filter(keyword => description.includes(keyword)).length;

    if (matches >= 3) return 'High Relevance';
    if (matches >= 1) return 'Medium Relevance';
    return 'Low Relevance';
  }

  /**
   * Get industry patterns for role type
   */
  private getIndustryPatterns(roleType: RoleType): Array<{
    pattern: string;
    match: boolean;
    examples: string[];
  }> {
    const patterns: Record<RoleType, Array<{ pattern: string; match: boolean; examples: string[] }>> = {
      growth: [
        { pattern: 'User acquisition focus', match: true, examples: ['Funnel optimization', 'A/B testing'] },
        { pattern: 'Metrics-driven decisions', match: true, examples: ['Conversion tracking', 'Cohort analysis'] }
      ],
      platform: [
        { pattern: 'Developer-facing products', match: true, examples: ['API design', 'SDK development'] },
        { pattern: 'Technical depth', match: true, examples: ['System architecture', 'Integration patterns'] }
      ],
      ai_ml: [
        { pattern: 'ML product experience', match: true, examples: ['Model evaluation', 'Feature engineering'] },
        { pattern: 'Data-driven insights', match: true, examples: ['Algorithm selection', 'Performance metrics'] }
      ],
      founding: [
        { pattern: '0-1 product building', match: true, examples: ['MVP development', 'Early customer discovery'] },
        { pattern: 'Startup environment', match: true, examples: ['Fast iteration', 'Resource constraints'] }
      ],
      technical: [
        { pattern: 'Technical background', match: true, examples: ['Engineering collaboration', 'System design'] },
        { pattern: 'Deep technical products', match: true, examples: ['Infrastructure', 'Platform work'] }
      ],
      general: [
        { pattern: 'Broad PM skills', match: true, examples: ['Feature development', 'User research'] },
        { pattern: 'Cross-functional work', match: true, examples: ['Stakeholder management', 'Team coordination'] }
      ]
    };

    return patterns[roleType] || [];
  }

  /**
   * Format role type for display
   */
  private formatRoleType(roleType: RoleType): string {
    const displayNames: Record<RoleType, string> = {
      growth: 'Growth PM',
      platform: 'Platform PM',
      ai_ml: 'AI/ML PM',
      founding: 'Founding PM',
      technical: 'Technical PM',
      general: 'Generalist PM'
    };
    return displayNames[roleType] || roleType;
  }

  /**
   * Get role type description
   */
  private getRoleTypeDescription(roleType: RoleType): string {
    const descriptions: Record<RoleType, string> = {
      growth: 'Focuses on user acquisition, activation, retention, and revenue growth',
      platform: 'Builds developer-facing products, APIs, SDKs, and infrastructure',
      ai_ml: 'Develops AI/ML-powered products and features',
      founding: 'Builds products from 0-1 in startup environments',
      technical: 'Works on technical products requiring deep engineering collaboration',
      general: 'Broad PM skills across various product areas'
    };
    return descriptions[roleType] || 'Product management role';
  }

  /**
   * Convert numeric score to confidence level
   */
  private scoreToConfidence(score: number): 'high' | 'medium' | 'low' {
    if (score >= 0.75 || score >= 2.5) return 'high';
    if (score >= 0.5 || score >= 2.0) return 'medium';
    return 'low';
  }

  /**
   * Sort roles by progression level (Associate Product Manager -> Product Manager -> Senior Product Manager -> etc.)
   */
  private sortRolesByProgression(roles: string[]): string[] {
    const progressionOrder = [
      'associate product manager',
      'product manager',
      'senior product manager',
      'staff product manager',
      'principal product manager',
      'group product manager',
      'director of product'
    ];

    return [...roles].sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Find index in progression order
      const aIndex = progressionOrder.findIndex(level => aLower.includes(level));
      const bIndex = progressionOrder.findIndex(level => bLower.includes(level));
      
      // If both found, sort by progression order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one found, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither found, maintain original order
      return 0;
    });
  }

  /**
   * Sort companies to match role progression order
   */
  private sortCompaniesByRoleProgression(workItems: any[], companies: string[]): string[] {
    const progressionOrder = [
      'associate product manager',
      'product manager',
      'senior product manager',
      'staff product manager',
      'principal product manager',
      'group product manager',
      'director of product'
    ];

    // Create a map of company -> earliest role level
    const companyRoleMap = new Map<string, number>();
    
    for (const workItem of workItems) {
      if (workItem.companies?.name && workItem.title) {
        const companyName = workItem.companies.name;
        const titleLower = workItem.title.toLowerCase();
        const roleIndex = progressionOrder.findIndex(level => titleLower.includes(level));
        
        if (roleIndex !== -1) {
          const currentIndex = companyRoleMap.get(companyName);
          if (currentIndex === undefined || roleIndex < currentIndex) {
            companyRoleMap.set(companyName, roleIndex);
          }
        }
      }
    }

    // Sort companies by their earliest role level
    return [...companies].sort((a, b) => {
      const aIndex = companyRoleMap.get(a) ?? 999;
      const bIndex = companyRoleMap.get(b) ?? 999;
      return aIndex - bIndex;
    });
  }

  /**
   * Format metric object to readable string
   */
  private formatMetric(metric: any): string | null {
    if (!metric) return null;
    
    // If metric is already a string, filter out invalid values
    if (typeof metric === 'string') {
      const trimmed = metric.trim();
      // Filter out standalone symbols like "%", "-", "+", etc.
      if (trimmed.length <= 2 && /^[%+\-]?$/.test(trimmed)) return null;
      return trimmed || null;
    }
    
    // Format structured metric object
    const parts: string[] = [];
    if (metric.value) {
      const valueStr = String(metric.value).trim();
      // Filter out invalid values
      if (valueStr && !/^[%+\-]?$/.test(valueStr)) {
        parts.push(valueStr);
      }
    }
    if (metric.context) {
      const contextStr = String(metric.context).trim();
      if (contextStr) parts.push(contextStr);
    }
    if (metric.unit && !parts.some(p => p.includes(metric.unit))) {
      parts.push(metric.unit);
    }
    
    const result = parts.length > 0 ? parts.join(' ') : null;
    // Final check - filter out standalone symbols
    if (result && result.length <= 2 && /^[%+\-]?$/.test(result)) return null;
    return result;
  }

  /**
   * Extract story-level metrics from stories array
   */
  private extractStoryLevelMetrics(stories: any[]): string[] {
    const storyMetrics: string[] = [];
    
    for (const story of stories) {
      if (story.metrics && Array.isArray(story.metrics)) {
        for (const metric of story.metrics) {
          // Only include story-level metrics
          if (!metric.parentType || metric.parentType === 'story') {
            const metricText = this.formatMetric(metric);
            if (metricText) storyMetrics.push(metricText);
          }
        }
      }
    }
    
    return storyMetrics;
  }

  /**
   * Select top artifacts used in analysis
   */
  private selectTopArtifacts(
    artifacts: Array<{ id: string; type: string; content: string }>,
    signals: LevelSignal
  ): string[] {
    // Return top 6 artifacts (prioritize sources, then stories, then work items)
    const sorted = [...artifacts].sort((a, b) => {
      const typeOrder: Record<string, number> = { source: 0, story: 1, work_item: 2 };
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });

    return sorted.slice(0, 6).map(a => a.id);
  }

  /**
   * Save level assessment to database
   */
  private async saveLevelAssessment(
    userId: string,
    inference: PMLevelInference
  ): Promise<void> {
    try {
      // Build upsert payload - exclude deprecated maturity_modifier
      const upsertPayload: any = {
        user_id: userId,
        inferred_level: inference.inferredLevel,
        confidence: inference.confidence,
        scope_score: inference.scopeScore,
        maturity_info: inference.maturityInfo, // Store maturity for display, not used as modifier
        role_type: inference.roleType,
        delta_summary: inference.deltaSummary,
        recommendations: inference.recommendations,
        competency_scores: inference.competencyScores,
        signals: inference.signals,
        evidence_by_competency: inference.evidenceByCompetency || {},
        level_evidence: inference.levelEvidence || {},
        role_archetype_evidence: inference.roleArchetypeEvidence || {},
        last_run_timestamp: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('user_levels')
        .upsert(upsertPayload, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      console.log('[PMLevelsService] Level assessment saved to database');
    } catch (error) {
      console.error('[PMLevelsService] Error saving level assessment:', error);
      throw error;
    }
  }

  /**
   * Log PM Levels result to evaluation_runs table
   */
  private async logPMLevelsResult(data: {
    userId: string;
    sourceId: string;
    sessionId?: string;
    inference: PMLevelInference | null;
    latency: number;
    status: 'success' | 'failed';
    error?: string;
  }): Promise<void> {
    try {
      // Find the most recent evaluation_run for this source_id
      const { data: evaluationRun, error: findError } = await supabase
        .from('evaluation_runs')
        .select('id')
        .eq('source_id', data.sourceId)
        .eq('user_id', data.userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (findError || !evaluationRun) {
        console.warn('[PMLevelsService] No evaluation_run found for source:', data.sourceId);
        return;
      }

      // Update the evaluation_run with PM Levels results
      const updateData: any = {
        pm_levels_status: data.status,
        pm_levels_latency_ms: data.latency
      };

      if (data.inference) {
        updateData.pm_levels_inferred_level = data.inference.inferredLevel;
        updateData.pm_levels_confidence = data.inference.confidence;
      }

      if (data.error) {
        updateData.pm_levels_error = data.error;
      }

      const { error: updateError } = await supabase
        .from('evaluation_runs')
        .update(updateData)
        .eq('id', evaluationRun.id);

      if (updateError) {
        console.error('[PMLevelsService] Failed to log PM Levels result:', updateError);
      } else {
        console.log('[PMLevelsService] Logged PM Levels result to evaluation_runs');
      }
    } catch (error) {
      console.error('[PMLevelsService] Error logging PM Levels result:', error);
      // Don't throw - logging failure shouldn't break the analysis
    }
  }

  /**
   * Get user's level assessment from database
   */
  async getUserLevel(userId: string): Promise<PMLevelInference | null> {
    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          console.log('[PMLevelsService] No level assessment found for user');
          return null;
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      // Transform database row to PMLevelInference
      return {
        inferredLevel: data.inferred_level as PMLevelCode,
        displayLevel: this.mapLevelCodeToDisplay(data.inferred_level),
        confidence: data.confidence,
        scopeScore: data.scope_score,
        maturityInfo: data.maturity_info || 'growth', // Maturity for display only, not used as modifier
        roleType: data.role_type || [],
        competencyScores: data.competency_scores || {
          execution: 0,
          customer_insight: 0,
          strategy: 0,
          influence: 0
        },
        levelScore: 0, // Not stored in DB, only used during analysis
        deltaSummary: data.delta_summary || '',
        recommendations: data.recommendations || [],
        signals: data.signals || {},
        topArtifacts: [], // Not stored in DB, only used during analysis
        evidenceByCompetency: data.evidence_by_competency || {},
        levelEvidence: data.level_evidence || {},
        roleArchetypeEvidence: data.role_archetype_evidence || {}
      };
    } catch (error) {
      console.error('[PMLevelsService] Error fetching user level:', error);
      throw error;
    }
  }

  /**
   * Map level code to display text
   */
  private mapLevelCodeToDisplay(levelCode: string): PMLevelDisplay {
    const displayMap: Record<string, PMLevelDisplay> = {
      'L3': 'Associate Product Manager' as PMLevelDisplay,
      'L4': 'Product Manager' as PMLevelDisplay,
      'L5': 'Senior Product Manager' as PMLevelDisplay,
      'L6': 'Staff/Principal Product Manager' as PMLevelDisplay,
      'M1': 'Group Product Manager' as PMLevelDisplay,
      'M2': 'Director of Product' as PMLevelDisplay
    };
    return displayMap[levelCode] || (levelCode as PMLevelDisplay);
  }

  /**
   * Call LLM for PM Levels analysis (wrapper around LLMAnalysisService)
   */
  private async callLLMForPMLevels(
    prompt: string,
    maxTokens: number
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    retryable?: boolean;
  }> {
    // Use LLMAnalysisService's private callOpenAI method via type assertion
    // This is a workaround until we add a public method to LLMAnalysisService
    try {
      const response = await (this.llmService as any).callOpenAI(prompt, maxTokens);
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LLM call failed',
        retryable: true
      };
    }
  }
}

