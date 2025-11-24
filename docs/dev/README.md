# Developer Documentation

This directory contains internal development documentation that tracks the evolution of the codebase, implementation decisions, bug fixes, and testing notes. These files are primarily for maintainers and developers to understand the history and rationale behind implementation choices.

## Directory Structure

### 📁 agent-handoffs/
Agent-to-agent handoff documents tracking work across multiple development sessions.
- **Purpose**: Continuity between development sessions
- **Audience**: Future developers, AI agents picking up work
- **Value**: Historical context, what was tried, what worked, what didn't

### 📁 bug-fixes/
Detailed documentation of bugs discovered and fixed during development.
- **Purpose**: Root cause analysis, fix documentation
- **Audience**: Developers investigating similar issues
- **Value**: Learn from past bugs, prevent regressions

### 📁 features/
Feature implementation documentation including design decisions and technical specs.
- **Purpose**: Document major feature implementations
- **Audience**: Developers extending or maintaining features
- **Value**: Understanding design tradeoffs, implementation patterns

### 📁 phases/
Phase-by-phase implementation tracking for multi-stage features.
- **Purpose**: Track progress through complex, staged rollouts
- **Audience**: Project managers, developers working on later phases
- **Value**: Status tracking, blockers, next steps

### 📁 summaries/
High-level summaries of completed work, deliveries, and milestones.
- **Purpose**: Executive summaries and completion reports
- **Audience**: Stakeholders, team leads, future maintainers
- **Value**: Quick reference, impact assessment

### 📁 testing/
Testing plans, QA documentation, and test results.
- **Purpose**: Document testing strategy and results
- **Audience**: QA engineers, developers adding tests
- **Value**: Coverage visibility, test patterns, manual QA checklists

### 📁 merge-prep/
Pre-merge analysis, diff reviews, and merge readiness assessments.
- **Purpose**: Ensure safe, well-reviewed merges to main
- **Audience**: Code reviewers, release managers
- **Value**: Risk assessment, rollback plans, validation checklists

## Key Documents (Quick Reference)

### Current Feature Work
- `features/MATCH_METRICS_TOOLBAR_*.md` - Match intelligence toolbar implementation
- `features/TAG_IMPROVEMENT_*.md` - Tag inheritance and improvement system
- `features/FEATURE_JD_METADATA_EXTRACTION.md` - Job description parsing

### Architecture & Refactoring
- `features/REQUIREMENTS_MET_REFACTOR_PLAN.md` - Section attribution refactoring
- `features/PERFORMANCE_OPTIMIZATION_PLAN.md` - Performance improvements
- `phases/PHASE_2_*.md` - Progressive streaming implementation

### Testing & QA
- `testing/QA_DOCUMENTATION_PLAN.md` - Comprehensive QA strategy
- `testing/MANUAL_QA_PLAN.md` - Manual testing checklist
- `testing/E2E_VALIDATION_SUMMARY.md` - E2E test results

### Merge & Deployment
- `merge-prep/MERGE_READINESS_ANALYSIS.md` - Pre-merge checklist
- `merge-prep/MERGE_DIFF_SUMMARY.md` - Visual diff breakdown

## Document Naming Conventions

- `AGENT_X_*.md` → agent-handoffs/ (historical handoff notes)
- `BUG_FIX_*.md` → bug-fixes/ (bug documentation)
- `FEATURE_*.md` → features/ (feature specs)
- `PHASE_*.md` → phases/ (multi-phase implementation)
- `*_SUMMARY.md` → summaries/ (completion reports)
- `*_TEST_*.md`, `*_QA_*.md`, `E2E_*.md` → testing/
- `MERGE_*.md` → merge-prep/

## Best Practices

### When to Create New Docs
- ✅ Major feature implementation (new service, complex component)
- ✅ Non-obvious bug with interesting root cause
- ✅ Performance optimization with measurable impact
- ✅ Architecture refactoring affecting multiple files
- ❌ Trivial changes (use commit messages instead)
- ❌ Routine maintenance (update existing docs instead)

### How to Write Effective Dev Docs
1. **Start with TL;DR** - What, Why, Impact (first 3 lines)
2. **Include Context** - What was the problem? What alternatives considered?
3. **Show Evidence** - Code snippets, test results, metrics
4. **Document Decisions** - Why this approach vs alternatives?
5. **Link to Code** - Reference specific files, commits, PRs
6. **Add Next Steps** - Known limitations, future work

### Document Lifecycle
- **Active**: Currently relevant to ongoing work
- **Historical**: Completed work, valuable for context
- **Archived**: Superseded by later implementations

Most docs in this directory are **Historical** - they document decisions made during initial implementation and are valuable for understanding the "why" behind the code.

## Related Documentation

- `docs/implementation/` - Technical implementation guides (HOW-TO)
- `docs/prd/` - Product requirements (WHAT and WHY from product perspective)
- `docs/qa/` - QA status and verification (production-ready checks)
- `docs/backlog/` - Future work and follow-ups

## Maintenance Notes

This directory was organized on 2025-11-24 as part of merge prep for the draft cover letter MVP feature. Previous docs were in the repo root and have been categorized for easier navigation.

If you're looking for something specific:
- **"How do I implement X?"** → Check `docs/implementation/`
- **"Why did we implement X this way?"** → Check this directory (`docs/dev/`)
- **"What's the status of X?"** → Check `docs/qa/` or relevant PHASE doc
- **"What's planned for X?"** → Check `docs/backlog/`

---

**Last Updated**: 2025-11-24  
**Maintainer**: Development team
