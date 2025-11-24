/**
 * Unified Job Streaming Types
 * 
 * Supports streaming architecture for long-running operations:
 * - Onboarding (resume + cover letter + LinkedIn import)
 * - Cover Letter Generation (draft + metrics + gaps)
 * - PM Levels Assessment (competencies + specializations)
 */

// ============================================================================
// Job Type Definitions
// ============================================================================

export type JobType = 'onboarding' | 'coverLetter' | 'pmLevels';

export type JobStatus = 'pending' | 'running' | 'complete' | 'error';

// ============================================================================
// Job Input Types (per job type)
// ============================================================================

export interface OnboardingJobInput {
  resumeText?: string;
  coverLetterText?: string;
  linkedInData?: any;
  fileUploadIds?: string[];
}

export interface CoverLetterJobInput {
  jobDescriptionId: string;
  templateId?: string;
  existingDraftId?: string;
}

export interface PMLevelsJobInput {
  profileId?: string;
  targetRole?: string;
  forceRefresh?: boolean;
}

export type JobInput = OnboardingJobInput | CoverLetterJobInput | PMLevelsJobInput;

// ============================================================================
// Job Result Types (per job type)
// ============================================================================

export interface OnboardingJobResult {
  profileId: string;
  workHistoryCount: number;
  storiesCount: number;
  skillsCount: number;
}

export interface CoverLetterJobResult {
  draftId: string;
  metrics: {
    atsScore?: number;
    experienceMatch?: number;
    goalsMatch?: number;
    requirementsMet?: number;
    rating?: number;
  };
  gapCount: number;
}

export interface PMLevelsJobResult {
  assessmentId: string;
  icLevel: number;
  competencies: Record<string, number>;
  specializations: string[];
}

export type JobResult = OnboardingJobResult | CoverLetterJobResult | PMLevelsJobResult;

// ============================================================================
// Job Database Record
// ============================================================================

export interface Job {
  id: string;
  user_id: string;
  type: JobType;
  status: JobStatus;
  input: JobInput;
  result?: JobResult;
  error_message?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

// ============================================================================
// SSE Event Types
// ============================================================================

export type SSEEventType = 'progress' | 'complete' | 'error' | 'heartbeat';

export interface SSEProgressEvent {
  type: 'progress';
  jobId: string;
  stage: string;
  data: any;
  timestamp: string;
}

export interface SSECompleteEvent {
  type: 'complete';
  jobId: string;
  result: JobResult;
  timestamp: string;
}

export interface SSEErrorEvent {
  type: 'error';
  jobId: string;
  error: string;
  timestamp: string;
}

export interface SSEHeartbeatEvent {
  type: 'heartbeat';
  timestamp: string;
}

export type SSEEvent = SSEProgressEvent | SSECompleteEvent | SSEErrorEvent | SSEHeartbeatEvent;

// ============================================================================
// Stage-Specific Data Types
// ============================================================================

// Onboarding Stages
export interface OnboardingParseStageData {
  jobsCount: number;
  skillsCount: number;
  profileFieldsExtracted: string[];
}

export interface OnboardingSkeletonStageData {
  workHistoryItems: number;
  storiesIdentified: number;
  coreThemes: string[];
}

export interface OnboardingDetailedStageData {
  impactScores: Record<string, number>;
  suggestedStories: number;
  confidenceScore: number;
}

// Cover Letter Stages
export interface CoverLetterBasicMetricsData {
  atsScore: number;
  goalsMatch: number;
  experienceMatch: number;
  topThemes: string[];
  initialFitScore: number;
}

export interface CoverLetterRequirementAnalysisData {
  coreRequirements: Array<{
    id: string;
    text: string;
    met: boolean;
    evidence?: string;
  }>;
  preferredRequirements: Array<{
    id: string;
    text: string;
    met: boolean;
    evidence?: string;
  }>;
  requirementsMet: number;
  totalRequirements: number;
}

export interface CoverLetterSectionGapsData {
  sections: Array<{
    id: string;
    title: string;
    gaps: Array<{
      type: string;
      description: string;
      suggestion: string;
    }>;
  }>;
  totalGaps: number;
}

export interface CoverLetterDraftData {
  draftId: string;
  sections: Array<{
    id: string;
    content: string;
    type: string;
  }>;
}

// PM Levels Stages
export interface PMLevelsBaselineData {
  icLevel: number;
  roleToLevelMapping: Record<string, number>;
  assessmentBand: string;
}

export interface PMLevelsCompetencyData {
  execution: number;
  strategy: number;
  customerInsight: number;
  influence: number;
}

export interface PMLevelsSpecializationData {
  growth?: number;
  platform?: number;
  aiMl?: number;
  founding?: number;
}

// ============================================================================
// Client-Side Job State (used by useJobStream hook)
// ============================================================================

export interface JobStreamState<T extends JobType = JobType> {
  jobId: string;
  type: T;
  status: JobStatus;
  error?: string;
  stages: Record<string, any>;
  result?: JobResult;
  startedAt?: Date;
  completedAt?: Date;
}

// Typed versions for each job type
export interface OnboardingStreamState extends JobStreamState<'onboarding'> {
  stages: {
    parseInputs?: OnboardingParseStageData;
    skeletonProfile?: OnboardingSkeletonStageData;
    detailedProfile?: OnboardingDetailedStageData;
  };
  result?: OnboardingJobResult;
}

export interface CoverLetterStreamState extends JobStreamState<'coverLetter'> {
  stages: {
    basicMetrics?: CoverLetterBasicMetricsData;
    requirementAnalysis?: CoverLetterRequirementAnalysisData;
    sectionGaps?: CoverLetterSectionGapsData;
    draftLetter?: CoverLetterDraftData;
  };
  result?: CoverLetterJobResult;
}

export interface PMLevelsStreamState extends JobStreamState<'pmLevels'> {
  stages: {
    baselineAssessment?: PMLevelsBaselineData;
    competencyBreakdown?: PMLevelsCompetencyData;
    specializationAssessment?: PMLevelsSpecializationData;
  };
  result?: PMLevelsJobResult;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateJobRequest {
  type: JobType;
  input: JobInput;
}

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
}

export interface GetJobResponse extends Job {}

// ============================================================================
// Error Types
// ============================================================================

export class JobError extends Error {
  constructor(
    message: string,
    public jobId: string,
    public stage?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'JobError';
  }
}

export class JobTimeoutError extends JobError {
  constructor(jobId: string, timeoutMs: number) {
    super(`Job ${jobId} timed out after ${timeoutMs}ms`, jobId);
    this.name = 'JobTimeoutError';
  }
}

export class JobStreamError extends JobError {
  constructor(jobId: string, message: string, originalError?: Error) {
    super(message, jobId, undefined, originalError);
    this.name = 'JobStreamError';
  }
}

