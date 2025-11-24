# Developer Documentation Index

Quick reference to find what you need in the organized developer docs.

**Last Updated**: 2025-11-24

---

## 🔍 Quick Lookup

| What You Need | Where to Look |
|---------------|---------------|
| "How was X implemented?" | [`features/`](#features) or [`agent-handoffs/`](#agent-handoffs) |
| "Why did X break?" | [`bug-fixes/`](#bug-fixes) |
| "What's the status of X?" | [`phases/`](#phases) or [`summaries/`](#summaries) |
| "How do I test X?" | [`testing/`](#testing) |
| "Is this ready to merge?" | [`merge-prep/`](#merge-prep) |

---

## 📁 Directory Contents

### agent-handoffs/
*18 files* - Development session continuity documents

Key files:
- `AGENT_A_HANDOFF.md` - Initial JD parsing implementation
- `AGENT_C_FINAL_COMPLETION.md` - Match intelligence completion
- `AGENT_D_REFRESH_PERSISTENCE_IMPLEMENTATION.md` - Draft persistence work
- `AGENT_E_SUMMARY.md` - Final testing and validation

**When to read**: Understanding historical decisions, picking up where previous work left off

---

### bug-fixes/
*10 files* - Root cause analysis and fix documentation

Key bugs fixed:
- `BUG_FIX_BLOCKING_EDIT_DRAFT_CRASH.md` - Critical crash on edit
- `BUG_FIX_GOALS_SHOWING_ALL_CATEGORIES.md` - Goal filtering issue
- `BUG_FIX_1_PROGRESS_UI.md` - Progress indicator fixes
- `BUG_FIX_2_TOOLTIP_INTERACTION.md` - Tooltip UX improvements

**When to read**: Investigating similar bugs, learning from past issues

---

### features/
*15 files* - Feature implementation specs and designs

Major features:
- **Match Intelligence**: `MATCH_METRICS_TOOLBAR_*.md`
- **Tag System**: `TAG_IMPROVEMENT_*.md` 
- **Requirements Attribution**: `REQUIREMENTS_MET_REFACTOR_PLAN.md`
- **Performance**: `PERFORMANCE_OPTIMIZATION_PLAN.md`, `LATENCY_*.md`
- **Job Parsing**: `JOB_DESCRIPTION_CLEANING_PHASE_1.md`
- **Section Analysis**: `SECTION_ATTRIBUTION_RCA.md`

**When to read**: Extending features, understanding architecture decisions

---

### phases/
*8 files* - Multi-stage feature rollout tracking

Current phases:
- **Phase 1**: `PHASE_1_PROGRESS.md` - Basic metrics (✅ Complete)
- **Phase 2**: `PHASE_2_*.md` - Progressive streaming (⚠️ In progress)
  - `PHASE_2_STATUS.md` - Current status and blockers
  - `PHASE_2_STREAMING_FAILURE_ANALYSIS.md` - Why streaming didn't work
  - `PHASE_2_INTEGRATION_GUIDE.md` - How to integrate
  - `PHASE_2_PARALLEL_LLM_DESIGN.md` - Architecture design
- **Phase 5B**: `PHASE_5B_*.md` - QA and final validation

**When to read**: Understanding project status, planning next phase

---

### summaries/
*12 files* - Completion reports and delivery summaries

Key summaries:
- `DELIVERY_SUMMARY.md` - Overall delivery summary
- `DELIVERY_SUMMARY_EVAL_LOGGING.md` - Eval logging feature
- `EDIT_DRAFT_COVER_LETTER_MVP_STATUS.md` - MVP status
- `COMMIT_SUMMARY.md` - Commit-by-commit breakdown
- `INTEGRATION_REVIEW.md` - Integration points review

**When to read**: Getting high-level overview, stakeholder updates

---

### testing/
*8 files* - QA plans, test guides, and results

Testing docs:
- `QA_DOCUMENTATION_PLAN.md` - Comprehensive QA strategy (1168 lines!)
- `MANUAL_QA_PLAN.md` - Manual testing checklist
- `E2E_VALIDATION_SUMMARY.md` - E2E test results
- `TEST_FIXES_SUMMARY.md` - Test maintenance notes
- `PM_LEVELS_QA_STATUS.md` - PM levels feature QA
- `PRODUCTION_TEST_RESULTS.md` - Production validation
- `RETEST_RESULTS.md` - Regression test results

**When to read**: Writing tests, planning QA, debugging test failures

---

### merge-prep/
*3 files* - Pre-merge analysis and checklists

Merge documents:
- `MERGE_READINESS_ANALYSIS.md` - Comprehensive merge checklist
- `MERGE_DIFF_SUMMARY.md` - Visual breakdown of changes
- `MERGE_NOTES.md` - Merge strategy and rollback plan

**When to read**: Before merging to main, code review preparation

---

## 📊 Document Statistics

```
Total dev docs organized:  74 files
Agent handoffs:           18 files (24%)
Bug fixes:                10 files (14%)
Features:                 15 files (20%)
Phases:                    8 files (11%)
Summaries:                12 files (16%)
Testing:                   8 files (11%)
Merge prep:                3 files (4%)
```

---

## 🎯 Common Scenarios

### Scenario: "I need to fix a bug in the match metrics toolbar"

1. Read `features/MATCH_METRICS_TOOLBAR_IMPLEMENTATION.md` - Understand the design
2. Check `bug-fixes/` - See if similar bugs were fixed before
3. Review `agent-handoffs/AGENT_C_*.md` - Original implementation context

### Scenario: "I'm adding tests for the draft cover letter feature"

1. Read `testing/QA_DOCUMENTATION_PLAN.md` - Overall testing strategy
2. Check `testing/MANUAL_QA_PLAN.md` - Manual test cases
3. Review `agent-handoffs/AGENT_E_TEST_REPORT.md` - What was already tested

### Scenario: "Why is streaming not working in Phase 2?"

1. Read `phases/PHASE_2_STATUS.md` - Current status and known issues
2. Review `phases/PHASE_2_STREAMING_FAILURE_ANALYSIS.md` - Root cause analysis
3. Check `phases/PHASE_2_INTEGRATION_GUIDE.md` - Implementation details

### Scenario: "I need to understand the requirements met refactor"

1. Read `features/REQUIREMENTS_MET_REFACTOR_PLAN.md` - Complete refactor plan
2. Review `features/SECTION_ATTRIBUTION_RCA.md` - Why it was needed
3. Check `agent-handoffs/AGENT_C_*.md` - Implementation notes

---

## 🔗 Related Documentation

- **Implementation Guides**: `../implementation/` - HOW-TO guides
- **PRDs**: `../prd/` - Product requirements
- **QA Status**: `../qa/` - Production readiness checks
- **Backlog**: `../backlog/` - Future work

---

## 💡 Tips for Using These Docs

1. **Start with summaries** - Get high-level overview first
2. **Check the date** - Older docs may be superseded
3. **Look at commit references** - Link docs to actual code changes
4. **Cross-reference** - Many docs reference each other
5. **Update when you change code** - Keep docs in sync

---

## 📝 Contributing to Dev Docs

When adding new dev docs:
1. Follow naming conventions (see `README.md`)
2. Start with TL;DR summary
3. Include date and context
4. Reference specific files/commits
5. Update this INDEX.md

---

**Questions?** Check `README.md` in this directory for more details.
