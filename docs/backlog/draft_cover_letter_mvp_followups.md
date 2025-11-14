# Draft Cover Letter MVP – Follow-up Backlog

| Priority | Item | Notes & Dependencies |
| --- | --- | --- |
| P0 | Replace placeholder metrics with real scoring | Tie metrics to parsed JD + draft analysis (ATS, rating, goals, requirements). Depends on streaming hookup. |
| P0 | Refresh gap detection after edits | Service should diff current draft vs JD and surface unresolved requirements. Requires JD parser output + section comparison. |
| P0 | Stream generation progress | Remove artificial delay, hook LLM streaming tokens into `useCoverLetterDraft`, update UI progress states. |
| P0 | Instrument JD parse + draft generation logging | Implement events defined in `docs/implementation/EVAL_LOGGING_EXTENSION.md`. Can proceed in parallel with metric work. |
| P1 | Persist HIL action telemetry | Log story/saved/paragraph edits with metadata (also in logging spec). Depends on instrumentation infra. |
| P1 | Surface real differentiator coverage in finalization modal | Final modal should show live differentiator stats (once metric refresh lands). |
| P1 | Improve error handling & user messaging | Handle LLM failures, Supabase errors, retry flows. |
| P2 | Story selection via LLM | Await design; will require batching story corpus and prompt design. |
| P2 | Share modal polish & export formats | Optional enhancements once core flow stabilized. |
| P2 | Re-enable URL ingestion | Blocked by backend capability; tracked in `docs/backlog/HIDDEN_FEATURES.md`. |

## Sequencing Guidance
- **Parallel-ready:** instrumentation (`P0 logging`, `P1 telemetry`) can proceed alongside streaming integration.
- **Blocked:** differentiator coverage + gap refresh rely on real metric engine; schedule after streaming is live.
- **Design dependency:** story selection awaits updated strategy (in progress).

## Suggested Next Steps
1. Implement streaming + metrics refresh (P0 foundation).
2. In parallel, build logging hooks & dashboard queries.
3. Once metrics are dynamic, tackle advanced gap detection + finalization analytics.
4. Fold in story selection once design is ready.
