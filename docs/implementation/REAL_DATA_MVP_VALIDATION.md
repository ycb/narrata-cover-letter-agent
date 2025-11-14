# Real Data MVP Validation & Context Engineering Roadmap

## Goals
1. **Validate** that real-world PM resumes/cover letters improve Narrata’s evaluation accuracy and recommendations.
2. **Automate context assembly** so the LLM receives richer, persona-aware prompts with minimal manual curation.

## Experiment Matrix

| Experiment | Data | Hypothesis | Metrics | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| **E1: Real vs Synthetic Evaluation Accuracy** | 10 real anonymized resumes vs 10 synthetic baselines | Real data produces higher evaluator alignment | Human agreement %, gap count reduction, qualitative reviewer rating | Eval Squad | Planned |
| **E2: Cover Letter Impact** | Resume-only vs resume+cover-letter pairs | Cover-letter context improves recommendation specificity | Actionable suggestion count, reviewer usefulness rating | Content Ops | Planned |
| **E3: Persona Prompt Enrichment** | Resume text vs resume + LinkedIn summary + trajectory tags | Richer prompts drive better PM Level classification | Precision/recall across PM levels, latency impact | Platform | Planned |
| **E4: Automated Context Bundles** | Auto-assembled vs manual-curated prompts | Automated bundles maintain output quality with less effort | Reviewer QA time, final-score delta, prompt token count | Platform | Planned |

### Metric Definitions
- **Human agreement %**: percentage of evaluator outputs matching human rubric rating within ±1 level.
- **Gap count reduction**: change in number of flagged competency gaps vs baseline run.
- **Actionable suggestion count**: number of concrete next steps (includes metrics/action verbs).
- **Reviewer usefulness rating**: 1-5 scale captured in QA spreadsheet.
- **Latency impact**: difference in total LLM processing time (ms) between prompt variants.

## Validation Workflow
1. **Dataset Assembly**
   - Use `RealDataPipeline` to collect 10 resumes (mid-heavy distribution) + matching cover letters.
   - Store evaluation manifests with metadata (source, career stage, enrichment toggles).
2. **Prompt Variants**
   - `baseline`: resume text only.
   - `rich-context`: resume + LinkedIn summary + inferred skills + context tags.
   - `full`: resume + cover letter + LinkedIn + target company snippet.
3. **Run Evaluations**
   - Drive via existing evaluation CLI or Supabase job.
   - Capture outputs + latencies + LLM token usage.
4. **Human Review**
   - Two PM reviewers per sample, independent scoring.
   - Use scoring template (attach to docs/testing) with rubric.
5. **Analysis**
   - Evaluate metrics (accuracy, suggestions, latency).
   - Feed insights into GTM segmentation (e.g., mid-level PMs respond better to real data?).

## Context Engineering Automation

### Components
1. **Context Builder Service**
   - Input: normalized resume JSON.
   - Output: structured context segments (career trajectory, domain expertise, leadership signals).
   - Implementation sketch:
     - Extract top 3 achievements by impact.
     - Summarize career progression (title sequence + durations).
     - Tag PM competencies (execution, strategy, leadership) using heuristics/LLM.
2. **Prompt Template Manager**
   - JSON/YAML file storing prompt variations.
   - Supports AB testing across experiments (baseline vs enriched vs full context).
3. **Evidence Sampler**
   - Selects sentences supporting each PM level assertion.
   - Prioritizes quant metrics, leadership keywords, cross-functional references.
4. **Feedback Loop**
   - Collect reviewer feedback + evaluation outcomes.
   - Train heuristics to adjust context emphasis (e.g., highlight ROI metrics more for leadership track).

### Automation Roadmap
| Milestone | Description | Owner | Deadline |
| --- | --- | --- | --- |
| **M1** | Build context builder service (summaries, tags, achievements) | Platform | 2025-11-18 |
| **M2** | Integrate prompt template manager + variant toggles in evaluation runner | Platform | 2025-11-22 |
| **M3** | Launch Experiment E1 + E2 with baseline vs rich prompts | Eval Squad | 2025-11-25 |
| **M4** | Implement evidence sampler + auto QA logging | Platform | 2025-11-29 |
| **M5** | Analyze results, update GTM personas + share findings | GTM | 2025-12-02 |

## Tooling & Data Artifacts
- **Evaluation manifests**: JSON files storing sample metadata + prompt variant used.
- **Reviewer dashboard**: Extend existing QA Google Sheet to include real-data columns.
- **Token usage tracker**: Derive from OpenAI response metadata.
- **Prompt library**: Commit to `src/prompts/real-data/*.ts` after experimentation (future work).

## Risks & Mitigations
- **Limited sample size** → Start with 10, scale to 100 once anonymization workflow validated.
- **PII leakage** → QA anonymized text before Supabase upload; run regex checks pre-upload.
- **Latency spikes** → Monitor GPT response times; consider summarizing context to stay under token caps.
- **Reviewer fatigue** → Rotate reviewers, cap daily evaluations, provide rubric training.

## Deliverables
- ✅ This roadmap document.
- 🔜 Evaluation manifest template + context builder prototype (tracked separately).
- 🔜 Experiment readouts feeding into GTM insights document.


