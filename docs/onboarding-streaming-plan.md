# Onboarding Streaming – MVP Implementation Plan

**Date:** December 3, 2025  
**Scope:** Resume onboarding only (NO CL, NO Readiness)  
**Goal:** User sees first work history data in <15s, can browse app immediately

---

## 1. MVP Scope

### IN SCOPE (MVP)

| Feature | Description |
|---------|-------------|
| Edge function | `process-resume` with 2 LLM stages |
| Stage 1: Skeleton | Extract company, title, dates, description → `work_items` |
| Stage 2: Skills | Extract skills (category + items) → `user_skills` |
| Schema | Add `processing_stage` column to `sources` |
| Realtime | Subscribe to `sources` (stage) and `work_items` (inserts) |
| Frontend hook | `useResumeStream` with stage tracking + work items array |
| UI: Skeletons | Work History shows skeleton cards → real cards |
| UI: Progress | Simple stage → label/percent indicator |

### OUT OF SCOPE (MVP → V2)

| Feature | Why Excluded |
|---------|--------------|
| Stories extraction | Adds complexity; work history structure is sufficient for MVP |
| Gap detection | Separate concern; can run later |
| LinkedIn merge | Requires schema work; out of scope |
| Education table | No table exists; stays in `structured_data` |
| PM Levels changes | Already reads `work_items`; no change needed |

### Assumptions & Clarifications

1. **`extracting` stage is client-side only.**  
   The client sets `processing_stage = 'extracting'` after text extraction completes. The edge function never sets this stage—it begins at `skeleton`. Text extraction does NOT happen server-side.

2. **`work_items.source_id` column exists.**  
   Realtime subscription filters `work_items` by `source_id`. If this column does not exist, add it as part of the schema migration.

3. **Education is NOT persisted in MVP.**  
   The skills prompt may return education data, but it is stored only in `sources.structured_data` (JSONB). No separate `education` table insert is performed.

4. **Legacy client-side LLM path must be removed/bypassed.**  
   The existing `fileUploadService.ts` contains resume → LLM → DB logic. For MVP, this path must be disabled for resumes to avoid double-processing. See Task 8 below.

5. **`useResumeStream` must be instantiated once.**  
   If multiple components call the hook independently, realtime state will fragment. Instantiate `useResumeStream` once at the onboarding layout (or via a shared React Context provider) so `GlobalResumeProgress` and Work History components share the same state.

---

## 2. Current Architecture (Problem)

```
User uploads resume
    ↓
[CLIENT] FileUploadService.uploadContent()
    ↓ blocks UI for 80-120s
[CLIENT] Text extraction → LLM calls → DB writes
    ↓
[CLIENT] Complete - UI finally unblocks

TOTAL BLOCKING TIME: 80-120s
```

**Key Problem**: Resume parsing runs entirely in browser, blocking UI.

### Current Code Locations

| Component | Location |
|-----------|----------|
| Upload hook | `src/hooks/useFileUpload.ts` |
| Upload service | `src/services/fileUploadService.ts` |
| LLM service | `src/services/openaiService.ts` |
| Onboarding page | `src/pages/NewUserOnboarding.tsx` |

---

## 3. MVP Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Upload file to storage                                       │
│  2. Extract text client-side (~1s)                               │
│  3. Insert sources row (raw_text, processing_stage='pending')    │
│  4. POST /process-resume { sourceId, userId }                    │
│  5. Return immediately → user can browse                         │
│  6. Subscribe to realtime: sources + work_items                  │
│  7. Render skeleton → real cards as data arrives                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTION: process-resume                 │
├─────────────────────────────────────────────────────────────────┤
│  Returns 202 immediately, uses EdgeRuntime.waitUntil()           │
│                                                                  │
│  Stage 1: Skeleton (~15s)                                        │
│    - LLM: extract workHistory[]                                  │
│    - Upsert companies                                            │
│    - Insert work_items                                           │
│    - Update sources.processing_stage = 'skeleton'                │
│                                                                  │
│  Stage 2: Skills (~10s)                                          │
│    - LLM: extract skills[]                                       │
│    - Insert user_skills                                          │
│    - Update sources.processing_stage = 'skills'                  │
│                                                                  │
│  Complete:                                                       │
│    - Update processing_stage = 'complete'                        │
│    - Update processing_status = 'completed'                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  sources (processing_stage broadcasts via realtime)              │
│  work_items (inserts broadcast via realtime)                     │
│  user_skills (inserts, realtime optional)                        │
│  companies (upsert for dedup)                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Schema Changes

### 4.1 Add `processing_stage` to `sources`

```sql
-- Migration: add_processing_stage_to_sources

ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS processing_stage TEXT DEFAULT 'pending';

-- MVP values: 'pending', 'extracting', 'skeleton', 'skills', 'complete', 'error'

CREATE INDEX IF NOT EXISTS idx_sources_processing_stage 
ON sources(processing_stage);
```

### 4.2 Enable Realtime

```sql
-- Check current publication first:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Add if not present:
ALTER PUBLICATION supabase_realtime ADD TABLE sources;
ALTER PUBLICATION supabase_realtime ADD TABLE work_items;
```

---

## 5. Edge Function: `process-resume`

**File:** `supabase/functions/process-resume/index.ts`

### 5.1 Entry Point

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sourceId, userId } = await req.json();
    
    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: corsHeaders 
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Return immediately - processing happens in background
    const responsePromise = processResumeAsync(supabase, sourceId, userId, openaiKey);
    
    // @ts-ignore - Deno EdgeRuntime
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(responsePromise);
    } else {
      responsePromise.catch(console.error);
    }
    
    return new Response(
      JSON.stringify({ success: true, message: 'Processing started', sourceId }),
      { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('process-resume error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

### 5.2 Async Processing (MVP: 2 Stages)

```typescript
async function processResumeAsync(
  supabase: any,
  sourceId: string,
  userId: string,
  openaiKey: string
) {
  const startTime = Date.now();
  
  try {
    // Get source with raw text
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .select('raw_text, file_name')
      .eq('id', sourceId)
      .single();
      
    if (sourceError || !source?.raw_text) {
      throw new Error('Source not found or no text');
    }
    
    const resumeText = source.raw_text;
    
    // =========================================================================
    // STAGE 1: Work History Skeleton
    // =========================================================================
    console.log('[process-resume] Stage 1: Extracting work history...');
    await updateStage(supabase, sourceId, 'skeleton');
    
    const skeletonResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkeletonPrompt(resumeText) }],
      maxTokens: 2000,
      temperature: 0.3
    });
    
    const skeleton = parseJSON(skeletonResult);
    console.log(`[process-resume] Stage 1 complete: ${skeleton.workHistory?.length || 0} roles`);
    
    // Insert work_items (triggers realtime)
    await insertWorkItems(supabase, userId, sourceId, skeleton.workHistory || []);
    
    // =========================================================================
    // STAGE 2: Skills
    // =========================================================================
    console.log('[process-resume] Stage 2: Extracting skills...');
    await updateStage(supabase, sourceId, 'skills');
    
    const skillsResult = await callOpenAI(openaiKey, {
      messages: [{ role: 'user', content: buildSkillsPrompt(resumeText) }],
      maxTokens: 1500,
      temperature: 0.3
    });
    
    const skills = parseJSON(skillsResult);
    console.log(`[process-resume] Stage 2 complete: ${skills.skills?.length || 0} categories`);
    
    // Insert user_skills
    await insertSkills(supabase, userId, sourceId, skills.skills || []);
    
    // =========================================================================
    // COMPLETE
    // =========================================================================
    await updateStage(supabase, sourceId, 'complete');
    
    const totalTime = Date.now() - startTime;
    console.log(`[process-resume] Complete in ${totalTime}ms`);
    
    // Update source with final data
    await supabase
      .from('sources')
      .update({
        processing_status: 'completed',
        structured_data: { workHistory: skeleton.workHistory, skills: skills.skills },
        llm_latency_ms: totalTime,
        total_processing_ms: totalTime
      })
      .eq('id', sourceId);
      
  } catch (error) {
    console.error('[process-resume] Error:', error);
    
    await supabase
      .from('sources')
      .update({
        processing_stage: 'error',
        processing_status: 'failed',
        processing_error: error.message
      })
      .eq('id', sourceId);
  }
}
```

### 5.3 Helper Functions

```typescript
// Update processing stage (triggers realtime broadcast)
async function updateStage(supabase: any, sourceId: string, stage: string) {
  await supabase
    .from('sources')
    .update({ processing_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', sourceId);
}

// Insert work_items with company upsert
async function insertWorkItems(
  supabase: any, 
  userId: string, 
  sourceId: string, 
  workHistory: any[]
) {
  if (!workHistory?.length) return;
  
  // Batch upsert companies
  const companies = workHistory.map(wh => ({ name: wh.company }));
  const { data: companiesData } = await supabase
    .from('companies')
    .upsert(companies, { onConflict: 'name', ignoreDuplicates: true })
    .select('id, name');
    
  const companyMap = new Map(companiesData?.map((c: any) => [c.name, c.id]) || []);
  
  // Batch insert work_items
  const workItems = workHistory.map(wh => ({
    user_id: userId,
    source_id: sourceId,
    company_id: companyMap.get(wh.company),
    title: wh.title,
    start_date: wh.startDate,
    end_date: wh.endDate,
    description: wh.description || null
  }));
  
  await supabase.from('work_items').insert(workItems);
}

// Insert user_skills
async function insertSkills(
  supabase: any,
  userId: string,
  sourceId: string,
  skills: any[]
) {
  if (!skills?.length) return;
  
  const skillRecords = skills.flatMap((cat: any) => 
    (cat.items || []).map((item: string) => ({
      user_id: userId,
      source_id: sourceId,
      skill: item,
      category: cat.category,
      source_type: 'resume'
    }))
  );
  
  if (skillRecords.length) {
    await supabase
      .from('user_skills')
      .upsert(skillRecords, { onConflict: 'user_id,skill', ignoreDuplicates: true });
  }
}
```

### 5.4 LLM Helpers

```typescript
async function callOpenAI(apiKey: string, options: {
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  temperature: number;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
      response_format: { type: 'json_object' }
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) return JSON.parse(match[1]);
    throw new Error('Failed to parse JSON response');
  }
}
```

### 5.5 Prompts (MVP - Lean)

```typescript
function buildSkeletonPrompt(text: string): string {
  return `Extract work history from this resume. Return JSON:
{
  "workHistory": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Brief role description (1-2 sentences)"
    }
  ]
}

Rules:
- Extract EVERY role
- Use YYYY-MM-DD format (use -01-01 for year-only)
- For current roles: endDate = null
- description should be brief, not bullet points

Resume:
${text}`;
}

function buildSkillsPrompt(text: string): string {
  return `Extract skills from this resume. Return JSON:
{
  "skills": [
    { "category": "Technical", "items": ["Python", "SQL", "AWS"] },
    { "category": "Product", "items": ["Roadmapping", "A/B Testing"] }
  ]
}

Rules:
- Group skills into 3-5 categories
- Each category should have 3-10 items
- Categories: Technical, Product, Leadership, Domain, Tools (adapt as needed)

Resume:
${text}`;
}
```

---

## 6. Frontend Hook: `useResumeStream`

**File:** `src/hooks/useResumeStream.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ProcessingStage = 'pending' | 'extracting' | 'skeleton' | 'skills' | 'complete' | 'error';

interface WorkItem {
  id: string;
  company_id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string | null;
}

interface UseResumeStreamReturn {
  // Actions
  startProcessing: (file: File) => Promise<string>;
  reset: () => void;
  
  // State
  sourceId: string | null;
  processingStage: ProcessingStage;
  workItems: WorkItem[];
  error: string | null;
  
  // Derived flags
  isProcessing: boolean;
  isComplete: boolean;
  hasWorkHistory: boolean;
}

export function useResumeStream(): UseResumeStreamReturn {
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('pending');
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Subscribe to realtime when sourceId is set
  useEffect(() => {
    if (!sourceId) return;
    
    const channel = supabase
      .channel(`resume-${sourceId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sources',
          filter: `id=eq.${sourceId}`
        },
        (payload) => {
          const newStage = payload.new.processing_stage as ProcessingStage;
          console.log(`[useResumeStream] Stage: ${newStage}`);
          setProcessingStage(newStage);
          if (payload.new.processing_error) {
            setError(payload.new.processing_error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'work_items',
          filter: `source_id=eq.${sourceId}`
        },
        (payload) => {
          console.log(`[useResumeStream] Work item inserted`);
          setWorkItems(prev => [...prev, payload.new as WorkItem]);
        }
      )
      .subscribe();
      
    channelRef.current = channel;
    
    return () => {
      channel.unsubscribe();
    };
  }, [sourceId]);
  
  const startProcessing = useCallback(async (file: File): Promise<string> => {
    // Reset state
    setProcessingStage('extracting');
    setWorkItems([]);
    setError(null);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');
    
    // 1. Upload file to storage
    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `resumes/${session.user.id}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file);
      
    if (uploadError) throw uploadError;
    
    // 2. Create source record
    const checksum = await generateChecksum(file);
    
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        user_id: session.user.id,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_checksum: checksum,
        storage_path: storagePath,
        source_type: 'resume',
        processing_status: 'pending',
        processing_stage: 'pending'
      })
      .select()
      .single();
      
    if (sourceError) throw sourceError;
    
    // 3. Extract text client-side (reuse existing TextExtractionService)
    const { TextExtractionService } = await import('@/services/textExtractionService');
    const extractor = new TextExtractionService();
    const extraction = await extractor.extractText(file);
    
    if (!extraction.success) throw new Error(extraction.error);
    
    await supabase
      .from('sources')
      .update({ raw_text: extraction.text, processing_stage: 'extracting' })
      .eq('id', source.id);
    
    // 4. Trigger background processing
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          sourceId: source.id,
          userId: session.user.id
        })
      }
    );
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to start processing');
    }
    
    // 5. Set sourceId (triggers realtime subscription)
    setSourceId(source.id);
    
    return source.id;
  }, []);
  
  const reset = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setSourceId(null);
    setProcessingStage('pending');
    setWorkItems([]);
    setError(null);
  }, []);
  
  return {
    startProcessing,
    reset,
    sourceId,
    processingStage,
    workItems,
    error,
    isProcessing: processingStage !== 'pending' && processingStage !== 'complete' && processingStage !== 'error',
    isComplete: processingStage === 'complete',
    hasWorkHistory: workItems.length > 0
  };
}

async function generateChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## 7. Shared Provider (Single Instance)

**File:** `src/contexts/ResumeStreamContext.tsx`

To ensure `GlobalResumeProgress` and Work History components share the same realtime state, wrap the onboarding layout with a provider:

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useResumeStream } from '@/hooks/useResumeStream';

type ResumeStreamContextType = ReturnType<typeof useResumeStream>;

const ResumeStreamContext = createContext<ResumeStreamContextType | null>(null);

export function ResumeStreamProvider({ children }: { children: ReactNode }) {
  const resumeStream = useResumeStream();
  return (
    <ResumeStreamContext.Provider value={resumeStream}>
      {children}
    </ResumeStreamContext.Provider>
  );
}

export function useResumeStreamContext(): ResumeStreamContextType {
  const context = useContext(ResumeStreamContext);
  if (!context) {
    throw new Error('useResumeStreamContext must be used within ResumeStreamProvider');
  }
  return context;
}
```

**Usage in onboarding layout:**
```typescript
// In NewUserOnboarding.tsx or a layout wrapper
<ResumeStreamProvider>
  <GlobalResumeProgress />
  <OnboardingContent />
</ResumeStreamProvider>
```

Components should use `useResumeStreamContext()` instead of `useResumeStream()` directly.

---

## 8. UI Integration

### 8.1 Global Progress Indicator

**File:** `src/components/GlobalResumeProgress.tsx`

```typescript
import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';
import { Progress } from '@/components/ui/progress';

const stageConfig: Record<string, { label: string; percent: number }> = {
  pending: { label: 'Preparing...', percent: 5 },
  extracting: { label: 'Reading resume...', percent: 15 },
  skeleton: { label: 'Identifying roles...', percent: 50 },
  skills: { label: 'Analyzing skills...', percent: 85 },
  complete: { label: 'Profile ready!', percent: 100 },
  error: { label: 'Processing failed', percent: 0 }
};

export function GlobalResumeProgress() {
  const { processingStage, isProcessing, isComplete } = useResumeStreamContext();
  
  // Hide when not processing (and not just completed)
  if (!isProcessing && !isComplete) return null;
  
  const config = stageConfig[processingStage] || stageConfig.pending;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b px-4 py-2">
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        <Progress value={config.percent} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {config.label}
        </span>
      </div>
    </div>
  );
}
```

### 8.2 Work History Skeleton States

**Modify existing Work History component:**

```typescript
import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkHistoryList() {
  const { processingStage, workItems, hasWorkHistory, isProcessing } = useResumeStreamContext();
  
  // Show skeletons while waiting for work_items
  if (isProcessing && !hasWorkHistory) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }
  
  // Show real work items
  return (
    <div className="space-y-4">
      {workItems.map(item => (
        <WorkHistoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

---

## 9. Implementation Tasks

### Task Sequence for Worker

| # | Task | File(s) | Acceptance Criteria |
|---|------|---------|---------------------|
| 1 | Schema migration | `supabase/migrations/...` | `processing_stage` column exists; `work_items.source_id` confirmed |
| 2 | Enable realtime | Migration or dashboard | `sources`, `work_items` in publication |
| 3 | Edge function | `supabase/functions/process-resume/index.ts` | Deploys, returns 202, stages update |
| 4 | Frontend hook | `src/hooks/useResumeStream.ts` | Compiles, triggers function, receives updates |
| 5 | Resume stream provider | `src/contexts/ResumeStreamContext.tsx` | Single instance shared across components |
| 6 | Progress UI | `src/components/GlobalResumeProgress.tsx` | Shows stage label and percent |
| 7 | Skeleton states | Modify Work History component | Shows skeletons → real cards |
| 8 | Remove legacy LLM path | `src/services/fileUploadService.ts` | Resume uploads skip client-side LLM calls |
| 9 | Wire onboarding | `src/pages/NewUserOnboarding.tsx` | Uses new hook via provider, doesn't block |

### Manual QA Checklist

- [ ] Upload PDF → skeleton cards appear within 15s
- [ ] Real work history cards replace skeletons
- [ ] Progress indicator shows correct stages
- [ ] DB shows `processing_stage = 'complete'` after finish
- [ ] Error case: bad file → `processing_stage = 'error'`, user sees message

---

## 10. Success Metrics (MVP)

| Metric | Current | Target |
|--------|---------|--------|
| Time to first work history | 80-120s | <15s |
| Time user can navigate | 80-120s | <5s |
| Total backend processing | 80-120s | 30-45s |

---

## 11. V2 Scope (NOT MVP – Spec Only)

The following features are **explicitly deferred** to V2. Do NOT implement these in MVP.

### V2.1 Stories Extraction

- Add Stage 2B after skeleton
- LLM prompt: extract stories per role (title, content, metrics)
- Insert to `stories` table with `source_id`
- Stream stories to UI under each Work History card
- Show "More details loading..." placeholder

### V2.2 Gap Detection

- Add Stage 3 after skills
- Compute gaps between roles > 30 days
- Insert to `gaps` table
- Show gap indicators in Work History

### V2.3 LinkedIn Merge

- Read existing LinkedIn-backed `work_items`
- Merge resume roles with LI roles:
  - Normalize company names
  - Prefer entries with more structure
- Show "Source: LinkedIn / Resume" label

### V2.4 Architecture Hardening

- Evaluate splitting into multiple edge functions
- Add structured telemetry (stage latency, LLM tokens)
- Add retry logic for LLM failures
- Polling fallback if realtime drops

---

## Appendix: Files to Create/Modify

| Action | File | Notes |
|--------|------|-------|
| CREATE | `supabase/migrations/YYYYMMDD_add_processing_stage.sql` | Add column + indexes |
| CREATE | `supabase/functions/process-resume/index.ts` | New edge function |
| CREATE | `src/hooks/useResumeStream.ts` | Core streaming hook |
| CREATE | `src/contexts/ResumeStreamContext.tsx` | Shared provider for single instance |
| CREATE | `src/components/GlobalResumeProgress.tsx` | Progress indicator |
| MODIFY | Work History list component | Add skeleton states |
| MODIFY | `src/services/fileUploadService.ts` | **Bypass client-side LLM for resumes** |
| MODIFY | `src/pages/NewUserOnboarding.tsx` | Wire new hook via provider |
