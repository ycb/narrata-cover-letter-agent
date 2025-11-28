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

// A-Phase Streaming Stages (Task 4) - Canonical contract
export interface JdAnalysisStageData {
  roleInsights?: {
    inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
    inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
    titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
    scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
    goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
  };
  jdRequirementSummary?: { coreTotal: number; preferredTotal: number };
}

export interface GoalsAndStrengthsStageData {
  mws?: {
    summaryScore: 0 | 1 | 2 | 3; // 0-3 band
    details: Array<{
      label: string; // e.g., "Growth product work"
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  companyContext?: {
    industry?: string;
    maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | string;
    businessModels?: string[];
    source?: 'jd' | 'web' | 'mixed';
    confidence?: number;
  };
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
    // A-Phase Streaming (Task 4)
    jdAnalysis?: { status: string; data?: JdAnalysisStageData };
    goalsAndStrengths?: { status: string; data?: GoalsAndStrengthsStageData };
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

// ============================================================================
// A-Phase Insights (Task 5)
// ============================================================================

/**
 * Normalized A-phase insights for banner and toolbar
 * Read-only data structure derived from jobState.stages
 * Does NOT modify draft-based metrics/requirements/gaps
 */
export interface APhaseInsights {
  roleInsights?: {
    inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
    inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
    titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
    scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
    goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
  };
  jdRequirementSummary?: { coreTotal: number; preferredTotal: number };
  mws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  companyContext?: {
    industry?: string;
    maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | string;
    businessModels?: string[];
    source?: 'jd' | 'web' | 'mixed';
    confidence?: number;
  };
  stageFlags: {
    hasJdAnalysis: boolean;
    hasRequirementAnalysis: boolean;
    hasGoalsAndStrengths: boolean;
    hasRoleInsights: boolean;
    hasJdRequirementSummary: boolean;
    hasMws: boolean;
    hasCompanyContext: boolean;
    phaseComplete: boolean; // true when all A-phase stages completed
  };
}

