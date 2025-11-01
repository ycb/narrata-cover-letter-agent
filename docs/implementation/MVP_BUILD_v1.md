v1 MVP Production Build
Goal
Transition from prototype to production-ready MVP with all core features working with real data.

Current State Summary
✅ Onboarding system (file upload → parsing → database)
✅ Data processing pipeline
✅ Onboarding dashboard UI
✅ User settings UI (My Goals, My Voice modals)
✅ Assessment UI (level, competencies, specializations)
✅ Work History page with gap warning UI
❌ Gap detection backend not implemented
❌ Level assessment backend not implemented
❌ Content review not integrated
❌ User preferences not persisted
❌ Prototype code still in main branch
Implementation Phases
Phase 1: Branch Strategy & Prototype Separation
Goal: Clean separation of prototype code for future usability testing

Tasks:

[ ] Create usability-test branch from current branch
[ ] Move prototype files to usability-test branch:
src/contexts/PrototypeContext.tsx
src/components/work-history/PrototypeStateBanner.tsx
Tour mode components
Sample data definitions
[ ] Tag usability-test branch for reference
[ ] Remove PrototypeContext from App.tsx
[ ] Remove usePrototype from all pages
[ ] Remove PrototypeStateBanner usage
Phase 2: Remove Sample Data Fallbacks
Goal: All pages show real data or proper empty states

Files to Update:

src/pages/WorkHistory.tsx - Remove sampleWorkHistory
src/pages/ShowAllStories.tsx - Remove mockAllStories
src/pages/ShowAllLinks.tsx - Check for mock data
src/pages/Dashboard.tsx - Check for mock data
Empty States to Create:

Work History: "No work history yet" → Link to onboarding
Stories: "No stories found" → Prompt to add stories
Links: "No links found" → Prompt to add links
Dashboard: Guide to onboarding completion
Phase 3: Implement Gap Detection Service
File: src/services/gapDetectionService.ts (new)

Three Types of Gaps:

Data Quality:
Missing dates, incomplete stories
Missing metrics, insufficient quantification
Duplicate/inconsistent entries
Best Practices:
Metrics per story ratio (e.g., 2-3 metrics per story)
Story count per role (e.g., 3-5 stories for Sr PM roles)
Quantification level (percentages, dollar amounts, timeframes)
Specificity vs generic descriptions
Role-Level Expectations (Based on Narrata's PM leveling):
Sr PM: Strategic thinking, organizational influence evidence
Lead PM: Technical leadership, domain expertise
Compare current data to target level requirements
Integration Points:

Connect to Work History page (gap warnings UI already exists)
Show gaps during content review in onboarding
Store gap data in database for tracking
Phase 4: Implement Level Assessment Service
File: src/services/levelAssessmentService.ts (new)

Narrata's PM Levels:

Associate PM (0-2 years)
PM (2-4 years)
Sr PM (4-7 years)
Lead PM (technical leadership)
Principal PM (domain expert)
Assessment Algorithm:

Benchmark from uploaded data (resume, LinkedIn, stories, metrics)
Assess competencies: Execution, Customer Insight, Strategy, Influence
Map specializations: Growth, Technical, Founding, Platform
Store results in database (new table or JSONB column)
Auto-reassess when new data added (hook into processStructuredData)
Integration Points:

Connect to Assessment page (UI already exists)
Display level, competencies, specializations
Show progression path (current → next level)
Phase 5: Content Review During Onboarding
Integration Point: Add review UI into NewUserDashboard.tsx task flow

Features:

Show extracted content (stories, metrics, tags) for review
Allow approve/reject/edit actions
Show gap warnings during review
Track completion status per category
Guide refinement with gap detection feedback
Files to Create/Update:

src/components/onboarding/ContentReviewStep.tsx (build or enhance)
Update NewUserDashboard.tsx to integrate review
Add review completion tracking to database

Phase 5b: Cover Letter Template Creation & Setup During Onboarding
Goal: Users create and customize their first cover letter template as part of onboarding

Saved Sections = Content Library:
- Saved Sections are reusable content blocks (intro paragraphs, closer paragraphs, signatures)
- These serve as a library of content for cover letter templates
- Extracted from uploaded cover letters during parsing (decomposed from cover letter content)
- Can also be manually created or AI-generated

Template Creation Flow:
1. Initialize default template from parsed cover letter data (if available)
   - Decompose uploaded cover letter into saved sections (intro, body paragraphs, closer, signature)
   - Create default template with these sections mapped
2. Allow customization:
   - Edit/refine saved sections (intro, closer, signature)
   - Configure template structure (section order, which sections use work history stories vs saved sections)
   - Set default content sources (work history stories vs saved sections for each paragraph type)
3. Guide user through template setup:
   - Explain saved sections as content library
   - Show how to create reusable intro/closer/signature sections
   - Demonstrate how templates pull from work history stories and saved sections
   - Allow creating additional saved sections from work history content

Integration Points:
- Add template creation task to NewUserDashboard.tsx onboarding flow
- Decompose cover letter content during parsing into saved sections
- Create default template after cover letter upload
- Allow template customization before graduation
- Track template setup completion

Files to Create/Update:

src/services/coverLetterTemplateService.ts (new)
  - Decompose cover letter into saved sections
  - Create default template from parsed cover letter
  - Manage saved sections CRUD
  - Template structure management

src/components/onboarding/CoverLetterTemplateSetupStep.tsx (new)
  - Guide user through template creation
  - Allow editing saved sections
  - Configure template structure
  - Preview template with sample content

src/pages/SavedSections.tsx (enhance)
  - Connect to database (currently uses mock data)
  - Allow creation from work history content
  - Link to cover letter template creation

src/pages/CoverLetterTemplate.tsx (enhance)
  - Integrate into onboarding flow
  - Use real saved sections from database
  - Default template creation from parsed cover letter

Database Updates:
- Ensure saved_sections table exists (or create if needed)
- Link saved sections to user_id
- Track template creation status in onboarding

Phase 6: User Preferences Persistence
File: src/services/userPreferencesService.ts (new)

Store:

"My Goals" (target titles, salary, company maturity, work type, industries)
"My Voice" (writing style prompt)
Database Schema:

Create user_preferences table or add JSONB column to profiles
Allow editing throughout onboarding and after
Use preferences for cover letter recommendations
Integration Points:

Connect "My Goals" modal to service
Connect "My Voice" modal to service
Persist on save, load on page load
Phase 7: Graduation Criteria
Decision: Start with blocking approach (simpler for MVP)

Implementation:

Track onboarding task completion in database
Define required vs optional tasks
Block cover letter creation until required tasks complete
Show clear message: "Complete onboarding to create cover letters"
Allow viewing of gaps/quality issues even when blocked
Future Alternative:

Non-blocking: Allow creation but surface quality warnings
Explain low quality due to incomplete review
Phase 8: Production Error Handling
Goal: User-friendly error states throughout

Error Types to Handle:

File upload failures → Clear messages, retry options
LLM parsing failures → Retry mechanism, fallback
Database errors → User-friendly messages
Network issues → Offline detection
Files to Update:

Update FileUploadService error handling
Update processStructuredData error handling
Add error boundaries to key pages
Implementation Checklist
Setup & Cleanup
[ ] Create usability-test branch
[ ] Move prototype code
[ ] Remove prototype dependencies from main branch
[ ] Remove sample data fallbacks
[ ] Create empty state components
[ ] Update all pages to use empty states
Core Features
[ ] Implement gap detection service
[ ] Connect gap detection to Work History
[ ] Implement level assessment service
[ ] Connect level assessment to Assessment page
[ ] Build content review UI
[ ] Integrate review into onboarding
[ ] Build cover letter template setup during onboarding
[ ] Decompose cover letters into saved sections during parsing
[ ] Create cover letter template service
[ ] Connect saved sections to database
[ ] Create default template from parsed cover letter
[ ] Create user preferences service
[ ] Connect preferences modals to service
Graduation & Polish
[ ] Implement graduation criteria
[ ] Add completion tracking
[ ] Update error handling
[ ] Test end-to-end flows
Success Criteria
No Prototype Code: All prototype code in usability-test branch
Real Data Only: No sample data, proper empty states
Gap Detection Works: All 3 types detected and displayed
Level Assessment Works: Narrata's algorithm, auto-reassessment
Content Review Integrated: Part of onboarding, guides refinement
Cover Letter Template Setup: Users create and customize template during onboarding
Saved Sections Library: Reusable content extracted from cover letters and work history
Preferences Persist: My Goals and My Voice stored
Graduation Works: Clear path from onboarding to production
Error Handling: User-friendly error states throughout
Files to Create/Modify
New Files:

src/services/gapDetectionService.ts
src/services/levelAssessmentService.ts
src/services/userPreferencesService.ts
src/services/coverLetterTemplateService.ts
src/components/work-history/EmptyStates.tsx
src/components/onboarding/ContentReviewStep.tsx (if new)
src/components/onboarding/CoverLetterTemplateSetupStep.tsx
Modified Files:

src/App.tsx - Remove PrototypeProvider
src/pages/WorkHistory.tsx - Remove usePrototype, sample data, add gap integration
src/pages/ShowAllStories.tsx - Remove mock data
src/pages/ShowAllLinks.tsx - Check/remove mock data
src/pages/Dashboard.tsx - Check/remove mock data
src/pages/NewUserDashboard.tsx - Integrate content review and template setup
src/pages/Assessment.tsx - Connect to level assessment service
src/pages/SavedSections.tsx - Connect to database, remove mock data
src/pages/CoverLetterTemplate.tsx - Use real saved sections, integrate into onboarding
src/services/fileUploadService.ts - Decompose cover letters into saved sections, add auto-reassessment hook