# Auto-Suggest Tags Feature - Implementation Plan

**Feature:** Auto-Suggest Tags  
**Status:** Planning  
**Date:** 2025-01-31  
**Epic:** Content Tagging & Personalization

---

## Overview

This document outlines the step-by-step implementation plan for transforming the auto-suggest tags feature from prototype to production-ready functionality.

**Related PRD:** `docs/prd/AUTO_SUGGEST_TAGS_PRD.md`

---

## Implementation Phases

### Phase 1: Core Tag Suggestion Service
**Goal:** Create unified tag suggestion service with LLM integration

**Tasks:**

#### Task 1.1: Create Tag Suggestion Service
**File:** `src/services/tagSuggestionService.ts` (new)

**Implementation:**
```typescript
import { LLMAnalysisService } from './openaiService';
import { buildContentTaggingPrompt } from '@/prompts/contentTagging';

export interface TagSuggestion {
  id: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  category?: 'industry' | 'business_model' | 'skill' | 'competency' | 'other';
}

export interface TagSuggestionRequest {
  content: string;
  contentType: 'company' | 'role' | 'saved_section';
  companyName?: string; // For company tags - enables browser search
  userGoals?: {
    industries?: string[];
    businessModels?: string[];
  };
  existingTags?: string[];
}

export class TagSuggestionService {
  private static llmService = new LLMAnalysisService(process.env.VITE_OPENAI_API_KEY || '');

  static async suggestTags(request: TagSuggestionRequest): Promise<TagSuggestion[]> {
    // 1. For company tags, research company via browser search
    let companyResearch: CompanyResearchResult | null = null;
    if (request.contentType === 'company' && request.companyName) {
      try {
        // Use minimal caching (users won't repeatedly request tags)
        companyResearch = await BrowserSearchService.researchCompany(request.companyName, false);
      } catch (error) {
        // Don't silently fail - throw error so UI can show retry option
        throw new Error(`Failed to research company: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Build prompt with user goals context and company research
    const prompt = buildContentTaggingPrompt(
      request.content,
      request.contentType,
      request.userGoals,
      companyResearch
    );

    // 3. Call LLM
    const response = await this.llmService.analyzeContent(prompt);

    // 3. Parse response JSON
    const parsed = JSON.parse(response);

    // 4. Transform to TagSuggestion format
    const suggestions: TagSuggestion[] = [];
    
    // Combine all tag categories
    const allTags = [
      ...(parsed.primaryTags || []),
      ...(parsed.industryTags || []),
      ...(parsed.skillTags || []),
      ...(parsed.roleLevelTags || []),
      ...(parsed.scopeTags || []),
      ...(parsed.contextTags || [])
    ];

    // Map to TagSuggestion with confidence
    allTags.forEach((tag: string, index: number) => {
      // Determine confidence based on:
      // - If tag matches user goals industries/businessModels → high
      // - If tag is in primaryTags → high
      // - Otherwise → medium/low based on position
      let confidence: 'high' | 'medium' | 'low' = 'medium';
      
      if (request.userGoals) {
        const tagLower = tag.toLowerCase();
        const matchesIndustry = request.userGoals.industries?.some(industry =>
          tagLower.includes(industry.toLowerCase()) || industry.toLowerCase().includes(tagLower)
        );
        const matchesBusinessModel = request.userGoals.businessModels?.some(model =>
          tagLower.includes(model.toLowerCase()) || model.toLowerCase().includes(tagLower)
        );
        
        if (matchesIndustry || matchesBusinessModel) {
          confidence = 'high';
        } else if (parsed.primaryTags?.includes(tag)) {
          confidence = 'high';
        } else if (index < 3) {
          confidence = 'medium';
        } else {
          confidence = 'low';
        }
      } else {
        confidence = index < 3 ? 'high' : index < 5 ? 'medium' : 'low';
      }

      // Determine category
      let category: TagSuggestion['category'] = 'other';
      if (parsed.industryTags?.includes(tag)) category = 'industry';
      else if (parsed.skillTags?.includes(tag)) category = 'skill';
      else if (parsed.roleLevelTags?.includes(tag)) category = 'competency';
      else if (parsed.scopeTags?.includes(tag)) category = 'competency';

      suggestions.push({
        id: `tag-${index}`,
        value: tag,
        confidence,
        category
      });
    });

    // 5. Filter out existing tags
    const filtered = suggestions.filter(s => 
      !request.existingTags?.some(existing => 
        existing.toLowerCase() === s.value.toLowerCase()
      )
    );

    // 6. Limit to top 10 suggestions
    return filtered.slice(0, 10);
  }
}
```

**Dependencies:**
- `src/prompts/contentTagging.ts` - Update prompt to prioritize user goals
- `src/services/openaiService.ts` - LLM service

**Testing:**
- Unit test with various content types
- Unit test with/without user goals
- Unit test with existing tags (should filter)

---

#### Task 1.2: Update Content Tagging Prompt
**File:** `src/prompts/contentTagging.ts` (update)

**Changes:**
1. Enhance prompt to explicitly prioritize user goal industries/business models
2. Add instruction to map industries/business models to relevant role tags
3. Improve JSON structure to include confidence indicators

**Key Updates:**
```typescript
export const buildContentTaggingPrompt = (
  content: string,
  contentType: 'company' | 'role' | 'saved_section',
  userGoals?: { industries?: string[]; businessModels?: string[] },
  companyResearch?: CompanyResearchResult | null
): string => {
  const userContext = userGoals 
    ? `\n\nUSER PREFERENCES (HIGH PRIORITY - PRIORITIZE THESE):\n- Industries of interest: ${userGoals.industries?.join(', ') || 'none'}\n- Business models of interest: ${userGoals.businessModels?.join(', ') || 'none'}\n\nCRITICAL: When suggesting tags, prioritize tags that align with these preferences. If the content relates to these industries/business models, include them as high-confidence tags in the primaryTags array. Map industries to relevant role tags (e.g., "Fintech" → "financial products", "B2B SaaS" → "enterprise", "Healthcare" → "health tech").`
    : '';

  const companyContext = companyResearch
    ? `\n\nCOMPANY RESEARCH (FROM WEB SEARCH):\n- Industry: ${companyResearch.industry || 'unknown'}\n- Business Model: ${companyResearch.businessModel || 'unknown'}\n- Company Stage: ${companyResearch.companyStage || 'unknown'}\n- Company Size: ${companyResearch.companySize || 'unknown'}\n- Description: ${companyResearch.description || 'N/A'}\n- Key Products: ${companyResearch.keyProducts?.join(', ') || 'N/A'}\n\nUse this research data to enhance tag suggestions. Prioritize tags that match the researched industry and business model.`
    : '';
  
  // ... rest of prompt with userContext and companyContext included
}
```

**Testing:**
- Verify prompt includes user context when provided
- Verify prompt includes company research when provided
- Verify prompt works without user context or company research

---

#### Task 1.3: Create Browser Search Service
**File:** `src/services/browserSearchService.ts` (new)

**Implementation:**
```typescript
import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';

export interface CompanyResearchResult {
  companyName: string;
  industry?: string;
  businessModel?: string;
  companyStage?: string; // startup, growth-stage, established, enterprise
  companySize?: string; // small, medium, large, enterprise
  description?: string;
  keyProducts?: string[];
  tags?: string[];
  source?: string; // URL or source of information
  cachedAt?: string;
}

export class BrowserSearchService {
  private static llmService = new LLMAnalysisService(process.env.VITE_OPENAI_API_KEY || '');

  /**
   * Research company using OpenAI with browser/search capability
   * Optionally caches results (minimal caching since users won't repeatedly request)
   */
  static async researchCompany(companyName: string, useCache: boolean = false): Promise<CompanyResearchResult> {
    // 1. Optionally check cache first (if useCache is true)
    if (useCache) {
      const cached = await this.getCachedResearch(companyName);
      if (cached) {
        return cached;
      }
    }

    // 2. Build prompt for OpenAI to search web and extract company info
    const searchPrompt = this.buildCompanyResearchPrompt(companyName);
    
    // 3. Call OpenAI with browser/search capability
    // Note: This assumes OpenAI API supports web search/browser capability
    // If not available, we may need to use a different approach
    const searchResults = await this.llmService.searchWeb(searchPrompt);
    
    // 4. Extract structured company information from search results
    const research = this.extractCompanyInfo(companyName, searchResults);
    
    // 5. Optionally cache results
    if (useCache) {
      await this.cacheResearch(research, companyName);
    }
    
    return research;
  }

  private static buildCompanyResearchPrompt(companyName: string): string {
    return `Search the web for information about the company "${companyName}".

Extract the following information:
- Industry (e.g., SaaS, Fintech, Healthcare, E-commerce)
- Business Model (e.g., B2B, B2C, Marketplace, Platform)
- Company Stage (startup, growth-stage, established, enterprise)
- Company Size (small, medium, large, enterprise)
- Brief description of what the company does
- Key products or services
- Relevant tags for categorization

Return the information in a structured format that can be used for tag suggestions.`;
  }

  private static async performWebSearch(query: string): Promise<string> {
    // Use OpenAI's browser/search capability if available
    // This is a placeholder - actual implementation depends on OpenAI API capabilities
    // Alternative: Use OpenAI to generate search query, then use a search API
    const prompt = `Search the web for: ${query}\n\nReturn the most relevant information found.`;
    
    // If OpenAI doesn't have native search, we might need to:
    // 1. Use OpenAI to generate search queries
    // 2. Call a search API (Tavily, Serper, etc.) with those queries
    // 3. Use OpenAI to extract structured info from search results
    
    return await this.llmService.analyzeContent(prompt);
  }

  private static extractCompanyInfo(companyName: string, searchResults: string): CompanyResearchResult {
    // Use LLM to extract structured company info from search results
    const extractionPrompt = `Extract structured company information from the following search results:

${searchResults}

Return ONLY valid JSON with this structure:
{
  "industry": "industry name or null",
  "businessModel": "business model or null",
  "companyStage": "startup|growth-stage|established|enterprise or null",
  "companySize": "small|medium|large|enterprise or null",
  "description": "brief description or null",
  "keyProducts": ["product1", "product2"] or [],
  "tags": ["tag1", "tag2"] or []
}`;

    const extracted = this.llmService.analyzeContent(extractionPrompt);
    const parsed = JSON.parse(extracted);

    return {
      companyName,
      industry: parsed.industry,
      businessModel: parsed.businessModel,
      companyStage: parsed.companyStage,
      companySize: parsed.companySize,
      description: parsed.description,
      keyProducts: parsed.keyProducts || [],
      tags: parsed.tags || []
    };
  }

  private static async getCachedResearch(companyName: string): Promise<CompanyResearchResult | null> {
    // Check cache in companies table
    const { data, error } = await supabase
      .from('companies')
      .select('research_cache, research_cached_at')
      .ilike('name', companyName)
      .single();

    if (error || !data?.research_cache) {
      return null;
    }

    try {
      const cached = typeof data.research_cache === 'string' 
        ? JSON.parse(data.research_cache)
        : data.research_cache;
      
      return {
        ...cached,
        cachedAt: data.research_cached_at
      };
    } catch (e) {
      console.error('Error parsing cached research:', e);
      return null;
    }
  }

  private static async cacheResearch(research: CompanyResearchResult, companyName: string): Promise<void> {
    // Cache in companies table
    const { error } = await supabase
      .from('companies')
      .update({
        research_cache: research,
        research_cached_at: new Date().toISOString()
      })
      .ilike('name', companyName);

    if (error) {
      console.error('Error caching company research:', error);
      // Non-blocking: don't fail if caching fails
    }
  }
}
```

**Dependencies:**
- OpenAI API (with browser/search capability or use search API integration)
- Database for optional caching (companies table)

**Database Schema:**
```sql
-- Add to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_cache JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS research_cached_at TIMESTAMP WITH TIME ZONE;
```

**Note on OpenAI Browser Search:**
- If OpenAI API doesn't have native browser/search capability, we'll need to:
  1. Use OpenAI to generate search queries
  2. Integrate with a search API (Tavily, Serper, etc.) for actual web search
  3. Use OpenAI to extract structured info from search results
- This will be determined during implementation based on available OpenAI features

**Testing:**
- Test company research with various company names
- Test optional caching (if enabled)
- Test search failure handling (show error, allow retry)
- Test extraction of structured company info from search results

---

### Phase 2: Tag Persistence Service
**Goal:** Create service to persist tags to database

**Tasks:**

#### Task 2.1: Create Tag Service
**File:** `src/services/tagService.ts` (new)

**Implementation:**
```typescript
import { supabase } from '@/lib/supabase';

export class TagService {
  /**
   * Update company tags
   */
  static async updateCompanyTags(
    companyId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    // Deduplicate and normalize tags
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('companies')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update company tags: ${error.message}`);
    }
  }

  /**
   * Update work item (role) tags
   */
  static async updateWorkItemTags(
    workItemId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('work_items')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', workItemId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update work item tags: ${error.message}`);
    }
  }

  /**
   * Update saved section tags
   */
  static async updateSavedSectionTags(
    sectionId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('saved_sections')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update saved section tags: ${error.message}`);
    }
  }
}
```

**Testing:**
- Unit test tag deduplication
- Unit test tag normalization (trim, filter empty)
- Integration test database updates
- Test error handling

---

### Phase 3: Update ContentGenerationModal
**Goal:** Enhance modal for consistent tag suggestion experience

**Tasks:**

#### Task 3.1: Update Modal Props Interface
**File:** `src/components/hil/ContentGenerationModal.tsx` (update)

**Changes:**
1. Add `contentType` prop
2. Add `entityId` prop for persistence
3. Add `existingTags` prop
4. Improve loading states
5. Add error handling

**Updated Props:**
```typescript
interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'gap-detection' | 'tag-suggestion';
  
  // Tag suggestion mode props
  content?: string;
  contentType?: 'company' | 'role' | 'saved_section';
  entityId?: string; // For persisting tags
  existingTags?: string[];
  suggestedTags?: TagSuggestion[];
  onApplyTags?: (tags: string[]) => void;
  onGenerateTags?: () => Promise<void>; // New: trigger tag generation
  
  // Gap detection mode props (existing)
  gap?: GapAnalysis | null;
  onApplyContent?: (content: string) => void;
}
```

#### Task 3.2: Enhance Modal UI
**Changes:**
1. Show existing tags in modal
2. Better loading state with spinner
3. Error state with retry button
4. Show tag categories if available
5. Improve confidence indicators

**UI Updates:**
- Display existing tags with "remove" option
- Show loading spinner during tag generation
- Show "Researching company..." status when browser search is active (for company tags)
- Show error message with retry button on failure (for both LLM and browser search failures)
- Group tags by category (if provided)
- Visual confidence indicators (✓ for high, ~ for medium, ? for low)
- Add retry button in error state to allow user to retry failed searches

**Testing:**
- Test loading states
- Test error states
- Test tag selection/deselection
- Test apply tags callback

---

### Phase 4: Integrate with Work History
**Goal:** Replace mock implementations with real service

**Tasks:**

#### Task 4.1: Update Work History Company Tags
**File:** `src/components/work-history/WorkHistoryDetail.tsx` (update)

**Changes:**
1. Replace `handleCompanyTagSuggestions` to use real service
2. Fetch user goals from `UserGoalsContext`
3. Call `TagSuggestionService.suggestTags()`
4. Persist tags via `TagService.updateCompanyTags()`
5. Refresh work history data after tag update

**Implementation:**
```typescript
import { TagSuggestionService } from '@/services/tagSuggestionService';
import { TagService } from '@/services/tagService';
import { useUserGoals } from '@/contexts/UserGoalsContext';

// In component:
const { goals } = useUserGoals();

const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);

const handleCompanyTagSuggestions = async () => {
  const content = `${selectedCompany.name}: ${selectedCompany.description || 'Company information'}`;
  
  setTagContent(content);
  setSuggestedTags([]);
  setSearchError(null);
  setIsTagModalOpen(true);
  setIsSearching(true); // Show "Researching company..." indicator
  
  try {
    const suggestions = await TagSuggestionService.suggestTags({
      content,
      contentType: 'company',
      companyName: selectedCompany.name, // Pass company name for browser search
      userGoals: goals ? {
        industries: goals.industries,
        businessModels: goals.businessModels
      } : undefined,
      existingTags: selectedCompany.tags
    });
    
    setSuggestedTags(suggestions);
    setIsSearching(false);
  } catch (error) {
    console.error('Error generating tag suggestions:', error);
    setIsSearching(false);
    setSearchError(error instanceof Error ? error.message : 'Failed to research company. Please try again.');
    // Modal will show error with retry option
  }
};

// Retry handler
const handleRetry = () => {
  handleCompanyTagSuggestions();
};

const handleApplyCompanyTags = async (selectedTags: string[]) => {
  if (!user || !selectedCompany.id) return;
  
  try {
    // Merge with existing tags
    const allTags = [...new Set([...selectedCompany.tags, ...selectedTags])];
    
    await TagService.updateCompanyTags(selectedCompany.id, allTags, user.id);
    
    // Refresh work history
    if (onRefresh) {
      onRefresh();
    }
    
    setIsTagModalOpen(false);
    setSuggestedTags([]);
  } catch (error) {
    console.error('Error updating company tags:', error);
    // Show error message
  }
};
```

**Testing:**
- Test tag suggestion generation
- Test tag persistence
- Test work history refresh
- Test error handling

#### Task 4.2: Update Work History Role Tags
**File:** `src/components/work-history/WorkHistoryDetail.tsx` (update)

**Similar changes to Task 4.1, but for role tags:**
- Use `contentType: 'role'`
- Use `TagService.updateWorkItemTags()`
- Pass role description as content

---

### Phase 5: Integrate with Saved Sections
**Goal:** Replace mock implementation with real service

**Tasks:**

#### Task 5.1: Update Saved Sections Tags
**File:** `src/pages/SavedSections.tsx` (update)

**Changes:**
1. Replace `handleTagSuggestions` to use real service
2. Fetch user goals from `UserGoalsContext`
3. Call `TagSuggestionService.suggestTags()`
4. Persist tags via `TagService.updateSavedSectionTags()`
5. Refresh saved sections data after tag update

**Implementation:**
Similar to Phase 4, but for saved sections:
- Use `contentType: 'saved_section'`
- Use `TagService.updateSavedSectionTags()`
- Pass section content

**Testing:**
- Test tag suggestion generation
- Test tag persistence
- Test saved sections refresh
- Test error handling

---

### Phase 6: Gap Detection Integration
**Goal:** Detect tag misalignment when user goals change

**Tasks:**

#### Task 6.1: Implement Tag Misalignment Gap Detection
**File:** `src/services/gapDetectionService.ts` (update)

**New Method:**
```typescript
/**
 * Detect tag misalignment gaps when user goals change
 * Compares work history tags against user's industries and business models
 */
static async detectTagMisalignmentGaps(
  userId: string,
  userGoals: { industries: string[]; businessModels: string[] }
): Promise<Gap[]> {
  const gaps: Gap[] = [];
  
  // 1. Fetch all work items for user
  const { data: workItems, error } = await supabase
    .from('work_items')
    .select('id, title, tags, company_id, companies!inner(name, tags)')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching work items for tag gap detection:', error);
    return [];
  }
  
  // 2. Check each work item for tag misalignment
  for (const workItem of workItems || []) {
    const workItemTags = workItem.tags || [];
    const companyTags = workItem.companies?.tags || [];
    const allTags = [...workItemTags, ...companyTags];
    
    if (allTags.length === 0) continue; // Skip if no tags
    
    // 3. Check industry mismatch
    const hasMatchingIndustry = allTags.some(tag => 
      userGoals.industries?.some(industry => 
        tag.toLowerCase().includes(industry.toLowerCase()) ||
        industry.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (!hasMatchingIndustry && userGoals.industries && userGoals.industries.length > 0) {
      // Determine severity based on semantic similarity
      // For now, use simple heuristic (can be enhanced with LLM)
      const severity: 'high' | 'medium' | 'low' = 'medium'; // TODO: Use LLM to assess
      
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItem.id,
        gap_type: 'role_expectation',
        gap_category: 'tag_industry_mismatch',
        severity,
        description: `Work history tagged with industries that don't match your career goals. Current tags: ${allTags.join(', ')}. Your preferred industries: ${userGoals.industries.join(', ')}.`,
        resolved: false
      });
    }
    
    // 4. Check business model mismatch
    const hasMatchingBusinessModel = allTags.some(tag => 
      userGoals.businessModels?.some(model => 
        tag.toLowerCase().includes(model.toLowerCase()) ||
        model.toLowerCase().includes(tag.toLowerCase())
      )
    );
    
    if (!hasMatchingBusinessModel && userGoals.businessModels && userGoals.businessModels.length > 0) {
      const severity: 'high' | 'medium' | 'low' = 'medium'; // TODO: Use LLM to assess
      
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItem.id,
        gap_type: 'role_expectation',
        gap_category: 'tag_business_model_mismatch',
        severity,
        description: `Work history tagged with business models that don't match your career goals. Current tags: ${allTags.join(', ')}. Your preferred business models: ${userGoals.businessModels.join(', ')}.`,
        resolved: false
      });
    }
  }
  
  // 5. Save gaps to database
  if (gaps.length > 0) {
    await this.saveGaps(gaps);
  }
  
  return gaps;
}
```

**Testing:**
- Test gap detection with various tag/goal combinations
- Test gap creation in database
- Test gap resolution
- Test with empty user goals (should not create gaps)

#### Task 6.2: Trigger Gap Detection on Goals Update
**File:** `src/contexts/UserGoalsContext.tsx` (update)

**Changes:**
1. After saving goals, check if industries or businessModels changed
2. If changed, call `GapDetectionService.detectTagMisalignmentGaps()`
3. Show notification if gaps are created

**Implementation:**
```typescript
// In setGoals method, after saving:
if (targetTitlesChanged && newGoals.targetTitles && newGoals.targetTitles.length > 0) {
  // Existing PM Levels gap re-analysis (stub)
}

// NEW: Tag misalignment gap detection
const industriesChanged = 
  goals?.industries?.join(',') !== newGoals.industries?.join(',');
const businessModelsChanged = 
  goals?.businessModels?.join(',') !== newGoals.businessModels?.join(',');

if ((industriesChanged || businessModelsChanged) && 
    (newGoals.industries?.length > 0 || newGoals.businessModels?.length > 0)) {
  try {
    const gaps = await GapDetectionService.detectTagMisalignmentGaps(
      user.id,
      {
        industries: newGoals.industries || [],
        businessModels: newGoals.businessModels || []
      }
    );
    
    if (gaps.length > 0) {
      console.log(`Created ${gaps.length} tag misalignment gaps`);
      // Optionally show notification to user
    }
  } catch (error) {
    console.error('Error detecting tag misalignment gaps:', error);
    // Non-blocking: don't fail goal save if gap detection fails
  }
}
```

**Testing:**
- Test gap detection trigger on industries change
- Test gap detection trigger on businessModels change
- Test no gaps created if goals unchanged
- Test error handling (non-blocking)

---

## Testing Strategy

### Unit Tests
1. **TagSuggestionService**
   - `suggestTags()` with various content types
   - `suggestTags()` with/without user goals
   - `suggestTags()` with existing tags (should filter)
   - Confidence level assignment logic

2. **TagService**
   - Tag deduplication
   - Tag normalization
   - Database update operations

3. **GapDetectionService**
   - `detectTagMisalignmentGaps()` logic
   - Gap creation for industry mismatch
   - Gap creation for business model mismatch
   - No gaps when tags match goals

### Integration Tests
1. **End-to-End Tag Suggestion Flow**
   - Work history company tags
   - Work history role tags
   - Saved sections tags

2. **Tag Persistence**
   - Tags persist to database
   - UI updates after tag application
   - Work history refresh after tag update

3. **Gap Detection Integration**
   - Gaps created when goals change
   - Gaps displayed in work history
   - Gaps resolved by updating tags

### Manual Testing Checklist
- [ ] Tag suggestions work for company tags
- [ ] Tag suggestions work for role tags
- [ ] Tag suggestions work for saved sections
- [ ] Tag suggestions prioritize user goals
- [ ] Tags persist to database
- [ ] UI updates after tag application
- [ ] Gap detection runs on goals update
- [ ] Gaps displayed in work history
- [ ] Error handling works (LLM failure, network failure)
- [ ] Loading states display correctly
- [ ] Modal works consistently across all contexts

---

## Rollout Plan

### Phase 1: Core Services (Week 1)
- Create `tagSuggestionService.ts`
- Create `tagService.ts`
- Update `contentTagging.ts` prompt
- Unit tests

### Phase 2: Modal Enhancement (Week 1-2)
- Update `ContentGenerationModal`
- Improve loading/error states
- Integration tests

### Phase 3: Work History Integration (Week 2)
- Update work history company tags
- Update work history role tags
- Integration tests

### Phase 4: Saved Sections Integration (Week 2)
- Update saved sections tags
- Integration tests

### Phase 5: Gap Detection (Week 3)
- Implement tag misalignment gap detection
- Trigger on goals update
- Integration tests

### Phase 6: Testing & Polish (Week 3)
- Manual testing
- Bug fixes
- Performance optimization
- Documentation

---

## Success Metrics

1. **Tag Suggestion Quality**
   - Tag suggestions include user goal industries/business models when relevant
   - Tag suggestions have appropriate confidence levels
   - Tag suggestions are relevant to content

2. **Gap Detection**
   - Gaps created when tags don't match user goals
   - Gaps resolved when tags updated
   - Gap severity reflects misalignment level

3. **User Experience**
   - Consistent modal experience across all contexts
   - Fast tag generation (< 3 seconds)
   - Clear error messages
   - Smooth tag persistence

---

## Risk Mitigation

1. **LLM Failure**
   - Fallback to keyword-based suggestions
   - Clear error messages
   - Retry mechanism

2. **Performance**
   - Debounce tag suggestion requests
   - Cache suggestions (with user goals as key)
   - Show loading states

3. **Data Consistency**
   - Validate tags before persistence
   - Handle concurrent updates
   - Rollback on error

---

## Dependencies

1. **User Goals Context** - Must be available
2. **LLM Service** - `LLMAnalysisService` or similar
3. **Database** - Supabase client
4. **Gap Detection Service** - Existing service

---

## Future Enhancements

1. Tag suggestions from job descriptions
2. Tag analytics and recommendations
3. Bulk tag operations
4. Tag categories UI
5. Tag validation against predefined list

---

## Appendix

### Related Files
- `docs/prd/AUTO_SUGGEST_TAGS_PRD.md` - Product requirements
- `src/components/hil/ContentGenerationModal.tsx` - Modal component
- `src/components/work-history/WorkHistoryDetail.tsx` - Work history integration
- `src/pages/SavedSections.tsx` - Saved sections integration
- `src/contexts/UserGoalsContext.tsx` - User goals context
- `src/services/gapDetectionService.ts` - Gap detection service
- `src/prompts/contentTagging.ts` - Tag prompt

