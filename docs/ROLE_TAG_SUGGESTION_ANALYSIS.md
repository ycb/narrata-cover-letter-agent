# Role Tag Suggestion Analysis

## Current Implementation

### Onboarding (Resume Upload)
- **Source**: Resume text parsed by `resumeAnalysis.ts` prompt
- **When**: During initial resume/LinkedIn upload
- **Content**: Full resume context, all bullets, all roles
- **Output**: 3-5 role tags per role extracted from resume
- **Purpose**: Initial extraction from uploaded documents

### Auto-Suggest Service (New)
- **Source**: Only role description
- **When**: User clicks "Auto-suggest tags" button on existing role
- **Content**: `${role.title} at ${company.name}: ${role.description}`
- **Output**: AI-generated tag suggestions based on description
- **Purpose**: Refinement/addition of tags after initial upload

## Key Difference

**Onboarding**: Extracts tags from full resume context (all bullets, all content)
**Auto-Suggest**: Only uses role description (limited context)

## Proposal: Include Stories in Role Tag Suggestions

### Current Content
```typescript
const content = `${selectedRole.title} at ${selectedCompany.name}: ${selectedRole.description || ''}`;
```

### Proposed Content
```typescript
// Include role description
let content = `${selectedRole.title} at ${selectedCompany.name}: ${selectedRole.description || ''}`;

// Include stories (up to 3-5 most recent/relevant)
if (selectedRole.blurbs && selectedRole.blurbs.length > 0) {
  const storyTexts = selectedRole.blurbs
    .slice(0, 5) // Limit to 5 stories
    .map(story => `- ${story.title}: ${story.content}`)
    .join('\n');
  content += `\n\nStories demonstrating this work:\n${storyTexts}`;
}

// Optionally include links for context
if (selectedRole.externalLinks && selectedRole.externalLinks.length > 0) {
  const linkTexts = selectedRole.externalLinks
    .slice(0, 3) // Limit to 3 links
    .map(link => `- ${link.label || link.url}`)
    .join('\n');
  content += `\n\nSupporting links:\n${linkTexts}`;
}
```

## Pros of Including Stories

1. **Substantiation**: Role-level tags should reflect demonstrated work (stories), not just job description
2. **Completeness**: Stories contain richer context about actual accomplishments
3. **Logical**: If you claim "data analytics" at role level, stories should demonstrate it
4. **Better Suggestions**: More context = more accurate tag suggestions
5. **Alignment**: Matches user's mental model - role tags summarize story-level work

## Cons of Including Stories

1. **Length**: Could make prompt very long with many stories
2. **Token Cost**: More content = more tokens = higher API cost
3. **Dilution**: If stories are very different, might suggest too broad tags
4. **Performance**: Longer content = slower API response

## Recommendations

### Option 1: Include Stories (Recommended)
- Include up to 3-5 most recent stories
- Truncate story content if too long (e.g., first 200 chars)
- Include links for additional context (up to 3)
- Add to prompt: "Role-level tags should reflect demonstrated work in stories"

### Option 2: Include Stories with Smart Selection
- Prioritize stories with metrics (more substantive)
- Prioritize recent stories
- Limit total content to ~1000 characters
- Only include if stories exist (don't break if no stories)

### Option 3: Hybrid Approach
- Use description for initial suggestions
- If user rejects/edits, offer to "re-analyze with stories" option
- Gives user control over context depth

## Implementation Suggestion

**Recommended: Option 1 with limits**

```typescript
const buildRoleContent = (role: WorkHistoryRole, company: WorkHistoryCompany) => {
  let content = `${role.title} at ${company.name}`;
  
  if (role.description) {
    content += `: ${role.description}`;
  }
  
  // Include stories (up to 5, truncated)
  if (role.blurbs && role.blurbs.length > 0) {
    const storyTexts = role.blurbs
      .slice(0, 5)
      .map(story => {
        const truncated = story.content.length > 200 
          ? story.content.substring(0, 200) + '...' 
          : story.content;
        return `- ${story.title}: ${truncated}`;
      })
      .join('\n');
    content += `\n\nDemonstrated work (stories):\n${storyTexts}`;
  }
  
  // Include links (up to 3)
  if (role.externalLinks && role.externalLinks.length > 0) {
    const linkTexts = role.externalLinks
      .slice(0, 3)
      .map(link => `- ${link.label || link.url}`)
      .join('\n');
    content += `\n\nSupporting evidence:\n${linkTexts}`;
  }
  
  return content;
};
```

## Prompt Update

Add to prompt:
```
For ROLE tags:
- Role-level tags should reflect demonstrated work and accomplishments
- Consider both the role description AND the stories/achievements
- Tags should be substantiated by the stories provided
- Focus on competencies, skills, and impact areas shown in the stories
```

