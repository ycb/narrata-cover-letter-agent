# Saved Sections Edit Modal - Implementation Instructions

## Goal
Ensure saved sections edit modals use the same pattern as role/story edit modals, including consistent tag editing functionality.

## Current State Analysis

### ✅ Role/Story Edit Modal Pattern (Reference Implementation)
**Location**: `src/components/work-history/WorkHistoryDetail.tsx`

**Pattern**:
- Inline modal (overlay with Card component)
- State management: `isEditingRole`, `editingRole`, `roleTagInput`
- Tag editor component with:
  - Input field + "Add" button
  - Existing tags displayed as badges with remove (X) buttons
  - Enter key support for adding tags
- Handlers: `handleAddRoleTag`, `handleRemoveRoleTag`
- Save/Cancel buttons

**Key Code Structure**:
```typescript
// State
const [isEditingRole, setIsEditingRole] = useState(false);
const [editingRole, setEditingRole] = useState<WorkHistoryRole | null>(null);
const [roleTagInput, setRoleTagInput] = useState('');

// Handlers
const handleEditRole = () => {
  if (selectedRole) {
    setEditingRole({ ...selectedRole, tags: selectedRole.tags || [] });
    setRoleTagInput('');
    setIsEditingRole(true);
  }
};

const handleAddRoleTag = () => {
  if (roleTagInput.trim() && editingRole && !editingRole.tags?.includes(roleTagInput.trim())) {
    setEditingRole({
      ...editingRole,
      tags: [...(editingRole.tags || []), roleTagInput.trim()]
    });
    setRoleTagInput('');
  }
};

const handleRemoveRoleTag = (tagToRemove: string) => {
  if (editingRole) {
    setEditingRole({
      ...editingRole,
      tags: (editingRole.tags || []).filter(tag => tag !== tagToRemove)
    });
  }
};

// Modal JSX
if (isEditingRole && editingRole) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Edit Role</CardTitle>
          <Button onClick={handleCancelEdit}>X</Button>
        </CardHeader>
        <CardContent>
          {/* Title, Description fields */}
          
          {/* Tags Section */}
          <div className="space-y-2">
            <Label htmlFor="roleTags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="roleTags"
                value={roleTagInput}
                onChange={(e) => setRoleTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRoleTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddRoleTag} size="sm">
                Add
              </Button>
            </div>
            
            {editingRole.tags && editingRole.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {editingRole.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveRoleTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <Button onClick={handleSaveRole}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### ❌ Current Saved Section Edit Modal
**Location**: `src/components/template-blurbs/TemplateBlurbDetail.tsx`

**Issues**:
- Uses different component structure (not inline modal pattern)
- Tag editing uses comma-separated input instead of badge-based editor
- Missing consistent tag add/remove handlers
- Different UI pattern than role/story modals

## Implementation Instructions

### Step 1: Update SavedSections.tsx to Use Inline Modal Pattern

**File**: `src/pages/SavedSections.tsx`

**Changes Needed**:

1. **Add state management** (similar to WorkHistoryDetail):
```typescript
const [isEditingSection, setIsEditingSection] = useState(false);
const [editingSection, setEditingSection] = useState<HierarchicalBlurb | null>(null);
const [sectionTagInput, setSectionTagInput] = useState('');
```

2. **Update `handleEditBlurb`**:
```typescript
const handleEditBlurb = (blurb: HierarchicalBlurb) => {
  setEditingSection({ ...blurb, tags: blurb.tags || [] });
  setSectionTagInput('');
  setIsEditingSection(true);
};
```

3. **Add tag handlers**:
```typescript
const handleAddSectionTag = () => {
  if (sectionTagInput.trim() && editingSection && !editingSection.tags?.includes(sectionTagInput.trim())) {
    setEditingSection({
      ...editingSection,
      tags: [...(editingSection.tags || []), sectionTagInput.trim()]
    });
    setSectionTagInput('');
  }
};

const handleRemoveSectionTag = (tagToRemove: string) => {
  if (editingSection) {
    setEditingSection({
      ...editingSection,
      tags: (editingSection.tags || []).filter(tag => tag !== tagToRemove)
    });
  }
};

const handleSaveSection = async () => {
  if (!editingSection || !user) return;
  
  try {
    await CoverLetterTemplateService.updateSavedSection(editingSection.id, {
      title: editingSection.title,
      content: editingSection.content,
      tags: editingSection.tags || []
    });
    
    // Update local state
    setTemplateBlurbs(prev => prev.map(blurb => 
      blurb.id === editingSection.id 
        ? { ...blurb, ...editingSection, updatedAt: new Date().toISOString() }
        : blurb
    ));
    
    setIsEditingSection(false);
    setEditingSection(null);
    setSectionTagInput('');
  } catch (error) {
    console.error('Error updating saved section:', error);
  }
};

const handleCancelEditSection = () => {
  setIsEditingSection(false);
  setEditingSection(null);
  setSectionTagInput('');
};
```

4. **Add inline edit modal** (before return statement):
```typescript
// Edit Section Modal - Check first
if (isEditingSection && editingSection) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Edit Saved Section</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancelEditSection}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="sectionTitle">Title</Label>
            <Input
              id="sectionTitle"
              value={editingSection.title}
              onChange={(e) => setEditingSection({ ...editingSection, title: e.target.value })}
            />
          </div>
          
          {/* Content */}
          <div>
            <Label htmlFor="sectionContent">Content</Label>
            <Textarea
              id="sectionContent"
              value={editingSection.content}
              onChange={(e) => setEditingSection({ ...editingSection, content: e.target.value })}
              placeholder="Enter section content..."
              rows={6}
            />
          </div>
          
          {/* Tags - MATCH ROLE/STORY PATTERN */}
          <div className="space-y-2">
            <Label htmlFor="sectionTags">Tags</Label>
            <div className="flex gap-2">
              <Input
                id="sectionTags"
                value={sectionTagInput}
                onChange={(e) => setSectionTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSectionTag();
                  }
                }}
                placeholder="Add a tag and press Enter"
              />
              <Button type="button" onClick={handleAddSectionTag} size="sm">
                Add
              </Button>
            </div>
            
            {editingSection.tags && editingSection.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {editingSection.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveSectionTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveSection} className="flex-1">
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Step 2: Update TemplateBlurbDetail.tsx (If Still Used)

**File**: `src/components/template-blurbs/TemplateBlurbDetail.tsx`

**Decision**: 
- If this component is still used elsewhere, update it to match the pattern
- If it's only used for saved sections, consider deprecating it in favor of inline modal pattern

**If updating**:
1. Replace comma-separated tag input with badge-based editor
2. Add `tagInput` state and handlers matching role/story pattern
3. Update UI to match role/story edit modal structure

### Step 3: Ensure Consistent Imports

**Required imports** for SavedSections.tsx:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { CoverLetterTemplateService } from "@/services/coverLetterTemplateService";
```

### Step 4: Update TemplateBlurbMaster.tsx

**File**: `src/components/template-blurbs/TemplateBlurbMaster.tsx`

**Ensure**:
- `onEditBlurb` callback is properly wired
- Clicking "+" badge (when no tags) opens edit modal
- Edit modal uses the new inline pattern

### Step 5: Testing Checklist

- [ ] Clicking "+" badge on saved section with no tags opens edit modal
- [ ] Edit modal shows title, content, and tags fields
- [ ] Tag input field accepts Enter key to add tags
- [ ] "Add" button adds tags
- [ ] Existing tags display as badges with X buttons
- [ ] Clicking X removes tag from list
- [ ] Save button persists changes to database
- [ ] Cancel button closes modal without saving
- [ ] Modal matches visual style of role/story edit modals
- [ ] Tags are saved to `saved_sections.tags` column

### Step 6: Database Integration

**Ensure** `CoverLetterTemplateService.updateSavedSection` accepts tags:
```typescript
static async updateSavedSection(
  sectionId: string,
  updates: Partial<SavedSection>
): Promise<SavedSection> {
  // Should include tags in updatePayload
  const updatePayload = {
    title: updates.title,
    content: updates.content,
    tags: updates.tags ?? undefined, // ✅ Already exists
    // ... other fields
  };
  // ...
}
```

## Key Differences to Address

| Aspect | Role/Story Modal | Current Saved Section | Target |
|--------|------------------|----------------------|--------|
| **Modal Type** | Inline overlay | Separate component | Inline overlay ✅ |
| **Tag Input** | Input + Add button | Comma-separated | Input + Add button ✅ |
| **Tag Display** | Badges with X | Comma-separated | Badges with X ✅ |
| **State Management** | Local state in parent | Component state | Local state in parent ✅ |
| **Enter Key** | Adds tag | N/A | Adds tag ✅ |

## Reference Files

- **Role Edit Modal**: `src/components/work-history/WorkHistoryDetail.tsx` (lines 676-774)
- **Story Edit Modal**: `src/components/work-history/WorkHistoryDetail.tsx` (lines 755-850)
- **Current Saved Section**: `src/components/template-blurbs/TemplateBlurbDetail.tsx`
- **Saved Sections Page**: `src/pages/SavedSections.tsx`

## Summary

The goal is to make saved sections edit modals **identical in structure and behavior** to role/story edit modals:
1. Use inline modal pattern (overlay with Card)
2. Use badge-based tag editor (not comma-separated)
3. Use same state management pattern
4. Use same handlers pattern
5. Match visual styling exactly

This ensures a consistent user experience across all content types.

