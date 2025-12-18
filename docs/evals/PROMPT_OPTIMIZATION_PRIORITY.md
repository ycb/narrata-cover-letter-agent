# LLM Prompt Optimization Priority List

**Generated:** 2025-12-17  
**Methodology:** Prompt length × usage frequency = optimization ROI

---

## 📊 Optimization Priority Score

**Formula:** `Priority Score = (Prompt Size × Token Cost × Usage Frequency) + UX Impact`

| Rank | Prompt | Est. Size | Frequency | Model | Priority Score | Why Optimize |
|------|--------|-----------|-----------|-------|----------------|--------------|
| 🔴 **1** | **Match Intelligence** | ~1200 tokens | High (per draft) | gpt-4o-mini | **9/10** | Large context, frequent use |
| 🔴 **2** | **Enhanced Metrics (Draft)** | ~2000 tokens | High (per draft) | gpt-4 | **9/10** | Huge prompt, expensive model |
| 🟡 **3** | **HIL Gap Resolution V2** | ~800 tokens | Very High (user-triggered) | gpt-4 | **8/10** | Expensive model, frequent HIL |
| 🟡 **4** | **Content Generation (HIL)** | ~600 tokens | High (user-triggered) | gpt-4o-mini | **7/10** | Frequent HIL use |
| 🟡 **5** | **Section Gaps** | ~900 tokens | Medium (per draft) | gpt-4o-mini | **6/10** | Part of CL pipeline |
| 🟢 **6** | **Resume Analysis (Staged)** | ~500 tokens × 3 | One-time | gpt-4o-mini | **4/10** | One-time, but 3 stages |
| 🟢 **7** | **JD Analysis** | ~400 tokens | Low (cached) | gpt-4o-mini | **3/10** | Cached aggressively |
| 🟢 **8** | **Content Standards** | ~500 tokens | Low (optional) | gpt-4o-mini | **3/10** | Optional quality check |
| 🟢 **9** | **CL Rating** | ~400 tokens | Low (optional) | gpt-4o-mini | **2/10** | Optional quality check |
| 🟢 **10** | **Tag Suggestion** | ~300 tokens | Low (occasional) | gpt-4o-mini | **2/10** | Auxiliary feature |

---

## 🔴 TIER 1: CRITICAL — OPTIMIZE IMMEDIATELY

### 1. **Match Intelligence** (`matchIntelligencePrompt`)
**File:** `src/prompts/matchIntelligence.ts`

**Current Size:** ~1200 tokens
- Job context (300 tokens)
- User goals (200 tokens)
- Work history (400 tokens)
- Stories (300 tokens)

**Usage Frequency:** **HIGH**
- Triggered: Every draft CL generation
- Estimate: 10-50x per user during active job search

**Model:** `gpt-4o-mini` ($0.15/$0.60 per 1M tokens)

**Optimization Opportunities:**
1. ✂️ **Remove redundant work history** — Already shown in stories
2. ✂️ **Summarize user goals** — Don't need full JSON, just key criteria
3. ✂️ **Compress requirements** — "5+ years PM experience" → "5y PM exp"
4. 🎯 **Separate into two calls** — Goals match + Requirements match (if needed)

**Expected Savings:** 40-50% reduction → ~600-700 tokens
**ROI:** High (frequent use, large prompt)

---

### 2. **Enhanced Metrics (Draft CL)** (`ENHANCED_METRICS_SYSTEM_PROMPT`)
**File:** `src/prompts/enhancedMetricsAnalysis.ts`

**Current Size:** ~2000 tokens
- System prompt with JSON schema (800 tokens)
- Job description + requirements (400 tokens)
- Draft content (600 tokens)
- User context (200 tokens)

**Usage Frequency:** **HIGH**
- Triggered: Every draft CL generation
- Estimate: 5-20x per user (with retries)

**Model:** `gpt-4` ($3/$15 per 1M tokens) 💰

**Optimization Opportunities:**
1. ✂️ **Simplify JSON schema** — Reduce example verbosity by 50%
2. ✂️ **Remove duplicate instructions** — System prompt repeats guidance
3. 🎯 **Split into two calls** — Basic metrics (gpt-4o-mini) + Deep analysis (gpt-4)
4. 💾 **Cache system prompt** — If API supports it

**Expected Savings:** 50% reduction → ~1000 tokens
**ROI:** **CRITICAL** (expensive model, frequent use, high token count)

---

## 🟡 TIER 2: HIGH PRIORITY — OPTIMIZE SOON

### 3. **HIL Gap Resolution V2** (`gapResolutionStreamingServiceV2`)
**File:** `src/services/gapResolutionStreamingServiceV2.ts` (inline prompt)

**Current Size:** ~800 tokens
- Gap context (200 tokens)
- Work history context (300 tokens)
- Existing content (200 tokens)
- Instructions (100 tokens)

**Usage Frequency:** **VERY HIGH**
- Triggered: User-initiated, multiple times per session
- Estimate: 20-100x per user during profile building

**Model:** `gpt-4` ($3/$15 per 1M tokens) 💰

**Optimization Opportunities:**
1. ✂️ **Compress work history** — Show only relevant roles/stories
2. ✂️ **Remove verbose instructions** — Model already knows STAR format
3. 🎯 **Use gpt-4o-mini for simple gaps** — Reserve gpt-4 for complex cases
4. 💾 **Cache work history context** — Reuse across gaps

**Expected Savings:** 30% reduction → ~560 tokens
**ROI:** High (expensive model, very frequent HIL use)

---

### 4. **Content Generation (HIL)** (`buildStoryGenerationPrompt`)
**File:** `src/prompts/contentGeneration.ts`

**Current Size:** ~600 tokens
- System prompt (150 tokens)
- Work history context (250 tokens)
- Gap description (100 tokens)
- Instructions (100 tokens)

**Usage Frequency:** **HIGH**
- Triggered: User-initiated gap resolution
- Estimate: 15-50x per user

**Model:** `gpt-4o-mini` ($0.15/$0.60 per 1M tokens)

**Optimization Opportunities:**
1. ✂️ **Remove redundant constraints** — "CRITICAL CONSTRAINTS" repeated 3x
2. ✂️ **Compress work history** — Show only metrics, not full role descriptions
3. ✂️ **Simplify STAR instructions** — Model knows STAR format

**Expected Savings:** 25% reduction → ~450 tokens
**ROI:** Medium-High (frequent HIL use, but cheaper model)

---

### 5. **Section Gaps** (`buildSectionGapsPrompt`)
**File:** `src/prompts/sectionGaps.ts`

**Current Size:** ~900 tokens
- System prompt (200 tokens)
- JD + requirements (300 tokens)
- Draft sections (300 tokens)
- Section guidance (100 tokens)

**Usage Frequency:** **MEDIUM**
- Triggered: Part of CL Phase A pipeline
- Estimate: 5-20x per user

**Model:** `gpt-4o-mini` ($0.15/$0.60 per 1M tokens)

**Optimization Opportunities:**
1. ✂️ **Compress section guidance** — Use abbreviations
2. ✂️ **Remove redundant instructions** — Trust model knowledge
3. 🎯 **Analyze sections sequentially** — May reduce context per call

**Expected Savings:** 20% reduction → ~720 tokens
**ROI:** Medium (part of pipeline, but cheaper model)

---

## 🟢 TIER 3: LOW PRIORITY — OPTIMIZE LATER

### 6-10. **Lower Priority Prompts**

These are either:
- **One-time use** (resume parsing, onboarding)
- **Cached** (JD pre-analysis)
- **Optional** (quality gates, tag suggestion)
- **Already small** (<500 tokens)

**Defer optimization** until Tiers 1-2 are complete.

---

## 💡 OPTIMIZATION TECHNIQUES

### Quick Wins (No Model Retraining)

1. **✂️ Token Compression:**
   - Remove redundant instructions
   - Use abbreviations for repeated terms
   - Compress JSON schema examples
   - Remove verbose constraints (model knows best practices)

2. **🎯 Context Pruning:**
   - Show only relevant work history (not full history)
   - Compress user goals to key criteria
   - Remove duplicate information across sections

3. **💾 Caching:**
   - Cache system prompts (if API supports)
   - Reuse work history context across HIL calls
   - Cache JD analysis aggressively

4. **🔀 Model Selection:**
   - Use gpt-4o-mini for simple tasks
   - Reserve gpt-4 for complex analysis only
   - Consider o1-mini for reasoning-heavy tasks

### Advanced Optimization (Requires Testing)

5. **🔪 Split Large Prompts:**
   - Enhanced Metrics → Basic (mini) + Deep (gpt-4)
   - Match Intelligence → Goals + Requirements (separate)

6. **📦 Batching:**
   - Batch quality gate checks
   - Analyze multiple sections together

7. **🧠 Fine-tuning:**
   - Train gpt-4o-mini on HIL patterns (long-term)

---

## 📊 Expected Impact by Tier

| Tier | Prompts | Current Avg Tokens | Optimized Avg | Savings | Frequency | Annual Cost Savings (est.) |
|------|---------|-------------------|---------------|---------|-----------|----------------------------|
| **Tier 1** | 2 | 1600 | 850 | **47%** | Very High | **$500-1000** |
| **Tier 2** | 3 | 766 | 577 | **25%** | High | **$200-400** |
| **Tier 3** | 5 | 433 | 380 | **12%** | Low | **$50-100** |

**Total Potential Savings:** **$750-1500/year** + 35% faster responses

---

## 🎯 Recommended Optimization Order

### Phase 1: Quick Wins (1-2 days)
1. Enhanced Metrics — Remove verbose JSON examples
2. Match Intelligence — Compress work history context
3. HIL Gap Resolution — Remove redundant instructions

**Expected:** 30-40% token reduction, $300-500/year savings

### Phase 2: Context Pruning (2-3 days)
4. Content Generation — Show only relevant work history
5. Section Gaps — Compress section guidance
6. All HIL prompts — Cache work history context

**Expected:** Additional 20% reduction, $200-300/year savings

### Phase 3: Advanced (5-7 days)
7. Split Enhanced Metrics into two calls
8. A/B test gpt-4o-mini for simple HIL gaps
9. Implement system prompt caching

**Expected:** Additional 15% reduction, $200-400/year savings

---

## 📝 Answers to Your Questions

### Q: Resume and CL parsing are one-time?
✅ **Yes** — Resume parsing (3 stages) is one-time per user onboarding.
- Optimization: **LOW PRIORITY** (one-time use)

### Q: HIL will be most frequent?
✅ **Yes** — HIL is user-triggered, 20-100x per user during active profile building.
- Optimization: **HIGH PRIORITY** (Tier 2)
- Focus: Gap Resolution V2 (#3) and Content Generation (#4)

### Q: PM Levels triggered by content updates?
✅ **Correct** — PM Levels re-runs on content updates.
- Frequency: High during initial setup, then stabilizes
- Current status: Already uses edge function (efficient)
- Optimization: **MEDIUM PRIORITY** (already optimized via pipeline)

### Q: Any other questions?
💬 **For you:**
1. What's your **monthly LLM budget** or target spend?
2. Are there specific **latency pain points** today?
3. Which features get the **most user engagement** (for prioritization)?
4. Do you want me to **start with Tier 1 optimization** now?

---

**End of Priority List**

