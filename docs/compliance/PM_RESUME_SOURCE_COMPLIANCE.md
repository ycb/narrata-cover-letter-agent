# PM Resume Source Compliance Log

## Overview
- **Last updated:** 2025-11-11
- **Maintainer:** Data Pipeline Team
- **Scope:** Compliance tracking for PM resume and cover-letter sourcing initiatives, including licensing, terms-of-service (TOS), and legal review checkpoints.
- **Storage policy:** Original (non-anonymized) files stored locally at `/Users/admin/narrata/data/original`. Anonymized derivatives may be uploaded to Supabase only after PII scrubbing and legal approval.

## Legal Review Checklist
- Document dataset license, attribution, and redistribution rights.
- Verify whether automated scraping/crawling is permitted by robots.txt and TOS.
- Confirm rate-limit adherence and authentication requirements.
- Ensure storage of originals remains local-only and access-controlled.
- Capture anonymization guarantee (PII removal, reversible mapping security).
- Record approvals (date, reviewer) before ingesting beyond pilot scope.

## Source Inventory

| Source | Data Format | Access Method | License / TOS Summary | Compliance Notes | Legal Review Status |
| --- | --- | --- | --- | --- | --- |
| Kaggle | CSV, JSON, ZIP bundles | Kaggle API (token) | Licenses vary by dataset; many use CC BY/CC0 but must inspect each dataset card. Kaggle TOS restrict redistribution if prohibited by dataset license. | Maintain dataset-specific license copy in `/docs/compliance/licenses/kaggle/<dataset>` (create on pull). Respect API rate limits (~600 calls/10 min). Attribution required where stipulated. | Pending – require dataset-level review before download. |
| HuggingFace Datasets | JSON, Parquet | `datasets` API / HTTPS | Default to Apache 2.0 unless overridden. Must review `dataset_card` for explicit license. | Check for “no commercial use” clauses. Cache metadata hash for audit. Respect HF throttling guidelines (`~10 req/s`). | Pending – review per target dataset. |
| Common Crawl | WARC | AWS S3 (public) | CC BY 4.0; additional restrictions may apply for derived content. | Use filtered indexes (e.g., CDX) targeting resume keywords. Must add `robots.txt` compliance filtering before fetch. Store URLs for takedown requests. | Pending – require legal sign-off on resume extraction via CC. |
| GitHub Public Repos (`resume.md`, `CV.pdf`) | Markdown, PDF | GitHub REST API / `gh` CLI | Repos licensed per repository (MIT, Apache, proprietary). GitHub TOS allows crawling for OSS, but respect robots and repo LICENSE. | Log repo URL, license, and commit hash. Avoid private or questionable repos. Prefer repos with explicit permissive licenses. | Pending – confirm candidate repos and license compatibility. |
| Lever Jobs API | JSON | Lever public postings API | Content intended for job seekers; TOS discourage bulk scraping for unrelated purposes. Each company may add terms. | Only fetch postings from companies granting permission. Capture company terms snapshot in compliance log. Evaluate whether resumes exist; likely not (job descriptions only). | Pending – require explicit partner permission if resumes retrieved. |

## Action Items
- [ ] Identify pilot datasets (≤10 resumes) and attach license summaries in this log.
- [ ] Obtain legal counsel approval for each source before large-scale ingestion.
- [ ] Implement automated provenance recording (source, license, fetch timestamp).
- [ ] Define takedown process (request channel, SLA, data deletion steps).

## Notes
- Cover-letter sourcing currently under investigation. No compliant public dataset identified yet.
- For any future sources, append to this log with the same columns and secure legal approval prior to ingestion.

