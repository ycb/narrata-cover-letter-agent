# Prompts Directory

This folder holds the app-visible prompts used by services and pipelines. Keep them here (and referenced from `src/prompts/index.ts`) so they are easy to review and update.

## Active Prompts

| File | Purpose | Primary consumers |
|------|---------|-------------------|
| `resumeAnalysisSplit.ts` | 3-stage resume parsing (skeleton, role stories, skills/education) | `src/services/openaiService.ts`, `supabase/functions/process-resume-v2` |
| `resumeAnalysis.ts` | Legacy single-shot resume parsing (still exported) | `src/services/openaiService.ts`, `supabase/functions/process-resume-v2` |
| `coverLetterTemplate.ts` | Create cover letter templates | `src/services/coverLetterDraftService.ts` |
| `coverLetterRating.ts` | Score/grade cover letters | `src/services/coverLetterRatingService.ts` |
| `jobDescriptionAnalysis.ts` | JD pre-analysis (title, company, requirements) | `supabase/functions/preanalyze-jd`, `src/services/jobDescriptionService.ts` |
| `requirementAnalysis.ts` | Requirement extraction for CL pipeline | `supabase/functions/cover-letter.ts` |
| `sectionGaps.ts` | Section-level gap analysis | `supabase/functions/cover-letter.ts` |
| `contentGeneration.ts` | Story/role/section generation (HIL) | `src/services/contentGenerationService.ts`, `src/services/gapResolutionStreamingService.ts` |
| `contentTagging.ts` | Tag suggestion and job matching tags | `src/services/tagSuggestionService.ts` |
| `matchIntelligence.ts` | JD ⇄ profile matching | `src/services/matchIntelligenceService.ts` |
| `experienceMatch.ts` | Experience match scoring | `src/services/experienceMatchService.ts` |
| `basicMetrics.ts` / `enhancedMetricsAnalysis.ts` | Basic/enhanced metrics extraction | `src/services/openaiService.ts` (legacy), PM Levels (legacy) |
| `templateEvaluation.ts` | Template evaluation/judging | `src/services/templateService.ts` |
| `contentGeneration.ts` | Story/role/section generation | `src/services/contentGenerationService.ts` |
| `goNoGo.ts` | Go/No-Go decisioning | `src/services/goNoGoService.ts` (deprecated) |
| `unifiedProfile*.ts` | Unified profile build/merge/eval | `src/services/unifiedProfileService.ts` |
| `jsonExtraction.ts`, `letterContentStandards.ts`, `sectionContentStandards.ts`, `sharedStoryGuidance.ts`, `letterContentStandards.ts` | Utility standards/extraction | Various services |

## Archived Prompts

| File | Reason | Notes |
|------|--------|-------|
| `archive/coverLetterAnalysis.ts` | CL parsing is now programmatic (no LLM) | Kept for historical reference; not exported from `index.ts` |

## Edge Function Prompts (not in this folder)
- **PM Levels pipeline** prompts live in `supabase/functions/_shared/pipelines/pm-levels.ts`.
- Cover letter and resume pipelines also have staged prompts in their edge functions; keep the canonical text mirrored here when practical.

## Maintenance Checklist
- New prompt? Add it here and export it from `src/prompts/index.ts`.
- Moving/retiring a prompt? Note it in this README (or move to an `archive/` subfolder).
- Avoid “hidden” prompts in edge functions: mirror or document them here so they stay reviewable.
