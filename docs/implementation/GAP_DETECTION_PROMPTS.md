# Gap Detection Prompts & Logic

This document outlines all prompts and logic used for gap detection across different content types.

## Gap Detection Types

### 1. **Role Description Gaps** (`work_item` entity)
**Gap Categories:**
- `missing_role_description` - High severity
- `generic_role_description` - Medium/High severity (LLM-as-judge)

**Detection Logic:**

#### Missing Description Check
```typescript
if (!description || description.trim().length === 0) {
  // Creates gap: missing_role_description
  severity: 'high'
  description: 'Missing role description'
}
```

#### Generic Description Check (LLM-as-judge)
**Prompt Used:**
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
- `too_generic` - Medium/High severity

**Detection Logic (LLM-as-judge):**

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

### Generic Content Detection Severity
```typescript
// Severity based on LLM confidence score
severity = genericGap.confidence > 0.8 ? 'high' : 'medium'
```

## Summary

| Gap Type | Entity | Categories | Detection Method | LLM Prompt? |
|----------|--------|------------|------------------|-------------|
| Role Description | `work_item` | `missing_role_description`, `generic_role_description` | Boolean + LLM-as-judge | ✅ Yes (generic check) |
| Role Metrics | `work_item` | `missing_role_metrics`, `insufficient_role_metrics` | Rule-based counting | ❌ No |
| Story Completeness | `approved_content` | `incomplete_story` | Regex pattern matching | ❌ No |
| Story Missing Metrics | `approved_content` | `missing_metrics` | Boolean check | ❌ No |
| Story Generic | `approved_content` | `too_generic` | LLM-as-judge | ✅ Yes |

## LLM Configuration

**Model:** `gpt-4o-mini`  
**Temperature:** `0.3`  
**Max Tokens:** `200`  
**Response Format:** `JSON object`  
**API Endpoint:** `https://api.openai.com/v1/chat/completions`

## Notes

- **Generic Content Check** is the only LLM-based prompt and is reused for both role descriptions and stories
- All other gap detection uses rule-based logic (regex, boolean checks, counting)
- Fallback heuristics are used when OpenAI API is unavailable
- Gaps are deduplicated by `entity_type:entity_id:gap_category` before saving to database

