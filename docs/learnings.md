# Learnings

## 2026-03-19

- When suggesting rollout steps for Narrata, check project automation docs first. Pushing to `main` updates the testing server automatically, so do not tell the user to run redundant manual deploy steps unless they explicitly ask for function-only deployment.
- Temporary QA diagnostics for cover letter generation belong in eval logging or internal persistence, not in the end-user draft UI. If a debug surface is needed, keep it out of the editor and wire it to `evaluation_runs` or another internal inspection path.
