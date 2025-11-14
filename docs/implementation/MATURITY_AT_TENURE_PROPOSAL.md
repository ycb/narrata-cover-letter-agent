# Maturity at Tenure: Design Proposal

## Problem Statement

**Current Issue:**
- Company maturity is captured at the company level (current state)
- A person may have worked at a Series A startup 6 years ago, but web search shows it's now public
- Different roles value different experience types:
  - Some roles want "startup experience" (0-1 product, scrappy, fast-moving)
  - Others want "scale experience" (enterprise, process, large teams)
- The modifiers (0.8x, 1.0x, 1.2x) are fine for impact assessment, but we need tenure-specific maturity for matching

**Solution:**
- Capture maturity **at the time the user worked there** (tenure-specific)
- Store at the **work_item level** (role-level)
- Use as an **auto-tag** for job matching
- Keep company-level maturity for PM Levels impact modifiers

## Architecture

### Database Schema

```sql
-- Add maturity_at_tenure to work_items
ALTER TABLE work_items
  ADD COLUMN maturity_at_tenure TEXT CHECK (maturity_at_tenure IN ('early', 'growth', 'late'));

COMMENT ON COLUMN work_items.maturity_at_tenure IS 
  'Company maturity when user worked there (early/growth/late). Used for role matching and auto-tagging.';

CREATE INDEX idx_work_items_maturity_at_tenure 
  ON work_items(maturity_at_tenure) 
  WHERE maturity_at_tenure IS NOT NULL;
```

### Inference Logic

**Priority Order:**
1. **Explicit tags in resume/description** (e.g., "Series A startup", "early-stage", "enterprise")
2. **Date-based inference** (company founded date + user tenure dates)
3. **Company description keywords** (LLM analysis of company description)
4. **Fallback to company-level maturity** (if available and tenure is recent)

**Inference Function:**
```typescript
async function inferMaturityAtTenure(
  workItem: WorkItem,
  company: Company,
  companyDescription?: string
): Promise<'early' | 'growth' | 'late' | null> {
  // 1. Check explicit keywords in role description/tags
  const description = (workItem.description || '').toLowerCase();
  const keywords = {
    early: ['startup', 'seed', 'series a', 'early-stage', 'pre-seed', 'founding'],
    growth: ['growth-stage', 'series b', 'series c', 'scaling', 'growth'],
    late: ['enterprise', 'public', 'established', 'fortune', 'series d+', 'ipo']
  };
  
  for (const [maturity, terms] of Object.entries(keywords)) {
    if (terms.some(term => description.includes(term))) {
      return maturity as 'early' | 'growth' | 'late';
    }
  }
  
  // 2. Date-based inference (if company has founded_date)
  if (company.founded_date && workItem.start_date) {
    const founded = new Date(company.founded_date);
    const tenureStart = new Date(workItem.start_date);
    const yearsSinceFounded = (tenureStart.getTime() - founded.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    if (yearsSinceFounded < 3) return 'early';
    if (yearsSinceFounded < 10) return 'growth';
    return 'late';
  }
  
  // 3. LLM inference from company description
  if (companyDescription) {
    const inferred = await llmInferMaturity(companyDescription, workItem.start_date);
    if (inferred) return inferred;
  }
  
  // 4. Fallback: Use company-level maturity if tenure is recent (<2 years old)
  if (company.maturity && workItem.end_date) {
    const tenureEnd = new Date(workItem.end_date);
    const now = new Date();
    const yearsSinceTenure = (now.getTime() - tenureEnd.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (yearsSinceTenure < 2) {
      return company.maturity;
    }
  }
  
  return null; // Unknown
}
```

### Auto-Tagging

**Add maturity tag to work_items.tags during parsing:**

```typescript
// In fileUploadService.ts or resumeAnalysis.ts
const maturityTag = maturity_at_tenure === 'early' ? 'startup' :
                    maturity_at_tenure === 'growth' ? 'growth-stage' :
                    maturity_at_tenure === 'late' ? 'enterprise' : null;

if (maturityTag && !workItem.tags.includes(maturityTag)) {
  workItem.tags.push(maturityTag);
}
```

**Tag Values:**
- `'early'` → `'startup'` tag
- `'growth'` → `'growth-stage'` tag  
- `'late'` → `'enterprise'` tag

### Usage in Job Matching

**Job descriptions can specify:**
- "Looking for startup experience" → matches `startup` tag
- "Experience at scale preferred" → matches `enterprise` tag
- "Growth-stage company experience" → matches `growth-stage` tag

**Matching Logic:**
```typescript
function matchesMaturityRequirement(
  workItem: WorkItem,
  jobRequirement: string
): boolean {
  const requirement = jobRequirement.toLowerCase();
  const tags = workItem.tags || [];
  
  if (requirement.includes('startup') || requirement.includes('early-stage')) {
    return tags.includes('startup');
  }
  if (requirement.includes('enterprise') || requirement.includes('scale') || requirement.includes('large')) {
    return tags.includes('enterprise');
  }
  if (requirement.includes('growth')) {
    return tags.includes('growth-stage');
  }
  
  return false;
}
```

## PM Levels Integration

**Keep current modifiers for impact assessment:**
- Use `work_items.maturity_at_tenure` for evidence display
- Use `companies.maturity` (current) for impact modifiers (0.8x, 1.0x, 1.2x)
- Display both in evidence modal:
  - "Company Scale: FlowHub (Growth-stage)" ← from company.maturity
  - "Role Context: startup experience" ← from work_item.maturity_at_tenure tag

**Update Evidence Collection:**
```typescript
// In collectLevelEvidence()
const companyScale = workItems.map(wi => {
  const companyName = wi.companies.name;
  const maturityAtTenure = wi.maturity_at_tenure;
  
  if (maturityAtTenure) {
    const label = maturityAtTenure === 'early' ? 'Early-stage' :
                  maturityAtTenure === 'growth' ? 'Growth-stage' : 'Late-stage';
    return `${companyName} (${label} at tenure)`;
  }
  return companyName;
});
```

## Implementation Plan

### Phase 1: Database Schema
1. Create migration `016_add_maturity_at_tenure.sql`
2. Add column to `work_items` table
3. Add index for performance

### Phase 2: Inference Logic
1. Create `inferMaturityAtTenure()` function in `fileUploadService.ts`
2. Call during resume parsing when creating work_items
3. Add LLM prompt for company description analysis (if needed)

### Phase 3: Auto-Tagging
1. Update resume parsing to add maturity tag to `work_items.tags`
2. Ensure tag is added during onboarding flow

### Phase 4: PM Levels Integration
1. Update `collectLevelEvidence()` to use `maturity_at_tenure`
2. Update evidence modal to show tenure-specific maturity
3. Keep company-level maturity for impact modifiers

### Phase 5: Job Matching
1. Update job matching logic to consider maturity tags
2. Add maturity filters to job search UI (optional)

## Benefits

1. **Accurate Matching**: Roles can match on actual experience type (startup vs scale)
2. **Historical Accuracy**: Captures what company was like when user worked there
3. **Auto-Tagging**: Automatically tags roles for better searchability
4. **Flexible**: Can be manually overridden if inference is wrong
5. **Backward Compatible**: Existing data can be backfilled

## Open Questions

1. **Backfill Strategy**: Should we backfill existing work_items?
   - Option A: Run inference on all existing work_items
   - Option B: Only set for new work_items going forward
   - Option C: Allow manual override in UI

2. **LLM vs Heuristics**: When to use LLM vs keyword matching?
   - Start with heuristics (keywords, dates)
   - Use LLM only if heuristics fail
   - Cache LLM results

3. **Manual Override**: Should users be able to edit `maturity_at_tenure`?
   - Yes, in Work History UI
   - Show confidence indicator (inferred vs manual)

## Next Steps

1. Review and approve design
2. Create migration
3. Implement inference logic
4. Test with P1 synthetic data
5. Deploy and backfill (if approved)

