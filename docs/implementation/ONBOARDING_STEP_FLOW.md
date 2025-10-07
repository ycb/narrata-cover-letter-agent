# Onboarding Step-by-Step Flow Implementation

## Overview

Implemented a sequential step-by-step onboarding flow in `NewUserOnboarding.tsx` where each content upload card is enabled only after the previous step is completed.

**Implementation Date:** October 6, 2025  
**Status:** ✅ Complete

## User Flow

### Sequential Steps

1. **Step 1: Resume Upload** (Always enabled)
   - User uploads or pastes resume
   - System parses resume using OpenAI
   - Extracts work history, education, skills
   - On completion: Unlocks Step 2

2. **Step 2: LinkedIn Profile** (Enabled after Step 1)
   - User enters LinkedIn URL
   - System enriches data using PDL API
   - Uses resume data + user name for matching
   - Gets comprehensive work history, education, certifications
   - On completion: Unlocks Step 3

3. **Step 3: Cover Letter** (Enabled after Step 2)
   - User uploads or pastes best cover letter example
   - System analyzes writing style and structure
   - On completion: Enables "Review & Approve" button

## Visual Design

### Step Indicators

Each step has a numbered circle indicator:
- **Pending**: Gray circle with number
- **Active**: Blue circle with number
- **Completed**: Green checkmark icon

### Connecting Line

A vertical line connects all steps, creating a visual flow.

### Card States

- **Disabled**: 
  - 50% opacity
  - Pointer events disabled
  - Description shows "Complete [previous step] first"
  
- **Active**:
  - Full opacity
  - Interactive
  - Clear description of action needed

- **Completed**:
  - Green checkmark on step indicator
  - Card remains interactive (can edit)

## State Management

### New State Variables

```typescript
const [resumeCompleted, setResumeCompleted] = useState(false);
const [linkedinCompleted, setLinkedinCompleted] = useState(false);
const [coverLetterCompleted, setCoverLetterCompleted] = useState(false);
```

### Completion Triggers

Steps are marked complete in `handleUploadComplete()`:

```typescript
if (uploadType === 'resume') {
  setResumeCompleted(true);
} else if (uploadType === 'linkedin') {
  setLinkedinCompleted(true);
} else if (uploadType === 'coverLetter') {
  setCoverLetterCompleted(true);
}
```

### Button State

The "Review & Approve" button shows contextual text:
- Not all steps complete: "Upload Resume to Continue" / "Add LinkedIn to Continue" / "Add Cover Letter to Continue"
- All steps complete: "Review & Approve"

## Why This Flow?

### 1. Resume First (Required for PDL)

The resume upload must come first because:
- Extracts user's most recent company
- PDL uses company + name + LinkedIn URL for accurate matching
- Better enrichment results with more context

### 2. LinkedIn Second (Enrichment Step)

LinkedIn comes after resume because:
- PDL needs resume data for best matching
- Can fall back to resume data if PDL fails
- Sequential processing is clearer to user

### 3. Cover Letter Last (Writing Style)

Cover letter comes last because:
- Not dependent on previous steps
- User may want to review enriched data first
- Completes the content gathering phase

## Implementation Details

### Card Disabled State

```typescript
<div className={!resumeCompleted ? 'opacity-50 pointer-events-none' : ''}>
  <FileUploadCard
    disabled={!resumeCompleted}
    description={resumeCompleted 
      ? "Enter your LinkedIn URL..." 
      : "Complete resume upload first"}
    // ...
  />
</div>
```

### Progress Indicator

```typescript
<div className="mt-4 text-sm text-muted-foreground">
  Step {(resumeCompleted ? 1 : 0) + (linkedinCompleted ? 1 : 0) + (coverLetterCompleted ? 1 : 0)} of 3 completed
</div>
```

### Button Logic

```typescript
<Button 
  disabled={!resumeCompleted || !linkedinCompleted || !coverLetterCompleted || isProcessing}
>
  {!resumeCompleted ? "Upload Resume to Continue"
    : !linkedinCompleted ? "Add LinkedIn to Continue"
    : !coverLetterCompleted ? "Add Cover Letter to Continue"
    : "Review & Approve"}
</Button>
```

## User Experience Benefits

### 1. Clear Progression
- Visual step indicators show where user is
- Progress counter shows completion status
- No confusion about what to do next

### 2. Prevents Errors
- Can't skip required steps
- Ensures proper data flow for PDL enrichment
- Validates completion before proceeding

### 3. Better Data Quality
- Resume data available for LinkedIn enrichment
- More accurate PDL matching
- Complete profile before review

### 4. Reduced Cognitive Load
- One task at a time
- Clear next action
- No overwhelming multi-card interface

## Technical Notes

### State Reset on File Clear

If user clears a file, the completion state resets:

```typescript
if (file === null) {
  if (type === 'resume') {
    setResumeCompleted(false);
    // This will disable subsequent steps
  }
}
```

### Completion Validation

Completion is set only when:
- File successfully uploaded AND
- Background processing completed AND
- `handleUploadComplete` callback fired

This ensures data is actually ready before unlocking next step.

### Mobile Responsive

The step indicators and connecting line are positioned using absolute positioning with proper z-index to work on all screen sizes.

## Testing Scenarios

### Happy Path
1. Upload resume → Step 1 completes → Step 2 enables
2. Add LinkedIn → Step 2 completes → Step 3 enables
3. Add cover letter → Step 3 completes → Review button enables
4. Click Review → Proceed to content review

### Error Handling
- Upload fails → Step remains incomplete → Next step stays disabled
- Clear uploaded file → Completion resets → Subsequent steps disable
- Network error during processing → User can retry same step

### Edge Cases
- User authenticated via LinkedIn → LinkedIn URL pre-populated but still needs completion
- Resume parsing fails → User must retry or paste text directly
- PDL enrichment fails → Falls back to resume data, still completes step

## Styling Details

### Step Indicator Positioning
```css
position: absolute;
left: -3rem;  /* -12 in Tailwind */
top: 1.5rem;  /* 6 in Tailwind */
```

### Connecting Line
```css
position: absolute;
left: -0.5rem;  /* -8px */
top: 3rem;     /* top-12 */
bottom: 3rem;  /* bottom-12 */
width: 0.125rem;  /* w-0.5 */
background: rgb(229 231 235);  /* gray-200 */
```

### Z-Index Layers
- Connecting line: `z-index: auto` (background)
- Step indicators: `z-index: 10` (foreground)
- Cards: `z-index: auto` (default)

## Future Enhancements

### Potential Improvements

1. **Progress Animation**
   - Animate step completion
   - Smooth unlock transitions
   - Celebratory micro-interactions

2. **Step Validation**
   - Show validation errors inline
   - Highlight missing required fields
   - Provide helpful hints

3. **Skip Option**
   - Allow skipping optional steps
   - Show trade-offs clearly
   - Enable partial completion

4. **Save Progress**
   - Auto-save on each completion
   - Resume from where user left off
   - Persist across sessions

5. **Estimated Time**
   - Show time estimate per step
   - Total remaining time
   - Adjust based on file size

## Related Files

- **Main Component**: `src/pages/NewUserOnboarding.tsx`
- **Card Component**: `src/components/onboarding/FileUploadCard.tsx`
- **Upload Hook**: `src/hooks/useFileUpload.ts`
- **PDL Service**: `src/services/peopleDataLabsService.ts`
- **OpenAI Service**: `src/services/openaiService.ts`

## Documentation

- [PDL Integration Guide](../features/PEOPLE_DATA_LABS_INTEGRATION.md)
- [File Upload Implementation](../features/FILE_UPLOAD_IMPLEMENTATION.md)
- [Environment Variables](../setup/ENVIRONMENT_VARIABLES.md)

---

**Implementation Team:** AI Assistant  
**Review Status:** Ready for QA  
**Deployment:** Ready for production
