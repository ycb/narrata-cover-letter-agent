# Cover Letter MVP Implementation TODO

**Branch**: `feat/draft-cover-letter-claude`
**Goal**: Make Create Cover Letter fully functional for MVP with end-to-end flow
**Started**: 2025-11-13

## Status Legend
- ⏳ In Progress
- ✅ Complete
- ⬜ Not Started
- 🔄 Needs Testing

---

## Phase 1: Critical Path (Core Services)

### 1. Go/No-Go Service
- ✅ Create `src/services/goNoGoService.ts`
- ✅ Implement `analyzeJobFit()` with OpenAI
- ✅ Add prompts to `src/prompts/goNoGo.ts`
- ✅ Write basic tests (4 tests passing)
- ✅ Commit: "feat: add Go/No-Go job fit analysis service"

### 2. Cover Letter Draft Service
- ✅ Create `src/services/coverLetterDraftService.ts`
- ✅ Implement `createDraft()` orchestration
- ✅ Implement `generateSections()` from saved sections + work history
- ✅ Implement `calculateMetrics()` for HIL progress
- ✅ Implement `saveDraft()` to database
- ✅ Implement `updateDraft()` for HIL edits
- ✅ Write basic tests (6 tests passing)
- ✅ Commit: "feat: add CoverLetterDraftService orchestration"

### 3. Gap Detection Extension
- ⬜ Update `src/services/gapDetectionService.ts` to support `cover_letter_section`
- ⬜ Add section-specific gap detection logic
- ⬜ Update types in `src/types/gaps.ts`
- ⬜ Write basic tests
- ⬜ Commit: "feat: extend gap detection for cover letter sections"

### 4. Content Generation Prompts
- ⬜ Add `buildExperienceSectionPrompt()` to `src/prompts/contentGeneration.ts`
- ⬜ Add cover letter specific prompts to `src/prompts/coverLetterGeneration.ts` (NEW)
- ⬜ Test prompts with OpenAI
- ⬜ Commit: "feat: add cover letter section generation prompts"

---

## Phase 2: Modal Integration (Wire Real Services)

### 5. Job Description Integration
- ⬜ Wire `JobDescriptionService.parseAndCreate()` into modal
- ⬜ Replace mock go/no-go with `GoNoGoService`
- ⬜ Test JD parsing flow
- ⬜ Commit: "feat: integrate JobDescriptionService into cover letter modal"

### 6. Draft Generation Integration
- ⬜ Replace `handleGenerate()` mock with `CoverLetterDraftService.createDraft()`
- ⬜ Replace `analyzeHILProgress()` mock with real gap detection
- ⬜ Wire real HIL metrics calculation
- ⬜ Test draft generation flow
- ⬜ Commit: "feat: integrate draft generation service into modal"

### 7. Save to Database
- ⬜ Implement `handleSaveCoverLetter()` with Supabase insert
- ⬜ Update cover_letters table on HIL edits
- ⬜ Test save flow
- ⬜ Commit: "feat: wire cover letter save to database"

### 8. Content Generation for Sections
- ⬜ Wire `ContentGenerationModal` to generate section content
- ⬜ Support apply/regenerate for cover letter sections
- ⬜ Update sections in real-time
- ⬜ Test content generation flow
- ⬜ Commit: "feat: enable content generation for cover letter sections"

---

## Phase 3: Polish & UX

### 9. Signature Personalization
- ⬜ Pull signature from user profile
- ⬜ Auto-populate [Your Name], [Your Phone], etc.
- ⬜ Commit: "feat: personalize signature from user profile"

### 10. Error Handling
- ⬜ Add error handling to all service calls
- ⬜ Add loading states during generation
- ⬜ Add retry logic for API failures
- ⬜ Add user-facing error messages with toast
- ⬜ Commit: "feat: add error handling and loading states"

### 11. Content Variations
- ⬜ Save generated content as variations linked to gaps
- ⬜ Tag variations with job_description_id
- ⬜ Track usage in content_variations table
- ⬜ Commit: "feat: save cover letter section variations"

---

## Phase 4: Testing & Validation

### 12. End-to-End Testing
- ⬜ Test full flow: JD input → Generate → HIL → Finalize → Save
- ⬜ Test go/no-go override flow
- ⬜ Test gap detection and content generation
- ⬜ Test error cases (API failures, invalid JD, etc.)
- ⬜ Commit: "test: add e2e tests for cover letter creation"

### 13. Database Validation
- ⬜ Verify cover_letters records created correctly
- ⬜ Verify gaps created and resolved correctly
- ⬜ Verify content_variations created correctly
- ⬜ Verify job_descriptions created correctly

---

## Phase 5: PR & Documentation

### 14. Documentation
- ⬜ Update CLAUDE.md with new services
- ⬜ Add JSDoc comments to new services
- ⬜ Document API contracts

### 15. Pull Request
- ⬜ Create PR with description
- ⬜ Link to issues/tickets
- ⬜ Request review

---

## Notes & Decisions

### Architecture Decisions
- Using existing ContentGenerationService for section generation
- Extending GapDetectionService rather than creating separate service
- Storing draft state in cover_letters table with status='draft'

### Dependencies
- OpenAI API for go/no-go analysis and section generation
- Supabase for all database operations
- Existing gap detection and content generation services

### Technical Debt / Future Work
- Performance optimization (caching JD parsing, section generation)
- Bulk gap actions ("Generate All" button)
- Template selection UI
- Section reordering (drag-and-drop)
- A/B testing for different prompts

---

## Progress Log

### 2025-11-13
- Created branch `feat/draft-cover-letter-claude`
- Created TODO tracking document
- Starting Phase 1: Critical Path implementation
- ✅ Completed Go/No-Go Service (goNoGoService.ts + prompts + tests - 4 tests)
- ✅ Completed CoverLetterDraftService (orchestration + tests - 6 tests)
- ⏳ Working on Modal Integration (wiring real services)
