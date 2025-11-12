import type { Json } from './supabase';

export type RequirementCategory = 'standard' | 'differentiator' | 'preferred';

export type RequirementPriority = 'critical' | 'high' | 'medium' | 'optional';

export interface JobRequirement {
  id: string;
  description: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  keywords: string[];
  signals?: string[];
}

export interface ParsedJobDescription {
  company: string;
  role: string;
  summary: string;
  standardRequirements: JobRequirement[];
  differentiatorRequirements: JobRequirement[];
  preferredRequirements: JobRequirement[];
  keywords: string[];
  differentiatorNotes?: string;
  structuredData: Record<string, unknown>;
  rawSections: string[];
}

export interface JobDescriptionRecord extends ParsedJobDescription {
  id: string;
  userId: string;
  url: string | null;
  content: string;
  analysis: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type DraftSectionType = 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing';

export type DraftSectionSourceKind =
  | 'template_static'
  | 'work_story'
  | 'saved_section'
  | 'hil_generated';

export interface DraftSectionSource {
  kind: DraftSectionSourceKind;
  entityId?: string | null;
}

export interface DraftSectionMetadata {
  requirementsMatched: string[];
  tags: string[];
  wordCount: number;
  differentiatorWeight?: number;
}

export interface DraftSectionStatus {
  hasGaps: boolean;
  gapIds: string[];
  isModified: boolean;
  lastUpdatedAt?: string;
}

export interface DraftSectionAnalytics {
  matchScore?: number;
  atsScore?: number;
  standardCoverage?: number;
  differentiatorCoverage?: number;
  preferredCoverage?: number;
}

export interface DraftSection {
  id: string;
  templateSectionId: string | null;
  slug: string;
  title: string;
  type: DraftSectionType;
  order: number;
  content: string;
  source: DraftSectionSource;
  metadata: DraftSectionMetadata;
  status: DraftSectionStatus;
  analytics: DraftSectionAnalytics;
}

export interface DifferentiatorInsight {
  requirementId: string;
  description: string;
  status: 'met' | 'partially_met' | 'missing';
  supportingSectionIds: string[];
}

export interface MatchMetrics {
  goalsAlignment: 'strong' | 'average' | 'weak';
  experienceAlignment: 'strong' | 'average' | 'weak';
  coverLetterRating: 'strong' | 'average' | 'weak';
  atsScore: number;
  coreRequirements: {
    met: number;
    total: number;
    differentiatorFocus: DifferentiatorInsight[];
  };
  preferredRequirements: {
    met: number;
    total: number;
  };
}

export interface CoverLetterAnalytics {
  atsScore?: number;
  overallScore?: number;
  differentiatorHighlights?: string[];
  metricSummary?: Record<string, unknown>;
}

export interface CoverLetterDraft {
  id: string;
  userId: string;
  templateId: string;
  jobDescriptionId: string;
  company: string;
  role: string;
  sections: DraftSection[];
  status: 'draft' | 'reviewed' | 'finalized';
  llmFeedback: Record<string, unknown>;
  analytics: CoverLetterAnalytics;
  differentiatorSummary?: {
    highlights: string[];
    gaps: string[];
    focusAreas: string[];
  };
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
}

export interface DraftWorkpadPayload {
  draftId: string;
  jobDescriptionId: string;
  phase: 'idle' | 'jd_parse' | 'content_match' | 'metrics' | 'gap_detection';
  sections: DraftSection[];
  sectionMatches: Record<string, string>;
  standardRequirements: JobRequirement[];
  differentiatorRequirements: JobRequirement[];
  preferredRequirements: JobRequirement[];
  keywords: string[];
}

export type StreamingPhase = DraftWorkpadPayload['phase'];

export interface StreamingCheckpoint {
  phase: StreamingPhase;
  message: string;
  progress: number; // 0 - 1
  payload?: Json;
}

export interface CreateJobDescriptionPayload {
  content: string;
  company: string;
  role: string;
  summary: string;
  url?: string | null;
  structuredData: Record<string, unknown>;
  standardRequirements: JobRequirement[];
  differentiatorRequirements: JobRequirement[];
  preferredRequirements: JobRequirement[];
  keywords: string[];
  analysis?: Record<string, unknown>;
  differentiatorNotes?: string;
  rawSections?: string[];
}

