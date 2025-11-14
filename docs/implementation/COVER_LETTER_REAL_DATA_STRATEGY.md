# Cover Letter Real-Data Strategy

## Objective
Secure a compliant set of PM cover letters for evaluation, aiming for an initial cohort of 10 anonymized letters that mirrors resume career-stage distribution (60% mid, 20% early, 20% leadership).

## Source Exploration

| Source | Access Path | Viability | Notes & Legal Considerations |
| --- | --- | --- | --- |
| **GitHub public repos** | Code search for `cover-letter.md`, `CoverLetter.docx` within PM-tagged repositories | 🔶 Medium | Similar approach to resume adapter; ensure repo license permits reuse. Many cover letters are templates—requires filtering for authentic PM letters. |
| **Personal blogs/portfolios** | Crawl curated list of PM portfolio sites (e.g., `pmportfolio.io`) | 🔶 Medium | Need explicit permission or confirmation of public license. Ideal for volunteers who publicly share cover letters. |
| **Reddit / community forums** | Threads in r/ProductManagement, r/PMInterview | 🔴 Low | Typically violates platform terms + essays often partially redacted. Avoid automated scraping to stay compliant. |
| **Open data portals (Kaggle/HuggingFace)** | Search for “cover letter dataset” | 🔴 Low | Current datasets focus on HR analytics with synthetic letters. No verified real-world PM cover-letter corpus. |
| **University career centers** | Public example cover letters | 🟡 Low | Often generic examples with explicit educational focus; limited PM relevance. Must review usage rights (usually educational only). |
| **Volunteer submissions** | Outreach to Narrata beta waitlist / PM communities | 🟢 High | Request direct consent for anonymized use. Pair with incentive (free evaluation credits) and clear anonymization disclosure. |

## Recommended Path
1. **Volunteer Program (Primary)**  
   - Draft outreach email to Narrata waitlist + PM Slack communities.  
   - Provide secure upload link (reuse file-upload flow) with consent checkbox referencing privacy policy.  
   - Offer anonymization summary and ability to revoke data.
2. **GitHub Harvest (Supplement)**  
   - Extend existing GitHub adapter to target cover-letter filenames (e.g., `cover-letter.md`, `cover_letter.txt`).  
   - Add heuristic filters to detect PM-specific content (keywords: “product manager”, “roadmap”, “A/B testing”).  
   - Review repository licenses before inclusion; log in compliance ledger.
3. **Curated Portfolios (Optional)**  
   - Build list of PMs sharing application materials publicly (Look at PM newsletters/blogs).  
   - Request explicit permission via email; store approvals in compliance log.

## Synthetic Fallback (Higher Quality)
If real cover-letter volume is insufficient:
1. **Prompt Template**  
   - Use anonymized resume summary + role JD snippet as context.  
   - Prompt example (OpenAI GPT-4o):  
     ```
     You are an experienced PM crafting a cover letter for {company} {role}. 
     Use the candidate summary and achievements below. Maintain professional tone, 350-450 words, highlight metric-driven impact.
     ```
2. **Diversity Controls**  
   - Vary industries, company stages, geography.  
   - Enforce career-stage distribution alignment.  
   - Run deduplication with trigram similarity to prevent near-identical letters.
3. **Human QA**  
   - Review at least 30% of generated letters for realism and alignment with anonymized resume context.
4. **Tagging**  
   - Mark metadata `synthetic: true`, `generatedAt`, `promptVersion` for downstream filtering.

## Automation Hooks
- Extend `RealDataPipeline` with a cover-letter mode storing outputs in `cover-letters` folder / Supabase prefix.
- Reuse anonymization mapping for contact/company placeholders.
- Support evaluation toggles in CLI (`--type resume|cover-letter` future enhancement).

## Next Steps
1. Launch volunteer outreach + create consent documentation (coordinate with legal).  
2. Implement GitHub cover-letter adapter + update compliance ledger for harvested letters.  
3. If after two weeks <10 real letters, trigger synthetic generation workflow with improved prompts.  
4. Maintain cover-letter status dashboard (counts by source, stage, authenticity).  
5. Feed anonymized letters into validation experiments once minimum dataset achieved.


## Appendix: Draft Cover Letter Section Contract

### JSON Shape
```json
{
  "id": "uuid",
  "templateSectionId": "uuid | null",
  "slug": "string",
  "title": "string",
  "type": "static | dynamic-story | dynamic-saved | closing",
  "order": 0,
  "content": "string",
  "source": {
    "kind": "template_static | work_story | saved_section | hil_generated",
    "entityId": "uuid | null"
  },
  "metadata": {
    "requirementsMatched": ["uuid"],
    "tags": ["string"],
    "wordCount": 0
  },
  "status": {
    "hasGaps": false,
    "gapIds": ["uuid"],
    "isModified": false,
    "lastUpdatedAt": "2025-11-12T00:00:00.000Z"
  },
  "analytics": {
    "matchScore": 0.0,
    "atsScore": 0.0
  }
}
```

### Field Notes
- `id`: Generated when the draft is minted and remains stable for the lifetime of the draft. Used by gap detection, match analytics, and HIL updates.
- `templateSectionId`: Links a draft section back to the originating template section when one exists. `null` for ad-hoc or HIL-generated sections.
- `slug`: Stable machine-readable key derived from the template definition (`introduction`, `body_a`, etc.) to support deterministic ordering across drafts.
- `type`: Drives renderer selection and informs matching logic (`dynamic-story` means pull best work history story, `dynamic-saved` pulls from saved sections).
- `order`: Template-defined sorting integer so downstream consumers can guarantee display order without re-sorting by title.
- `source`: Captures the provenance of the section content, enabling analytics, auto-tagging, and eventual auditing.
- `metadata.requirementsMatched`: Array of job requirement IDs (core or preferred) the current content claims to satisfy.
- `status`: Aggregates per-section lifecycle data. `gapIds` stores unresolved gaps; `isModified` flips to true once the user applies manual or HIL edits.
- `analytics`: Stores section-level scoring to power fine-grained insights; populated opportunistically (e.g., when the match service returns per-section scores).

### ID Propagation & Lifecycle
1. **Draft Creation (`CoverLetterDraftService.generateDraft`)**  
   - Pulls template sections, assigns new `id` values, and copies `templateSectionId` + `slug`.  
   - Evaluates dynamic sections to populate `source` and `metadata.requirementsMatched`.  
   - Persists the resulting array to `cover_letters.sections`.
2. **Gap Detection (`detectCoverLetterDraftGaps`)**  
   - Emits gaps keyed by `sectionId` (matching `sections[].id`).  
   - Updates `status.hasGaps` and appends unresolved `gapIds`.
3. **HIL Content Updates (`CoverLetterDraftService.updateDraftSection`)**  
   - Keeps `id`, `templateSectionId`, and `slug` intact while replacing `content` and merging metadata.  
   - Marks `status.isModified = true`, removes resolved gaps, and timestamps `status.lastUpdatedAt`.
4. **Hook Orchestration (`useCoverLetterDraft`)**  
   - Provides state helpers that reference sections strictly by `id`, ensuring React keys stay stable through regenerations.  
   - When regenerating, only re-IDs sections derived from newly added template blocks; unchanged sections retain their identifiers.
5. **Finalization**  
   - When the draft is finalized, the same section list is pushed to export/preview modules, preserving `order` and provenance for downstream analytics.

This contract ensures every service, hook, and UI layer shares a single source of truth for section shape, enabling future schema evolution without migration churn.


## Resiliency Strategy for AI-Powered Drafting

### Streaming-First Execution
- All OpenAI calls invoked through the AI SDK must use `streamText` (or equivalent) with handlers that forward tokens to `useStreamingProgress`.
- Services emit semantic checkpoints (`phase: "jd_parse" | "content_match" | "metrics"`) so the UI can surface granular status updates in the modal header.
- When a stream concludes successfully, services persist the final payload plus a checksum of streamed tokens to guard against double-commit on retries.

### Retry & Backoff Policy
| Failure Class | Strategy |
| --- | --- |
| `rate_limit_exceeded`, `overloaded` | Exponential backoff (250ms → 2s → 5s, 3 attempts) with jitter. |
| Network/socket errors mid-stream | Resume by reissuing the request with the same idempotency key. Partial tokens buffered during the previous attempt are replayed to the UI immediately. |
| Provider content filter / invalid request | Surface actionable message, skip automated retry, log in observability pipeline. |

### Checkpointing & Partial Saves
1. **JD Parsing**  
   - Parsed structure is committed before moving to draft generation. On retry, generation reuses the stored JD instead of re-calling OpenAI.
2. **Draft Assembly**  
   - Matched stories and sections are cached in a `draft_workpad` record keyed by draft UUID. If streaming fails mid-render, the next attempt picks up from cached matches.
3. **Metrics & Gap Detection**  
   - Metrics calls store interim outputs (`llm_feedback.partial`) even if the final classification fails. Gap detection jobs run only once metrics succeed to avoid cascading retries.

### User Messaging
- Streaming progress messages map to UI states: `Analyzing job description`, `Matching experience`, `Scoring draft`, `Detecting gaps`.
- On recoverable failure (e.g., after retry), the modal shows a warning banner (“We hit a hiccup—retrying automatically”) with a spinner tied to the current phase.
- On unrecoverable failure, the modal retains the last successful checkpoint with options to `Retry phase`, `Edit inputs`, or `Cancel`.

### Observability Hooks
- Each AI invocation logs `{draftId, phase, requestId, attempt}` to the existing analytics sink.
- Error payloads include provider metadata and current checkpoint so support can reconstruct user experience.
- Success events emit total wall time per phase, enabling SLA tracking against the 15-second target.
