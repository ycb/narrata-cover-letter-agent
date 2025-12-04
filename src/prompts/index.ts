// Centralized prompt exports
export { buildResumeAnalysisPrompt } from './resumeAnalysis';
export { 
  buildWorkHistorySkeletonPrompt,
  buildRoleStoriesPrompt,
  buildSkillsAndEducationPrompt,
  type WorkHistorySkeleton,
  type RoleStoriesResult,
  type SkillsAndEducationResult
} from './resumeAnalysisSplit';
export { buildCoverLetterAnalysisPrompt } from './coverLetterAnalysis';
export { buildJobDescriptionAnalysisPrompt } from './jobDescriptionAnalysis';
export { buildTemplateCreationPrompt } from './coverLetterTemplate';
export { buildTemplateEvaluationPrompt } from './templateEvaluation';
export { buildUnifiedProfilePrompt } from './unifiedProfile';
export { buildUnifiedProfileEvaluationPrompt } from './unifiedProfileEvaluation';
export { buildContentTaggingPrompt, buildJobMatchingTagsPrompt } from './contentTagging';

// Content generation prompts (Human-in-the-Loop)
export {
  buildStoryGenerationPrompt,
  buildRoleDescriptionPrompt,
  buildSavedSectionPrompt,
  CONTENT_GENERATION_SYSTEM_PROMPT,
  type WorkHistoryContext,
  type JobContext
} from './contentGeneration';

// JSON extraction prompts
export { 
  JSON_EXTRACTION_SYSTEM_PROMPT, 
  SIMPLE_JSON_EXTRACTION_PROMPT,
  buildExtractionPrompt
} from './jsonExtraction';

// Combined analysis prompts
export { 
  RESUME_COVER_LETTER_ANALYSIS_PROMPT,
  CASE_STUDY_ANALYSIS_PROMPT
} from './resumeCoverLetterAnalysis';
