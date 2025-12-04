## Summary
Create `useResumeStream` hook to upload resume, create source, extract text client-side, trigger the edge function, and subscribe to realtime stage and work item updates.

## Problem
Onboarding needs a single, typed hook that coordinates the streaming flow without blocking the UI.

## Files to create/modify
- Create: `src/hooks/useResumeStream.ts`

## Step-by-step implementation details
1) Create `src/hooks/useResumeStream.ts`.
2) Implement the hook with:
   - `startProcessing(file: File)`: upload to storage, insert `sources`, extract text, update `raw_text` + set stage `extracting`, call edge function, set `sourceId`.
   - Realtime subscription: `sources` (UPDATE by `id`) and `work_items` (INSERT by `source_id`).
   - State: `sourceId`, `processingStage`, `workItems`, `error`, derived flags (`isProcessing`, `isComplete`, `hasWorkHistory`).
   - `reset()` to tear down subscription and clear state.

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
  startProcessing: (file: File) => Promise<string>;
  reset: () => void;
  sourceId: string | null;
  processingStage: ProcessingStage;
  workItems: WorkItem[];
  error: string | null;
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

  useEffect(() => {
    if (!sourceId) return;

    const channel = supabase
      .channel(`resume-${sourceId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sources', filter: `id=eq.${sourceId}` },
        (payload) => {
          const newStage = payload.new.processing_stage as ProcessingStage;
          setProcessingStage(newStage);
          if (payload.new.processing_error) {
            setError(payload.new.processing_error);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'work_items', filter: `source_id=eq.${sourceId}` },
        (payload) => {
          setWorkItems(prev => [...prev, payload.new as WorkItem]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => channel.unsubscribe();
  }, [sourceId]);

  const startProcessing = useCallback(async (file: File): Promise<string> => {
    setProcessingStage('extracting');
    setWorkItems([]);
    setError(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // 1) Upload to storage
    const fileName = `${Date.now()}-${file.name}`;
    const storagePath = `resumes/${session.user.id}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('uploads').upload(storagePath, file);
    if (uploadError) throw uploadError;

    // 2) Create source
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

    // 3) Client-side text extraction
    const { TextExtractionService } = await import('@/services/textExtractionService');
    const extractor = new TextExtractionService();
    const extraction = await extractor.extractText(file);
    if (!extraction.success) throw new Error(extraction.error);

    await supabase
      .from('sources')
      .update({ raw_text: extraction.text, processing_stage: 'extracting' })
      .eq('id', source.id);

    // 4) Trigger edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ sourceId: source.id, userId: session.user.id })
      }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to start processing');
    }

    // 5) Subscribe by setting sourceId
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

## Acceptance criteria
- Hook compiles and exposes `startProcessing`, `reset`, and streaming state.
- Calling `startProcessing` performs upload, inserts source, writes `raw_text`, triggers edge function, and subscribes to realtime.
- Stage changes and work item inserts update state accordingly.

## QA steps
- In the onboarding page or a test harness, call `startProcessing(file)` with a real resume file.
- Verify: storage upload, `sources` insert/update, 202 response from edge function, realtime stage updates, and streaming `work_items`.

