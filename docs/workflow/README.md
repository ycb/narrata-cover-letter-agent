# Workflow Docs

These documents define how we plan, build, test, and release changes in this repository.

- `QUALITY_BAR.md`: what “done” means and the minimum quality gates.
- `TEST_MATRIX.md`: which test types apply to which kinds of changes.
- `RELEASE_CHECKLIST.md`: staging → production checklist and rollback.
- Nightly suite: `.github/workflows/nightly.yml` runs full unit + E2E on a schedule.
