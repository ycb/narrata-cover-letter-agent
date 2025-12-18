# LLM Call Usage Summary — By Purpose

**Generated:** 2025-12-17  
**Total Instrumented Calls:** 21-22  
**Coverage:** ~85-90% of active LLM calls

---

## 📊 Overview by Purpose

| Purpose | Call Count | User-Facing? | Examples |
|---------|-----------|--------------|----------|
| **📄 Parsing/Extraction** | 9 | ❌ No | Resume parsing, JD analysis, voice extraction |
| **✨ User-Facing Generation** | 6 | ✅ YES | HIL content, gap resolution, draft sections |
| **⚖️ Quality Evaluation (Judge)** | 6-7 | ❌ No | Match intelligence, content standards, ratings |
| **🏷️ Auxiliary** | 1 | ❌ No | Tag suggestion |

---

## 📄 Category 1: PARSING / EXTRACTION (9 calls)

**Purpose:** Extract structured data from unstructured text  
**User-Facing Content:** ❌ **NO** — Data extraction only  
**Visibility:** Backend processing, not shown to users

### Edge Function Pipelines

#### 1. **Resume Processing** (3 calls)
- **Stages:**
  1. `workHistorySkeleton` — Extract company names, titles, dates
  2. `roleStories` — Extract achievements per role
  3. `skillsAndEducation` — Extract skills and education
- **Model:** `gpt-4o-mini`
- **Output:** Structured JSON for database
- **User Sees:** Parsed data in profile, NOT the LLM output

#### 2. **Onboarding Streaming** (2 calls)
- **Stages:**
  1. `profileStructuring` — Extract skeleton profile from resume/CL
  2. `derivedArtifacts` — Detailed analysis (impact scores, confidence)
- **Model:** `gpt-4o-mini`
- **Output:** Structured profile data
- **User Sees:** Progress bar, then structured data

#### 3. **Cover Letter Phase A** (4 calls)
- **Stages:**
  1. `jdAnalysis` — Parse job description
  2. `requirementAnalysis` — Extract requirements
  3. `goalsAndStrengths.mws` — Analyze user strengths
  4. `goalsAndStrengths.companyContext` — Company context analysis
- **Model:** `gpt-4o-mini` / `gpt-4`
- **Output:** Structured analysis data
- **User Sees:** Match metrics, NOT the raw LLM analysis

#### 4. **JD Pre-Analysis** (1 call)
- **Stage:** `jdAnalysis.preanalyze`
- **Model:** `gpt-4o-mini`
- **Purpose:** Pre-compute JD analysis for caching
- **Output:** Role insights, requirements
- **User Sees:** Nothing directly (performance optimization)

---

## ✨ Category 2: USER-FACING GENERATION (6 calls)

**Purpose:** Generate text that users directly read/edit  
**User-Facing Content:** ✅ **YES** — Users see and interact with output  
**Visibility:** Directly shown in UI, editable by users

### HIL (Human-in-the-Loop) Services (5 calls)

#### 1. **Content Generation** (1 call)
- **Stage:** `hil.contentGeneration.{story|roleDesc|savedSection}`
- **Model:** `gpt-4o-mini`
- **Purpose:** Generate new content to fill gaps
- **Output Types:**
  - Story (CAR format achievement)
  - Role description
  - Saved section (CL paragraph)
- **User Sees:** ✅ **Direct LLM output** in modal, can edit before saving

#### 2. **Gap Resolution Streaming V1** (1 call)
- **Stage:** `hil.gapResolution.stream`
- **Model:** `gpt-4`
- **Purpose:** Real-time gap resolution with streaming
- **Output:** Generated content to address specific gaps
- **User Sees:** ✅ **Streaming LLM output** character-by-character

#### 3. **Gap Resolution Streaming V2** (2 calls)
- **Stages:**
  - `hil.gapResolutionV2.stream` — Enhanced resolution
  - `hil.gapResolutionV2.refine` — Refinement with user input
- **Model:** `gpt-4`
- **Purpose:** Enhanced gap resolution with context + refinement
- **User Sees:** ✅ **Streaming LLM output**, can refine with feedback

#### 4. **Review Notes Streaming** (1 call)
- **Stage:** `hil.reviewNotes.stream`
- **Model:** `gpt-4`
- **Purpose:** Generate review notes for HIL content
- **User Sees:** ✅ **Streaming review notes** to guide edits

### Cover Letter Draft Generation (1 call)

#### 5. **Draft Metrics Calculation** (1 call)
- **Stage:** `coverLetter.phaseB.metrics`
- **Model:** `gpt-4`
- **Purpose:** Calculate match metrics for draft CL
- **Output:** Match scores, ATS score, differentiator analysis
- **User Sees:** ⚠️ **Partially** — Metrics/scores only, not raw LLM output
- **Note:** This is borderline - it generates analysis but not prose

---

## ⚖️ Category 3: QUALITY EVALUATION (JUDGE) (6-7 calls)

**Purpose:** LLM-as-judge for quality assessment  
**User-Facing Content:** ❌ **NO** — Scores/flags only, not prose  
**Visibility:** Shown as scores, badges, or indicators

### Quality Gates

#### 1. **Match Intelligence** (1 call)
- **Stage:** `qualityGate.matchIntelligence`
- **Model:** `gpt-4o-mini`
- **Purpose:** Comprehensive match analysis (goals, requirements, experience)
- **Output:** Match scores, gap flags
- **User Sees:** Scores and percentages, NOT raw analysis

#### 2. **Content Standards** (2 calls)
- **Stages:**
  - `qualityGate.contentStandards.section` — Per-section evaluation
  - `qualityGate.contentStandards.letter` — Whole-letter evaluation
- **Model:** `gpt-4o-mini`
- **Purpose:** Evaluate against content quality standards
- **Output:** met/partial/unmet status per standard
- **User Sees:** Pass/fail indicators, NOT evaluation text

#### 3. **Cover Letter Rating** (1 call)
- **Stage:** `qualityGate.clRating`
- **Model:** `gpt-4o-mini`
- **Purpose:** Rate CL quality (strong/average/weak)
- **Output:** Overall rating + criteria checklist
- **User Sees:** Rating badge and criteria list

#### 4. **Gap Detection** (1 call)
- **Stage:** `qualityGate.gapDetection.batch`
- **Model:** `gpt-4o-mini`
- **Purpose:** Detect generic content in batch
- **Output:** isGeneric flag + reasoning
- **User Sees:** "Needs more specificity" badge, NOT reasoning

#### 5. **Draft Readiness Judge** (1 call)
- **Stage:** `draftReadiness`
- **Model:** `gpt-4o-mini`
- **Purpose:** Editorial readiness evaluation
- **Output:** Verdict (ready/needs-work) + 4 dimension scores
- **User Sees:** Readiness indicator, NOT full evaluation

#### 6. **Gap Detection (Section Gaps)** (1 call)
- **Stage:** `sectionGaps` (part of CL Phase A)
- **Model:** `gpt-4o-mini`
- **Purpose:** Identify gaps in CL sections vs requirements
- **Output:** Gap list with explanations
- **User Sees:** Gap badges and summaries

---

## 🏷️ Category 4: AUXILIARY (1 call)

**Purpose:** Supporting features (tagging, metadata)  
**User-Facing Content:** ❌ **NO** — Suggestions only  
**Visibility:** Shown as tag suggestions

#### 1. **Tag Suggestion** (1 call)
- **Stage:** `auxiliary.tagSuggestion`
- **Model:** `gpt-4o-mini`
- **Purpose:** Generate tag suggestions for companies/roles/sections
- **Output:** List of suggested tags with confidence
- **User Sees:** Tag suggestions, can accept/reject

---

## 🎯 Key Insights

### User-Facing Content Generation: **ONLY HIL** ✅

You're **correct** — only **5 HIL calls** generate user-facing content:
1. Content generation (stories, role descriptions, sections)
2. Gap resolution V1 (streaming)
3. Gap resolution V2 (streaming + refinement)
4. Review notes (streaming)

**Everything else is:**
- Parsing/extraction (9 calls)
- Quality evaluation (6-7 calls)
- Auxiliary support (1 call)

### Models by Purpose

| Purpose | Primary Model | Why |
|---------|--------------|-----|
| Parsing | `gpt-4o-mini` | Fast, cheap, structured output |
| User-Facing Generation | `gpt-4` | Higher quality prose |
| Quality Evaluation | `gpt-4o-mini` | Fast scoring, good enough for judgments |
| Auxiliary | `gpt-4o-mini` | Simple suggestions |

### Streaming vs Non-Streaming

| Streaming | Call Count | Use Case |
|-----------|-----------|----------|
| ✅ YES | 3 | HIL gap resolution + review notes (real-time UX) |
| ❌ NO | 18-19 | Everything else (batch processing) |

### Cost Implications

**Most Expensive (User-Facing):**
- HIL services (gpt-4, streaming, user-triggered)
- Draft metrics (gpt-4, large context)

**Cheapest (Batch Processing):**
- Resume parsing (gpt-4o-mini, one-time)
- JD analysis (gpt-4o-mini, cached)
- Quality gates (gpt-4o-mini, fast checks)

---

## 📝 Usage Patterns

### **High Frequency, Low Cost**
- Resume parsing (once per user)
- JD pre-analysis (cached, reused)
- Quality gates (batch, fast)

### **Low Frequency, High Cost**
- HIL gap resolution (user-triggered, streaming)
- Draft metrics (per draft, large context)

### **Medium Frequency, Medium Cost**
- Content generation (HIL, per gap)
- Onboarding streaming (once per user)
- CL Phase A (per job application)

---

## 🎨 Summary Table: User-Facing vs Backend

| Category | Calls | User-Facing? | What User Sees |
|----------|-------|--------------|----------------|
| **Parsing** | 9 | ❌ NO | Structured data (dates, titles, scores) |
| **Generation** | 5 | ✅ **YES** | **Direct LLM prose output** |
| **Draft Metrics** | 1 | ⚠️ Partial | Scores/metrics, not prose |
| **Quality Judge** | 6-7 | ❌ NO | Badges, scores, indicators |
| **Auxiliary** | 1 | ❌ NO | Tag suggestions |

**Total User-Facing Content Generation:** **5 calls (HIL only)**

---

## 🚀 Implications for Product Strategy

### **Quality Focus Areas**
1. **HIL Services (5 calls)** — Direct user impact, needs highest quality
2. **Parsing (9 calls)** — Foundation for everything, needs accuracy
3. **Quality Gates (6-7 calls)** — Nice-to-have, can be tuned for speed

### **Cost Optimization Priorities**
1. Cache JD analysis aggressively
2. Batch quality gates when possible
3. Monitor HIL usage (user-triggered, expensive)

### **Performance Priorities**
1. HIL streaming TTFU (user waiting)
2. Resume parsing (onboarding UX)
3. Draft metrics (CL generation speed)

---

**End of Summary**

