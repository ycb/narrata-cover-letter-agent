import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@/components/ui/progress";
import { isLinkedInScrapingEnabled } from "@/lib/flags";
import { PersonalDataService } from "@/services/personalDataService";

type OnboardingStep = 'welcome' | 'upload' | 'review';

interface OnboardingData {
  resume?: File | string;
  linkedinUrl?: string;
  coverLetter?: string;
  coverLetterFile?: File | string;
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
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState<{ percent: number; message: string; stage: string }>({
    percent: 0,
    message: '',
    stage: 'idle',
  });
  // Per-task progress for aggregation into the single global bar
  const [taskProgress, setTaskProgress] = useState<Record<'resume' | 'coverLetter' | 'linkedin', number>>({
    resume: 0,
    coverLetter: 0,
    linkedin: 0,
  });
  const [resumeCompleted, setResumeCompleted] = useState(false);
  const [linkedinCompleted, setLinkedinCompleted] = useState(false);
  const [coverLetterCompleted, setCoverLetterCompleted] = useState(false);
  // Timing metrics (ms since epoch)
  const [onboardingStartMs, setOnboardingStartMs] = useState<number | null>(null);
  const [resumeStartMs, setResumeStartMs] = useState<number | null>(null);
  const [clStartMs, setClStartMs] = useState<number | null>(null);
  const [liStartMs, setLiStartMs] = useState<number | null>(null);
  const linkedinRef = useRef<HTMLDivElement>(null);
  const coverLetterRef = useRef<HTMLDivElement>(null);


  const [autoPopulatingLinkedIn, setAutoPopulatingLinkedIn] = useState(false);
  const [linkedinAutoCompleted, setLinkedinAutoCompleted] = useState(false);
  const [linkedinPrefetchAttempted, setLinkedinPrefetchAttempted] = useState(false);
  const [linkedinPrefetchSuccess, setLinkedinPrefetchSuccess] = useState(false);
  const { startTour } = useTour();
  const { user, profile, refreshOnboardingStatus } = useAuth();
  const linkedInUpload = useLinkedInUpload();
  const [prefillComplete, setPrefillComplete] = useState(false);

  useEffect(() => {
    if (!profile) return;
    if ((profile as any).preferred_dashboard === 'main') {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  useEffect(() => {
    setPrefillComplete(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || prefillComplete) return;

    let isMounted = true;

    const seedFromExistingUploads = async () => {
      try {
        const assets = await PersonalDataService.getAssets(user.id);
        if (!isMounted) return;

        const resumeAsset = assets.find(
          asset => asset.sourceType === 'resume' && asset.processingStatus === 'completed'
        );
        const coverLetterAsset = assets.find(
          asset => asset.sourceType === 'cover_letter' && asset.processingStatus === 'completed'
        );

        if (!resumeAsset && !coverLetterAsset) {
          setPrefillComplete(true);
          return;
        }

        if (resumeAsset) {
          setResumeCompleted(true);
          setOnboardingData(prev => ({ ...prev, resume: resumeAsset.fileName }));
        }

        if (coverLetterAsset) {
          setCoverLetterCompleted(true);
          setOnboardingData(prev => ({ ...prev, coverLetterFile: coverLetterAsset.fileName }));
        }

        const tasks: Array<'resume' | 'coverLetter' | 'linkedin'> = isLinkedInScrapingEnabled()
          ? ['resume', 'coverLetter', 'linkedin']
          : ['resume', 'coverLetter'];

        const seededProgress: Record<'resume' | 'coverLetter' | 'linkedin', number> = {
          resume: resumeAsset ? 95 : 0,
          coverLetter: coverLetterAsset ? 95 : 0,
          linkedin: linkedinCompleted ? 95 : 0,
        };

        setTaskProgress(prev => ({
          ...prev,
          ...seededProgress,
        }));

        const total = tasks.reduce((sum, key) => sum + seededProgress[key], 0);
        const percent = Math.min(total / tasks.length, 99);

        if (percent > 0) {
          const message = resumeAsset && coverLetterAsset
            ? 'All sources complete'
            : resumeAsset
              ? 'Resume: Upload complete'
              : 'Cover letter: Upload complete';
          setGlobalProgress({ percent, message, stage: 'seeded' });
        }

        if (resumeAsset || coverLetterAsset) {
          setCurrentStep(resumeAsset && coverLetterAsset ? 'review' : 'upload');
        }
      } catch (err) {
        console.warn('[Onboarding] Failed to load existing uploads:', err);
      } finally {
        if (isMounted) {
          setPrefillComplete(true);
        }
      }
    };

    void seedFromExistingUploads();

    return () => {
      isMounted = false;
    };
  }, [user?.id, prefillComplete, linkedinCompleted]);
  
  // Approved blocking progress bar (tracks active upload)
  const [uploadingFile, setUploadingFile] = useState<'resume' | 'coverLetter' | 'linkedin' | null>(null);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadPercent, setUploadPercent] = useState(0);

  // Listen for file upload progress events
  useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const fileType = detail.fileType || detail.type;
      const stage = detail.stage || '';
      const percent = detail.percent || detail.progress || 0;
      const label = detail.label || detail.message || '';
      
      // Only show overlay during actual file upload/extraction stages
      const isUploadStage = ['uploading', 'extracting', 'extracted', 'text_ready'].includes(stage);
      if (fileType && percent < 100 && isUploadStage) {
        setUploadingFile(fileType);
        setUploadStage(label);
        setUploadPercent(percent);
      } else if (percent === 100 && isUploadStage) {
        // Hide after brief delay
        setTimeout(() => {
          setUploadingFile(null);
          setUploadStage('');
          setUploadPercent(0);
        }, 500);
      }
    };

    window.addEventListener('file-upload-progress', handleProgress);
    return () => window.removeEventListener('file-upload-progress', handleProgress);
  }, []);

  // Streaming: onboarding analysis
  const {
    state: onboardingJob,
    createJob: createOnboardingJob,
    isStreaming: isOnboardingStreaming,
    error: onboardingError,
  } = useOnboardingJobStream({
    pollIntervalMs: 2000,
    timeout: 300000,
    onProgress: (stage, data) => {
      // Map backend onboarding stages to a coarse percent and readable label
      const stagePercents: Record<string, number> = {
        linkedInFetch: 45,
        profileStructuring: 70,
        derivedArtifacts: 90,
      };
      const messages: Record<string, string> = {
        linkedInFetch: (() => {
          const jobs = data?.jobsCount;
          const skills = data?.skillsCount;
          if (jobs || skills) {
            const parts = [
              jobs ? `${jobs} roles detected` : null,
              skills ? `${skills} skills noted` : null,
            ].filter(Boolean);
            return `LinkedIn parsed${parts.length ? ` (${parts.join(', ')})` : ''}`;
          }
          return 'LinkedIn parsed';
        })(),
        profileStructuring: (() => {
          const roles = data?.workHistoryItems;
          const stories = data?.storiesIdentified;
          const themes = data?.coreThemesCount;
          const parts = [
            roles ? `${roles} roles` : null,
            stories ? `${stories} stories` : null,
            themes ? `${themes} themes` : null,
          ].filter(Boolean);
          return `Profile skeleton${parts.length ? ` (${parts.join(', ')})` : ''}`;
        })(),
        derivedArtifacts: (() => {
          const suggested = data?.suggestedStories;
          const confidence = data?.confidenceScore;
          const parts = [
            suggested ? `${suggested} suggestions` : null,
            typeof confidence === 'number' ? `confidence ${confidence}%` : null,
          ].filter(Boolean);
          return `Profile insights${parts.length ? ` (${parts.join(', ')})` : ''}`;
        })(),
      };

      const percent = stagePercents[stage] ?? 60;
      const message = messages[stage] || stage;
      setGlobalProgress(prev => {
        if (prev.percent >= 100) return prev;
        return {
          percent: Math.max(prev.percent, percent),
          message,
          stage,
        };
      });
      setIsProcessing(true);
    },
  });

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
      // Reset global progress when a new upload starts to avoid flicker
      setGlobalProgress({ percent: 1, message: 'Starting upload...', stage: 'starting' });
      // Reset that task’s progress to a small non-zero value so aggregation is honest
      setTaskProgress(prev => ({ ...prev, [type]: 1 }));
      setIsProcessing(true);
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
    let nextResumeDone = resumeCompleted;
    let nextLinkedInDone = linkedinCompleted;
    let nextCoverDone = coverLetterCompleted;

    if (uploadType === 'resume') {
      nextResumeDone = true;
      setResumeCompleted(true);
      // Check if resume contains LinkedIn URL and auto-populate
      await checkAndAutoPopulateLinkedIn(fileId);
    } else if (uploadType === 'linkedin') {
      nextLinkedInDone = true;
      setLinkedinCompleted(true);
    } else if (uploadType === 'coverLetter') {
      nextCoverDone = true;
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

    // If all three are done, advance immediately and sync global progress
    if (nextResumeDone && nextLinkedInDone && nextCoverDone) {
      setGlobalProgress({ percent: 100, message: 'All sources complete', stage: 'complete' });
      setIsProcessing(false);
      setCurrentStep('review');
    }
    
    // Clear processing state after upload completes
    // This ensures button is enabled after all uploads are done
    setIsProcessing(false);
    if (uploadType === 'resume' || uploadType === 'coverLetter') {
      void refreshOnboardingStatus();
    }
  };

  const handleUploadError = (error: string) => {
    console.warn('Background processing error:', error);
    // Don't block user flow, just log the error
  };

  const handleLinkedInUrl = async (url: string) => {
    setOnboardingData(prev => ({ ...prev, linkedinUrl: url }));
    
    // Feature flag: If scraping disabled, this shouldn't be called
    // (Connect button should be disabled), but handle it gracefully
    if (!isLinkedInScrapingEnabled()) {
      console.log('📌 LinkedIn scraping disabled - Connect button should be disabled');
      return;
    }
    
    // Emit progress: Connecting
    window.dispatchEvent(new CustomEvent('file-upload-progress', {
      detail: { 
        stage: 'connecting', 
        percent: 50, 
        label: 'Connecting to LinkedIn...', 
        fileType: 'linkedin' 
      }
    }));
    
    // User clicked Connect button
    // If prefetch succeeded, this will be instant. If failed or not attempted, retry now.
    if (!linkedinPrefetchSuccess) {
      console.log('🔄 LinkedIn Connect: calling Appify...');
      try {
        const result = await linkedInUpload.connectLinkedIn(url);
        if (result.success) {
          console.log('✅ LinkedIn Connect succeeded:', result);
        } else {
          console.warn('⚠️ LinkedIn Connect failed:', result.error);
          // Still mark as completed - user gave permission
        }
      } catch (error) {
        console.error('❌ LinkedIn Connect error:', error);
        // Still mark as completed - user gave permission
      }
    } else {
      console.log('✅ LinkedIn Connect: using prefetched data');
    }
    
    // Emit progress: Connected
    window.dispatchEvent(new CustomEvent('file-upload-progress', {
      detail: { 
        stage: 'connected', 
        percent: 100, 
        label: 'Connected to LinkedIn!', 
        fileType: 'linkedin' 
      }
    }));
    
    // Set completed regardless of Appify success (user gave permission)
    setLinkedinCompleted(true);
  };

  const handleCoverLetterText = (text: string) => {
    setOnboardingData(prev => ({ ...prev, coverLetter: text }));
  };

  const startFinalAnalysis = async () => {
    try {
      const linkedInData = isLinkedInScrapingEnabled() && linkedinUrl
        ? { url: linkedinUrl }
        : undefined;
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

    // Compute required tasks based on LI flag
    const getRequiredTasks = () => isLinkedInScrapingEnabled()
      ? (['resume', 'coverLetter', 'linkedin'] as const)
      : (['resume', 'coverLetter'] as const);

    const applyAggregatedProgress = (
      fileType: 'resume' | 'coverLetter' | 'linkedin',
      rawPercent: number,
      label?: string,
      stage?: string,
      counts?: Record<string, unknown>
    ) => {
      // Cap per-task at 95% to avoid premature global 100
      const capped = Math.min(rawPercent, 95);
      setTaskProgress(prev => {
        const next = { ...prev, [fileType]: capped };
        const required = getRequiredTasks();
        const avg = required.reduce((sum, t) => sum + (next[t] || 0), 0) / required.length;
        const boundedAvg = Math.min(avg, 99);
        const fileLabels: Record<'resume' | 'coverLetter' | 'linkedin', string> = {
          resume: 'Resume',
          coverLetter: 'Cover letter',
          linkedin: 'LinkedIn',
        };
        const prefix = fileLabels[fileType];
        const countParts: string[] = [];
        if (counts) {
          const num = (key: string) => {
            const val = counts[key];
            return typeof val === 'number' ? val : undefined;
          };
          const mapping: Array<{ key: string; label: string }> = [
            { key: 'companiesFound', label: 'companies' },
            { key: 'rolesFound', label: 'roles' },
            { key: 'rolesProcessed', label: 'roles' },
            { key: 'storiesFound', label: 'stories' },
            { key: 'totalParagraphs', label: 'paragraphs' },
            { key: 'sectionsCount', label: 'sections' },
            { key: 'bodyParagraphs', label: 'body paragraphs' },
            { key: 'gapsFound', label: 'gaps' },
            { key: 'metricsFound', label: 'metrics' },
          ];
          mapping.forEach(({ key, label }) => {
            const val = num(key);
            if (val && val > 0) {
              countParts.push(`${val} ${label}`);
            }
          });
        }
        const labelHasCounts = label ? /\d/.test(label) : false;
        const countText = !labelHasCounts && countParts.length > 0 ? ` • ${countParts.join(', ')}` : '';
        setGlobalProgress(prevGp => {
          if (prevGp.percent >= 100) return prevGp;
          const nextPercent = Math.max(prevGp.percent, boundedAvg);
          return {
            percent: nextPercent,
            // Always update the message when a new label is provided, even if percent stalls
            message: label ? `${prefix}: ${label}${countText}` : prevGp.message,
            stage: stage || prevGp.stage,
          };
        });
        setIsProcessing(true);
        if (processingTimeout) clearTimeout(processingTimeout);
        processingTimeout = setTimeout(() => {
          console.warn('[Onboarding] Processing timeout - clearing isProcessing state');
          setIsProcessing(false);
        }, 120000);
        return next;
      });
    };

    const handleFileUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { stage?: string; percent?: number; label?: string; fileType?: string } | undefined;
      if (!detail?.stage) return;
      const { stage, percent = 0, label, fileType, ...rest } = detail;
      const taskKey: 'resume' | 'coverLetter' | 'linkedin' =
        fileType === 'coverLetter' ? 'coverLetter' : fileType === 'linkedin' ? 'linkedin' : 'resume';
      const message = label || stage;
      const mappedPercent = (() => {
        switch (stage) {
          case 'uploading':
          case 'extracting':
            return Math.max(percent, 20);
          case 'extracted':
          case 'text_ready':
            return Math.max(percent, 35);
          case 'linkedin_detected':
            return Math.max(percent, 37);
          case 'linkedin_fetch':
            return Math.max(percent, 45);
          case 'analyzing':
          case 'workHistorySkeleton':
          case 'roleStories':
          case 'skillsAndEducation':
            return Math.max(percent, 55);
          case 'structuring':
            return Math.max(percent, 75);
          case 'saving':
            return Math.max(percent, 85);
          case 'linkedin_complete':
            return Math.max(percent, 90);
          case 'saved':
            return Math.max(percent, 90);
          case 'done':
          case 'complete':
            return 95;
          default:
            return percent;
        }
      })();
      applyAggregatedProgress(taskKey, mappedPercent, message, fileType || stage, rest);
    };

    const handleUploadProgress = (event: Event) => {
      const detail = (event as CustomEvent).detail as { step?: string; progress?: number; message?: string; fileType?: string } | undefined;
      if (!detail?.step) return;
      const { step, progress = 0, message, fileType, ...rest } = detail;
      const taskKey: 'resume' | 'coverLetter' | 'linkedin' =
        fileType === 'coverLetter' ? 'coverLetter' : fileType === 'linkedin' ? 'linkedin' : 'resume';
      const mappedPercent = (() => {
        switch (step) {
          case 'extractingSkeleton':
            return Math.max(progress * 100, 40);
          case 'extractingStories':
            return Math.max(progress * 100, 60);
          case 'detectingGaps':
            return Math.max(progress * 100, 90);
          case 'linkedin_detected':
            return Math.max(progress * 100, 37);
          case 'complete':
            return 95;
          default:
            return progress * 100;
        }
      })();
      applyAggregatedProgress(taskKey, mappedPercent, message || step, fileType || step, rest);
    };

    window.addEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
    window.addEventListener('upload:progress', handleUploadProgress as EventListener);
    // Listen once for early LinkedIn detection (emitted when raw_text is saved)
    const earlyLinkedIn = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const url = detail?.url as string | undefined;
      if (!url) return;
      const normalized = normalizeLinkedInUrl(url);
      if (!normalized || !isValidLinkedInUrl(normalized)) return;
      setOnboardingData(prev => ({ ...prev, linkedinUrl: normalized }));
      setLinkedinAutoCompleted(false);
      setAutoPopulatingLinkedIn(false);
    };
    window.addEventListener('linkedin-detected', earlyLinkedIn as EventListener);

    return () => {
      if (processingTimeout) clearTimeout(processingTimeout);
      window.removeEventListener('file-upload-progress', handleFileUploadProgress as EventListener);
      window.removeEventListener('upload:progress', handleUploadProgress as EventListener);
      window.removeEventListener('linkedin-detected', earlyLinkedIn as EventListener);
    };
  }, []);

  // Auto-clear processing state when all uploads are complete
  useEffect(() => {
    // When LinkedIn scraping is disabled, only wait for resume + cover letter
    const liScrapingEnabled = isLinkedInScrapingEnabled();
    const allRequiredComplete = liScrapingEnabled 
      ? (resumeCompleted && linkedinCompleted && coverLetterCompleted)
      : (resumeCompleted && coverLetterCompleted);
    
    if (allRequiredComplete) {
      // All uploads complete - update global progress and proceed
      setGlobalProgress({ percent: 100, message: 'All sources complete', stage: 'complete' });
      setIsProcessing(false);
      setIsProcessing(false);
      // Kick off PM Levels in the background after onboarding artifacts exist
      if (user?.id) {
        import('@/services/pmLevelsEdgeClient')
          .then(({ schedulePMLevelBackgroundRun }) => {
            schedulePMLevelBackgroundRun({
              userId: user.id,
              reason: 'onboarding-complete',
              triggerReason: 'initial-load',
              runType: 'first-run',
              delayMs: 3000,
            });
          })
          .catch((err) => console.warn('[Onboarding] PM Levels schedule failed:', err));
      }
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
  }, [resumeCompleted, linkedinCompleted, coverLetterCompleted, user?.id]);

  // Auto-complete LinkedIn task when flag is off (immediately, no URL needed)
  useEffect(() => {
    if (!isLinkedInScrapingEnabled() && !linkedinCompleted) {
      console.log('📌 LinkedIn scraping disabled - marking as complete immediately');
      
      // Mark as complete (no progress events needed since card is hidden)
      setLinkedinCompleted(true);
      setLinkedinAutoCompleted(true);
    }
  }, [linkedinCompleted]);

  /**
   * Check if resume contains LinkedIn URL and auto-populate Step 2
   */
  const checkAndAutoPopulateLinkedIn = async (resumeFileId: string) => {
    if (!user) return;
    
    // Skip entire function if LinkedIn scraping is disabled
    if (!isLinkedInScrapingEnabled()) {
      console.log('📌 LinkedIn scraping disabled - skipping auto-populate check');
      return;
    }

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    const fetchStructured = async () => {
      const { data: fileData, error } = await supabase
        .from('sources')
        .select('structured_data, raw_text')
        .eq('id', resumeFileId)
        .eq('user_id', user.id)
        .single();
      if (error || !fileData) return null;

      const structured = (fileData as any).structured_data || {};
      const rawText = (fileData as any).raw_text;

      // If structured_data is empty but raw_text exists, return an object containing raw_text
      if (!structured || Object.keys(structured).length === 0) {
        if (rawText) {
          return { raw_text: rawText };
        }
        return null;
      }

      return { ...structured, raw_text: rawText };
    };

    let structuredData: any = null;
    for (let i = 0; i < 4; i++) {
      structuredData = await fetchStructured();
      if (structuredData && Object.keys(structuredData).length > 0) break;
      await delay(750);
    }
    if (!structuredData) return;

    // Check common locations for LinkedIn URL
    const candidates: Array<string | undefined> = [
      structuredData?.contactInfo?.linkedin,
      structuredData?.contact_info?.linkedin,
      structuredData?.linkedin,
      structuredData?.social?.linkedin,
    ];

    // Fallback: scan text blobs
    const blob = [
      structuredData.raw_text,
      structuredData.text,
      structuredData.fullText,
      structuredData.resumeText,
      structuredData.summary,
      JSON.stringify(structuredData),
    ]
      .filter(Boolean)
      .join('\n');
    const regexUrl = extractLinkedInUrl(blob);
    candidates.push(regexUrl || undefined);

    const linkedinUrl = candidates.find(u => !!u);
    if (!linkedinUrl) return;

    const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    if (!normalizedUrl || !isValidLinkedInUrl(normalizedUrl)) return;

    setOnboardingData(prev => ({ ...prev, linkedinUrl: normalizedUrl }));
    setLinkedinAutoCompleted(false);
    setAutoPopulatingLinkedIn(false);
    
    // Skip prefetch if LinkedIn scraping is disabled
    if (!isLinkedInScrapingEnabled()) {
      console.log('📌 LinkedIn scraping disabled - skipping prefetch');
      setLinkedinPrefetchAttempted(true);
      setLinkedinPrefetchSuccess(true); // Mark as "success" so connect doesn't retry
      return;
    }
    
    if (!linkedinPrefetchAttempted) {
      console.log('🔄 Silent LinkedIn prefetch starting for:', normalizedUrl);
      setLinkedinPrefetchAttempted(true);
      
      // Reuse the same connectLinkedIn flow for silent prefetch; UI will still require Connect click.
      linkedInUpload.connectLinkedIn(normalizedUrl)
        .then(result => {
          if (result.success) {
            console.log('✅ LinkedIn prefetch succeeded:', result);
            setLinkedinPrefetchSuccess(true);
          } else {
            console.warn('⚠️ LinkedIn prefetch failed (will retry on Connect):', result.error);
            setLinkedinPrefetchSuccess(false);
          }
        })
        .catch(error => {
          console.error('❌ LinkedIn prefetch error (will retry on Connect):', error);
          setLinkedinPrefetchSuccess(false);
        });
    }
  };

  const renderWelcomeStep = () => (
    <div className="space-y-8">
      {/* Progress Bar */}
      {isProcessing || globalProgress.percent > 0 ? (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Progress</span>
              <span className="text-sm text-gray-700">{globalProgress.percent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(globalProgress.percent, 100)}%` }}
              />
            </div>
            {globalProgress.message ? (
              <div className="text-xs text-gray-600">{globalProgress.message}</div>
            ) : null}
          </div>
        </Card>
      ) : null}

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
            {/* LinkedIn mention - HIDDEN when feature flag is OFF */}
            {isLinkedInScrapingEnabled() && (
              <li className="flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-1">•</span>
                <span>Your LinkedIn profile URL (if included in your resume, we extract automatically)</span>
              </li>
            )}
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
      {/* Global streaming progress (LLM + DB) */}
      {(isProcessing || globalProgress.percent > 0) && (
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-900">Progress</span>
              <span className="text-sm text-gray-700">{globalProgress.percent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(globalProgress.percent, 100)}%` }}
              />
            </div>
            {globalProgress.message ? (
              <div className="text-xs text-gray-600">{globalProgress.message}</div>
            ) : null}
          </div>
        </Card>
      )}

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
          />
        </div>
        
        {/* Cover Letter (parallel upload - streaming architecture) */}
        <div ref={coverLetterRef}>
          <FileUploadCard
            type="coverLetter"
            title="Best Cover Letter"
            description="Upload or paste your best cover letter example"
            icon={Mail}
            onTextInput={handleCoverLetterText}
            onFileUpload={handleFileUpload}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            currentValue={(onboardingData as any).coverLetterFile || onboardingData.coverLetter}
            required={true}
          />
        </div>

        {/* LinkedIn (parallel upload - streaming architecture) */}
        {/* HIDDEN when feature flag is OFF */}
        {isLinkedInScrapingEnabled() && (
          <div ref={linkedinRef}>
            <FileUploadCard
              type="linkedin"
              title="LinkedIn Profile"
              description={
                autoPopulatingLinkedIn 
                  ? "✨ Auto-populating from resume..." 
                  : linkedinAutoCompleted && linkedinCompleted
                    ? "LinkedIn profile imported from your resume"
                    : linkedinUrl 
                      ? "LinkedIn URL found in resume - click Connect to enrich" 
                      : "Enter your LinkedIn URL to enrich your work history"
              }
              icon={LinkedinIcon}
              onLinkedInUrl={handleLinkedInUrl}
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              currentValue={linkedinUrl}
              disabled={autoPopulatingLinkedIn}
              required={true}
            />
          </div>
        )}
        
      </div>

      {/* Button removed in blocking UX; auto-advance on completion */}
    </div>
  );

  const renderReviewStep = () => {
    return (
      <div className="space-y-8">

        <ImportSummaryStep
          onNext={handleNextStep}
          onBackToUploads={() => setCurrentStep('upload')}
        />
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
                      { key: 'linkedInFetch', label: 'Resume: ingest' },
                      { key: 'profileStructuring', label: 'Resume: extract' },
                      { key: 'derivedArtifacts', label: 'Resume: save insights' },
                    ]}
                    statusByKey={{
                      linkedInFetch: (onboardingJob?.stages as any)?.linkedInFetch?.status || 'running',
                      profileStructuring: (onboardingJob?.stages as any)?.profileStructuring?.status || 'pending',
                      derivedArtifacts: (onboardingJob?.stages as any)?.derivedArtifacts?.status || 'pending',
                    }}
                  />
                  {/* Value-centric counts */}
                  <div className="mt-3 text-xs text-muted-foreground space-y-1">
                    {(() => {
                      const li = (onboardingJob?.stages as any)?.linkedInFetch?.data || {};
                      const ps = (onboardingJob?.stages as any)?.profileStructuring?.data || {};
                      const da = (onboardingJob?.stages as any)?.derivedArtifacts?.data || {};
                      const rows: string[] = [];
                      if (li.jobsCount != null || li.skillsCount != null) {
                        rows.push(`LinkedIn: ${li.jobsCount || 0} roles, ${li.skillsCount || 0} skills`);
                      }
                      if (ps.workHistoryItems != null || ps.storiesIdentified != null || ps.coreThemesCount != null) {
                        rows.push(
                          `Resume: ${ps.workHistoryItems || 0} roles, ${ps.storiesIdentified || 0} stories, ${ps.coreThemesCount || 0} themes`
                        );
                      }
                      if (da.suggestedStories != null || da.confidenceScore != null) {
                        rows.push(
                          `Insights: ${da.suggestedStories || 0} story suggestions, confidence ${da.confidenceScore || 0}`
                        );
                      }
                      return rows.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1">
                          {rows.map((r) => (
                            <li key={r}>{r}</li>
                          ))}
                        </ul>
                      ) : null;
                    })()}
                  </div>
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
