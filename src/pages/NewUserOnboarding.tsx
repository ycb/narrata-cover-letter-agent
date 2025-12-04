import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText,
  LinkedinIcon, 
  Mail, 
  CheckCircle, 
  ArrowRight,
  Trophy,
  Sparkles,
  Target,
  Users,
  Lightbulb,
  BookOpen,
} from "lucide-react";
// Streaming runs under the hood only (blocking UX). No provider/global progress bar.
import { ImportSummaryStep } from "@/components/onboarding/ImportSummaryStep";
import { FileUploadCard } from "@/components/onboarding/FileUploadCard";
import { useTour } from "@/contexts/TourContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useLinkedInUpload } from "@/hooks/useFileUpload";
import { useOnboardingJobStream } from "@/hooks/useJobStream";
import { StageStepper } from "@/components/streaming/StageStepper";
import { isValidLinkedInUrl, normalizeLinkedInUrl } from "@/utils/linkedinUtils";
import { FILE_UPLOAD_CONFIG } from "@/lib/config/fileUpload";
import { TextExtractionService } from "@/services/textExtractionService";
import { Progress } from "@/components/ui/progress";
import { createClient as createSbClient } from "@supabase/supabase-js";

type OnboardingStep = 'welcome' | 'upload' | 'review';

interface OnboardingData {
  resume?: File;
  linkedinUrl?: string;
  coverLetter?: string;
  coverLetterFile?: File;
  pmLevel?: string;
  confidence?: number;
  progress?: number;
  approvedContent?: Array<{
    id: string;
    type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
    title: string;
    source: string;
    content: string;
    sections?: Array<{
      id: string;
      title: string;
      content: string;
      type: 'intro' | 'paragraph' | 'closer' | 'signature';
    }>;
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      company: string;
      role: string;
      dates: string;
    }>;
    approved: boolean;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

export default function NewUserOnboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumeCompleted, setResumeCompleted] = useState(false);
  const [linkedinCompleted, setLinkedinCompleted] = useState(false);
  const [coverLetterCompleted, setCoverLetterCompleted] = useState(false);
  // Once the resume flow starts, keep CL & LI enabled for the rest of onboarding
  const [resumeGateOpen, setResumeGateOpen] = useState(false);
  // Timing metrics (ms since epoch)
  const [onboardingStartMs, setOnboardingStartMs] = useState<number | null>(null);
  const [resumeStartMs, setResumeStartMs] = useState<number | null>(null);
  const [clStartMs, setClStartMs] = useState<number | null>(null);
  const [liStartMs, setLiStartMs] = useState<number | null>(null);
  const linkedinRef = useRef<HTMLDivElement>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);


  const [autoPopulatingLinkedIn, setAutoPopulatingLinkedIn] = useState(false);
  const [linkedinAutoCompleted, setLinkedinAutoCompleted] = useState(false);
  const { startTour } = useTour();
  const { user, profile } = useAuth();
  const linkedInUpload = useLinkedInUpload();
  const [blockingStage, setBlockingStage] = useState<'pending' | 'extracting' | 'skeleton' | 'skills' | 'complete' | 'error'>('pending');
  const [showBlockingProgress, setShowBlockingProgress] = useState(false);

  const stageConfig: Record<string, { label: string; percent: number }> = {
    pending: { label: 'Preparing...', percent: 5 },
    extracting: { label: 'Reading resume...', percent: 15 },
    skeleton: { label: 'Identifying roles...', percent: 50 },
    skills: { label: 'Analyzing skills...', percent: 85 },
    complete: { label: 'Profile ready!', percent: 100 },
    error: { label: 'Processing failed', percent: 0 }
  };
  // Blocking resume upload using streaming under the hood with polling
  const resumeBlockingUpload = useCallback(async (file: File) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };

      // Create an authenticated client to guarantee JWT on every request (avoids RLS role mismatch)
      const url = (import.meta.env?.VITE_SUPABASE_URL) || '';
      const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
      const authSupabase = createSbClient(url, key, {
        global: { headers: { Authorization: `Bearer ${session.access_token}` } }
      });

      // Open gates for subsequent cards immediately after starting resume flow
      setResumeGateOpen(true);
      setOnboardingStartMs(Date.now());
      setResumeStartMs(Date.now());

      // 1) Upload to storage
      const fileName = `${Date.now()}-${file.name}`;
      const storagePath = `resumes/${session.user.id}/${fileName}`;
      const bucket = FILE_UPLOAD_CONFIG?.STORAGE?.BUCKET_NAME || 'user-files';
      const { error: uploadError } = await authSupabase.storage.from(bucket).upload(storagePath, file, { upsert: true });
      if (uploadError) return { success: false, error: uploadError.message };

      // 2) Create source row
      const checksum = await (async () => {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      })();

      const { data: source, error: sourceError } = await authSupabase
        .from('sources')
        .insert({
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
      if (sourceError || !source?.id) {
        return { success: false, error: sourceError?.message || 'Failed to create source' };
      }

      // 3) Client-side text extraction and update raw_text
      const extractor = new TextExtractionService();
      const extraction = await extractor.extractText(file);
      if (!extraction.success) return { success: false, error: extraction.error || 'Text extraction failed' };

      await authSupabase
        .from('sources')
        .update({ raw_text: extraction.text, processing_stage: 'extracting' })
        .eq('id', source.id);

      // Best-effort: extract LinkedIn URL from resume text and prefill UI + DB structured_data
      const detectedLinkedIn = extractLinkedInUrl(extraction.text);
      if (detectedLinkedIn) {
        const normalized = normalizeLinkedInUrl(detectedLinkedIn);
        if (normalized && isValidLinkedInUrl(normalized)) {
          // Prefill UI immediately
          setOnboardingData(prev => ({ ...prev, linkedinUrl: normalized }));
          // Persist for later reference (non-destructive for MVP; may overwrite structured_data)
          try {
            await authSupabase
              .from('sources')
              .update({ structured_data: { contactInfo: { linkedin: normalized } } })
              .eq('id', source.id);
          } catch {}
        }
      }
      setShowBlockingProgress(true);
      setBlockingStage('extracting');

      // 4) Trigger Edge function (do NOT await to keep UI polling responsive)
      const fnPromise = fetch(
        `${url}/functions/v1/process-resume`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': (import.meta.env?.VITE_SUPABASE_ANON_KEY) || ''
          },
          body: JSON.stringify({ sourceId: source.id, userId: session.user.id })
        }
      ).then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({} as any));
          throw new Error(err?.message || 'Failed to start processing');
        }
      }).catch((e) => {
        console.warn('[Onboarding] Edge start error (will continue polling):', e);
      });

      // 5) Poll until complete or error (blocking UX) while edge function runs
      const deadline = Date.now() + 180_000; // up to 3 minutes
      while (Date.now() < deadline) {
        const { data: s, error: sErr } = await authSupabase
          .from('sources')
          .select('processing_stage, processing_error')
          .eq('id', source.id)
          .single();
        if (!sErr) {
          if (s?.processing_stage === 'complete') {
            setBlockingStage('complete');
            setShowBlockingProgress(false);
            setOnboardingData(prev => ({ ...prev, resume: file }));
            setResumeCompleted(true);
            // Client-side resume duration (server also logs in evaluation_runs)
            try {
              if (resumeStartMs) {
                const resumeMs = Date.now() - resumeStartMs;
                await authSupabase.from('evaluation_runs').insert({
                  user_id: session.user.id,
                  session_id: (session as any)?.session?.id || (session as any).user?.id,
                  source_id: source.id,
                  file_type: 'resume_client',
                  total_latency_ms: resumeMs
                });
              }
            } catch {}
            
            // Generate stories from work_items (async, non-blocking)
            try {
              const { generateStoriesForWorkItems } = await import('@/services/storiesGenerationService');
              console.log(`[Onboarding] Generating stories for resume work_items...`);
              generateStoriesForWorkItems(
                session.user.id,
                source.id,
                import.meta.env.VITE_OPENAI_API_KEY
              ).then(({ storiesCreated, errors }) => {
                console.log(`[Onboarding] Stories generation complete: ${storiesCreated} created`);
                if (errors.length > 0) {
                  console.warn(`[Onboarding] Story generation errors:`, errors);
                }
              }).catch(err => {
                console.warn('[Onboarding] Story generation failed (non-critical):', err);
              });
            } catch (importError) {
              console.warn('[Onboarding] Could not import story generation service:', importError);
            }
            
            return { success: true, fileId: source.id };
          }
          if (s?.processing_stage === 'skeleton') setBlockingStage('skeleton');
          if (s?.processing_stage === 'skills') setBlockingStage('skills');
          if (s?.processing_stage === 'error') {
            setBlockingStage('error');
            setShowBlockingProgress(false);
            return { success: false, error: s?.processing_error || 'Processing failed' };
          }
        }
        await new Promise(r => setTimeout(r, 1000));
      }
      // Ensure the function promise settles; if it threw earlier, surface timeout
      await Promise.race([fnPromise, Promise.resolve()]);
      return { success: false, error: 'Processing timeout' };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Upload failed' };
    }
  }, [setCurrentStep, setOnboardingData, setResumeCompleted]);

  // Streaming: onboarding analysis
  const {
    state: onboardingJob,
    createJob: createOnboardingJob,
    isStreaming: isOnboardingStreaming,
    error: onboardingError,
  } = useOnboardingJobStream({ pollIntervalMs: 2000, timeout: 300000 });

  const obStageOrder = ['linkedInFetch', 'profileStructuring', 'derivedArtifacts'] as const;
  const obCompleted = obStageOrder.filter(
    (k) => (onboardingJob?.stages as any)?.[k]?.status === 'complete'
  ).length;
  const obPct = Math.round((obCompleted / obStageOrder.length) * 100);

  // Check if user signed up with LinkedIn
  const isLinkedInUser = user?.app_metadata?.provider === 'linkedin_oidc' || 
                        user?.identities?.some(identity => identity.provider === 'linkedin_oidc');
  
  // Extract LinkedIn ID from OAuth data if available
  const linkedinIdentity = user?.identities?.find(id => id.provider === 'linkedin_oidc');
  const linkedinId = linkedinIdentity?.identity_data?.id;
  const linkedinUrl = linkedinId ? `https://linkedin.com/in/${linkedinId}` : onboardingData.linkedinUrl;

  const handleNextStep = () => {
    switch (currentStep) {
      case 'welcome':
        setCurrentStep('upload');
        break;
      case 'upload':
        setCurrentStep('review');
        // Kick off final analysis when entering review if uploads are present
        if (!isOnboardingStreaming) {
          void startFinalAnalysis();
        }
        break;
      case 'review':
        try {
          startTour();
        } catch (error) {
          console.error('Error starting tour:', error);
        }
        break;
      default:
        setCurrentStep('welcome');
    }
  };

  // Pull a LinkedIn profile URL from free-form text
  function extractLinkedInUrl(text: string): string | null {
    if (!text) return null;
    // Match common LinkedIn profile URL variants
    const re = /(https?:\/\/)?(www\.)?linkedin\.com\/(in|pub)\/[A-Za-z0-9\-_%/]+/i;
    const m = text.match(re);
    return m ? m[0] : null;
  }

  const handleFileUpload = (type: 'resume' | 'coverLetter', file: File | null) => {
    if (file === null) {
      // Clear the file from state
      if (type === 'coverLetter') {
        setOnboardingData(prev => ({ ...prev, coverLetterFile: undefined }));
        setCoverLetterCompleted(false);
        setClStartMs(null);
      } else if (type === 'resume') {
        setOnboardingData(prev => ({ ...prev, [type]: undefined }));
        setResumeCompleted(false);
        setResumeStartMs(null);
      }
    } else {
      // Set the file in state
      if (type === 'coverLetter') {
        setOnboardingData(prev => ({ ...prev, coverLetterFile: file }));
        // Start CL timer on first selection
        if (!clStartMs) setClStartMs(Date.now());
      } else {
        setOnboardingData(prev => ({ ...prev, [type]: file }));
      }
    }
  };

  const handleUploadComplete = async (fileId: string, uploadType: string) => {
    // Store the file ID for later reference
    setOnboardingData(prev => ({ 
      ...prev, 
      [`${uploadType}FileId`]: fileId 
    }));
    
    // Mark steps as completed
    if (uploadType === 'resume') {
      setResumeCompleted(true);
      
      // Check if resume contains LinkedIn URL and auto-populate
      await checkAndAutoPopulateLinkedIn(fileId);
    } else if (uploadType === 'linkedin') {
      setLinkedinCompleted(true);
    } else if (uploadType === 'coverLetter') {
      setCoverLetterCompleted(true);
      // Log CL latency
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && clStartMs) {
          const url = (import.meta.env?.VITE_SUPABASE_URL) || '';
          const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
          const authSupabase = createSbClient(url, key, {
            global: { headers: { Authorization: `Bearer ${session.access_token}` } }
          });
          const clMs = Date.now() - clStartMs;
          await authSupabase.from('evaluation_runs').insert({
            user_id: session.user.id,
            session_id: (session as any)?.session?.id || (session as any).user?.id,
            file_type: 'cover_letter',
            total_latency_ms: clMs
          });
        }
      } catch {}
    }
    
    // Clear processing state after upload completes
    // This ensures button is enabled after all uploads are done
    setIsProcessing(false);
  };

  const handleUploadError = (error: string) => {
    console.warn('Background processing error:', error);
    // Don't block user flow, just log the error
  };

  const handleLinkedInUrl = (url: string) => {
    setOnboardingData(prev => ({ ...prev, linkedinUrl: url }));
    // Note: linkedinCompleted will be set by handleUploadComplete when PDL processing finishes
  };

  const handleCoverLetterText = (text: string) => {
    setOnboardingData(prev => ({ ...prev, coverLetter: text }));
  };

  const startFinalAnalysis = async () => {
    try {
      const linkedInData = linkedinUrl ? { url: linkedinUrl } : undefined;
      await createOnboardingJob('onboarding' as any, {
        linkedInData,
        resumeText: undefined,
        coverLetterText: onboardingData.coverLetter,
        source: 'finalAnalysis',
      } as any);
    } catch (e) {
      console.error('[Onboarding] Failed to start streaming analysis', e);
    }
  };

  useEffect(() => {
    let processingTimeout: NodeJS.Timeout | null = null;

    const handleFileUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { stage?: string } | undefined;
      const stage = detail?.stage;
      if (!stage) return;

      if (['uploading', 'extracting', 'analyzing', 'structuring'].includes(stage)) {
        setIsProcessing(true);
        
        // Safety timeout: clear processing state after 120 seconds if no completion event
        // Increased from 30s to accommodate LLM analysis + gap detection batch call
        if (processingTimeout) clearTimeout(processingTimeout);
        processingTimeout = setTimeout(() => {
          console.warn('[Onboarding] Processing timeout - clearing isProcessing state');
          setIsProcessing(false);
        }, 120000);
      }

      if (stage === 'complete' || stage === 'duplicate') {
        if (processingTimeout) {
          clearTimeout(processingTimeout);
          processingTimeout = null;
        }
        setIsProcessing(false);
      }
    };

    const handleUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { step?: string } | undefined;
      const step = detail?.step;
      if (!step) return;

      if (step === 'saving') {
        setIsProcessing(true);
        
        // Safety timeout: clear processing state after 120 seconds if no completion event
        // Increased from 30s to accommodate LLM analysis + gap detection batch call
        if (processingTimeout) clearTimeout(processingTimeout);
        processingTimeout = setTimeout(() => {
          console.warn('[Onboarding] Processing timeout - clearing isProcessing state');
          setIsProcessing(false);
        }, 120000);
      }

      if (step === 'complete') {
        if (processingTimeout) {
          clearTimeout(processingTimeout);
          processingTimeout = null;
        }
        setIsProcessing(false);
      }
    };

    window.addEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
    window.addEventListener('upload:progress', handleUploadProgress as EventListener);

    return () => {
      if (processingTimeout) clearTimeout(processingTimeout);
      window.removeEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
      window.removeEventListener('upload:progress', handleUploadProgress as EventListener);
    };
  }, []);

  // Auto-clear processing state when all uploads are complete
  useEffect(() => {
    if (resumeCompleted && linkedinCompleted && coverLetterCompleted) {
      // All uploads complete - proceed to confirmation automatically
      setIsProcessing(false);
      // Log overall onboarding total time
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session && onboardingStartMs) {
            const url = (import.meta.env?.VITE_SUPABASE_URL) || '';
            const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
            const authSupabase = createSbClient(url, key, {
              global: { headers: { Authorization: `Bearer ${session.access_token}` } }
            });
            const totalMs = Date.now() - onboardingStartMs;
            await authSupabase.from('evaluation_runs').insert({
              user_id: session.user.id,
              session_id: (session as any)?.session?.id || (session as any).user?.id,
              file_type: 'onboarding_total',
              total_latency_ms: totalMs
            });
          }
        } catch {}
      })();
      setCurrentStep('review');
    }
  }, [resumeCompleted, linkedinCompleted, coverLetterCompleted]);

  /**
   * Check if resume contains LinkedIn URL and auto-populate Step 2
   */
  const checkAndAutoPopulateLinkedIn = async (resumeFileId: string) => {
    if (!user) return;

    try {
      const { data: fileData, error } = await supabase
        .from('sources')
        .select('structured_data')
        .eq('id', resumeFileId)
        .eq('user_id', user.id)
        .single();

      if (error || !fileData) {
        return;
      }

      const structuredData = (fileData as any).structured_data;
      const linkedinUrl = structuredData?.contactInfo?.linkedin;

      if (!linkedinUrl) {
        return;
      }

      const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
      if (!normalizedUrl || !isValidLinkedInUrl(normalizedUrl)) {
        return;
      }

      setOnboardingData(prev => ({ ...prev, linkedinUrl: normalizedUrl }));
      setAutoPopulatingLinkedIn(true);

      try {
        if (linkedInUpload?.connectLinkedIn) {
          // Start LI timer
          setLiStartMs(Date.now());
          const result = await linkedInUpload.connectLinkedIn(normalizedUrl);
          if (result?.success) {
            setLinkedinAutoCompleted(true);
            await handleUploadComplete(result.fileId || `linkedin_${Date.now()}`, 'linkedin');
            // Log LI latency
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session && liStartMs) {
                const url = (import.meta.env?.VITE_SUPABASE_URL) || '';
                const key = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
                const authSupabase = createSbClient(url, key, {
                  global: { headers: { Authorization: `Bearer ${session.access_token}` } }
                });
                const liMs = Date.now() - liStartMs;
                await authSupabase.from('evaluation_runs').insert({
                  user_id: session.user.id,
                  session_id: (session as any)?.session?.id || (session as any).user?.id,
                  file_type: 'linkedin',
                  total_latency_ms: liMs
                });
              }
            } catch {}
          }
        }
      } finally {
        setAutoPopulatingLinkedIn(false);
      }
    } catch (error) {
      console.error('Error during LinkedIn auto-population:', error);
      setAutoPopulatingLinkedIn(false);
    }
  };

  const renderWelcomeStep = () => (
    <div className="space-y-8">
      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-center relative">
          <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
          <div className="flex items-center space-x-8">
            {/* Step 1: Welcome */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                Welcome
              </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 2: Upload */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'upload' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 3: Review */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'review' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : ['welcome', 'upload'].includes(currentStep) ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                Review
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Welcome Content */}
      <div className="text-center space-y-8 max-w-3xl mx-auto">
        <div className="space-y-4">
       
          <h1 className="text-4xl font-bold text-foreground">
            Welcome to Narrata!
          </h1>
          <p className="text-lg text-muted-foreground">
            Setting up your profile is simple and fast
          </p>
        </div>

        {/* Have Ready Section */}
        <div className="text-left space-y-4 bg-slate-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-foreground">Have ready</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">•</span>
              <span>Your most recent resume (PDF, DOCX, TXT)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">•</span>
              <span>Your best cover letter (PDF, DOCX, TXT)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 font-bold mt-1">•</span>
              <span>Your LinkedIn profile URL (if included in your resume, we extract automatically)</span>
            </li>
          </ul>
        </div>

        {/* How It Works Section */}
        <div className="text-left space-y-3">
          <h2 className="text-xl font-semibold text-foreground">How it works</h2>
          <p className="text-muted-foreground">
            Upload your documents on the next screen. We'll import your work history, create a smart cover letter template, and flag any issues worth addressing before applying to new jobs.
          </p>
        </div>

        {/* How Long It Takes Section */}
        <div className="text-left space-y-3">
          <h2 className="text-xl font-semibold text-foreground">How long it takes</h2>
          <p className="text-muted-foreground font-semibold">About 1 minute</p>
          <p className="text-muted-foreground">
            Once we finish, you'll get summary of everything we imported.
          </p>
        </div>

        {/* CTA */}
        <div className="space-y-2 pt-4">
          <Button 
            size="lg" 
            onClick={handleNextStep}
            className="px-8 py-3 text-lg"
          >
            Continue to Upload
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );

  // Streaming upload UI removed per UI rollback request

  const renderUploadStep = () => (
    <div className="space-y-8">
      {/* Global progress (blocking, single indicator) */}
      {showBlockingProgress && currentStep === 'upload' && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Progress value={(stageConfig[blockingStage] || stageConfig.pending).percent} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {(stageConfig[blockingStage] || stageConfig.pending).label}
            </span>
          </div>
        </div>
      )}
      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-center relative">
          <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
          <div className="flex items-center space-x-8">
            {/* Step 1: Welcome */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                Welcome
              </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 2: Upload */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'upload' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : currentStep === 'welcome' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
            </div>
            
            {/* Connector line */}
            <div className="w-12 h-0.5 bg-gray-200"></div>
            
            {/* Step 3: Review */}
            <div className="flex items-center gap-3">
              <div className="relative">
                {currentStep === 'review' ? (
                  <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white"></div>
                  </div>
                ) : ['welcome', 'upload'].includes(currentStep) ? (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                )}
              </div>
              <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                Review
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Add Your Content
        </h2>
      </div>

      <div className="flex flex-col gap-6">
        {/* Resume */}
        <div>
          <FileUploadCard
            type="resume"
            title="Resume"
            description="Upload your resume to get started"
            icon={FileText}
            onFileUpload={handleFileUpload}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            currentValue={onboardingData.resume}
            required={true}
            customUpload={resumeBlockingUpload}
          />
        </div>
        
        {/* Cover Letter (placed before LinkedIn; enabled once resume flow starts) */}
        <div ref={coverLetterRef}>
          <div className={!resumeGateOpen ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploadCard
              type="coverLetter"
              title="Best Cover Letter"
              description={resumeGateOpen 
                ? "Upload or paste your best cover letter example" 
                : "Complete resume upload first"}
              icon={Mail}
              onTextInput={handleCoverLetterText}
              onFileUpload={handleFileUpload}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              currentValue={(onboardingData as any).coverLetterFile || onboardingData.coverLetter}
              disabled={!resumeGateOpen}
              required={true}
            />
          </div>
        </div>

        {/* LinkedIn (moved after Cover Letter; enabled once resume flow starts) */}
        <div ref={linkedinRef}>
          <div className={!resumeGateOpen ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploadCard
              type="linkedin"
              title="LinkedIn Profile"
              description={autoPopulatingLinkedIn 
                ? "✨ Auto-populating from resume..." 
                : linkedinAutoCompleted && linkedinCompleted
                  ? "LinkedIn profile imported from your resume"
                  : resumeGateOpen 
                    ? (linkedinUrl 
                      ? "LinkedIn URL found in resume - click Connect to enrich" 
                      : "Enter your LinkedIn URL to enrich your work history")
                    : "Complete resume upload first"}
              icon={LinkedinIcon}
              onLinkedInUrl={handleLinkedInUrl}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              currentValue={linkedinUrl}
              disabled={!resumeGateOpen || autoPopulatingLinkedIn}
              required={true}
            />
          </div>
        </div>
        
      </div>

      {/* Button removed in blocking UX; auto-advance on completion */}
    </div>
  );

  const renderReviewStep = () => {
    return (
      <div className="space-y-8">
        {/* Progress Bar */}
        <Card className="p-6">
          <div className="flex items-center justify-center relative">
            <h3 className="font-semibold text-gray-900 absolute left-0">Progress</h3>
            <div className="flex items-center space-x-8">
              {/* Step 1: Welcome */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'welcome' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${currentStep === 'welcome' ? 'text-blue-600' : 'text-gray-900'}`}>
                  Welcome
                </span>
              </div>
              
              {/* Connector line */}
              <div className="w-12 h-0.5 bg-gray-200"></div>
              
              {/* Step 2: Upload */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'upload' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : currentStep === 'welcome' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                     <span className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}>
                       Content
                     </span>
              </div>
              
              {/* Connector line */}
              <div className="w-12 h-0.5 bg-gray-200"></div>
              
              {/* Step 3: Review */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {currentStep === 'review' ? (
                    <div className="w-8 h-8 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white"></div>
                    </div>
                  ) : ['welcome', 'upload'].includes(currentStep) ? (
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 bg-white"></div>
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
                <span className={`text-sm font-medium ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-900'}`}>
                  Summary
                </span>
              </div>
            </div>
          </div>
        </Card>

        <ImportSummaryStep onNext={handleNextStep} />
      </div>
    );
  };

  const renderTourStep = () => (
    <div className="space-y-8 text-center">
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">
          Ready for Your Product Tour!
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Let's walk through your new profile and show you how to use your content to generate cover letters.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-blue-900">Work History & Stories</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-blue-800 text-sm">
              See your approved stories and LinkedIn connections
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-purple-900">Templates & Saved Sections</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-purple-800 text-sm">
              Review your cover letter sections and templates
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-900">Cover Letter Generator</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-green-800 text-sm">
              Create your first targeted cover letter
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          The tour will take you through each page and highlight your newly-imported content.
        </p>
        <Button 
          size="lg" 
          onClick={startTour}
          className="px-8 py-3 text-lg"
        >
          Start Product Tour
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    try {
      switch (currentStep) {
        case 'welcome':
          return renderWelcomeStep();
        case 'upload':
          return renderUploadStep();
        case 'review':
          return (
            <>
              {isOnboardingStreaming || onboardingJob?.status === 'running' ? (
                <div className="mb-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">Analyzing your profile… {obPct}%</div>
                    <Badge variant="secondary">{onboardingJob?.status ?? 'pending'}</Badge>
                  </div>
                  <StageStepper
                    className="mt-3"
                    percent={obPct}
                    stages={[
                      { key: 'linkedInFetch', label: 'LinkedIn fetch' },
                      { key: 'profileStructuring', label: 'Profile structuring' },
                      { key: 'derivedArtifacts', label: 'Templates & baseline' },
                    ]}
                    statusByKey={{
                      linkedInFetch: (onboardingJob?.stages as any)?.linkedInFetch?.status || 'running',
                      profileStructuring: (onboardingJob?.stages as any)?.profileStructuring?.status || 'pending',
                      derivedArtifacts: (onboardingJob?.stages as any)?.derivedArtifacts?.status || 'pending',
                    }}
                  />
                </div>
              ) : null}
              {renderReviewStep()}
            </>
          );
        default:
          return renderWelcomeStep();
      }
    } catch (error: any) {
      console.error('Error rendering step:', error);
      return (
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-red-600">Error Loading Step</h2>
          <p className="text-gray-600">Current step: {currentStep}</p>
          <p className="text-gray-600">Error: {error.message}</p>
          <Button onClick={() => setCurrentStep('welcome')}>
            Return to Welcome
          </Button>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
