# Cover Letter Draft Performance Optimization Plan

**Goal:** Reduce perceived wait time from 57 seconds to ~15 seconds by implementing progressive disclosure, streaming sections, skeleton UI, and pre-parsing JD on paste.

---

## Current Flow (57 seconds to value)

```
User pastes JD → Selects template → Clicks "Generate"
  ↓
  JD Parse (10s) → Build Sections (5s) → Calculate Metrics (35s) → Save Draft (2s) → Show UI
  ↓
  User sees draft (57s total) ✅
```

---

## Target Flow (15 seconds to value)

```
User pastes JD → [JD Parse starts in background 10s]
  ↓
Selects template → Clicks "Generate"
  ↓
  Show Skeleton UI (instant) ✅
  ↓
  Build Section 1 (2s) → Stream to UI ✅
  ↓
  Build Section 2 (2s) → Stream to UI ✅
  ↓
  Build Section 3 (2s) → Stream to UI ✅
  ↓
  Build Section 4 (2s) → Stream to UI ✅
  ↓
  [User sees full draft at ~15s] ✅ ✅ ✅
  ↓
  Calculate Metrics in Background (35s) → Update Match Bar ✅
  ↓
  [Match bar updates at ~50s]
```

**Key improvements:**
- User sees skeleton at **0 seconds** (instant feedback)
- User sees first content at **~5 seconds** (streaming)
- User sees full draft at **~15 seconds** (can start editing)
- Metrics appear at **~50 seconds** (but user already engaged)

---

## Implementation Tasks (4 Independent Agents)

### **AGENT A: Pre-Parse JD on Paste (Backend)**
**Goal:** Start JD parsing immediately when user pastes content, before clicking "Generate"

**Files to Modify:**
- `src/components/cover-letters/CoverLetterCreateModal.tsx`
- `src/services/jobDescriptionService.ts`

**Implementation Steps:**

1. **Add state for pre-parsed JD:**
   ```typescript
   const [preParsedJD, setPreParsedJD] = useState<JobDescriptionRecord | null>(null);
   const [isPreParsing, setIsPreParsing] = useState(false);
   ```

2. **Trigger parse on paste/input change:**
   ```typescript
   const handleJobContentChange = useCallback(
     debounce(async (content: string) => {
       if (content.length >= MIN_JOB_DESCRIPTION_LENGTH && user?.id) {
         setIsPreParsing(true);
         try {
           const record = await jobDescriptionService.parseAndCreate(
             user.id,
             content,
             { onProgress: () => {}, onToken: () => {} } // Silent background parse
           );
           setPreParsedJD(record);
         } catch (error) {
           console.warn('Pre-parse failed, will parse on generate', error);
         } finally {
           setIsPreParsing(false);
         }
       }
     }, 1000), // Debounce 1s after user stops typing
     [user?.id]
   );
   ```

3. **Use pre-parsed JD in handleGenerate:**
   ```typescript
   const handleGenerate = async () => {
     // If we already have a pre-parsed JD, skip parsing step
     const record = preParsedJD || await jobDescriptionService.parseAndCreate(...);
     
     // Continue with draft generation
     const { draft } = await generateDraft({
       templateId: selectedTemplateId,
       jobDescriptionId: record.id,
     });
   };
   ```

4. **Add subtle UI indicator:**
   - Show spinner/checkmark in textarea corner when pre-parsing
   - "✓ Job description analyzed" when complete

**Acceptance Criteria:**
- [x] JD parsing starts automatically 1s after user stops typing
- [x] Pre-parsed JD is reused in handleGenerate if available
- [x] UI shows subtle feedback during pre-parsing
- [x] Falls back gracefully if pre-parse fails
- [x] Saves ~10 seconds from total wait time

**Implementation Notes:**
- Added `preParsedJD`, `isPreParsing`, and `preParsedContent` state to track pre-parsing status
- Created useEffect hook that debounces JD parsing by 1 second after user stops typing
- Pre-parse only triggers when content >= 50 chars, user is signed in, and content changed
- Added subtle UI indicators in textarea corner: spinner during parsing, checkmark when complete
- Modified `handleGenerateDraft` to reuse pre-parsed JD if content matches, skipping the ~10s parse step
- Silent error handling: if pre-parse fails, it falls back to normal parsing on Generate button click
- Pre-parse state is cleared when modal closes or content changes significantly

---

### **AGENT B: Skeleton UI (Frontend)**
**Goal:** Show immediate skeleton with company/role while draft generates

**Files to Modify:**
- `src/components/cover-letters/CoverLetterCreateModal.tsx`
- `src/components/cover-letters/CoverLetterSkeleton.tsx` (new)

**Implementation Steps:**

1. **Create CoverLetterSkeleton component:**
   ```typescript
   // src/components/cover-letters/CoverLetterSkeleton.tsx
   export const CoverLetterSkeleton = ({ 
     company, 
     role, 
     userName, 
     userEmail 
   }: SkeletonProps) => {
     return (
       <div className="space-y-6 animate-pulse">
         {/* Header with real data */}
         <div className="text-right">
           <p className="font-medium">{userName}</p>
           <p className="text-sm text-muted-foreground">{userEmail}</p>
           <p className="text-sm text-muted-foreground mt-4">{new Date().toLocaleDateString()}</p>
         </div>
         
         <div>
           <p className="font-medium">{company}</p>
           <p className="text-sm text-muted-foreground">{role}</p>
         </div>
         
         {/* Skeleton content blocks */}
         <div className="space-y-3">
           <div className="h-4 bg-muted rounded w-3/4"></div>
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-5/6"></div>
         </div>
         
         <div className="space-y-3">
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-4/5"></div>
           <div className="h-4 bg-muted rounded w-full"></div>
           <div className="h-4 bg-muted rounded w-3/4"></div>
         </div>
         
         {/* Repeat for 3-4 sections */}
       </div>
     );
   };
   ```

2. **Update CoverLetterCreateModal to show skeleton first:**
   ```typescript
   const renderDraftTab = () => {
     if (!draft && isGenerating && jobDescriptionRecord) {
       // Show skeleton while generating
       return (
         <CoverLetterSkeleton
           company={jobDescriptionRecord.company}
           role={jobDescriptionRecord.role}
           userName={user?.user_metadata?.full_name || 'Your Name'}
           userEmail={user?.email || ''}
         />
       );
     }
     
     if (!draft) {
       return <EmptyState />;
     }
     
     // Show actual draft content
     return <CoverLetterDraftView {...} />;
   };
   ```

**Acceptance Criteria:**
- [x] Skeleton appears instantly when "Generate" is clicked
- [x] Skeleton shows real company, role, user name/email
- [x] Animated shimmer effect on placeholder content
- [x] Seamlessly transitions to real content when available
- [x] User feels progress happening immediately

**Implementation Status:** ✅ COMPLETED

**Files Modified:**
- Created: `src/components/cover-letters/CoverLetterSkeleton.tsx`
- Modified: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Implementation Details:**
- Skeleton component displays real job details (company, role) and user info (name, email, date)
- Animated pulse effect on placeholder content blocks simulating paragraphs
- Conditionally rendered in `renderDraftTab()` when `isGenerating && !draft && jobDescriptionRecord`
- Wrapped in Card with progress indicator showing generation status
- Seamlessly transitions to actual CoverLetterDraftView when draft is available

---

### **AGENT C: Streaming Section Builder (Backend)**
**Goal:** Build and emit draft sections progressively instead of all at once

**Files to Modify:**
- `src/services/coverLetterDraftService.ts`
- `src/hooks/useCoverLetterDraft.ts`

**Implementation Steps:**

1. **Add section streaming to DraftGenerationOptions:**
   ```typescript
   interface DraftGenerationOptions {
     // ... existing fields
     onSectionBuilt?: (section: CoverLetterDraftSection, index: number, total: number) => void;
   }
   ```

2. **Update buildSections to emit sections as built:**
   ```typescript
   private buildSections({ 
     templateSections, 
     stories, 
     savedSections, 
     jobDescription, 
     userGoals,
     onSectionBuilt // NEW
   }: BuildSectionsOptions) {
     const sections: CoverLetterDraftSection[] = [];
     
     templateSections.forEach((template, index) => {
       // Build section logic (existing)
       const section = {
         id: template.id,
         slug: template.slug,
         title: template.title,
         content: matchedContent || template.staticContent,
         // ... rest of section
       };
       
       sections.push(section);
       
       // NEW: Emit section immediately
       onSectionBuilt?.(section, index, templateSections.length);
     });
     
     return { sections, matchState };
   }
   ```

3. **Update generateDraft to support streaming:**
   ```typescript
   async generateDraft(options: DraftGenerationOptions): Promise<DraftGenerationResult> {
     const { userId, templateId, jobDescriptionId, onProgress, onSectionBuilt, signal } = options;
     
     // ... JD loading, content loading (existing)
     
     const { sections, matchState } = this.buildSections({
       templateSections,
       stories,
       savedSections,
       jobDescription,
       userGoals,
       onSectionBuilt, // Pass through
     });
     
     // NOTE: Don't wait for metrics before returning sections!
     // Metrics will be calculated in background
     
     // ... rest of method
   }
   ```

4. **Update useCoverLetterDraft hook:**
   ```typescript
   const [streamingSections, setStreamingSections] = useState<CoverLetterDraftSection[]>([]);
   
   const generateDraft = async (options) => {
     setStreamingSections([]); // Reset
     
     const result = await service.generateDraft({
       ...options,
       onSectionBuilt: (section, index, total) => {
         setStreamingSections(prev => [...prev, section]);
         setProgress(prev => [...prev, {
           phase: 'content_generation',
           message: `Building section ${index + 1} of ${total}...`,
           timestamp: Date.now(),
         }]);
       },
     });
     
     return result;
   };
   ```

**Acceptance Criteria:**
- [x] Sections are emitted one-by-one as they're built
- [x] `onSectionBuilt` callback fires for each section
- [x] UI can render sections progressively
- [x] Total build time unchanged (~5s) but perceived as faster
- [x] No breaking changes to existing API

**Implementation Status:** ✅ COMPLETE

**Implementation Summary:**
1. Added `onSectionBuilt` callback to `DraftGenerationOptions` interface
2. Updated `buildSections` method to emit sections as they're created
3. Modified `generateDraft` to pass through the streaming callback
4. Enhanced `useCoverLetterDraft` hook with `streamingSections` state
5. Added progressive progress updates for each section built

---

### **AGENT D: Background Metrics Calculation (Backend + Frontend)**
**Goal:** Calculate metrics in background after showing draft, update match bar when done

**Files to Modify:**
- `src/services/coverLetterDraftService.ts`
- `src/components/cover-letters/CoverLetterCreateModal.tsx`
- `src/hooks/useCoverLetterDraft.ts`

**Implementation Steps:**

1. **Split generateDraft into two phases:**
   ```typescript
   // Phase 1: Fast draft generation (no metrics)
   async generateDraftFast(options: DraftGenerationOptions): Promise<{
     draft: CoverLetterDraft; // Without enhancedMatchData
     workpad: DraftWorkpad;
     jobDescription: ParsedJobDescription;
   }> {
     // ... existing logic up to section building
     
     const sections = this.buildSections({...});
     
     // Save draft WITHOUT metrics
     const insertPayload = {
       user_id: userId,
       template_id: templateId,
       job_description_id: jobDescriptionId,
       status: 'draft',
       sections: sections,
       llm_feedback: null, // No metrics yet
       metrics: [], // Empty
     };
     
     const { data: draftRow } = await this.supabaseClient
       .from('cover_letters')
       .insert(insertPayload)
       .select()
       .single();
     
     return { 
       draft: this.mapCoverLetterRow(draftRow, [], 0),
       workpad: workpadRow,
       jobDescription,
     };
   }
   
   // Phase 2: Calculate metrics in background
   async calculateMetricsForDraft(
     draftId: string,
     userId: string,
     jobDescriptionId: string,
     onProgress?: (phase: string, message: string) => void
   ): Promise<EnhancedMatchData> {
     const [draft, jobDescription, userGoals, workHistory, approvedContent] = await Promise.all([
       this.fetchDraft(draftId),
       this.fetchJobDescription(userId, jobDescriptionId),
       UserPreferencesService.loadGoals(userId),
       this.fetchWorkHistory(userId),
       this.fetchApprovedContent(userId),
     ]);
     
     onProgress?.('metrics', 'Calculating match metrics...');
     
     const metricResult = await this.metricsStreamer({
       draft: draft.sections,
       jobDescription,
       userGoals,
       workHistory,
       approvedContent,
       signal: undefined,
       onToken: undefined,
     });
     
     // Update draft with metrics
     await this.supabaseClient
       .from('cover_letters')
       .update({
         llm_feedback: {
           generatedAt: this.now().toISOString(),
           metrics: metricResult.raw,
           enhancedMatchData: metricResult.enhancedMatchData,
         },
         metrics: metricResult.metrics,
         analytics: {
           atsScore: metricResult.atsScore,
           generatedAt: this.now().toISOString(),
         },
         updated_at: this.now().toISOString(),
       })
       .eq('id', draftId);
     
     return metricResult.enhancedMatchData;
   }
   ```

2. **Update useCoverLetterDraft to support two-phase generation:**
   ```typescript
   const [metricsLoading, setMetricsLoading] = useState(false);
   
   const generateDraft = async (options) => {
     try {
       setIsGenerating(true);
       
       // Phase 1: Fast draft (15s)
       const { draft, workpad, jobDescription } = await service.generateDraftFast(options);
       
       setDraft(draft);
       setWorkpad(workpad);
       setIsGenerating(false); // Draft is ready!
       
       // Phase 2: Background metrics (35s)
       setMetricsLoading(true);
       setProgress(prev => [...prev, {
         phase: 'metrics',
         message: 'Calculating match metrics in background...',
         timestamp: Date.now(),
       }]);
       
       const enhancedMatchData = await service.calculateMetricsForDraft(
         draft.id,
         options.userId,
         options.jobDescriptionId,
         (phase, message) => {
           setProgress(prev => [...prev, { phase, message, timestamp: Date.now() }]);
         }
       );
       
       // Update draft with metrics
       setDraft(prev => prev ? { ...prev, enhancedMatchData } : prev);
       setMetricsLoading(false);
       
     } catch (error) {
       setError(error);
       setIsGenerating(false);
       setMetricsLoading(false);
     }
   };
   ```

3. **Update CoverLetterCreateModal UI:**
   ```typescript
   const renderDraftTab = () => {
     if (!draft) {
       if (isGenerating && jobDescriptionRecord) {
         return <CoverLetterSkeleton {...} />;
       }
       return <EmptyState />;
     }
     
     return (
       <>
         {/* Show match bar with loading state if metrics calculating */}
         {metricsLoading && (
           <div className="mb-4 text-sm text-muted-foreground">
             Calculating match metrics...
           </div>
         )}
         
         <ProgressIndicatorWithTooltips
           metrics={draft.enhancedMatchData ? hilMetrics : placeholderMetrics}
           enhancedMatchData={draft.enhancedMatchData}
           isLoading={metricsLoading}
           // ... rest of props
         />
         
         {/* Draft content - user can edit while metrics load */}
         <CoverLetterDraftView
           sections={streamingSections.length > 0 ? streamingSections : draft.sections}
           // ... rest of props
         />
       </>
     );
   };
   ```

**Acceptance Criteria:**
- [ ] Draft appears in ~15s without metrics
- [ ] Metrics calculate in background (non-blocking)
- [ ] Match bar shows loading state while metrics calculate
- [ ] Match bar updates when metrics complete (~50s total)
- [ ] User can edit draft while metrics are calculating
- [ ] No data loss if user navigates away during metrics calculation

---

## Testing Plan

### **Integration Test:**
1. Paste Supio JD → verify pre-parse starts automatically
2. Select template → click "Generate"
3. Verify skeleton appears instantly
4. Verify sections stream in progressively (~5s, ~10s, ~15s)
5. Verify draft is editable at ~15s
6. Verify match bar updates at ~50s with all metrics

### **Edge Cases:**
- [ ] User navigates away during generation
- [ ] Pre-parse fails (should fall back to normal parse)
- [ ] Network timeout during metrics calculation
- [ ] User closes modal before metrics complete

---

## Timeline Estimate

- **Agent A (Pre-Parse JD):** 2-3 hours
- **Agent B (Skeleton UI):** 1-2 hours
- **Agent C (Streaming Sections):** 3-4 hours
- **Agent D (Background Metrics):** 4-5 hours

**Total:** ~10-14 hours with 4 agents working in parallel = **2.5-3.5 hours wall clock time**

---

## Success Metrics

- [ ] Time to first content: **<5 seconds** (vs 57s currently)
- [ ] Time to full draft: **~15 seconds** (vs 57s currently)
- [ ] Time to metrics: **~50 seconds** (same, but non-blocking)
- [ ] User can start editing 3.8x faster
- [ ] Perceived performance dramatically improved

