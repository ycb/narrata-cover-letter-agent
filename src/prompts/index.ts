// Centralized prompt exports
export { buildResumeAnalysisPrompt } from './resumeAnalysis';
export { buildCoverLetterAnalysisPrompt } from './coverLetterAnalysis';
export { buildTemplateCreationPrompt } from './coverLetterTemplate';
export { buildTemplateEvaluationPrompt } from './templateEvaluation';
export { buildUnifiedProfilePrompt } from './unifiedProfile';
export { buildUnifiedProfileEvaluationPrompt } from './unifiedProfileEvaluation';
export { buildEvaluationPrompt, buildEnhancedEvaluationPrompt } from './evaluation';
export { buildContentTaggingPrompt, buildJobMatchingTagsPrompt } from './contentTagging';
export { buildDynamicMatchingPrompt, buildContentLibraryAnalysisPrompt } from './dynamicMatching';

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
