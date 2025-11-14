# Real Data Anonymization & Supabase Sync

## Objective
Define the safeguards, reversible mapping strategy, and Supabase upload workflow that keep us compliant while handling original PM resumes. This document supplements the compliance log and parsing guide.

## Anonymization Policy
- **PII classes**: names, email addresses, phone numbers, personal URLs, postal locations, employer names, educational institutions, and LinkedIn profiles.
- **Replacement strategy**:
  - Deterministic placeholders (`Candidate XXXXX`, `Company XXXXX`, `University XXXXX`) generated via `ResumeAnonymizer`.
  - Contact URIs replaced with neutral references (`candidate@example.com`, `https://candidate-portfolio.example.com`, `https://www.linkedin.com/in/candidate`).
  - Locations normalized to `United States` unless future policy dictates region-specific sampling.
- **Text coverage**: replacements applied across structured fields and raw text (`record.text`) using regex-safe substitution.
- **Redaction log**: `metadata.anonymization.replaced` records original tokens → placeholders; `removedFields` tracks fields removed entirely (e.g., social media handles not yet supported).

## Reversible Mapping Storage
- Stored at `<dataRoot>/.internal/anonymization-map.json`.
- Keyed by resume UUID (`resumeId`) with a nested object of original token → placeholder.
- Access limited to legal/compliance reviewers; do not sync beyond the local secure machine.
- File persists across runs; pipeline merges updates for previously processed resumes.

## Provenance Controls
- `provenance-ledger.json` (root of `dataRoot`) captures:
  - Source metadata (type, dataset ID, original URL).
  - Local storage path for originals.
  - Processing timestamp and target career stage allocation.
- Originals saved as binary files at `<dataRoot>/original/<resumeId>_<filename>`; maintain restricted ACLs on the directory.

## Supabase Sync Workflow
1. **Authentication**: Provide `VITE_SUPABASE_URL` + `VITE_SUPABASE_SERVICE_ROLE_KEY` (preferred) or fallback to anon key for dev buckets.
2. **Bucket**: `REAL_DATA_SUPABASE_BUCKET` (default `datasets`) with folder `pm-resumes`.
3. **Upload**: `RealDataPipeline.uploadToSupabase` performs `storage.from(bucket).upload(path, Blob, { upsert: true })`.
4. **Dataset footprint**: Each anonymized resume uploaded as JSON file `<resumeId>.json` containing the normalized schema.
5. **Opt-out**: `--skip-upload` (CLI) or `skipSupabaseUpload: true` (pipeline options) disables uploads for local dry runs.
6. **PII guarantee**: Only anonymized records leave the local machine; originals and mapping never transmitted.

## Operational Checklist
- ✅ Verify compliance log entry for each active source and capture any dataset-specific attribution.
- ✅ Confirm `dataRoot` resides on encrypted storage with restricted permissions.
- ✅ Run pipeline with `--dry-run` after new source adapters or policy updates.
- ✅ Review anonymized JSON samples before enabling Supabase uploads for a new dataset batch.
- ✅ Rotate placeholders if leakage risk identified; update legal reviewer on changes.

## Incident Response
- **Takedown request**: consult provenance ledger, delete original/anonymized files, purge Supabase object, update compliance log.
- **Placeholder collision**: re-run anonymizer on affected resume (ID-specific) to regenerate mappings; update mapping file accordingly.
- **Supabase breach**: rotate storage keys, trace affected resume IDs via bucket listing, restore from local anonymized directory after incident is resolved.

