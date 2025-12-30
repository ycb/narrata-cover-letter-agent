import type { Json } from './supabase';

export type RequirementCategory = 'standard' | 'preferred' | 'differentiator';

export interface RequirementInsight {
  id: string;
  label: string;
  detail?: string;
  category: RequirementCategory;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'optional';
  keywords: string[];
  reasoning?: string;
  signals?: string[];
}

export interface ParsedJobDescription {
  company: string;
  role: string;
  summary: string;
  workType?: string | null;
  location?: string | null;
  salary?: string | null;
  standardRequirements: RequirementInsight[];
  preferredRequirements: RequirementInsight[];
  differentiatorRequirements: RequirementInsight[];
  boilerplateSignals: string[];
  differentiatorSignals: string[];
  keywords: string[];
  structuredInsights: Record<string, Json>;
  analysis: Record<string, Json>;
  structuredData?: Record<string, Json>;
  differentiatorNotes?: string;
  rawSections?: string[];
}

export interface StorySelectionCandidateDiagnostic {
  storyId: string;
  title?: string;
  score: number;
  wasUsed: boolean;
  counts: {
    requirementsMatched: number;
    differentiatorsMatched: number;
    goalsMatched: number;
    jdKeywordsInContentScore: number;
    jdKeywordsInTagsScore: number;
    industryMatches?: number;
    verticalMatches?: number;
    buyerMatches?: number;
    userMatches?: number;
  };
  adjustments: {
    reusePenalty: number;
    shortContentPenalty: number;
    lowTimesUsedBonus: number;
    targetTitleTagBonus: number;
    industryMatchBonus?: number;
    verticalMatchBonus?: number;
    buyerMatchBonus?: number;
    userMatchBonus?: number;
  };
}

export interface StorySelectionDiagnostics {
  sectionTitle?: string;
  selectedStoryId: string | null;
  selectedScore: number | null;
  hasUnusedStories: boolean;
  usedStoryIds: string[];
  topCandidates: StorySelectionCandidateDiagnostic[];
}

export interface StoredJobDescription extends ParsedJobDescription {
  id: string;
  userId: string;
  content: string;
  url?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobDescriptionRecord extends StoredJobDescription {
  structuredData: Record<string, Json>;
}

export type DraftSectionSourceKind =
  | 'template_static'
  | 'work_story'
  | 'saved_section'
  | 'hil_generated';

export type DraftSectionType =
  | 'static'
  | 'dynamic-story'
  | 'dynamic-saved'
  | 'closing';

export interface CoverLetterDraftSection {
  id: string;
  templateSectionId: string | null;
  slug: string;
  title: string;
  type: DraftSectionType;
  order: number;
  content: string;
  source: {
    kind: DraftSectionSourceKind;
    entityId: string | null;
  };
  metadata: {
    requirementsMatched: string[];
    tags: string[];
    wordCount: number;
    storySelection?: StorySelectionDiagnostics;
  };
  status: {
    hasGaps: boolean;
    gapIds: string[];
    isModified: boolean;
    lastUpdatedAt: string;
  };
  analytics: {
    matchScore?: number;
    atsScore?: number;
  };
}

export type MatchStrength = 'strong' | 'average' | 'weak';

interface BaseMatchMetric {
  key:
    | 'goals'
    | 'experience'
    | 'rating'
    | 'ats'
    | 'coreRequirements'
    | 'preferredRequirements';
  label: string;
  tooltip: string;
  differentiatorHighlights?: string[];
}

export interface StrengthMatchMetric extends BaseMatchMetric {
  type: 'strength';
  strength: MatchStrength;
  summary: string;
}

export interface ScoreMatchMetric extends BaseMatchMetric {
  type: 'score';
  value: number;
  summary: string;
}

export interface RequirementMatchMetric extends BaseMatchMetric {
  type: 'requirement';
  met: number;
  total: number;
  summary: string;
}

export type CoverLetterMatchMetric =
  | StrengthMatchMetric
  | ScoreMatchMetric
  | RequirementMatchMetric;

// Enhanced match detail types for Agent C
export interface GoalMatchDetail {
  id: string;
  goalType: string;
  userValue: string | null;
  jobValue: string | null;
  met: boolean;
  evidence: string;
  requiresManualVerification?: boolean;
}

export interface RequirementMatchDetail {
  id: string;
  requirement: string;
  demonstrated: boolean;
  evidence: string;
  sectionIds: string[];
  severity?: 'critical' | 'important' | 'nice-to-have';
}

/**
 * Structured tag object for requirement display in ContentCard
 * Provides rich metadata for visual hierarchy and tooltips
 */
export interface RequirementTag {
  id: string;
  label: string;
  evidence: string;
  type: 'core' | 'preferred';
  severity: 'critical' | 'important' | 'nice-to-have';
}

export interface ExperienceMatchDetail {
  requirement: string;
  confidence: 'high' | 'medium' | 'low';
  matchedWorkItemIds: string[];
  matchedStoryIds: string[];
  evidence: string;
  missingDetails?: string;
}

export interface CTAHook {
  type: 'add-story' | 'edit-goals' | 'enhance-section' | 'add-metrics';
  label: string;
  requirement: string;
  severity: 'high' | 'medium' | 'low';
  actionPayload?: Record<string, unknown>;
}

// Enhanced metrics with detailed breakdowns
export interface EnhancedMatchData {
  // Goals match details
  goalMatches?: GoalMatchDetail[];
  
  // Requirements match details (what's in the DRAFT)
  coreRequirementDetails?: RequirementMatchDetail[];
  preferredRequirementDetails?: RequirementMatchDetail[];
  
  // Experience match details (what's in WORK HISTORY)
  coreExperienceDetails?: ExperienceMatchDetail[];
  preferredExperienceDetails?: ExperienceMatchDetail[];
  
  // Section-specific writing insights
  sectionGapInsights?: SectionGapInsight[];
  
  // Differentiator analysis
  differentiatorAnalysis?: {
    summary: string;
    userPositioning: string;
    strengthAreas: string[];
    gapAreas: string[];
  };
  
  // CTA hooks for actions
  ctaHooks?: CTAHook[];
}

export interface SectionGapInsight {
  sectionId?: string; // COVER LETTER ONLY: Unique ID for the specific section (for multi-section types like "experience")
  sectionSlug: string; // Semantic type or content ID (introduction/experience/closing for CL, or story ID for other content)
  sectionType: 'introduction' | 'experience' | 'closing' | 'signature' | 'custom';
  sectionTitle?: string;
  promptSummary: string;
  requirementGaps: Array<{
    id: string;
    label: string;
    severity: 'high' | 'medium' | 'low';
    requirementType?: 'core' | 'preferred' | 'differentiator' | 'narrative';
    rationale: string;
    recommendation: string;
  }>;
  recommendedMoves: string[];
  nextAction?: string;
}

export interface DifferentiatorInsight {
  requirementId: string;
  label: string;
  status: 'addressed' | 'missing' | 'partial';
  summary: string;
}

export interface CoverLetterAnalytics {
  atsScore?: number;
  overallScore?: number;
  differentiatorHighlights?: string[];
  metricSummary?: Record<string, unknown>;
  finalizedAt?: string;
  wordCount?: number;
  sections?: number;
  differentiatorCoverage?: {
    addressed: number;
    missing: number;
    total: number;
  };
}

export interface CoverLetterDraft {
  id: string;
  userId: string;
  templateId: string;
  jobDescriptionId: string;
  company?: string;
  role?: string;
  status: 'draft' | 'reviewed' | 'finalized';
  sections: CoverLetterDraftSection[];
  metrics: CoverLetterMatchMetric[];
  atsScore: number;
  differentiatorSummary: DifferentiatorInsight[];
  llmFeedback: Record<string, Json>;
  analytics?: CoverLetterAnalytics;
  enhancedMatchData?: EnhancedMatchData; // Agent C: detailed match breakdown
  // Match with Strengths - persisted from A-phase streaming
  mws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
}

export interface DraftWorkpad {
  id: string;
  draftId: string;
  userId: string;
  matchState: Record<string, Json>;
  sectionsSnapshot: CoverLetterDraftSection[];
  lastPhase: DraftGenerationPhase | null;
  createdAt: string;
  updatedAt: string;
}

export type DraftGenerationPhase =
  | 'idle'
  | 'jd_parse'
  | 'content_match'
  | 'metrics'
  | 'gap_detection'
  | 'finalized';

export interface DraftGenerationProgressUpdate {
  phase: DraftGenerationPhase;
  message: string;
  timestamp: number;
}

export interface DraftGenerationOptions {
  userId: string;
  templateId: string;
  jobDescriptionId: string;
  onProgress?: (update: DraftGenerationProgressUpdate) => void;
  onSectionBuilt?: (section: CoverLetterDraftSection, index: number, total: number) => void;
  signal?: AbortSignal;
}

export interface DraftGenerationResult {
  draft: CoverLetterDraft;
  workpad: DraftWorkpad | null;
}

export interface DraftWorkpadPayload {
  draftId: string;
  jobDescriptionId: string;
  phase: DraftGenerationPhase;
  sections: CoverLetterDraftSection[];
  sectionMatches: Record<string, string>;
  standardRequirements: RequirementInsight[];
  differentiatorRequirements: RequirementInsight[];
  preferredRequirements: RequirementInsight[];
  keywords: string[];
}

export type StreamingPhase = DraftWorkpadPayload['phase'];

export interface StreamingCheckpoint {
  phase: StreamingPhase;
  message: string;
  progress: number;
  payload?: Json;
}

export interface CreateJobDescriptionPayload {
  content: string;
  company: string;
  role: string;
  summary: string;
  url?: string | null;
  structuredData: Record<string, unknown>;
  standardRequirements: RequirementInsight[];
  differentiatorRequirements: RequirementInsight[];
  preferredRequirements: RequirementInsight[];
  keywords: string[];
  analysis?: Record<string, unknown>;
  differentiatorNotes?: string;
  rawSections?: string[];
}

// ============================================================================
// Content Standards Configuration Types (Section-Level Attribution)
// ============================================================================

/**
 * Where a content standard is evaluated
 * - section: Evaluated per-section (e.g., "compelling opening" only applies to intro)
 * - letter: Evaluated globally for the entire letter (e.g., "concise length")
 */
export type StandardScope = 'section' | 'letter';

/**
 * How a section-scoped standard aggregates to letter-level status
 * - any_section: Met if ANY applicable section meets it
 * - all_sections: Met only if ALL applicable sections meet it
 * - global: Not applicable (letter-scoped standards don't aggregate)
 */
export type AggregationRule = 'any_section' | 'all_sections' | 'global';

/**
 * Which sections a standard applies to
 * - all_sections: Applies to intro, body, and closing
 * - intro_only: Only intro sections
 * - body_only: Only body/experience sections
 * - closing_only: Only closing sections
 */
export type ApplicabilityRule =
  | 'all_sections'
  | 'intro_only'
  | 'body_only'
  | 'closing_only';

/**
 * Configuration for a single content standard
 * Defines evaluation scope, aggregation logic, and applicability
 */
export interface ContentStandardConfig {
  id: string;
  label: string;
  description: string;
  scope: StandardScope;
  aggregation: AggregationRule;
  applicability: ApplicabilityRule;
}

/**
 * Status of a standard for a specific section
 * - met: Standard is satisfied
 * - not_met: Standard is not satisfied
 * - not_applicable: Standard doesn't apply to this section type
 */
export type SectionStandardStatus = 'met' | 'not_met' | 'not_applicable';

/**
 * Per-section evaluation result
 * Contains status and evidence for each standard applicable to this section
 */
export interface SectionStandardResult {
  sectionId: string;
  standards: Array<{
    standardId: string;
    status: SectionStandardStatus;
    evidence: string;
  }>;
}

/**
 * Letter-level evaluation result
 * Used for global standards (e.g., concise length, professional tone)
 */
export interface LetterStandardResult {
  standardId: string;
  status: 'met' | 'not_met';
  evidence: string;
}

/**
 * Aggregated standard result (letter-level view)
 * Shows which sections contributed to meeting this standard
 */
export interface AggregatedStandardResult {
  standardId: string;
  status: 'met' | 'not_met';
  contributingSections: string[]; // Section IDs that met this standard
  evidence: string;
}

/**
 * Complete content standards analysis for a cover letter
 * Contains per-section, per-letter, and aggregated results
 */
export interface ContentStandardsAnalysis {
  perSection: SectionStandardResult[];
  perLetter: LetterStandardResult[];
  aggregated: {
    standards: AggregatedStandardResult[];
    overallScore: number; // 0-100, percentage of standards met
  };
}

// ============================================================================
// W10: Draft Readiness Metric Types (Unified Label System)
// ============================================================================

// Unified labels: same 4 labels used everywhere
export type UnifiedReadinessLabel = 'Exceptional' | 'Strong' | 'Adequate' | 'Needs Work';

// New format from updated spec (4 editorial dimensions - non-duplicative with Score)
export interface UnifiedReadinessResult {
  verdict: UnifiedReadinessLabel;
  verdict_summary: string;
  dimensions: {
    narrative_coherence: UnifiedReadinessLabel;
    persuasiveness_evidence: UnifiedReadinessLabel;
    role_relevance: UnifiedReadinessLabel;
    professional_polish: UnifiedReadinessLabel;
  };
  improvements: string[]; // Max 2 per tiered logic
}

// Legacy types for backward compatibility (edge function converts to this format)
export type DraftReadinessRating = 'weak' | 'adequate' | 'strong' | 'exceptional';
export type ReadinessDimensionStrength = 'strong' | 'sufficient' | 'insufficient';

// 4 editorial dimensions (non-duplicative with Score)
// Score = writing craft, Readiness = high-level editorial verdict
export interface DraftReadinessScoreBreakdown {
  narrativeCoherence: ReadinessDimensionStrength;
  persuasivenessEvidence: ReadinessDimensionStrength;
  roleRelevance: ReadinessDimensionStrength;
  professionalPolish: ReadinessDimensionStrength;
}

export interface DraftReadinessFeedback {
  summary: string;
  improvements: string[]; // max 5 per updated spec
}

export interface DraftReadinessEvaluation {
  rating: DraftReadinessRating;
  scoreBreakdown: DraftReadinessScoreBreakdown;
  feedback: DraftReadinessFeedback;
  evaluatedAt?: string; // ISO timestamp
  ttlExpiresAt?: string; // ISO timestamp
  metadata?: Record<string, unknown>;
  fromCache?: boolean;
}

// Helper to convert unified label to display string
export function getReadinessDisplayLabel(rating: DraftReadinessRating): UnifiedReadinessLabel {
  switch (rating) {
    case 'exceptional': return 'Exceptional';
    case 'strong': return 'Strong';
    case 'adequate': return 'Adequate';
    case 'weak': return 'Needs Work';
  }
}

// Helper to convert dimension strength to unified label
export function getDimensionDisplayLabel(strength: ReadinessDimensionStrength): UnifiedReadinessLabel {
  switch (strength) {
    case 'strong': return 'Strong';
    case 'sufficient': return 'Adequate';
    case 'insufficient': return 'Needs Work';
  }
}
