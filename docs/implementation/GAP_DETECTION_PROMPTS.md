# Gap Detection Prompts & Logic

This document outlines all prompts and logic used for gap detection across different content types.

## Gap Detection Types

### 1. **Role Description Gaps** (`work_item` entity)
**Gap Categories:**
- `missing_role_description` - High severity
- `role_description_needs_specifics` - Medium/High severity (content standards heuristic)

**Detection Logic:**

#### Missing Description Check
```typescript
if (!description || description.trim().length === 0) {
  // Creates gap: missing_role_description
  severity: 'high'
  description: 'Missing role description'
}
```

#### Content Standards Check (Heuristic)
**Legacy prompt (disabled for beta):**
```
Analyze this professional story/description and determine if it's too generic or lacks specific details.

Story:
"{content}"

Evaluate if this content:
1. Contains specific details (technologies, processes, methodologies, numbers)
2. Uses measurable outcomes (metrics, percentages, dollar amounts, timeframes)
3. Avoids vague language like "worked on", "contributed to", "helped with" without specifics
4. Demonstrates clear impact and outcomes

Respond in JSON format:
{
  "isGeneric": boolean,
  "reasoning": "brief explanation",
  "confidence": number (0-1)
}

If the content is specific, has metrics, and demonstrates clear impact, set isGeneric to false.
```

**Fallback Heuristic** (if API unavailable):
```typescript
Generic patterns: /worked on|contributed to|helped with|assisted in|participated in|was involved in/i
Has numbers: /\d+/
Has specifics: /(api|sdk|framework|library|tool|platform|system)/i

isGeneric = hasGenericPattern && (!hasNumbers && !hasSpecifics)
```

---

### 2. **Role Metrics Gaps** (`work_item` entity)
**Gap Categories:**
- `missing_role_metrics` - Medium severity
- `insufficient_role_metrics` - Low severity

**Detection Logic (No LLM Prompt - Rule-Based):**

```typescript
// Count valid metrics (with value)
validMetrics = roleMetrics.filter(m => m?.value && m.value.trim())
metricCount = validMetrics.length

// Missing metrics
if (metricCount === 0) {
  gap_category: 'missing_role_metrics'
  severity: 'medium'
  description: 'No role-level metrics'
}

// Insufficient metrics (only if role has stories or significant tenure ≥ 1 year)
if (metricCount < 3 && (storyCount > 0 || tenure >= 12 months)) {
  gap_category: 'insufficient_role_metrics'
  severity: 'low'
  description: 'Few role-level metrics'
}
```

---

### 3. **Story Completeness Gaps** (`approved_content` entity)
**Gap Categories:**
- `incomplete_story` - High severity

**Detection Logic (Regex-Based, No LLM Prompt):**

```typescript
// STAR Format Check
hasSituation = /(situation|context|challenge|problem|opportunity)/i
hasTask = /(task|goal|objective|mission|purpose)/i
hasAction = /(action|implemented|developed|created|built|designed|launched)/i
hasResult = /(result|outcome|impact|improved|increased|decreased|achieved)/i
hasSTAR = hasSituation && hasTask && hasAction && hasResult

// Accomplished Format Check
hasAccomplishedFormat = /accomplished\s+[^,]+\s+as\s+measured\s+by\s+[^,]+\s*,\s*by\s+doing/i

// Missing Components
if (!hasMetrics) missingComponents.push('metric')
if (!hasSTAR && !hasAccomplishedFormat) {
  missingComponents.push('narrative structure (STAR format or Accomplished format)')
}

// Creates separate gaps for each missing component:
// - "Missing narrative structure (STAR)" if narrative missing
// - "No quantified metrics" if metrics missing (may duplicate with missing_metrics gap)
```

---

### 4. **Story Missing Metrics Gaps** (`approved_content` entity)
**Gap Categories:**
- `missing_metrics` - Medium severity

**Detection Logic (Simple Boolean, No LLM Prompt):**

```typescript
hasMetrics = story.metrics && story.metrics.length > 0

if (!hasMetrics) {
  gap_category: 'missing_metrics'
  severity: 'medium'
  description: 'No quantified metrics'
}

// Note: Only creates gap if not already detected by completeness check
```

---

### 5. **Story Generic Content Gaps** (`approved_content` entity)
**Gap Categories:**
- `story_needs_specifics` - Medium/High severity (content standards heuristic)

**Detection Logic (Heuristic):**

**Same Prompt as Role Description:**
```
Analyze this professional story/description and determine if it's too generic or lacks specific details.

Story:
"{content}"

Evaluate if this content:
1. Contains specific details (technologies, processes, methodologies, numbers)
2. Uses measurable outcomes (metrics, percentages, dollar amounts, timeframes)
3. Avoids vague language like "worked on", "contributed to", "helped with" without specifics
4. Demonstrates clear impact and outcomes

Respond in JSON format:
{
  "isGeneric": boolean,
  "reasoning": "brief explanation",
  "confidence": number (0-1)
}

If the content is specific, has metrics, and demonstrates clear impact, set isGeneric to false.
```

**Fallback Heuristic:** Same as role description

---

## Implementation Details

### Role Metrics Gap Detection
```typescript
// Valid metrics count
validMetrics = roleMetrics?.filter(m => m?.value && m.value.trim()) || []
metricCount = validMetrics.length

// Missing metrics (metricCount === 0)
gap_category: 'missing_role_metrics'
severity: 'medium'
description: 'No role-level metrics'

// Insufficient metrics (metricCount < 3 AND (storyCount > 0 OR tenure >= 12 months))
gap_category: 'insufficient_role_metrics'
severity: 'low'
description: 'Few role-level metrics'
```

### Story Completeness Gap Detection
```typescript
// Creates TWO separate gaps if both are missing:
// 1. Missing narrative structure
if (!hasSTAR && !hasAccomplishedFormat) {
  gap_category: 'incomplete_story'
  severity: 'high'
  description: 'Missing narrative structure (STAR)'
}

// 2. Missing metrics (if not already detected)
if (!hasMetrics) {
  gap_category: 'missing_metrics'
  severity: 'medium'
  description: 'No quantified metrics'
}
```

### Content Standards Detection Severity
```typescript
// Severity based on heuristic confidence score
severity = genericGap.confidence > 0.8 ? 'high' : 'medium'
```

## Summary

| Gap Type | Entity | Categories | Detection Method | LLM Prompt? |
|----------|--------|------------|------------------|-------------|
| Role Description | `work_item` | `missing_role_description`, `role_description_needs_specifics` | Boolean + heuristic | ❌ No |
| Role Metrics | `work_item` | `missing_role_metrics`, `insufficient_role_metrics` | Rule-based counting | ❌ No |
| Story Completeness | `approved_content` | `incomplete_story` | Regex pattern matching | ❌ No |
| Story Missing Metrics | `approved_content` | `missing_metrics` | Boolean check | ❌ No |
| Story Needs Specifics | `approved_content` | `story_needs_specifics` | Heuristic | ❌ No |

## LLM Configuration (Internal / Future)

LLM-as-judge for content standards is intentionally disabled for beta user-facing gaps.

---

### 6. **Cover Letter Section Gaps** (`saved_section` entity)
**Gap Categories:**
- `saved_section_needs_specifics` - Medium/High severity (content standards heuristic)
- `incomplete_intro` - Medium severity
- `incomplete_cover_letter_section` - High severity
- `missing_metrics_cover_letter` - Medium severity
- `incomplete_signature` - Low severity

**Detection Logic:**

#### Content Standards Check (Heuristic)
**Same Prompt as Stories/Role Descriptions:**
```
Analyze this professional story/description and determine if it's too generic or lacks specific details.

Story:
"{content}"

Evaluate if this content:
1. Contains specific details (technologies, processes, methodologies, numbers)
2. Uses measurable outcomes (metrics, percentages, dollar amounts, timeframes)
3. Avoids vague language like "worked on", "contributed to", "helped with" without specifics
4. Demonstrates clear impact and outcomes

Respond in JSON format:
{
  "isGeneric": boolean,
  "reasoning": "brief explanation",
  "confidence": number (0-1)
}
```

#### Intro Section Check (Rule-Based)
```typescript
// Intro should mention company and role
hasCompanyMention = /\[Company\]|company|organization|your team/i.test(content)
hasRoleMention = /\[Position\]|role|position|opportunity/i.test(content)

if (!hasCompanyMention || !hasRoleMention) {
  gap_category: 'incomplete_intro'
  severity: 'medium'
  description: 'Introduction should mention the company and role specifically'
}
```

#### Body/Closing Section Check (Rule-Based)
```typescript
// Check for STAR format (reuse story completeness check)
completenessGap = checkStoryCompleteness(section)

if (missing narrative structure) {
  gap_category: 'incomplete_cover_letter_section'
  severity: 'high'
  description: 'Section should use STAR format to demonstrate impact'
}

// Check for metrics
hasMetrics = /\d+%|\d+\$|\d+\s*(users|customers|revenue|growth)/i.test(content)

if (!hasMetrics) {
  gap_category: 'missing_metrics_cover_letter'
  severity: 'medium'
  description: 'Section would benefit from quantifiable achievements'
}
```

#### Signature Section Check (Rule-Based)
```typescript
hasContactInfo = /\[Your Name\]|\[Your Email\]|email|phone|contact/i.test(content)

if (!hasContactInfo) {
  gap_category: 'incomplete_signature'
  severity: 'low'
  description: 'Signature should include contact information'
}
```

---

## Summary

| Gap Type | Entity | Categories | Detection Method | LLM Prompt? |
|----------|--------|------------|------------------|-------------|
| Role Description | `work_item` | `missing_role_description`, `role_description_needs_specifics` | Boolean + heuristic | ❌ No |
| Role Metrics | `work_item` | `missing_role_metrics`, `insufficient_role_metrics` | Rule-based counting | ❌ No |
| Story Completeness | `approved_content` | `incomplete_story` | Regex pattern matching | ❌ No |
| Story Missing Metrics | `approved_content` | `missing_metrics` | Boolean check | ❌ No |
| Story Needs Specifics | `approved_content` | `story_needs_specifics` | Heuristic | ❌ No |
| Cover Letter Section | `saved_section` | `saved_section_needs_specifics`, `incomplete_intro`, `incomplete_cover_letter_section`, `missing_metrics_cover_letter`, `incomplete_signature` | Heuristic + Rule-based | ❌ No |

## Notes

- “Needs specifics” checks are treated as content standards (heuristic) for beta user-facing gaps
- All other gap detection uses rule-based logic (regex, boolean checks, counting)
- Gaps are deduplicated by `entity_type:entity_id:gap_category` before saving to database
- **Cover Letter Best Practices**: Current prompt guidance is sufficient - covers generic content, STAR format, and metrics. Section-specific checks (intro, signature) are rule-based.
