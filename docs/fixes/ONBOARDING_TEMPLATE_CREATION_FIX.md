# Onboarding Template Creation Fix

## Issue
Users completing onboarding with a cover letter upload were not getting a default template created, which blocked them from generating new cover letters. The "Generate cover letter" button remained disabled with the error:
- `templatesCount: 0`
- `selectedTemplateId: null`

## Root Cause
In `fileUploadService.ts` (line 1918-1922), when cover letters used the **new format** (stories array) vs **old format** (paragraphs array), template creation was **deferred** to a UI backfill that only ran when users visited the Saved Sections page.

```typescript
if (hasNewFormat && !hasOldFormat) {
  // PROBLEM: Template creation deferred to UI
  console.log(`ℹ️ Saved sections will be created on-demand from stories in structured_data`);
}
```

If users skipped the Saved Sections page during onboarding, they would have:
- ✅ Work history extracted
- ✅ Stories created
- ❌ **NO template created**
- ❌ **Cannot generate cover letters**

## Fix
**File**: `src/services/fileUploadService.ts` (lines 1916-1944)

Changed the new format handler to:
1. **Immediately create a default template** during onboarding
2. Check if template already exists (avoid duplicates)
3. Use a generic 4-section structure (intro, body 1, body 2, closing)
4. Don't create saved sections (content will be generated per-job)

```typescript
if (hasNewFormat && !hasOldFormat) {
  // FIXED: Create template immediately during onboarding
  const templateStructure = [
    { id: 'intro', title: 'Introduction', type: 'intro', ... },
    { id: 'body-1', title: 'Body Paragraph 1', type: 'body', ... },
    { id: 'body-2', title: 'Body Paragraph 2', type: 'body', ... },
    { id: 'closing', title: 'Closing', type: 'closing', ... },
  ];
  
  const existingTemplates = await CoverLetterTemplateService.getUserTemplates(userId, accessToken);
  
  if (existingTemplates.length === 0) {
    const template = await CoverLetterTemplateService.createDefaultTemplate(
      userId,
      'Professional Template',
      templateStructure,
      [], // No saved sections - content generated per-job
      accessToken
    );
    console.log(`✅ Created default template ${template.id} for onboarding`);
  }
}
```

## Testing
1. Complete onboarding with cover letter upload (new format)
2. Navigate to Cover Letters page
3. Click "Create New Letter"
4. Modal opens with "Generate cover letter" button **enabled**
5. Console shows: `✅ Created default template <id> for onboarding`

## Impact
- ✅ All new users will have a template created during onboarding
- ✅ Users can immediately generate cover letters after onboarding
- ✅ No need to visit Saved Sections page first
- ✅ Preserves old format behavior (paragraphs → saved sections + template)

## Related Files
- `src/services/fileUploadService.ts` - Main fix location
- `src/services/coverLetterTemplateService.ts` - Template creation service
- `src/components/cover-letters/CoverLetterModal.tsx` - Button validation (no changes needed)

## Commit Message
```
fix(onboarding): ensure template created during cover letter upload

Template creation was deferred for new-format cover letters, blocking
users from generating letters if they skipped the Saved Sections page.

Now creates a default 4-section template immediately during onboarding
for all cover letter uploads, regardless of format.

Fixes: Generate cover letter button disabled after onboarding
```

















