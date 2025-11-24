# Latency Reduction Strategies for Onboarding

## Current State
- **60+ seconds** for batched resume + cover letter LLM analysis
- Multiple retries due to token limit auto-healing
- Blocking UI during processing

---

## 🚀 **Immediate Wins (Low Effort, High Impact)**

### 1. **Parallel Processing Instead of Batching** ⭐⭐⭐
**Current:** Resume + Cover Letter processed together (60s)  
**Proposed:** Process in parallel (30-35s)  

**Benefits:**
- Cut latency in half
- Better error isolation
- Progressive UI updates

**Implementation:**
```typescript
// Start both analyses simultaneously
const [resumeResult, coverLetterResult] = await Promise.all([
  this.openaiService.analyzeResume(resumeText),
  this.openaiService.analyzeCoverLetter(coverLetterText)
]);
```

---

### 2. **Progressive Loading UI** ⭐⭐⭐
**Perceived latency reduction: 70%+**

Show incremental progress:
```
✓ Resume uploaded (1s)
✓ LinkedIn connected (2s)
✓ Cover letter uploaded (1s)
⏳ Extracting work history... (15s)
⏳ Finding stories & metrics... (15s)
✓ All done! (30s total)
```

**Implementation:**
- WebSocket updates from backend
- Or: Polling with progress estimates
- Show partial results as they come in

---

### 3. **Skip Cover Letter Analysis** ⭐⭐
**Latency reduction: 30-50%**

**Rationale:**
- Resume has 90%+ of the needed data
- Cover letter adds minimal unique information
- Can analyze later asynchronously

**Implementation:**
```typescript
// Option 1: Analyze resume only, skip cover letter
// Option 2: Queue cover letter for background processing
// Option 3: Analyze cover letter only if explicitly requested
```

---

### 4. **Smarter Token Limits** ⭐⭐
**Current:** Fixed token limits → multiple retries  
**Proposed:** Adaptive token allocation based on input size

```typescript
const estimatedTokens = (resumeLength + coverLetterLength) / 3.5;
const maxTokens = Math.ceil(estimatedTokens * 1.5); // 50% buffer
```

**Benefits:**
- Fewer retries
- More accurate token limits
- Faster completion

---

### 5. **Streaming Responses** ⭐⭐⭐
**Perceived latency reduction: 80%+**

Show results as they stream in:
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  stream: true,
  messages: [...]
});

for await (const chunk of stream) {
  // Update UI incrementally
  updateProgress(chunk.choices[0]?.delta);
}
```

**Benefits:**
- User sees activity immediately
- Can start showing stories as they're extracted
- Feels much faster

---

## 🔥 **Medium-Term Optimizations**

### 6. **Reduce Prompt Complexity**
**Current:** Comprehensive prompt with detailed instructions  
**Proposed:** Simplified prompt with fewer examples

**Trade-off:** Slightly lower extraction quality vs. faster response

---

### 7. **Background Processing**
**Flow:**
1. Upload files → immediate confirmation (2s)
2. Show "Processing in background..." message
3. Email/notification when complete
4. Allow user to explore app while processing

**Best for:** Non-blocking workflows

---

### 8. **Client-Side Preprocessing**
Extract basic metadata client-side:
- Dates, company names, job titles (regex)
- Show immediately while LLM refines

---

## 📊 **Impact vs. Effort Matrix**

| Strategy | Impact | Effort | Priority |
|----------|--------|--------|----------|
| **Parallel Processing** | 🔥🔥🔥 | ⚡ | **P0** |
| **Progressive UI** | 🔥🔥🔥 | ⚡⚡ | **P0** |
| **Streaming** | 🔥🔥🔥 | ⚡⚡⚡ | **P1** |
| **Skip Cover Letter** | 🔥🔥 | ⚡ | **P1** |
| **Smarter Tokens** | 🔥🔥 | ⚡⚡ | **P1** |
| **Background Processing** | 🔥 | ⚡⚡⚡ | P2 |

---

## 🎯 **Recommended Approach**

### Phase 1 (This Sprint): **"Quick Wins"**
1. ✅ **Parallel Processing** (cut 50% latency)
2. ✅ **Progressive UI** (improve perceived speed)
3. ✅ **Smarter Token Limits** (reduce retries)

**Expected Result:** 60s → **25-30s** actual, **feels like 10-15s**

### Phase 2 (Next Sprint): **"Polish"**
1. Streaming responses
2. Background processing option
3. Client-side preprocessing

**Expected Result:** 25s → **15-20s** actual, **feels instant**

---

## 🛠️ **Implementation Notes**

### Parallel Processing Code:
```typescript
async processBatchedFiles(resume, coverLetter, accessToken) {
  const startTime = performance.now();
  
  // Process in parallel instead of batched
  const results = await Promise.allSettled([
    this.processResume(resume.text, resume.sourceId, accessToken),
    this.processCoverLetter(coverLetter.text, coverLetter.sourceId, accessToken)
  ]);
  
  const endTime = performance.now();
  console.log(`⏱️ Parallel processing took: ${endTime - startTime}ms`);
  
  return results;
}
```

### Progressive UI:
```typescript
// Emit progress events
eventBus.emit('onboarding:progress', {
  step: 'analyzing_resume',
  progress: 0.33,
  message: 'Extracting work history...'
});
```

---

## 📈 **Success Metrics**

- **P50 latency:** < 30s (from 60s)
- **P95 latency:** < 45s (from 90s)
- **User perception:** "Fast enough" (>4/5 rating)
- **Completion rate:** >95% (users don't abandon)

