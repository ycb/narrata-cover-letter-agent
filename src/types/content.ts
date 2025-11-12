// HIL-specific content types that extend existing functionality
import type { BlurbVariation, WorkHistoryBlurb } from './workHistory';

// PM Competency types
export type PMCompetency = 
  | 'product-strategy'
  | 'user-research'
  | 'data-analysis'
  | 'stakeholder-management'
  | 'team-leadership'
  | 'technical-understanding'
  | 'business-acumen'
  | 'execution'
  | 'communication'
  | 'prioritization';

// PM Level types
export type PMLevel = 
  | 'associate'
  | 'product-manager'
  | 'senior-product-manager'
  | 'lead-product-manager'
  | 'principal-product-manager'
  | 'director'
  | 'senior-director'
  | 'vp'
  | 'cp';

// Content source types
export type ContentSource = 'work-history' | 'reusable' | 'custom' | 'ai-generated' | 'variation';

// Change tracking types
export type ChangeType = 'creation' | 'modification' | 'deletion';

// AI assistance levels
export type AIAssistanceLevel = 'minimal' | 'moderate' | 'aggressive';

// Enhanced content metadata for HIL
export interface HILContentMetadata {
  source: ContentSource;
  sourceId?: string;
  confidence: 'high' | 'medium' | 'low';
  lastVerified: string;
  competencyTags: PMCompetency[];
  usageCount: number;
  
  // HIL-specific extensions
  variationId?: string;
  originalContent?: string;
  changeType: ChangeType;
  changeReason?: string;
  linkedVariations: string[];
  competencyMapping: {
    [competency in PMCompetency]?: {
      strength: number;
      evidence: string[];
    };
  };
}

// Variation metadata for HIL integration
export interface VariationMetadata {
  filledGap?: string;
  developedForJobTitle?: string;
  jdTags?: string[];
  outcomeMetrics?: string[];
  tags?: string[];
  createdBy: 'user' | 'AI' | 'user-edited-AI';
}

// Custom content for HIL library
export interface CustomContent {
  id: string;
  title: string;
  content: string;
  type: 'intro' | 'closer' | 'signature' | 'paragraph';
  metadata: HILContentMetadata;
  variations?: BlurbVariation[];
  createdAt: string;
  updatedAt: string;
}

// Content version tracking
export interface ContentVersion {
  id: string;
  contentId: string;
  content: string;
  metadata: HILContentMetadata;
  version: number;
  changeType: ChangeType;
  changeReason?: string;
  createdAt: string;
  createdBy: 'user' | 'AI';
}

// Gap analysis types
export interface ParagraphGap {
  paragraphId: string;
  gap: string;
  impact: 'high' | 'medium' | 'low';
  suggestion: string;
  relatedVariations?: string[];
}

export interface ImprovementSuggestion {
  type: 'add-metrics' | 'clarify-ownership' | 'match-keywords' | 'improve-tone' | 'fill-gap';
  content: string;
  priority: 'high' | 'medium' | 'low';
  relatedVariations?: string[];
}

export interface ContentRecommendation {
  id: string;
  title: string;
  relevance: number;
  source: ContentSource;
  variations?: BlurbVariation[];
}

export interface GapAnalysis {
  overallScore: number; // Mock LLM match %
  paragraphGaps: ParagraphGap[];
  suggestions: ImprovementSuggestion[];
  relatedContent: ContentRecommendation[];
  variationsCoverage: {
    [variationId: string]: {
      gapsCovered: string[];
      gapsUncovered: string[];
      relevance: number;
    };
  };
}

// AI suggestion types
export interface MockAISuggestion {
  id: string;
  type: 'improvement' | 'gap-fill' | 'competency-enhancement';
  content: string;
  confidence: number;
  reasoning: string;
  relatedVariations?: string[];
}

// ATS scoring types
export interface MockATSScore {
  overall: number;
  keywordMatch: number;
  formatting: number;
  variationsCoverage?: number;
  suggestions: string[];
}

export interface FormattingAnalysis {
  passiveVoiceCount: number;
  sentenceLength: number;
  readabilityScore: number;
  suggestions: string[];
}

export interface VariationsCoverageScore {
  overallCoverage: number;
  competencyCoverage: {
    [competency in PMCompetency]?: number;
  };
  gapAnalysis: string[];
}

// PM alignment types
export interface CompetencyGap {
  competency: PMCompetency;
  currentStrength: number;
  targetStrength: number;
  gap: number;
  suggestions: string[];
}

export interface PMAlignment {
  targetRoleLevel: PMLevel;
  userLevel: PMLevel;
  alignmentScore: number;
  competencyGaps: CompetencyGap[];
  levelSpecificSuggestions: string[];
  variationsAlignment: {
    [variationId: string]: {
      levelMatch: number;
      competencyCoverage: PMCompetency[];
      suggestedImprovements: string[];
    };
  };
}

// Collaboration types
export interface MockUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface CollaborationUpdate {
  id: string;
  type: 'comment' | 'suggestion' | 'approval';
  content: string;
  user: MockUser;
  timestamp: string;
  resolved: boolean;
}

export interface VariationCollaborationUpdate {
  variationId: string;
  update: CollaborationUpdate;
}

// Content type management
export interface ContentType {
  type: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isDefault: boolean;
}

// Analytics types
export interface VariationUsageData {
  variationId: string;
  jobTitle: string;
  company: string;
  successRate: number;
  usageCount: number;
  lastUsed: string;
}

export interface VariationInsight {
  type: 'performance' | 'coverage' | 'optimization';
  title: string;
  description: string;
  data: any;
  recommendations: string[];
}

// Generated content metadata
export interface MockAIGeneratedMetadata {
  confidence: number;
  reasoning: string;
  basedOnVariations: string[];
  competencyEnhancements: PMCompetency[];
}

export interface GeneratedContentMetadata {
  source: 'ai-generated';
  confidence: number;
  reasoning: string;
  basedOnVariations: string[];
  competencyEnhancements: PMCompetency[];
  metadata: HILContentMetadata;
}

// Improvement context for AI
export interface ImprovementContext {
  jobDescription: string;
  targetCompetencies: PMCompetency[];
  currentContent: string;
  variations: BlurbVariation[];
  improvementType: 'gap-fill' | 'enhancement' | 'optimization';
}

// Truth verification types
export interface TruthScore {
  overall: number;
  factualAccuracy: number;
  consistencyWithHistory: number;
  evidenceStrength: number;
  suggestions: string[];
}

// PM Levels Service types
export type PMLevelCode = 'L3' | 'L4' | 'L5' | 'L6' | 'M1' | 'M2';
export type PMLevelDisplay = 
  | 'Associate PM'
  | 'PM'
  | 'Senior PM'
  | 'Staff PM'
  | 'Principal PM'
  | 'Lead PM'
  | 'Manager'
  | 'Senior Manager';

export type RoleType = 'growth' | 'platform' | 'ai_ml' | 'founding' | 'technical' | 'general';
export type BusinessMaturity = 'early' | 'growth' | 'late';

// Core competency dimensions for PM leveling
export type PMDimension = 'execution' | 'customer_insight' | 'strategy' | 'influence';

// Extracted signals from content analysis
export interface LevelSignal {
  scope: {
    teams: number;
    revenueImpact?: number;
    usersImpact?: number;
    orgSize?: number;
  };
  impact: {
    metrics: string[];
    quantified: boolean;
    scale: 'feature' | 'team' | 'org' | 'company';
  };
  influence: {
    crossFunctional: boolean;
    executive: boolean;
    external: boolean;
    teamSize?: number;
  };
  teamSize?: number;
  metrics: string[];
}

// Competency score (0-3 scale)
export interface CompetencyScore {
  execution: number;
  customer_insight: number;
  strategy: number;
  influence: number;
}

// Company metadata for maturity calculation
export interface CompanyMetadata {
  name: string;
  size?: number; // employee count
  fundingStage?: 'seed' | 'series_a' | 'series_b' | 'series_c' | 'series_d' | 'public' | 'late';
  yearsActive?: number;
}

// PM Level inference result
export interface PMLevelInference {
  inferredLevel: PMLevelCode;
  displayLevel: PMLevelDisplay;
  confidence: number; // 0-1
  scopeScore: number; // 0-1
  maturityModifier: number; // 0.8-1.2
  roleType: RoleType[];
  competencyScores: CompetencyScore;
  levelScore: number; // Calculated score
  deltaSummary: string; // Human-readable gap description
  recommendations: LevelRecommendation[];
  signals: LevelSignal;
  topArtifacts: string[]; // IDs of top 6 artifacts used
}

// Level recommendation
export interface LevelRecommendation {
  id: string;
  type: 'add-story' | 'quantify-metrics' | 'strengthen-competency' | 'expand-scope';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  competency?: PMDimension;
  suggestedAction: string;
  relatedStories?: string[]; // Story IDs that could be improved
}

