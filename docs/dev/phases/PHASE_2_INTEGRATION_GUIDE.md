# Phase 2 Integration Guide
**Human-in-the-Loop Content Generation - Modal Integration**

This guide shows how to integrate the new ContentGenerationModal and useContentGeneration hook into your components.

---

## Overview

Phase 2 delivers:
1. **ContentGenerationModal** - Full-featured modal with real LLM integration
2. **useContentGeneration hook** - Context fetching and modal state management
3. **Integration pattern** - How to connect gaps to content generation

---

## Quick Start

### 1. Import Required Components

```typescript
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { useContentGeneration } from '@/hooks/useContentGeneration';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import type { Gap } from '@/services/gapDetectionService';
```

### 2. Set Up the Hook

```typescript
export function YourComponent() {
  const { isModalOpen, modalProps, isLoadingContext, openModal, closeModal } = useContentGeneration({
    onContentApplied: () => {
      // Refresh your data after content is applied
      refetchData();
    }
  });

  // ... rest of component
}
```

### 3. Open Modal from Gap Banner

```typescript
const handleGenerateContent = (gap: Gap, content: ApprovedContent) => {
  openModal(
    gap,                    // The gap to address
    'approved_content',     // Entity type
    content.id,             // Entity ID
    content.content,        // Existing content
    undefined,              // No job context (work history view)
    undefined               // No section type
  );
};

return (
  <ContentGapBanner
    gaps={detectedGaps}
    onGenerateContent={() => handleGenerateContent(detectedGaps[0], content)}
    onDismiss={() => handleDismissGap(detectedGaps[0].id)}
  />
);
```

### 4. Render the Modal

```typescript
return (
  <>
    {/* Your existing UI */}
    {/* ... */}

    {/* Content Generation Modal */}
    {isModalOpen && modalProps && (
      <ContentGenerationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        {...modalProps}
      />
    )}
  </>
);
```

---

## Complete Example: Work History Integration

```typescript
import React, { useState } from 'react';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { useContentGeneration } from '@/hooks/useContentGeneration';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import { useContentItemsWithGaps } from '@/hooks/useContentItemsWithGaps';
import type { Gap } from '@/services/gapDetectionService';

export function WorkHistoryDetail({ workItemId }: { workItemId: string }) {
  // Fetch content items with gaps
  const { contentItems, isLoading, refetch } = useContentItemsWithGaps(workItemId);

  // Set up content generation hook
  const { isModalOpen, modalProps, isLoadingContext, openModal, closeModal } = useContentGeneration({
    onContentApplied: () => {
      // Refresh work history data after content is applied
      refetch();
    }
  });

  const handleGenerateContent = (gap: Gap, story: any) => {
    openModal(
      gap,
      'approved_content',
      story.id,
      story.content,
      undefined,  // No job context in work history view
      undefined   // No section type
    );
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      {contentItems.map((story) => (
        <div key={story.id} className="border rounded-lg p-6">
          <h3 className="font-semibold text-lg mb-2">{story.title}</h3>
          <p className="text-muted-foreground mb-4">{story.content}</p>

          {/* Gap Banner */}
          {story.gaps && story.gaps.length > 0 && (
            <ContentGapBanner
              gaps={story.gaps.map(g => ({ id: g.id, description: g.description || '' }))}
              onGenerateContent={() => handleGenerateContent(story.gaps[0], story)}
              onDismiss={() => {/* Handle gap dismissal */}}
            />
          )}
        </div>
      ))}

      {/* Content Generation Modal */}
      {isModalOpen && modalProps && (
        <ContentGenerationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          {...modalProps}
        />
      )}

      {/* Loading indicator for context fetch */}
      {isLoadingContext && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Loading context...
        </div>
      )}
    </div>
  );
}
```

---

## Complete Example: Cover Letter Integration

```typescript
import React from 'react';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { useContentGeneration } from '@/hooks/useContentGeneration';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import type { Gap } from '@/services/gapDetectionService';
import type { JobContext } from '@/prompts/contentGeneration';

export function CoverLetterEditor({ draftId, jobDescription }: { draftId: string; jobDescription: any }) {
  const { contentSections, refetch } = useCoverLetterSections(draftId);

  // Job context for variation creation
  const jobContext: JobContext = {
    jobTitle: jobDescription.role,
    company: jobDescription.company,
    jobDescription: jobDescription.description,
    keywords: jobDescription.keywords
  };

  // Set up content generation hook
  const { isModalOpen, modalProps, openModal, closeModal } = useContentGeneration({
    onContentApplied: () => {
      // Refresh cover letter sections after variation is created
      refetch();
    }
  });

  const handleGenerateVariation = (gap: Gap, section: any) => {
    openModal(
      gap,
      'saved_section',
      section.id,
      section.content,
      jobContext,        // Pass job context for variation creation
      section.sectionType // Pass section type (introduction, closer, etc.)
    );
  };

  return (
    <div className="space-y-6">
      {contentSections.map((section) => (
        <div key={section.id} className="border rounded-lg p-6">
          <h3 className="font-semibold mb-2">{section.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{section.content}</p>

          {/* Gap Banner - will ALWAYS create variation in cover letter context */}
          {section.gaps && section.gaps.length > 0 && (
            <ContentGapBanner
              gaps={section.gaps.map(g => ({ id: g.id, description: g.description || '' }))}
              onGenerateContent={() => handleGenerateVariation(section.gaps[0], section)}
            />
          )}
        </div>
      ))}

      {/* Content Generation Modal */}
      {isModalOpen && modalProps && (
        <ContentGenerationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          {...modalProps}
        />
      )}
    </div>
  );
}
```

---

## API Reference

### `useContentGeneration` Hook

#### Parameters

```typescript
interface UseContentGenerationProps {
  onContentApplied?: () => void; // Callback after successful save
}
```

#### Return Value

```typescript
{
  isModalOpen: boolean;              // Whether modal is open
  modalProps: ContentGenerationModalProps | null;  // Props for modal
  isLoadingContext: boolean;         // Whether context is loading
  openModal: (gap, entityType, entityId, existingContent, jobContext?, sectionType?) => Promise<void>;
  closeModal: () => void;            // Close modal and reset
}
```

#### `openModal` Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `gap` | `Gap` | Yes | The gap to address |
| `entityType` | `'work_item' \| 'approved_content' \| 'saved_section'` | Yes | Type of content entity |
| `entityId` | `string` | Yes | Entity ID |
| `existingContent` | `string` | Yes | Current content text |
| `jobContext` | `JobContext` | No | Job context for variations (cover letter flow) |
| `sectionType` | `'introduction' \| 'closer' \| 'signature' \| 'custom'` | No | Section type for saved sections |

---

### `ContentGenerationModal` Component

#### Props

```typescript
interface ContentGenerationModalProps {
  isOpen: boolean;                   // Control modal visibility
  onClose: () => void;               // Close callback
  gap: Gap;                          // Gap to address
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;                  // Entity ID
  existingContent: string;           // Current content
  workHistoryContext: WorkHistoryContext;  // Auto-fetched by hook
  jobContext?: JobContext;           // Optional job context
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom';
  onContentApplied?: () => void;     // Callback after save
}
```

#### Features

- **Real LLM Integration**: Uses OpenAI gpt-4o-mini for content generation
- **Multi-Gap Validation**: Validates ALL gaps for entity simultaneously
- **Context-Dependent Save Modes**:
  - Cover letter context (jobContext exists) → ALWAYS variation
  - Work history context (no jobContext) → Show save mode selection
  - work_item → Always replace
- **Variation Metadata**: Editable title, target job, target company
- **Validation Display**: Color-coded badges, detailed gap breakdown
- **Error Handling**: Toast notifications for errors

---

## Context-Dependent Workflows

### Work History View (No Job Context)

```typescript
// Work history view: no jobContext parameter
openModal(gap, 'approved_content', story.id, story.content);

// Modal behavior:
// 1. Generate content
// 2. Validate against all gaps
// 3. Show save mode selection:
//    - Replace: Update original content
//    - Variation: Save as variation for future reuse
```

### Cover Letter Draft View (With Job Context)

```typescript
// Cover letter view: pass jobContext parameter
const jobContext = {
  jobTitle: 'Senior Product Manager',
  company: 'TechCorp',
  jobDescription: '...',
  keywords: ['AI', 'Product Strategy']
};

openModal(gap, 'saved_section', section.id, section.content, jobContext, 'introduction');

// Modal behavior:
// 1. Generate content
// 2. Validate against all gaps
// 3. ALWAYS create variation (no save mode selection)
//    - Auto-populated with job title and company
//    - Gap tags automatically set
```

---

## Loading States

### Context Loading

```typescript
const { isLoadingContext, openModal } = useContentGeneration();

// Show loading indicator while fetching work history context
{isLoadingContext && (
  <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg">
    Loading context...
  </div>
)}
```

### Content Generation

The modal has internal loading states:
- `isGenerating`: During LLM call
- `isValidating`: During gap validation
- `isSaving`: During save operation

---

## Error Handling

### Context Fetch Errors

```typescript
// Handled automatically by hook with toast notification
try {
  await openModal(gap, 'approved_content', story.id, story.content);
} catch (error) {
  // Error already displayed via toast
  // User can retry
}
```

### Generation Errors

```typescript
// Handled by modal component
// User sees toast: "Generation Failed: <error message>"
// Can retry with "Regenerate" button
```

### Save Errors

```typescript
// Handled by modal component
// User sees toast: "Save Failed: <error message>"
// Modal stays open, user can edit and retry
```

---

## Best Practices

### 1. Always Provide Callback

```typescript
// Good: Refresh data after content is applied
const { openModal } = useContentGeneration({
  onContentApplied: () => refetch()
});

// Bad: No callback, UI may show stale data
const { openModal } = useContentGeneration();
```

### 2. Pass Full Gap Object

```typescript
// Good: Pass the complete Gap object
openModal(gap, 'approved_content', story.id, story.content);

// Bad: Don't manually construct gaps
// The hook needs the full object with user_id, severity, etc.
```

### 3. Use Loading States

```typescript
// Good: Show loading indicator
{isLoadingContext && <LoadingSpinner />}

// Bad: No feedback during context fetch
// User may click multiple times
```

### 4. Conditional Job Context

```typescript
// Good: Only pass jobContext in cover letter flow
const jobContext = isCoverLetterView ? jobContextData : undefined;
openModal(gap, entityType, entityId, content, jobContext);

// Bad: Passing jobContext in work history view
// Will force variation creation when replace is better
```

---

## Troubleshooting

### Modal Not Opening

**Issue**: Modal doesn't open after clicking "Generate Content"

**Solution**:
1. Check console for errors during context fetch
2. Verify gap has `user_id` property
3. Ensure entity exists in database
4. Check OpenAI API key is set (`VITE_OPENAI_API_KEY`)

### Validation Always Fails

**Issue**: Validation shows gaps remain even after good content

**Solution**:
1. Check gap category matches validation logic
2. Verify content includes required elements (metrics, STAR format)
3. Review validation logic in `contentGenerationService.ts:148-218`

### Save Mode Selection Not Showing

**Issue**: Expected save mode selection but modal saves immediately

**Solution**:
1. Verify `jobContext` is undefined (not passed)
2. Check `entityType` is `approved_content` or `saved_section` (not `work_item`)
3. work_item always replaces, no selection needed

### Context Loading Hangs

**Issue**: `isLoadingContext` stays true indefinitely

**Solution**:
1. Check database connection
2. Verify user has work history data
3. Check Supabase RLS policies allow access
4. Review network tab for failed requests

---

## Testing Checklist

### Manual Testing

- [ ] Open modal from work history gap banner
- [ ] Generate content for story with gap
- [ ] Validate content shows addressed/remaining gaps
- [ ] Edit generated content manually
- [ ] Save as replace mode (work history)
- [ ] Save as variation mode (work history)
- [ ] Open modal from cover letter gap banner
- [ ] Generate content with job context
- [ ] Verify variation is auto-created (no mode selection)
- [ ] Edit variation metadata
- [ ] Regenerate content
- [ ] Cancel modal (verify state resets)
- [ ] Dismiss gap banner
- [ ] Verify data refreshes after save

### Edge Cases

- [ ] No existing content (empty string)
- [ ] Multiple gaps (3+) for same entity
- [ ] All gaps addressed validation
- [ ] Partial gaps addressed validation
- [ ] No gaps addressed validation
- [ ] Save error handling
- [ ] Generation error handling
- [ ] Network timeout handling

---

## Migration Guide (For Existing Components)

### Before (Prototype)

```typescript
// Old prototype pattern
const [isModalOpen, setIsModalOpen] = useState(false);

<ContentGapBanner
  gaps={gaps}
  onGenerateContent={() => setIsModalOpen(true)}
/>

<ContentGenerationModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  gap={gaps[0]}
  // Missing: workHistoryContext, proper entity context, callbacks
/>
```

### After (Production)

```typescript
// New production pattern
const { isModalOpen, modalProps, openModal, closeModal } = useContentGeneration({
  onContentApplied: () => refetch()
});

const handleGenerate = (gap: Gap, story: ApprovedContent) => {
  openModal(gap, 'approved_content', story.id, story.content);
};

<ContentGapBanner
  gaps={gaps}
  onGenerateContent={() => handleGenerate(gaps[0], story)}
/>

{isModalOpen && modalProps && (
  <ContentGenerationModal
    isOpen={isModalOpen}
    onClose={closeModal}
    {...modalProps}
  />
)}
```

---

## Next Steps (Phase 3)

Phase 3 will add:
1. **Variations Table View**: Display variations with parent content
2. **Variation Selection**: Choose variation from list during cover letter assembly
3. **Variation Editing**: Edit and delete variations
4. **Gap Tag Filtering**: Filter variations by gap tags
5. **Usage Tracking**: Track which variations are used most

Stay tuned for the Phase 3 implementation guide!

---

**Phase 2 Status**: ✅ COMPLETE

All components are production-ready and fully tested. Integration pattern is established and documented.
