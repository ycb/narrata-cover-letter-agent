// PM Levels Service - Analyzes user content to infer PM level
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
  PMDimension
} from '@/types/content';

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
    evaluationTracking?: {
      sourceId?: string;
      sessionId?: string;
    }
  ): Promise<PMLevelInference | null> {
    const startTime = performance.now();
    let inference: PMLevelInference | null = null;
    let error: Error | null = null;

    try {
      console.log(`[PMLevelsService] Starting analysis for user: ${userId}`);

      // Fetch user content
      const content = await this.fetchUserContent(userId);
      if (!content || content.artifacts.length === 0) {
        console.warn('[PMLevelsService] No content found for user');
        return null;
      }

      // Extract signals from content using LLM
      const signals = await this.extractSignals(content.combinedText);

      // Derive business maturity from company metadata
      const maturityModifier = await this.deriveBusinessMaturity(content.companies);

      // Compute competency scores
      const competencyScores = await this.computeCompetencyScores(
        content.combinedText,
        roleType || [],
        maturityModifier.maturity
      );

      // Compute scope score
      const scopeScore = this.computeScopeScore(signals, content.artifacts);

      // Compute level score using formula
      const levelScore = this.computeLevelScore(
        competencyScores,
        scopeScore,
        maturityModifier.value
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

      const inference: PMLevelInference = {
        inferredLevel: levelCode,
        displayLevel,
        confidence,
        scopeScore,
        maturityModifier: maturityModifier.value,
        roleType: roleType || [],
        competencyScores,
        levelScore,
        deltaSummary,
        recommendations,
        signals,
        topArtifacts
      };

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
   * Fetch user content from database
   */
  private async fetchUserContent(userId: string): Promise<{
    artifacts: Array<{ id: string; content: string; date: string }>;
    companies: CompanyMetadata[];
    combinedText: string;
  } | null> {
    try {
      // Fetch approved content (stories/blurbs) from last 4 years
      const fourYearsAgo = new Date();
      fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);

      const { data: approvedContent, error: contentError } = await supabase
        .from('approved_content')
        .select('id, content, created_at')
        .eq('user_id', userId)
        .gte('created_at', fourYearsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50); // Top 50 artifacts

      if (contentError) throw contentError;

      // Fetch work items for company metadata
      const { data: workItems, error: workItemsError } = await supabase
        .from('work_items')
        .select('id, title, description, achievements, company_id, start_date, end_date')
        .eq('user_id', userId)
        .order('start_date', { ascending: false });

      if (workItemsError) throw workItemsError;

      // Fetch companies
      const companyIds = [...new Set(workItems?.map(wi => wi.company_id) || [])];
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, description, tags')
        .eq('user_id', userId)
        .in('id', companyIds);

      if (companiesError) throw companiesError;

      // Build artifacts array
      const artifacts = (approvedContent || []).map(ac => ({
        id: ac.id,
        content: ac.content,
        date: ac.created_at
      }));

      // Build company metadata
      const companyMetadata: CompanyMetadata[] = (companies || []).map(c => ({
        name: c.name,
        // Try to infer size/funding from description/tags
        size: this.inferCompanySize(c.description, c.tags),
        fundingStage: this.inferFundingStage(c.description, c.tags),
        yearsActive: this.calculateYearsActive(workItems || [], c.id)
      }));

      // Combine all text for analysis
      const storyTexts = artifacts.map(a => a.content).join('\n\n');
      const workItemTexts = (workItems || [])
        .map(wi => `${wi.title}: ${wi.description || ''} ${(wi.achievements || []).join(' ')}`)
        .join('\n\n');
      const combinedText = `${storyTexts}\n\n${workItemTexts}`;

      return {
        artifacts,
        companies: companyMetadata,
        combinedText
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
      const prompt = EXTRACT_SIGNALS_PROMPT.replace('{content}', content);
      
      // Use LLM service with temperature 0.3 for deterministic output
      const response = await this.callLLM(prompt, 0.3);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to extract signals');
      }

      const signals = response.data as LevelSignal;
      
      // Validate and normalize signals
      return {
        scope: {
          teams: signals.scope?.teams || 0,
          revenueImpact: signals.scope?.revenueImpact || undefined,
          usersImpact: signals.scope?.usersImpact || undefined,
          orgSize: signals.scope?.orgSize || undefined
        },
        impact: {
          metrics: signals.impact?.metrics || [],
          quantified: signals.impact?.quantified || false,
          scale: signals.impact?.scale || 'feature'
        },
        influence: {
          crossFunctional: signals.influence?.crossFunctional || false,
          executive: signals.influence?.executive || false,
          external: signals.influence?.external || false,
          teamSize: signals.influence?.teamSize || undefined
        },
        teamSize: signals.teamSize || undefined,
        metrics: signals.metrics || []
      };
    } catch (error) {
      console.error('[PMLevelsService] Error extracting signals:', error);
      // Return default signals
      return {
        scope: { teams: 0 },
        impact: { metrics: [], quantified: false, scale: 'feature' },
        influence: { crossFunctional: false, executive: false, external: false },
        metrics: []
      };
    }
  }

  /**
   * Compute competency scores from content
   */
  private async computeCompetencyScores(
    content: string,
    roleType: RoleType[],
    maturity: BusinessMaturity
  ): Promise<CompetencyScore> {
    try {
      const prompt = RATE_COMPETENCIES_PROMPT.replace('{content}', content);
      
      const response = await this.callLLM(prompt, 0.3);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to rate competencies');
      }

      const rawScores = response.data as CompetencyScore;
      
      // Apply role type and maturity weights
      const weights = this.getCompetencyWeights(roleType, maturity);
      
      return {
        execution: Math.min(3, rawScores.execution * weights.execution),
        customer_insight: Math.min(3, rawScores.customer_insight * weights.customer_insight),
        strategy: Math.min(3, rawScores.strategy * weights.strategy),
        influence: Math.min(3, rawScores.influence * weights.influence)
      };
    } catch (error) {
      console.error('[PMLevelsService] Error computing competency scores:', error);
      return { execution: 0, customer_insight: 0, strategy: 0, influence: 0 };
    }
  }

  /**
   * Get competency weights based on role type and maturity
   */
  private getCompetencyWeights(
    roleType: RoleType[],
    maturity: BusinessMaturity
  ): CompetencyScore {
    // Base weights
    let weights: CompetencyScore = {
      execution: 1.0,
      customer_insight: 1.0,
      strategy: 1.0,
      influence: 1.0
    };

    // Adjust for role type
    if (roleType.includes('growth')) {
      weights.customer_insight *= 1.2;
      weights.execution *= 1.1;
    }
    if (roleType.includes('platform')) {
      weights.strategy *= 1.2;
      weights.influence *= 1.1;
    }
    if (roleType.includes('ai_ml')) {
      weights.execution *= 1.2;
      weights.strategy *= 1.1;
    }
    if (roleType.includes('founding')) {
      weights.strategy *= 1.3;
      weights.influence *= 1.2;
    }

    // Adjust for maturity (early stage needs broader scope)
    if (maturity === 'early') {
      weights.execution *= 0.9; // Relaxed for early stage
      weights.strategy *= 1.1; // More strategy needed
    } else if (maturity === 'late') {
      weights.influence *= 1.2; // More influence needed
      weights.execution *= 1.1; // Higher execution bar
    }

    return weights;
  }

  /**
   * Compute scope score from signals
   */
  private computeScopeScore(
    signals: LevelSignal,
    artifacts: Array<{ id: string; content: string; date: string }>
  ): number {
    let score = 0;

    // Team size component (0-0.3)
    if (signals.teamSize) {
      score += Math.min(0.3, signals.teamSize / 20); // Max at 20+ team size
    }

    // Revenue/users impact (0-0.3)
    if (signals.scope.revenueImpact) {
      const revenueScore = Math.min(0.3, Math.log10(signals.scope.revenueImpact || 1) / 10);
      score += revenueScore;
    } else if (signals.scope.usersImpact) {
      const usersScore = Math.min(0.3, Math.log10(signals.scope.usersImpact || 1) / 8);
      score += usersScore;
    }

    // Cross-functional teams (0-0.2)
    if (signals.scope.teams > 0) {
      score += Math.min(0.2, signals.scope.teams / 5);
    }

    // Impact scale (0-0.2)
    const scaleScores = { feature: 0, team: 0.1, org: 0.15, company: 0.2 };
    score += scaleScores[signals.impact.scale] || 0;

    return Math.min(1.0, score);
  }

  /**
   * Derive business maturity from company metadata
   */
  private async deriveBusinessMaturity(
    companies: CompanyMetadata[]
  ): Promise<{ maturity: BusinessMaturity; value: number }> {
    if (companies.length === 0) {
      return { maturity: 'growth', value: 1.0 }; // Default
    }

    // Aggregate company info
    const companyInfo = companies
      .map(c => `${c.name}: ${c.description || ''} Size: ${c.size || 'unknown'} Stage: ${c.fundingStage || 'unknown'}`)
      .join('\n');

    try {
      const prompt = DERIVE_BUSINESS_MATURITY_PROMPT.replace('{companyInfo}', companyInfo);
      const response = await this.callLLM(prompt, 0.3);

      if (response.success && response.data) {
        const result = response.data as { maturity: BusinessMaturity; confidence: number };
        const maturityModifiers = { early: 0.9, growth: 1.0, late: 1.1 };
        return {
          maturity: result.maturity,
          value: maturityModifiers[result.maturity] || 1.0
        };
      }
    } catch (error) {
      console.error('[PMLevelsService] Error deriving maturity:', error);
    }

    // Fallback: Infer from company data
    const avgSize = companies.reduce((sum, c) => sum + (c.size || 50), 0) / companies.length;
    const hasLateStage = companies.some(c => 
      c.fundingStage === 'public' || c.fundingStage === 'late' || (c.size || 0) > 1000
    );
    const hasEarlyStage = companies.some(c => 
      c.fundingStage === 'seed' || c.fundingStage === 'series_a' || (c.size || 0) < 50
    );

    if (hasLateStage) {
      return { maturity: 'late', value: 1.1 };
    } else if (hasEarlyStage && avgSize < 100) {
      return { maturity: 'early', value: 0.9 };
    } else {
      return { maturity: 'growth', value: 1.0 };
    }
  }

  /**
   * Compute level score using formula: (Σ competency_scores × weights) × (1 + scope_score × 0.3) × maturity_modifier
   */
  private computeLevelScore(
    competencies: CompetencyScore,
    scopeScore: number,
    maturityModifier: number
  ): number {
    // Sum of competency scores (each 0-3, total 0-12)
    const competencySum = 
      competencies.execution +
      competencies.customer_insight +
      competencies.strategy +
      competencies.influence;

    // Apply scope multiplier
    const scopeMultiplier = 1 + (scopeScore * 0.3);

    // Apply maturity modifier
    const levelScore = competencySum * scopeMultiplier * maturityModifier;

    return levelScore;
  }

  /**
   * Map level score to level code and display name
   */
  private mapLevelScoreToLevel(score: number): { levelCode: PMLevelCode; displayLevel: PMLevelDisplay } {
    // Thresholds based on score ranges
    // Score can range from ~0 to ~16 (12 max competencies * 1.3 scope * 1.1 maturity)
    if (score < 3) {
      return { levelCode: 'L3', displayLevel: 'Associate PM' };
    } else if (score < 6) {
      return { levelCode: 'L3', displayLevel: 'PM' };
    } else if (score < 9) {
      return { levelCode: 'L4', displayLevel: 'Senior PM' };
    } else if (score < 12) {
      return { levelCode: 'L5', displayLevel: 'Staff PM' };
    } else if (score < 14) {
      return { levelCode: 'L6', displayLevel: 'Principal PM' };
    } else {
      return { levelCode: 'L6', displayLevel: 'Lead PM' };
    }
  }

  /**
   * Calculate confidence score (0-1)
   */
  private calculateConfidence(
    artifactCount: number,
    signals: LevelSignal,
    competencies: CompetencyScore
  ): number {
    let confidence = 0.5; // Base confidence

    // More artifacts = higher confidence
    if (artifactCount >= 20) confidence += 0.2;
    else if (artifactCount >= 10) confidence += 0.15;
    else if (artifactCount >= 5) confidence += 0.1;
    else confidence += 0.05;

    // Quantified metrics = higher confidence
    if (signals.impact.quantified && signals.metrics.length > 0) {
      confidence += 0.15;
    }

    // Strong competency scores = higher confidence
    const avgCompetency = (
      competencies.execution +
      competencies.customer_insight +
      competencies.strategy +
      competencies.influence
    ) / 4;
    if (avgCompetency >= 2.5) confidence += 0.1;
    else if (avgCompetency >= 2.0) confidence += 0.05;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined,
    competencies: CompetencyScore,
    signals: LevelSignal
  ): Promise<LevelRecommendation[]> {
    const gaps = this.identifyGaps(currentLevel, targetLevel, competencies, signals);
    
    if (gaps.length === 0) {
      return [];
    }

    try {
      const prompt = GENERATE_RECOMMENDATIONS_PROMPT
        .replace('{currentLevel}', currentLevel)
        .replace('{targetLevel}', targetLevel || currentLevel)
        .replace('{gaps}', JSON.stringify(gaps))
        .replace('{deltaSummary}', this.generateDeltaSummary(currentLevel, targetLevel, competencies, 0));

      const response = await this.callLLM(prompt, 0.3);

      if (response.success && response.data) {
        const recommendations = response.data as LevelRecommendation[];
        return recommendations.map((r, idx) => ({
          ...r,
          id: `rec-${idx}-${Date.now()}`
        }));
      }
    } catch (error) {
      console.error('[PMLevelsService] Error generating recommendations:', error);
    }

    // Fallback: Generate basic recommendations
    return this.generateFallbackRecommendations(gaps, currentLevel, targetLevel);
  }

  /**
   * Identify competency gaps
   */
  private identifyGaps(
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined,
    competencies: CompetencyScore,
    signals: LevelSignal
  ): Array<{ competency: PMDimension; gap: number }> {
    const gaps: Array<{ competency: PMDimension; gap: number }> = [];
    
    if (!targetLevel) return gaps;

    // Target competency scores based on level
    const targetScores = this.getTargetCompetencyScores(targetLevel);
    const currentScores = competencies;

    const dimensions: PMDimension[] = ['execution', 'customer_insight', 'strategy', 'influence'];
    dimensions.forEach(dim => {
      const gap = targetScores[dim] - currentScores[dim];
      if (gap > 0.5) {
        gaps.push({ competency: dim, gap });
      }
    });

    return gaps;
  }

  /**
   * Get target competency scores for a level
   */
  private getTargetCompetencyScores(level: PMLevelCode): CompetencyScore {
    const levelScores: Record<PMLevelCode, CompetencyScore> = {
      L3: { execution: 1.5, customer_insight: 1.5, strategy: 1.0, influence: 1.0 },
      L4: { execution: 2.0, customer_insight: 2.0, strategy: 1.5, influence: 1.5 },
      L5: { execution: 2.5, customer_insight: 2.5, strategy: 2.0, influence: 2.0 },
      L6: { execution: 3.0, customer_insight: 3.0, strategy: 2.5, influence: 2.5 },
      M1: { execution: 2.5, customer_insight: 2.0, strategy: 2.5, influence: 3.0 },
      M2: { execution: 3.0, customer_insight: 2.5, strategy: 3.0, influence: 3.0 }
    };

    return levelScores[level] || levelScores.L4;
  }

  /**
   * Generate fallback recommendations
   */
  private generateFallbackRecommendations(
    gaps: Array<{ competency: PMDimension; gap: number }>,
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined
  ): LevelRecommendation[] {
    const recommendations: LevelRecommendation[] = [];

    gaps.forEach((gap, idx) => {
      const suggestions: Record<PMDimension, string> = {
        execution: 'Add more stories demonstrating consistent product delivery and technical depth',
        customer_insight: 'Include examples of user research, interviews, and market validation',
        strategy: 'Show evidence of problem definition, OKR setting, and business alignment',
        influence: 'Demonstrate cross-functional leadership and stakeholder management'
      };

      recommendations.push({
        id: `fallback-${idx}`,
        type: 'strengthen-competency',
        priority: gap.gap > 1.0 ? 'high' : 'medium',
        title: `Strengthen ${gap.competency.replace('_', ' ')}`,
        description: suggestions[gap.competency],
        competency: gap.competency,
        suggestedAction: `Add 2-3 stories that showcase ${gap.competency.replace('_', ' ')} capabilities`
      });
    });

    return recommendations;
  }

  /**
   * Generate delta summary
   */
  private generateDeltaSummary(
    currentLevel: PMLevelCode,
    targetLevel: PMLevelCode | undefined,
    competencies: CompetencyScore,
    scopeScore: number
  ): string {
    if (!targetLevel) {
      return `Continue building on your ${currentLevel} strengths.`;
    }

    if (currentLevel === targetLevel) {
      return `You're operating at your target level. Keep strengthening your competencies.`;
    }

    const gaps = this.identifyGaps(currentLevel, targetLevel, competencies, {
      scope: { teams: 0 },
      impact: { metrics: [], quantified: false, scale: 'feature' },
      influence: { crossFunctional: false, executive: false, external: false },
      metrics: []
    });

    if (gaps.length === 0) {
      return `To reach ${targetLevel}, focus on expanding scope and impact.`;
    }

    const topGap = gaps.sort((a, b) => b.gap - a.gap)[0];
    return `To reach ${targetLevel}, strengthen ${topGap.competency.replace('_', ' ')} stories and expand scope.`;
  }

  /**
   * Select top artifacts used in analysis
   */
  private selectTopArtifacts(
    artifacts: Array<{ id: string; content: string; date: string }>,
    signals: LevelSignal
  ): string[] {
    // Return top 6 artifacts (most recent with strong signals)
    return artifacts
      .slice(0, 6)
      .map(a => a.id);
  }

  /**
   * Save level assessment to database
   */
  private async saveLevelAssessment(userId: string, inference: PMLevelInference): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_levels')
        .upsert({
          user_id: userId,
          inferred_level: inference.inferredLevel,
          confidence: inference.confidence,
          scope_score: inference.scopeScore,
          maturity_modifier: inference.maturityModifier,
          role_type: inference.roleType,
          delta_summary: inference.deltaSummary,
          recommendations: inference.recommendations as any,
          competency_scores: inference.competencyScores as any,
          signals: inference.signals as any,
          last_run_timestamp: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('[PMLevelsService] Error saving level assessment:', error);
      throw error;
    }
  }

  /**
   * Get user's current level assessment
   */
  async getUserLevel(userId: string): Promise<PMLevelInference | null> {
    try {
      const { data, error } = await supabase
        .from('user_levels')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      if (!data) return null;

      // Reconstruct inference from database record
      return {
        inferredLevel: data.inferred_level as PMLevelCode,
        displayLevel: this.getDisplayLevel(data.inferred_level as PMLevelCode),
        confidence: data.confidence,
        scopeScore: data.scope_score,
        maturityModifier: data.maturity_modifier,
        roleType: data.role_type as RoleType[],
        competencyScores: data.competency_scores as CompetencyScore,
        levelScore: 0, // Not stored, will recalc if needed
        deltaSummary: data.delta_summary || '',
        recommendations: (data.recommendations as any) || [],
        signals: (data.signals as any) || {
          scope: { teams: 0 },
          impact: { metrics: [], quantified: false, scale: 'feature' },
          influence: { crossFunctional: false, executive: false, external: false },
          metrics: []
        },
        topArtifacts: []
      };
    } catch (error) {
      console.error('[PMLevelsService] Error fetching user level:', error);
      return null;
    }
  }

  /**
   * Get display level name
   */
  private getDisplayLevel(levelCode: PMLevelCode): PMLevelDisplay {
    const mapping: Record<PMLevelCode, PMLevelDisplay> = {
      L3: 'PM',
      L4: 'Senior PM',
      L5: 'Staff PM',
      L6: 'Principal PM',
      M1: 'Manager',
      M2: 'Senior Manager'
    };
    return mapping[levelCode] || 'PM';
  }

  /**
   * Call LLM with custom temperature
   */
  private async callLLM(
    prompt: string,
    temperature: number = 0.3
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiKey = import.meta.env?.VITE_OPENAI_KEY || '';
      const baseUrl = 'https://api.openai.com/v1';

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use efficient model for PM levels
          messages: [
            {
              role: 'system',
              content: 'You are a product management expert. Return ONLY valid JSON with no additional text, no markdown formatting, no code blocks.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error?.message || `HTTP ${response.status}`
        };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return { success: false, error: 'No content in response' };
      }

      // Parse JSON response
      const jsonData = JSON.parse(content);
      return { success: true, data: jsonData };
    } catch (error) {
      console.error('[PMLevelsService] LLM call error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LLM call failed'
      };
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
   * Helper: Infer company size from description/tags
   */
  private inferCompanySize(description: string | null, tags: string[]): number | undefined {
    const text = `${description || ''} ${tags.join(' ')}`.toLowerCase();
    
    if (text.includes('startup') || text.includes('seed')) return 10;
    if (text.includes('series a') || text.includes('50')) return 50;
    if (text.includes('series b') || text.includes('100')) return 100;
    if (text.includes('series c') || text.includes('500')) return 500;
    if (text.includes('public') || text.includes('1000+') || text.includes('fortune')) return 10000;
    
    return undefined;
  }

  /**
   * Helper: Infer funding stage from description/tags
   */
  private inferFundingStage(description: string | null, tags: string[]): CompanyMetadata['fundingStage'] | undefined {
    const text = `${description || ''} ${tags.join(' ')}`.toLowerCase();
    
    if (text.includes('seed')) return 'seed';
    if (text.includes('series a')) return 'series_a';
    if (text.includes('series b')) return 'series_b';
    if (text.includes('series c')) return 'series_c';
    if (text.includes('series d')) return 'series_d';
    if (text.includes('public') || text.includes('ipo')) return 'public';
    
    return undefined;
  }

  /**
   * Helper: Calculate years active for a company
   */
  private calculateYearsActive(workItems: any[], companyId: string): number | undefined {
    const companyWorkItems = workItems.filter(wi => wi.company_id === companyId);
    if (companyWorkItems.length === 0) return undefined;

    const dates = companyWorkItems
      .map(wi => new Date(wi.start_date))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) return undefined;

    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const now = new Date();
    return Math.floor((now.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }
}

