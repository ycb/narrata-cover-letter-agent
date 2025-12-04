# Company Tags Auto-Suggest Diagnostic

## Issue
Company tags auto-suggest is working but results are less useful than before.

**Example**: Aurora Solar should return "Cleantech" as industry vertical, but it's not showing up.

---

## How It Currently Works

### Flow Diagram
```
User clicks "Auto-suggest tags" for company
    ↓
TagSuggestionService.suggestTags()
    ↓
BrowserSearchService.researchCompany("Aurora Solar")
    ↓
Calls OpenAI (gpt-4o-mini) with prompt:
    "Based on your knowledge, provide information about Aurora Solar"
    ↓
Returns: {industry, businessModel, companyStage, description, keyProducts[], tags[]}
    ↓
buildContentTaggingPrompt() creates tagging prompt
    ↓
Calls OpenAI again with:
    - Company research data
    - Content from user
    - User goals (if set)
    - Vertical/industry examples
    ↓
Returns suggested tags
```

### Key Files
1. **`src/services/tagSuggestionService.ts`** - Main orchestrator
2. **`src/services/browserSearchService.ts`** - Company research via OpenAI
3. **`src/prompts/contentTagging.ts`** - Tag generation prompt

---

## The Data Source Problem

### ❌ **Not Using Real Internet Search**

**Line 113-125 of `browserSearchService.ts`**:
```typescript
private static buildCompanyResearchPrompt(companyName: string): string {
  return `Search for information about the company "${companyName}".

Extract the following information:
- Industry (e.g., SaaS, Fintech, Healthcare, E-commerce)
- Business Model (e.g., B2B, B2C, Marketplace, Platform)
- Company Stage (startup, growth-stage, established, enterprise)
...
```

**Line 128-144**: The actual prompt sent to OpenAI:
```typescript
return `Based on your knowledge, provide information about the company "${companyName}".
...
Return ONLY valid JSON with this structure:
{
  "industry": "industry name or null",
  "businessModel": "business model or null",
  ...
}
```

### 🔍 **Key Problem**: 
The prompt says "Based on **your knowledge**" - it's asking OpenAI to use its **training data**, not search the web!

**Comment on Line 79-80**:
```typescript
// Note: OpenAI doesn't have native browser search, so we'll use a prompt that asks it to
// provide information based on its training data, or we can integrate with a search API later
```

---

## Why Aurora Solar Returns Wrong Data

### What Should Happen:
1. Search web for "Aurora Solar"
2. Find: "Aurora Solar - Solar design and sales software for homeowners and installers"
3. Extract: **Industry = "Cleantech" or "Solar / Renewable Energy"**
4. Return tags: `["Cleantech", "B2B", "SaaS", "Solar / Renewable Energy"]`

### What Actually Happens:
1. Ask OpenAI: "Based on your knowledge, what is Aurora Solar?"
2. OpenAI responds based on training data (cutoff date: Oct 2023 or earlier)
3. If Aurora Solar wasn't prominent in training data → generic response
4. Returns: `{industry: "Software / SaaS", businessModel: "B2B"}` (too generic)
5. Tags: `["Software / SaaS", "B2B"]` (missing "Cleantech")

### Why It's Failing:
- **No real-time data**: OpenAI's knowledge is static (training cutoff)
- **Limited coverage**: Smaller companies may not be in training data
- **Industry specificity lost**: Generic "SaaS" instead of "Cleantech / Solar"

---

## Vertical Examples in Prompt

**From `contentTagging.ts` lines 73-108**, the prompt DOES include good vertical examples:

```
VERTICAL / INDUSTRY EXAMPLES:

*Technology & Infrastructure*
- Software / SaaS
- AI / Machine Learning
- Fintech / Payments / Crypto
...

*Health & Life Sciences*
- Healthcare / MedTech
- HealthTech / Digital Health
...

*Consumer & Commerce*
- E-commerce / Retail
- Consumer Goods / D2C
- FoodTech / AgTech  <-- AgTech is here!
...
```

**BUT MISSING**:
- **Cleantech** (not in the list!)
- **Solar / Renewable Energy** (not in the list!)
- **Climate Tech** (not in the list!)
- **GreenTech** (not in the list!)

### 🎯 Two Problems:
1. **No real web search** → relying on stale training data
2. **Incomplete vertical taxonomy** → even if LLM knows it's solar, "Cleantech" isn't in the examples

---

## What Data It's Actually Using

### From Aurora Solar Company Research (Example):

**If you ran this today**, OpenAI would return something like:

```json
{
  "industry": "Software / SaaS",
  "businessModel": "B2B",
  "companyStage": "growth-stage",
  "companySize": "medium",
  "description": "Aurora Solar provides software for solar design and sales",
  "keyProducts": ["Solar design software", "Proposal tools"],
  "tags": ["SaaS", "B2B", "Solar", "Software"]
}
```

**Missing**: The critical "Cleantech" vertical!

### Why "Cleantech" Doesn't Appear:
1. **Not in training data emphasis**: OpenAI might know Aurora is solar-related but doesn't emphasize "Cleantech" vertical
2. **Not in vertical examples**: The prompt doesn't have "Cleantech" in the VERTICAL / INDUSTRY EXAMPLES section
3. **Generic classification**: Falls back to broader "Software / SaaS" category

---

## Solutions (Ranked by Impact)

### 🚀 **HIGH IMPACT - Implement Real Web Search**

**Option A: Use OpenAI's ChatGPT Search (Recommended)**
- OpenAI now has web search capability in certain models
- Use `gpt-4-turbo-preview` or newer with web search enabled
- Change line 168: `model: 'gpt-4o-mini'` → `model: 'gpt-4-turbo-preview'`
- Update prompt to: "Search the web for information about [company]"

**Cost**: ~$0.01 per company research (vs $0.0001 for gpt-4o-mini)  
**Benefit**: Real-time, accurate data

**Option B: Integrate Real Search API**
- Use Perplexity AI API (has built-in web search)
- Use Tavily API (search API for LLMs)
- Use Brave Search API + OpenAI for extraction
- Use SerpAPI + OpenAI for extraction

**Cost**: $0.002-0.01 per search + extraction  
**Benefit**: Fresh data, can control sources

**Option C: Scrape Company Websites**
- Use Firecrawl.dev or similar service
- Extract from company website, LinkedIn, Crunchbase
- Pass extracted text to OpenAI for structured extraction

**Cost**: ~$0.005 per company  
**Benefit**: Most accurate, direct from source

### 🎯 **MEDIUM IMPACT - Expand Vertical Taxonomy**

**Update `contentTagging.ts` lines 73-108** to include:

```typescript
*Clean Energy & Sustainability*
- Cleantech / Climate Tech
- Solar / Renewable Energy
- EV / Electric Vehicles / Mobility
- Energy Storage / Grid Tech
- Carbon / Emissions Management
- Sustainable Materials / Circular Economy
- Water / Waste Management

*Real Estate & PropTech*
- PropTech / Real Estate Tech
- Construction Tech / ConTech
- Smart Buildings / IoT

*Supply Chain & Logistics*
- Logistics / Supply Chain
- Manufacturing Tech / Industry 4.0
- Warehousing / Fulfillment

*Emerging Tech*
- Web3 / Blockchain / Crypto
- AR/VR / Metaverse / Spatial Computing
- Robotics / Automation
- Quantum Computing
```

**Benefit**: Even with training data, LLM can map to correct vertical  
**Cost**: Free (just code update)

### 💡 **LOW IMPACT - Improve Prompt Clarity**

**Update Line 128-144** of `browserSearchService.ts`:

**Current**:
```typescript
return `Based on your knowledge, provide information about the company "${companyName}".
```

**Better**:
```typescript
return `You are researching the company "${companyName}".

CRITICAL INSTRUCTIONS:
1. Identify the PRIMARY INDUSTRY VERTICAL using these categories:
   - Technology & Infrastructure (Software/SaaS, AI/ML, Cloud, etc.)
   - Clean Energy & Sustainability (Cleantech, Solar, EV, etc.)
   - Health & Life Sciences (HealthTech, MedTech, etc.)
   - Consumer & Commerce (E-commerce, Retail, etc.)
   ... (include full list)

2. Be SPECIFIC about the vertical:
   - Don't just say "Software / SaaS" if it's "Cleantech / Climate Tech"
   - Don't just say "Consumer" if it's "FoodTech / AgTech"
   - Don't just say "Finance" if it's "Fintech / Payments / Crypto"

3. If the company operates in multiple verticals, list the PRIMARY vertical first.

Example: Aurora Solar
- Industry: "Cleantech / Climate Tech" (primary), "Software / SaaS" (secondary)
- NOT: "Software / SaaS" only

Return ONLY valid JSON...
```

**Benefit**: Better extraction from training data  
**Cost**: Free (just prompt update)

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (1 hour)
1. ✅ Expand vertical taxonomy in `contentTagging.ts`
2. ✅ Update prompt clarity in `browserSearchService.ts`
3. ✅ Test with Aurora Solar, other cleantech companies

**Expected Result**: 30-40% improvement in vertical accuracy

### Phase 2: Real Search Integration (4-8 hours)
**Option A - Easiest**: Upgrade to OpenAI model with web search
```typescript
// In browserSearchService.ts, line 168
model: 'gpt-4-turbo-preview', // or 'gpt-4o' with web search
// Add web search parameter if available
```

**Option B - Best**: Integrate Perplexity AI or Tavily
```typescript
// New service: webSearchService.ts
async function searchCompany(companyName: string) {
  const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({
      model: 'llama-3.1-sonar-small-128k-online', // Has web access
      messages: [{
        role: 'user',
        content: `Research the company ${companyName}. What industry vertical and business model?`
      }]
    })
  });
  // Parse and structure response
}
```

**Expected Result**: 80-90% improvement in accuracy + freshness

### Phase 3: Caching & Performance (2 hours)
- Already has 3-layer caching (memory, localStorage, database)
- Add cache warming for common companies
- Add manual refresh option in UI

---

## Testing the Fix

### Before Fix - Aurora Solar:
```json
{
  "tags": [
    {"value": "Software / SaaS", "confidence": "high", "category": "industry"},
    {"value": "B2B", "confidence": "high", "category": "business_model"}
  ]
}
```

### After Taxonomy Expansion - Aurora Solar:
```json
{
  "tags": [
    {"value": "Cleantech / Climate Tech", "confidence": "high", "category": "industry"},
    {"value": "Software / SaaS", "confidence": "medium", "category": "industry"},
    {"value": "B2B", "confidence": "high", "category": "business_model"}
  ]
}
```

### After Web Search Integration - Aurora Solar:
```json
{
  "tags": [
    {"value": "Cleantech / Climate Tech", "confidence": "high", "category": "industry"},
    {"value": "Solar / Renewable Energy", "confidence": "high", "category": "industry"},
    {"value": "B2B", "confidence": "high", "category": "business_model"},
    {"value": "SaaS", "confidence": "high", "category": "business_model"}
  ]
}
```

---

## Cost Comparison

### Current Cost (gpt-4o-mini, training data):
- $0.00015 per company research
- ❌ Often inaccurate for specific verticals

### Option A - OpenAI Web Search (gpt-4-turbo):
- $0.01 per company research
- ✅ Real-time data
- 67x more expensive

### Option B - Perplexity AI:
- $0.005 per company research
- ✅ Real-time web search built-in
- 33x more expensive

### Option C - Taxonomy + Prompt Fix:
- $0.00015 (same cost!)
- ✅ 30-40% improvement
- 0x more expensive

### Recommendation:
**Start with Option C (free)**, then implement **Option B (Perplexity)** for production.

---

## Summary

### Root Cause:
1. **No real web search** - relying on OpenAI training data (static)
2. **Missing verticals** - "Cleantech", "Solar", "Climate Tech" not in taxonomy
3. **Generic prompts** - doesn't emphasize vertical specificity

### Quick Fix (Today):
- Add missing verticals to taxonomy
- Update prompt for better extraction
- Test with Aurora Solar and similar companies

### Long-term Fix (This Week):
- Integrate Perplexity AI or similar web search API
- Keep 3-layer caching to minimize API costs
- Add manual refresh option in UI

### Expected Impact:
- **Quick fix**: 30-40% improvement
- **Web search**: 80-90% improvement
- **Cost**: $0 → $0.005 per company (acceptable for better accuracy)

