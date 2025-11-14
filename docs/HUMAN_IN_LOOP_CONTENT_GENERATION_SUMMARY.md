# Human-in-the-Loop Content Generation: Executive Summary

**Date**: November 6, 2025
**Status**: Ready for Implementation
**Epic**: Phase 4 - AI-Assisted Content Creation

---

## Overview

Transform the prototype "Generate Content" modal into a fully functional, LLM-powered system that helps users address content quality gaps through intelligent, context-aware content generation with automatic variation management.

**Related Documents**:
- **PRD**: `docs/prd/HUMAN_IN_LOOP_CONTENT_GENERATION_PRD.md`
- **Implementation Plan**: `docs/implementation/HUMAN_IN_LOOP_CONTENT_GENERATION_IMPLEMENTATION.md`

---

## Key Insights from User Feedback

### 1. **Context-Dependent Workflow** ⭐

**Work History View** (Sharpening the Axe):
- Users improving base content quality
- **Default behavior**: REPLACE existing content
- **Option**: Create variation if desired

**Cover Letter Draft View** (Primary Workflow):
- Users addressing JD-specific gaps during drafting
- **Always**: CREATE VARIATION (never replace base content)
- **Rationale**: Post-onboarding, most content refinement happens here

### 2. **The Cover Letter Assembly Pattern**

```
1. Draft assembled from best-matching base content
   ↓
2. Gap detection identifies JD-specific gaps
   ↓
3. User generates content to address gaps (HIL content creation)
   ↓
4. Content saved as VARIATION linked to parent story/section
   ↓
5. Gap marked as resolved, variation available for future reuse
```

**Key Principle**: Original base content library stays pristine; job-specific adaptations live as variations.

### 3. **Gap Resolution Scope**

- **Both** AI-generated AND human-edited content should address gaps
- One content item can have **multiple gaps** (e.g., missing metrics + generic description)
- Validation must check **all gaps simultaneously**, not just one

### 4. **Variation Management**

- **Auto-generate names**: "Fills Gap: [gap_category]" (e.g., "Fills Gap: Leadership Philosophy")
- **Gap Tags**: Tag variations with gap categories for intelligent matching
- **Job Context**: Track target job/company for each variation
- **No Limits**: Allow unlimited variations per content item (monitor usage)
- **UI Challenge**: Visual nesting in table views (needs design iteration)

---

## Technical Architecture

### Database Schema

**New Tables**:

```sql
-- content_variations: JD-specific adaptations of base content
CREATE TABLE content_variations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  parent_entity_type TEXT CHECK (IN ('approved_content', 'saved_section')),
  parent_entity_id UUID,  -- Links to base content

  -- Variation content
  title TEXT,             -- "Fills Gap: Leadership Philosophy"
  content TEXT,

  -- Gap tracking
  filled_gap_id UUID REFERENCES gaps(id),
  gap_tags TEXT[],        -- ['leadership', 'team-management']

  -- Job context
  target_job_title TEXT,
  target_company TEXT,
  job_description_id UUID,

  -- Reuse tracking
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP,

  created_by TEXT DEFAULT 'AI' CHECK (IN ('user', 'AI', 'user-edited-AI'))
);

-- saved_sections: Reusable cover letter sections
CREATE TABLE saved_sections (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  section_type TEXT CHECK (IN ('introduction', 'closer', 'signature', 'custom')),
  title TEXT,
  content TEXT,
  tags TEXT[],
  addressed_gap_id UUID REFERENCES gaps(id)
);
```

### Service Layer

**ContentGenerationService** (`src/services/contentGenerationService.ts`):
- `generateContent()`: Call OpenAI with context-aware prompts
- `validateContent()`: Run gap detection on generated content
- `saveContent()`: Handle replace vs variation modes
- `fetchWorkHistoryContext()`: Load user's work history for LLM context

**Gap Detection Service** (enhanced):
- `validateContentForGaps()`: Fast validation optimized for real-time feedback
- Multi-gap validation support (check all gaps simultaneously)

### Content Generation Prompts

New file: `src/prompts/contentGeneration.ts`

**Prompts**:
1. `buildStoryGenerationPrompt()` - For approved_content (STAR format stories)
2. `buildRoleDescriptionPrompt()` - For work_item descriptions
3. `buildSavedSectionPrompt()` - For cover letter sections

**Key Constraints**:
- MUST use only facts from provided work history (no hallucinations)
- MUST address identified gap
- MUST maintain user's voice and tone
- MUST include specific metrics when available

---

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- ✅ Database migration (content_variations, saved_sections tables)
- ✅ Content generation prompts
- ✅ ContentGenerationService implementation

### Phase 2: Modal Integration (Week 2)
- ✅ Update ContentGenerationModal with real LLM calls
- ✅ Add validation result display
- ✅ Create useContentGeneration hook
- ✅ Wire up ContentGapBanner integration

### Phase 3: Variations UI (Week 3)
- ✅ Update ContentCard to display variations
- ✅ Create VariationCard component
- ✅ Migrate Saved Sections page to database

### Phase 4: Gap Validation (Week 4)
- ✅ Enhance gap detection for fast validation (<1s)
- ✅ Multi-gap validation support
- ✅ Real-time validation in modal

### Phase 5: Cover Letter Drafts (Week 5)
- ✅ Extend to cover_letter_drafts entity type
- ✅ Paragraph-level gap detection in drafts
- ✅ ALWAYS VARIATION mode in draft context
- ✅ Truth fidelity testing

**Total Duration**: 5 weeks to MVP

---

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Gap Resolution Rate** | 60%+ | % of gaps resolved within first generation |
| **Variation Creation** | 3+ per story | Average variations created (shows reuse value) |
| **Validation Pass Rate** | 80%+ | Generated content passes gap checks |
| **Generation Latency** | <3s p95 | Fast enough for good UX |
| **Zero Hallucination** | 100% | All content grounded in work history |
| **User Satisfaction** | 4.5+/5 | Post-generation survey rating |

---

## User Workflows

### Workflow 1: Improve Base Story (Work History View)

```
1. User views story with gap: "Missing specific metrics"
2. Clicks "Generate Content"
3. Modal opens → Generate → Validation shows gaps addressed
4. User chooses "Replace existing content"
5. Story updated, gap resolved
```

**Use Case**: Sharpening the axe - improving content quality pre-application.

---

### Workflow 2: Create JD-Specific Variation (Cover Letter Draft) ⭐ PRIMARY

```
1. User drafts cover letter for "Director of Product @ TechCorp"
2. Draft assembled from best-matching stories
3. Gap detected: "Missing leadership philosophy for Director-level role"
4. User clicks "Generate Content"
5. Modal opens in VARIATION mode (auto-detected from draft context)
   - Target Job: "Director of Product, TechCorp" (auto-filled)
   - Related Story: "Team Building at AtlasSuite" (auto-selected)
6. Generate → Validation passes
7. Click "Save Variation"
   - Variation Title: "Fills Gap: Leadership Philosophy" (auto-generated, editable)
   - Gap Tags: ['leadership', 'team-management'] (auto-tagged)
   - Job Context: "Director of Product, TechCorp" (auto-filled)
8. Variation saved, draft updated, gap resolved
```

**Use Case**: Post-onboarding primary workflow - addressing JD gaps during drafting.

**Key Benefits**:
- Original story remains unchanged
- Variation tagged for intelligent reuse in similar Director-level applications
- Gap context preserved for analytics

---

## Risk Mitigation

### Risk 1: LLM Hallucinations
**Impact**: High - Violates core "truth fidelity" principle

**Mitigation**:
- ✅ Strict prompt constraints emphasizing "ONLY use facts from work history"
- ✅ Gap validation checks for inconsistencies
- ✅ User review required before applying
- ✅ Adversarial testing with JD requirements not in work history
- ✅ LLM trained to say "insufficient information" rather than fabricate

### Risk 2: Poor Generation Quality
**Impact**: Medium - Users abandon feature if content is generic

**Mitigation**:
- ✅ Gap validation before allowing "Apply"
- ✅ Regenerate option with variation prompts
- ✅ User can edit content directly in modal
- ✅ Prompt engineering iteration based on feedback

### Risk 3: High LLM Costs
**Impact**: Medium - Could impact unit economics

**Mitigation**:
- ✅ Use GPT-4o-mini for generation (cheaper than GPT-4)
- ✅ Optimize prompts for token efficiency
- ✅ Cache work history context
- ✅ Rate limiting: Max 10 generations/minute/user
- **Target**: <$0.05 per generation

### Risk 4: Slow Performance
**Impact**: High - Poor UX if generation takes >10s

**Mitigation**:
- ✅ Parallel processing (validate while user reviews)
- ✅ Streaming responses from OpenAI
- ✅ Optimistic UI updates
- ✅ Timeout wrappers (10s max)
- **Target**: <3s p95 latency

---

## Future Enhancements (Post-MVP)

### Phase 6: User-Configurable Prompts
**Feature**: Prompts section in user profile menu

**Capabilities**:
- Configure personal voice/tone instructions
- Custom prompt templates
- See/edit prompts sent to LLM
- Save prompt presets

**Priority**: Stretch goal after MVP validation

### Advanced Variation Management
**Features**:
- Variation performance tracking (which variations get interviews)
- Smart variation suggestions based on JD analysis
- Variation merging (combine best parts of multiple variations)
- Variation versioning UI

### Intelligent Content Matching
**Features**:
- Auto-suggest best base content for JD gaps
- Predictive gap detection before drafting
- Content recommendation engine

---

## Open Design Questions

### 1. Variation Nesting in Table Views
**Question**: How to visually show parent-child relationship in work history tables?

**Decision**: Defer to post-MVP. **Simple solution**: Add "Show Variations" filter toggle that displays variations as separate rows with visual indicator (e.g., `[↳]` icon).

**MVP**: Use expandable sections in ContentCard only.

### 2. Gap Resolution for Human Edits
**Question**: Should manual edits trigger gap validation?

**Answer**: YES - Gap resolution should work for both AI-generated and human-edited content. User can manually mark gaps resolved after editing.

**Implementation**: Add "Mark Gap Resolved" button in content editors (future enhancement).

### 3. Multi-Gap Priority
**Question**: If content has 3 gaps, which one to generate for first?

**Answer**: User clicks gap banner → Modal opens for that specific gap. Future: Allow "Generate for all gaps" option.

### 4. Truth Score Display
**Question**: Should we show "Truth Score" confidence indicator in modal?

**Answer**: NO - Not needed for MVP. Focus on gap validation only.

---

## Rollout Strategy

### Week 1-4: Development
- Build Phases 1-4 (foundation, modal, variations, validation)
- Internal testing with real user work histories

### Week 5: Cover Letter Integration
- Build Phase 5 (cover letter draft workflow)
- Beta testing with 10 users
- Collect feedback on variation naming and nesting

### Week 6: Refinement
- Address beta feedback
- Performance optimization
- Cost monitoring and tuning

### Week 7: Launch Preparation
- Final QA testing
- Performance tuning
- Cost monitoring setup

### Week 8: Full Launch
- Deploy to all users (no feature flag needed)
- Monitor success metrics closely
- Plan Phase 6 enhancements based on usage data

---

## Success Criteria for MVP Launch

**Product**:
- [ ] Content generation works for all 4 entity types
- [ ] Validation catches >80% of remaining gaps
- [ ] Variations save and display correctly
- [ ] Cover letter draft workflow functional

**Technical**:
- [ ] Generation latency <3s p95
- [ ] Validation latency <2s p95
- [ ] LLM cost <$0.05 per generation
- [ ] Error rate <5%

**User Experience**:
- [ ] User testing shows 4.5+/5 satisfaction
- [ ] Users create 3+ variations on average
- [ ] 60%+ gap resolution rate
- [ ] Zero reported hallucinations

**Business**:
- [ ] Feature drives user engagement (measured by session length)
- [ ] Reduces time-to-application (measured by draft completion time)
- [ ] Increases cover letter quality (measured by interview callback rate - leading indicator)

---

## Conclusion

The Human-in-the-Loop Content Generation feature represents a critical step in Narrata's vision of semi-structured autonomy: AI assists with content quality, but users maintain full control. By understanding the **context-dependent workflow** (sharpening the axe vs. drafting cover letters) and emphasizing **variation management** for job-specific adaptations, we create a system that balances speed with customization while maintaining truth fidelity.

**The key insight**: Post-onboarding, users primarily interact with this feature during cover letter drafting, not work history management. This informs our design decisions around automatic variation creation, gap tagging, and content reuse.

**Next Steps**:
1. Review and approve PRD and implementation plan
2. Assign engineering resources
3. Create GitHub issues for each phase
4. Begin Phase 1 implementation (database + services)
5. Set up monitoring and cost tracking

**Estimated Impact**: This feature enables the core Narrata promise - "zero fluff, no hallucinations, full control" - by giving users intelligent assistance that never fabricates, always validates, and respects their agency.

---

**Questions or Feedback**: Contact product team or comment on related Notion documents.
