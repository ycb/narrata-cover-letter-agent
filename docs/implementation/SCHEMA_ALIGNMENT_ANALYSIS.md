# Schema Alignment Analysis: Why Fields Are Being Stripped

## The Problem

There's a **fundamental mismatch** between:
1. **What the LLM prompt asks for** (rich schema with roleMetrics, stories, etc.)
2. **What TypeScript types define** (simplified schema missing these fields)
3. **What gets stored in database** (only typed fields survive)

## Current Data Flow

```
LLM Response (JSON)
  ↓
parseStructuredData() → StructuredResumeData (STRIPS fields)
  ↓
Database: sources.structured_data
  ↓
UI reads from structured_data (missing fields!)
```

## Schema Comparison

### LLM Prompt Schema (What We Ask For)
```json
{
  "location": "City, State, Country",           // ✅ Top-level
  "contactInfo": { "email", "phone", ... },     // ✅ Updated (no location)
  "workHistory": [{
    "title": "...",
    "company": "...",
    "roleMetrics": [...],                       // ❌ MISSING from type
    "stories": [...],                           // ❌ MISSING from type
    "roleTags": [...],                          // ❌ MISSING from type
    "roleSummary": "...",                       // ❌ MISSING from type
    "companyTags": [...],                       // ❌ MISSING from type
  }]
}
```

### TypeScript Type (`StructuredResumeData`)
```typescript
interface StructuredResumeData {
  workHistory: WorkExperience[];  // ❌ Only basic fields
  // Missing: location (top-level)
}

interface WorkExperience {
  id: string;
  company: string;
  title: string;
  // ❌ Missing: roleMetrics, stories, roleTags, roleSummary, companyTags
}
```

### What `parseStructuredData()` Does
```typescript
// Only extracts fields that match StructuredResumeData
// Strips: roleMetrics, stories, roleTags, roleSummary, companyTags
// Strips: top-level location
```

## Why Fields Are Stripped

1. **Type Safety**: TypeScript types define what's "allowed"
2. **Parser Logic**: `parseWorkHistory()` only extracts fields in `WorkExperience` interface
3. **Database Storage**: Only parsed/typed data gets stored (until my recent `rawData` change)

## Current Status

After recent changes:
- ✅ `rawData` now preserved in `LLMAnalysisResult`
- ✅ Database stores `rawData` if available (full LLM response)
- ⚠️ **But**: Type system still doesn't reflect the actual schema
- ⚠️ **Result**: TypeScript can't validate/enforce the richer schema

## Options for Fix

### Option 1: Update Type System (Recommended)
**Pros:**
- Type safety for all fields
- IntelliSense/autocomplete works
- Catch errors at compile time
- Aligns types with actual schema

**Cons:**
- Need to update all usages
- Potential breaking changes

**Implementation:**
```typescript
interface WorkExperience {
  // Existing fields...
  roleMetrics?: RoleMetric[];
  stories?: Story[];
  roleTags?: string[];
  roleSummary?: string;
  companyTags?: string[];
}

interface StructuredResumeData {
  // Existing fields...
  location?: string;  // Top-level
  contactInfo: ContactInfo;  // Updated (no location)
}
```

### Option 2: Store Raw LLM Response (Current Workaround)
**Pros:**
- Preserves all fields
- No type updates needed
- Flexible for schema evolution

**Cons:**
- No type safety
- UI code becomes `any` types
- Harder to maintain
- Doesn't align with product goals (type safety)

### Option 3: Hybrid Approach
**Pros:**
- Type-safe for known fields
- Flexible for future schema changes
- Best of both worlds

**Cons:**
- More complex implementation

**Implementation:**
```typescript
interface StructuredResumeData {
  // Typed fields
  workHistory: WorkExperience[];
  
  // Unknown fields preserved
  [key: string]: unknown;
}
```

## Recommendation

**Update the Type System (Option 1)** because:
1. ✅ Product goal: Type-safe, maintainable code
2. ✅ Schema is stable (we've defined it in prompts)
3. ✅ UI needs these fields (already accessing them)
4. ✅ Better developer experience
5. ✅ Catches errors early

The `rawData` workaround is temporary - we should align types with reality.
