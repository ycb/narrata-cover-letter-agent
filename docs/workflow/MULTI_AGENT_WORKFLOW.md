# Multi-Agent Workflow

This document adapts the Codex multi-agent cookbook to Narrata’s product and cultural guardrails. The goal is to make every feature delivery traceable through coordinated, role-specific agents (FE, BE, design, PM, QA) while honouring the ExecPlan discipline defined in `PLANS.md` and the team workflow in `WORKFLOW.md`. Following this workflow lets the team ship consistent, high-fidelity cover letters and tooling with shared ownership, transparent handoffs, and measurable quality gates.

## Guiding Principles

- **Truth fidelity first**: Every agent is accountable for checking facts with source data (story library, JD summaries, Supabase data) instead of inventing narratives. Mismatched facts must be flagged for review before implementation.
- **Human-in-the-loop control**: Agents draft work but depend on human approvals as per ExecPlan milestones. Decisions at each phase are logged in the plan, not just in code.
- **Strategic storytelling**: Outline what story the feature is meant to tell before writing UI/logic; this keeps the experience unified across FE, BE, and design.
- **Observable outcomes**: Every step must clearly state “how to see it working” (commands, URLs, sample output) so any agent or reviewer can verify behavior end-to-end.

## Roles, Remits, and Handoff Expectations

- **Product Manager (PM) Agent**  
  - Owns the “why” (business goal, success metrics, risk level).  
  - Frames the ExecPlan scope by describing the user task, priority, and acceptance criteria in plain language.  
  - Records dependencies (data, design, QA resources) and updates the plan whenever priorities shift.

- **Design Agent**  
  - Translates goals into experience sketches and annotated flows.  
  - Calls out accessibility considerations, edge cases, and responsive behavior.  
  - Provides updated assets (Figma links, design tokens, animation specs) referenced in the plan so FE/QA agents know what to aim for.

- **Frontend (FE) Agent**  
  - Owns the story delivery (components, layout, theming).  
  - Implements shared UI according to design assets and ensures the experience renders with the chosen motion/typography direction.  
  - Updates content prompt hooks if front-end interactions change what’s shown to the user.

- **Backend (BE) Agent**  
  - Ensures data contracts, Supabase views, and prompt orchestration behave consistently (file upload, gap detection).  
  - Validates any schema updates, supabase migrations, or service changes in `src/services`.  
  - Publishes clear API or data contract notes for FE and QA agents.

- **QA Agent**  
  - Designs regression checks tied to the ExecPlan’s acceptance story.  
  - Runs or scripts automated tests (`npm test`, `npm run test:core`, `npm run lint`) and supplements them with manual verification steps (`npm run dev` walkthrough, prompt invocation).  
  - Logs issues with reproducible steps before signoff.

## Stage-Based Orchestration

**1. Intake & Framing (PM-led)**  
- PM agent drafts the ExecPlan summary and acceptance criteria.  
- All agents review the plan and acknowledge blockers (design assets needed, backend contracts).  
- Document in `Progress` section of ExecPlan: “Plan approved, assets scheduled by X date”.

**2. Discovery & Story Definition (Design + PM + BE)**  
- Design agent sketches tones and surfaces; BE agent lists data needs; PM validates scope.  
- Add decision log entries for trade-offs (animation vs. performance, new prompt vs. existing).  
- Record “Surprises & Discoveries” as soon as unknowns surface (e.g., prompt output variability, Supabase latency).

**3. Implementation Sprint (FE + BE)**  
- FE and BE agents work in parallel but sync through shared ExecPlan anchors (e.g., “UI passes gap data to gap detection service”).  
- Each agent updates `Progress` as they finish sub-tasks (component built, API stubbed).  
- Use pair-run reviews on prompts or data flows that cross layers.

**4. QA & Verification (QA-led)**  
- QA agent executes the “Validation and Acceptance” steps, referencing plan’s expectations (e.g., `npm run test:e2e:ui` scenario).  
- Automated test failures or design regressions are traced to the relevant agent for fix; progress checkboxes reflect the fix/rescan.

**5. Release Readiness (All agents)**  
- PM/QA confirm checklist (lint, core tests, diff coverage, build) in plan.  
- ExecPlan’s `Outcomes & Retrospective` section captures what shipped, remaining work, and lessons.

## Multi-Agent Coordination Practices

- **Shared artifacts**: Every agent links to assets in ExecPlan sections (`Context and Orientation`, `Plan of Work`).  
- **Daily sync**: Agents update the plan (Progress, Decision Log, Surprises) before merging; each entry includes the timestamp to reflect velocity.  
- **Prompt-oriented handoffs**: When FE needs new copy, they reference `src/prompts/*.ts` updates from PM/BE; patch notes should mention the file name.
- **Conflict resolution**: If agents disagree (design vs. BE), the PM adds the final ruling to the Decision Log, citing the rationale and the date.

## Quality & Observable Validation

- **Quality gates**  
  1. `npm run lint` (captures FE/BE style issues).  
  2. `npm test` (unit coverage).  
  3. `npm run test:core` or `npm run test:diff-coverage` if coverage impacted.  
  4. `npm run build` followed by a manual check at `localhost:8080`.  
  5. Prompt/system behavior validation: run the relevant story (e.g., generate a cover letter) and compare the output or logs to the expectation recorded in `Validation and Acceptance`.

- **Observability**: Agents include transcripts or sample output (e.g., prompt responses, API payloads) under `Artifacts and Notes` when possible.

## Sample Multi-Agent Story Flow

1. PM defines a new “experience gap summary” requirement and starts a live ExecPlan with entry: “Goal: surface misalignments between JD and story library in gap banner.”  
2. Design agent drops a responsive direction (gradient background, new typographic scale) and captures the rationale in Decision Log.  
3. BE agent surfaces data contract changes: new `gap_detection` view, type definitions.  
4. FE agent renders banner, wires to gap data, adds animation per design notes.  
5. QA agent runs `npm run test:e2e:ui` targeting `/gap-summary`, verifies screenshot diff, and documents manual confirmation steps in `Validation`.
6. All agents mark ExecPlan Progress done, note remaining polish (e.g., “Add extra QA story for mobile”) in Outcomes.

## Next Steps & Continuous Improvement

1. Pilot this flow on the next cross-functional change, capture cycle time per agent, and refine the Decision Log style for easier scanning.  
2. Create templated prompts or issue templates for common handoffs (design-to-FE, BE-to-QA) so each agent knows what to supply.  
3. Review the plan after two sprints: add missing artifacts, update `WORKFLOW.md` if any coordination detail becomes standard.
