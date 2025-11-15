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

