# Hidden Features Log

This is the single source of truth for all features that are hidden or disabled.
We track both feature-flagged features and commented-out code here.

## Feature Flags (Runtime Toggle via Environment Variables)

### External Links
- **Flag**: `ENABLE_EXTERNAL_LINKS` (default: off)
- **Status**: Implemented but hidden behind feature flag
- **Scope**: 
  - Links tab in Work History (`WorkHistoryDetail.tsx`, `WorkHistoryDetailTabs.tsx`)
  - "Pick Links" button in Add Story modal (`AddStoryModal.tsx`)
  - /show-all-links route and page (`App.tsx`, `ShowAllLinks.tsx`)
  - Links navigation in header (`Header.tsx` - desktop & mobile)
  - Tour auto-advance through Links tab (`WorkHistory.tsx`)
- **Files**: 7 components + 1 flag definition (`src/lib/flags.ts`)
- **Reactivate**: Set `ENABLE_EXTERNAL_LINKS=true` in environment
- **Why Hidden**: Backend and UX not production-ready

### Draft Readiness Evaluation
- **Flag**: `ENABLE_DRAFT_READINESS` (default: off)
- **Status**: Implemented, soft-launched for QA cohort
- **Scope**: Readiness metrics in cover letter drafts
- **Files**: See `docs/specs/W10_READINESS_METRIC.md`
- **Reactivate**: Set `ENABLE_DRAFT_READINESS=true` in environment
- **Why Hidden**: Beta feature for controlled rollout

## Commented Code (Requires Code Changes to Reactivate)

### Job Description URL Ingestion
- **Location**: `src/components/cover-letters/CoverLetterModal.tsx:1534`
- **Status**: UI hidden, backend not implemented
- **Scope**: URL input button for remote JD fetching
- **Reactivate**: Uncomment code block after implementing remote JD fetch
- **Why Hidden**: Backend functionality doesn't exist yet
