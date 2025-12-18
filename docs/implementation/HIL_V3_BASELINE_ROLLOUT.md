# HIL V3 Baseline Rollout (Plan + Checklist)

Goal: Make the “iteration-first” HIL V3 workflow the baseline across Narrata, while keeping JD-aware features limited to Draft Cover Letter.

## Principles
- **One baseline UX**: editable text → Get Feedback → targeted suggestions → accept/regenerate → apply.
- **Truth fidelity**: no invented facts/metrics; keep user voice.
- **JD context only exists for Draft Cover Letter**.
- **Reusable content (roles/stories/saved sections)** can be improved using content standards + voice + work-history context (no JD requirements).

## Deliverables
1) Shared V3 modal component usable by any entity.
2) Context builder utilities per entity.
3) Prompt/service layer that accepts optional JD context.
4) Cleanup: remove legacy debug UI + consolidate feature flags.

## Work Plan

### Phase 1 — Create shared V3 “shell”
- [ ] Extract `ContentGenerationModalV3` into a generic component (suggested: `src/components/hil/HilModalV3.tsx`).
- [ ] Keep cover-letter-only UI (Reqs Met / SectionInspector) behind props (e.g. `showAttribution`).
- [ ] Keep “Get Feedback” disable-until-edited behavior.

### Phase 2 — Context builders (entity-specific)
Create `src/services/hilContextBuilders/`:
- [ ] `buildCoverLetterHilContext(...)`: voice + workHistorySummary + draftCoverageSummary + draftOutline + JD requirements lists.
- [ ] `buildStoryHilContext(...)`: voice + role/company context + story metrics/tags + adjacent stories snippets.
- [ ] `buildRoleHilContext(...)`: voice + role summary + role metrics + top stories.
- [ ] `buildSavedSectionHilContext(...)`: voice + section type/title/tags + top stories (for grounding).

### Phase 3 — Port callers (if/when desired)
Cover letter (JD-aware):
- [ ] Keep Req/Pref requirements + “Reqs Met” UI.
- [ ] Always provide `draftOutline` + `draftCoverageSummary` to avoid repetition and strategy mistakes.

Non-cover-letter (no JD):
- [ ] Stories (`src/pages/ShowAllStories.tsx`)
- [ ] Work history (`src/components/work-history/WorkHistoryDetail.tsx`)
- [ ] Saved sections (`src/pages/SavedSections.tsx`)

For each:
- [ ] Use V3 shell.
- [ ] Supply entity-appropriate standards list (not cover-letter standards).
- [ ] Do not show “Reqs Met”.

### Phase 4 — Cleanup & flags
- [ ] Remove legacy HIL env/debug UI.
- [ ] Deprecate `VITE_HIL_COVER_LETTER_V2` once V3 is default.
- [ ] Consolidate flags:
  - Primary: `VITE_ENABLE_HIL_V3=true` (enables V3 everywhere)
  - Rollback: `VITE_FORCE_HIL_LEGACY=true` (forces legacy HIL everywhere)
  - Back-compat aliases (temporary): `VITE_HIL_COVER_LETTER_V3`, `VITE_ENABLE_HIL_V3_BASELINE`

## Migration Checklist (per caller)
For each place that opens HIL:
- [ ] Identify entity type and editable field (story.content, role.description, saved_section.content, cover_letter.section.content).
- [ ] Determine “existing content” vs “draft text” in the V3 editor.
- [ ] Provide `voicePrompt` if available.
- [ ] Provide the correct standards list for the entity.
- [ ] Provide JD-only fields only for cover letters.
- [ ] Ensure apply action persists correctly:
  - Cover letters: update section, then recalc metrics.
  - Stories: replace or create variation.
  - Saved sections: replace or create variation.
  - Roles: replace description/summary fields.
