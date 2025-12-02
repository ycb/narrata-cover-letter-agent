/**
 * Evaluation Event Types & Payloads
 * 
 * Centralized type definitions for all evaluation logging events.
 * Used by EvaluationEventLogger to emit structured events to evaluation_runs table.
 * 
 * Events track:
 * - JD parsing quality & latency
 * - HIL content creation (stories, saved sections, drafts)
 * - Gap coverage and content quality metrics
 */

/**
 * JD Parsing Event - emitted when Job Description is parsed and stored
 */
export interface JDParseEvent {
  userId: string;
  jobDescriptionId: string;
  rawTextChecksum: string;
  
  // Structured insights from parsing
  company?: string;
  role?: string;
  requirements?: string[];
  differentiatorSummary?: string;
  
  // Performance metrics
  inputTokens: number;
  outputTokens: number;
  latency: number; // milliseconds
  
  // Status
  status: 'success' | 'failed';
  error?: string;
  
  // Optional context
  sourceUrl?: string;
  model?: string;
  syntheticProfileId?: string;
}

/**
 * HIL Content Type - discriminator for HIL events
 */
export type HILContentType = 'story' | 'saved_section' | 'cover_letter_draft';

/**
 * HIL Action Type - the user action that triggered content creation
 */
export type HILActionType = 'ai_suggest' | 'manual_edit' | 'apply_suggestion';

/**
 * Gap Coverage Map - tracks which gaps a content item addresses
 */
export interface GapCoverageMap {
  closedGapIds: string[];
  remainingGapCount: number;
  gapCoveragePercentage: number;
}

/**
 * HIL Story Content Event - emitted when user creates/edits story via HIL
 */
export interface HILStoryEvent {
  userId: string;
  storyId?: string; // undefined if creating new
  workItemId: string;
  
  // Content source & action
  contentSource: 'story'; // discriminator
  action: HILActionType;
  
  // Content metrics
  initialWordCount: number;
  finalWordCount: number;
  wordDelta: number; // final - initial
  
  // Gap analysis
  gapCoverage?: GapCoverageMap;
  gapsAddressed?: string[];
  
  // Performance
  latency: number; // milliseconds
  
  // Status
  status: 'success' | 'failed';
  error?: string;
  
  // Optional context
  model?: string;
  syntheticProfileId?: string;
  draftId?: string; // if linked to a draft
}

/**
 * HIL Saved Section Content Event - emitted when user creates/updates saved section via HIL
 */
export interface HILSavedSectionEvent {
  userId: string;
  savedSectionId?: string; // undefined if creating new
  
  // Content source & action
  contentSource: 'saved_section'; // discriminator
  action: HILActionType;
  
  // Content metrics
  initialWordCount: number;
  finalWordCount: number;
  wordDelta: number;
  
  // Gap analysis
  gapCoverage?: GapCoverageMap;
  gapsAddressed?: string[];
  
  // Performance
  latency: number;
  
  // Status
  status: 'success' | 'failed';
  error?: string;
  
  // Optional context
  model?: string;
  syntheticProfileId?: string;
  draftId?: string; // if linked to a draft
}

/**
 * HIL Draft Content Event - emitted when user edits cover letter draft sections via HIL
 */
export interface HILDraftEvent {
  userId: string;
  draftId: string;
  
  // Content source & action
  contentSource: 'cover_letter_draft'; // discriminator
  action: HILActionType;
  
  // Section being edited
  sectionName: string;
  
  // Content metrics
  initialWordCount: number;
  finalWordCount: number;
  wordDelta: number;
  
  // Gap analysis
  gapCoverage?: GapCoverageMap;
  gapsAddressed?: string[];
  initialGapCount?: number;
  finalGapCount?: number;
  
  // Draft quality metrics (if recalculated)
  qualityMetrics?: {
    atsScore?: number;
    relevanceScore?: number;
    personalizedScore?: number;
  };
  
  // Performance
  latency: number;
  
  // Status
  status: 'success' | 'failed';
  error?: string;
  
  // Optional context
  model?: string;
  syntheticProfileId?: string;
}

/**
 * Union of all HIL events
 */
export type HILContentEvent = HILStoryEvent | HILSavedSectionEvent | HILDraftEvent;

/**
 * Union of all evaluation events
 */
export type EvaluationEvent = JDParseEvent | HILContentEvent | DraftCoverLetterEvalEvent;

/**
 * Event metadata for logging
 */
export interface EventMetadata {
  eventType: string;
  emittedAt: Date;
  sessionId?: string;
  userId: string;
  source: 'jd_parse' | 'hil_story' | 'hil_saved_section' | 'hil_draft' | 'draft_cover_letter';
}

// ============================================================================
// Draft Cover Letter Generation Evaluation
// ============================================================================

/**
 * Eval status for internal QA (distinct from customer-facing Go/No-Go)
 */
export type EvalStatus = 'pass' | 'review' | 'fail';

/**
 * Phase A (Streaming) completeness tracking
 */
export interface PhaseACompleteness {
  jdAnalysis: { 
    complete: boolean; 
    company?: string; 
    role?: string; 
  };
  coreRequirements: { 
    complete: boolean; 
    count: number; 
  };
  preferredRequirements: { 
    complete: boolean; 
    count: number; 
  };
  goalsMatched: { 
    complete: boolean; 
    met: number; 
    total: number; 
  };
  strengthsMatched: { 
    complete: boolean; 
    summaryScore: 0 | 1 | 2 | 3 | null; 
    detailCount: number; 
  };
}

/**
 * Phase B (Post-Draft) completeness tracking
 */
export interface PhaseBCompleteness {
  sectionsGenerated: { 
    complete: boolean; 
    count: number; 
  };
  gapsAnalyzed: { 
    complete: boolean; 
    badgeCount: number; 
    actualGaps: number; 
    match: boolean;  // KEY: badge === actual (catches the bug you had)
  };
  overallScore: { 
    complete: boolean; 
    value: number | null; 
  };
  contentStandards: { 
    complete: boolean; 
    perSectionCount: number; 
  };
}

/**
 * Toolbar validation - ensures all metrics are properly populated
 */
export interface ToolbarValidation {
  gaps: boolean;           // Badge shows AND children populate
  mwg: boolean;            // X/Y format shows
  mws: boolean;            // Score + details show
  coreReqs: boolean;       // Count + list show
  preferredReqs: boolean;  // Count + list show
  overallScore: boolean;   // Numeric value shows
  readiness: boolean;      // Async, may be skeleton initially
}

/**
 * Draft Cover Letter Generation Event
 * Tracks completeness and quality of the full draft generation pipeline
 */
export interface DraftCoverLetterEvalEvent {
  userId: string;
  draftId: string;
  jobDescriptionId: string;
  syntheticProfileId?: string;
  
  // Timing breakdown
  phaseALatencyMs: number;
  phaseBLatencyMs: number;
  totalLatencyMs: number;
  
  // Phase completeness
  phaseA: PhaseACompleteness;
  phaseB: PhaseBCompleteness;
  
  // Toolbar validation (key concern for catching regressions)
  toolbarPopulated: ToolbarValidation;
  
  // Overall status
  evalStatus: EvalStatus;
  missingFields: string[];  // e.g., ['gaps.children', 'mws.details']
  
  // Error tracking
  status: 'success' | 'failed';
  errorMessage?: string;
  
  // Model info
  model?: string;
}


