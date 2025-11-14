# Real Data Parsing & Enrichment Guide

## Overview
This document outlines the standardized parsing schema, enrichment workflow, and quality safeguards for the real-data pipeline (`RealDataPipeline` service and `run-real-data-pipeline.ts` runner). The goal is to ensure resume artifacts from heterogeneous sources (Kaggle, HuggingFace, Common Crawl, GitHub, Lever, custom uploads) are normalized into a consistent structure and enriched with LinkedIn metadata when permissible.

## Standardized Resume Schema
Each anonymized resume exported to Supabase or disk follows the structure below:

```0:0:src/services/realDataPipeline.ts
{
  "id": "UUIDv4",
  "text": "PII-scrubbed resume text",
  "contact": {
    "name": "Candidate XXXXX",
    "email": "candidate@example.com",
    "phone": "+1 (555) 123-4567",
    "location": "United States",
    "linkedin": "https://www.linkedin.com/in/candidate",
    "websites": ["https://candidate-portfolio.example.com"]
  },
  "workHistory": [
    {
      "role": "Product Manager",
      "company": "Company XXXXX",
      "startDate": "2020-01-01",
      "endDate": "2024-01-01",
      "durationMonths": 48,
      "responsibilities": ["Launched X"],
      "achievements": ["Improved metric Y by 45%"]
    }
  ],
  "education": [
    {
      "institution": "University XXXXX",
      "degree": "MBA",
      "field": "Product Management",
      "startDate": "2012-01-01",
      "endDate": "2014-01-01"
    }
  ],
  "skills": ["Roadmapping", "A/B Testing", "SQL"],
  "summary": "Optional summary paragraph",
  "metadata": {
    "sourceId": "github-pm-resumes",
    "sourceType": "github",
    "checksum": "sha256",
    "wordCount": 742,
    "inferredCareerStage": "mid",
    "yearsExperience": 8,
    "linkedinUrl": "https://www.linkedin.com/in/example",
    "anonymization": {
      "replaced": {},
      "removedFields": []
    }
  }
}
```

### Key Normalization Rules
- **Career stages**: `early`, `mid`, `leader`, `unknown`. Derived from role seniority heuristics and work history depth.
- **Dates**: Converted to ISO `YYYY-MM-DD` whenever parsable; durations derived in months.
- **Skills**: Tokenized from explicit “Skills” sections, limited to 50 entries.
- **Education**: Up to 5 entries, capturing degree, field, and notable achievements.
- **Checksum**: SHA-256 hash of tokenized resume text to support deduplication.

## Parsing Workflow
1. **Text extraction** via `ResumeTextExtractor`:
   - Plain text/JSON handled directly.
   - PDF/DOCX routed through `TextExtractionService` (pdf.js + mammoth fallback).
   - Extraction errors short-circuit the record (logged at WARN level).
2. **Resume normalization** via `ResumeParser`:
   - Contact info (email, phone, LinkedIn, location) detected with regex heuristics.
   - Work history parsed from sections containing role/company/date patterns with bullet responsibilities.
   - Education entries derived from sections referencing universities/colleges/degrees.
   - Skills list captured from explicit headings.
   - Summary gleaned from leading paragraph when short enough.
3. **Career stage inference**:
   - Managerial keywords → `leader`.
  - Senior IC signals (senior/principal/staff) or ≥3 roles → `mid`.
  - Otherwise defaults to `early` (or `unknown` if no history).
4. **Experience calculation**: Earliest start to latest end (or current date) converted to whole years.

## LinkedIn Enrichment
- Backed by `LinkedInLookupService`, which optionally calls Google Custom Search if `GOOGLE_API_KEY` and `GOOGLE_CX` are defined.
- Query composed of candidate name, most recent company, and role keywords.
- Enforces throttle (`1500 ms` default) and safe-search filtering.
- Lookup is skipped automatically when credentials are absent or `--skip-linkedin` flag is set.
- Found URLs stored in `metadata.linkedinUrl`; anonymization step overrides `contact.linkedin` but preserves original URL in metadata for reviewer context.

## Provenance & Mapping
- **Ledger**: `provenance-ledger.json` captures source metadata, fetch timestamps, and storage paths for originals.
- **Reversible mapping**: Stored at `<dataRoot>/.internal/anonymization-map.json`, mapping raw tokens to placeholders for audit-only use.
- **Original files**: Persisted at `<dataRoot>/original`, named `<resumeId>_<filename>`.
- **Anonymized JSON**: Persisted at `<dataRoot>/anonymized/<resumeId>.json`.

## Quality Safeguards
- Records under 200 bytes (Common Crawl/GitHub noise) rejected.
- Unsupported file types logged and skipped.
- Anonymization replaces names, emails, phones, locations, company names, institutions, and URLs with deterministic placeholders.
- Supabase uploads (optional) use upsert semantics and JSON content-type.

## Operational Checklist
1. Confirm environment variables:
   - `REAL_DATA_ROOT`
   - `VITE_SUPABASE_URL` + `VITE_SUPABASE_SERVICE_ROLE_KEY` (or anon key in local mode)
   - `KAGGLE_USERNAME` / `KAGGLE_KEY` (if using Kaggle sources)
   - `HF_TOKEN` for private HuggingFace datasets
   - `GITHUB_TOKEN` for higher rate limits
   - `GOOGLE_API_KEY` + `GOOGLE_CX` for LinkedIn enrichment
2. Run `tsx scripts/run-real-data-pipeline.ts --dry-run` to validate sourcing without writes.
3. Monitor logs for extraction failures or skipped records.
4. After anonymization, review mapping file and provenance ledger before pushing to Supabase.

## Change Management
- Update this guide whenever parsing heuristics or schema fields change.
- Document new source adapters (or configuration overrides) alongside licensing notes in the compliance log.
- Coordinate with legal before enabling sources flagged as `enabled: false` by default (Common Crawl, Lever).

