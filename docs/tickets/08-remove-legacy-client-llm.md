## Summary
Remove/bypass legacy client-side LLM resume parsing in `fileUploadService.ts` to prevent double-processing. Resume parsing must run exclusively via the edge function.

## Problem
The previous client flow performed LLM calls in-browser. With the new edge function, that would cause duplicate inserts and blocking UI.

## Files to create/modify
- Modify: `src/services/fileUploadService.ts`

## Step-by-step implementation details
1) Locate resume-specific paths (e.g., `source_type === 'resume'`).
2) For resumes:
   - Perform file upload to Supabase Storage as usual.
   - Do not call client-side `openaiService` for parsing.
   - Do not write `work_items` or `user_skills` from the client.
   - Return minimal info for the onboarding UI to call `startProcessing(file)` from `useResumeStreamContext`.
3) Keep non-resume flows unchanged.
4) Add a concise code comment explaining that resume parsing is owned by the edge function `process-resume`.

## Acceptance criteria
- Resume uploads no longer trigger client-side LLM parsing or client DB writes for work history/skills.
- No duplicate `work_items`/`user_skills` are created from client code.
- Non-resume flows remain unchanged.

## QA steps
- Upload a resume and confirm only the edge function path runs (watch logs).
- Verify realtime updates arrive and there are no duplicate records.

