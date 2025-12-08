# Cover Letter Slowness: Root Cause Analysis

## **THE PROBLEM**

**Current Performance**: 65s (from evals dashboard)  
**Baseline (main)**: 10-18s  
**Regression**: **6x slower** than baseline

---

## **ROOT CAUSE**

### **1. MASSIVE PROMPT COMPLEXITY**

**Evidence**: `src/prompts/coverLetterAnalysis.ts` (176 lines)

The CL prompt extracts:
1. ✅ Template structure (paragraph-level)
2. ✅ **STORIES** in full STAR format
3. ✅ Role-level metrics 
4. ✅ Profile data (goals, voice, preferences)
5. ✅ Skills deduplication
6. ✅ **Evidence tracking with character spans**
7. ✅ Template signals (tone, persona, structure)
8. ✅ Entity refs (education, company matching)

**Comparison to Resume**:
- Resume uses **3-stage split** for performance:
  * Stage 1: Work history skeleton (5-8s)
  * Stage 2: Stories per role (3-5s each, parallel)
  * Stage 3: Skills + education (3-5s)
- Cover letter uses **1 massive LLM call** for everything

---

### **2. TOKEN CALCULATION**

From `openaiService.ts:491-510`:

```typescript
private calculateOptimalTokens(extractedText: string, type: FileType): number {
  const contentTokens = Math.ceil(extractedText.length / 3.5);
  const structureOverhead = type === 'resume' ? 1200 : 800;
  const complexityMultiplier = this.analyzeContentComplexity(extractedText);
  const typeMultiplier = this.getTypeMultiplier(type);
  
  const baseOutputTokens = Math.ceil(contentTokens * complexityMultiplier * typeMultiplier);
  
  const safetyBuffer = 3.0; // 200% safety buffer
  const fixedOverhead = 1500; // Large fixed overhead for comprehensive story extraction
  const optimalTokens = Math.ceil((baseOutputTokens + structureOverhead) * safetyBuffer + fixedOverhead);
  ...
}
```

**Result**: CL gets allocated **HUGE** token budget due to:
- 3.0x safety buffer (200%)
- 1500 fixed overhead
- Story extraction complexity

**More tokens = slower LLM response time**

---

### **3. NO STAGED ANALYSIS**

Resume (fast):
```typescript
// Stage 1: Skeleton (5-8s)
await analyzeWorkHistorySkeleton(text);
// Stage 2: Stories per role (parallel, 3-5s each)
await Promise.all(roles.map(role => analyzeRoleStories(role)));
// Stage 3: Skills (3-5s)
await analyzeSkillsAndEducation(text);
```

Cover Letter (slow):
```typescript
// Everything in one call (65s!)
await analyzeCoverLetter(text);
```

**Why this matters**:
- Smaller prompts = faster responses
- Parallel processing = perceived speed
- Progress events = better UX

---

## **WHY 65s SPECIFICALLY?**

**Hypothesis**: 
1. Token budget calculation: ~8,000-12,000 tokens allocated
2. LLM generation time: ~6-8 tokens/second at that scale
3. Math: 10,000 tokens ÷ 7 tokens/sec = **~23s** for generation
4. Plus: Network latency, prompt processing, JSON parsing = **+42s**

**Evidence needed**: Check actual `optimalTokens` value in console logs

---

## **COMPARISON TO MAIN**

**Main branch** (10-18s):
- Likely uses simpler CL prompt
- Or uses staged analysis
- Or allocates fewer tokens

**Current branch** (65s):
- Massive prompt (176 lines)
- Single LLM call
- Huge token allocation
- Comprehensive story extraction with evidence spans

---

## **FIX STRATEGIES**

### **Option 1: Staged CL Analysis** (Best Performance)
Split into 3 stages like resume:
1. **Stage 1**: Template structure only (5-8s)
   - Paragraph functions, purpose tags
   - Basic tone/voice signals
2. **Stage 2**: Story extraction (10-15s)
   - STAR format stories
   - Metrics, evidence
3. **Stage 3**: Profile data (3-5s)
   - Goals, preferences, voice

**Total**: 18-28s (vs 65s current)  
**Complexity**: Medium (refactor prompt splitting)

---

### **Option 2: Reduce Token Budget** (Quick Win)
```typescript
// Before
const safetyBuffer = 3.0; 
const fixedOverhead = 1500;

// After
const safetyBuffer = type === 'coverLetter' ? 1.5 : 3.0; // 50% buffer for CL
const fixedOverhead = type === 'coverLetter' ? 800 : 1500;
```

**Impact**: ~30-40% faster  
**Risk**: May truncate output for long CLs  
**Complexity**: Low (one-line change)

---

### **Option 3: Simplify Prompt** (Remove Features)
Remove expensive extractions:
- ❌ Character span evidence tracking
- ❌ Template signals (use simpler heuristics)
- ❌ Entity refs (not critical for MVP)
- ✅ Keep: Stories, metrics, profile data

**Impact**: ~40-50% faster  
**Trade-off**: Less comprehensive data  
**Complexity**: Medium (prompt refactor)

---

### **Option 4: Edge Function with Streaming** (Best UX)
Move to Edge function with:
- Real-time streaming progress (feels instant)
- Backend processing (non-blocking)
- Same comprehensive analysis
- Better error handling

**Impact**: Perceived 10-15s (actual 50-60s backend)  
**Complexity**: High (already attempted, had bugs)

---

## **RECOMMENDED ACTION**

### **Immediate (Today)**:
1. ✅ **Reduce token budget** (Option 2) - Quick win, 30% faster
2. ✅ **Add progress event at 50%** - Better UX during wait

### **Next Sprint**:
3. **Implement staged CL analysis** (Option 1) - Get to baseline perf
4. **Test with actual CLs** - Verify data quality maintained

### **Future**:
5. **Move to Edge function** - Once proven client-side logic works

---

## **VALIDATION CHECKLIST**

Before deploying fixes:
- [ ] Console log shows `optimalTokens` value
- [ ] Compare token counts: main vs current
- [ ] Test with short CL (200 words)
- [ ] Test with long CL (500 words)
- [ ] Verify data quality (stories, metrics extracted correctly)
- [ ] Check evaluation_runs for latency improvement

---

## **QUESTIONS FOR USER**

1. **Is comprehensive story extraction worth 6x slowdown?**
   - Current: Full STAR + evidence spans + all metadata
   - Alternative: Simpler extraction, faster processing

2. **Can we defer some extractions to post-processing?**
   - Template signals → Calculate client-side
   - Evidence spans → Generate on-demand

3. **Should CL upload feel instant (Edge function) or show progress?**
   - Instant: Streaming, non-blocking (complex)
   - Progress: Client-side with events (simple, current)

---

## **NEXT STEPS**

1. Check console logs for actual `optimalTokens` value during CL upload
2. Compare to resume `optimalTokens` value
3. Implement Option 2 (reduce token budget) as quick win
4. Plan Option 1 (staged analysis) for next iteration

