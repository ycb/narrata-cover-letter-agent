import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  buildEffectiveSectionGapMap, 
  buildEffectiveGlobalGaps,
  logEmptyGapDiagnostic,
  type Gap,
} from '@/utils/gaps';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  Eye,
  FileText,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { JobDescriptionService } from '@/services/jobDescriptionService';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import { useCoverLetterDraft } from '@/hooks/useCoverLetterDraft';
import { useCoverLetterJobStream } from '@/hooks/useJobStream'; // Phase 2: Streaming hook
import { useAPhaseInsights } from '@/hooks/useAPhaseInsights'; // Task 5: A-phase streaming insights
import { StageStepper } from '@/components/streaming/StageStepper';
import { MatchMetricsToolbar } from './MatchMetricsToolbar';
import { CoverLetterFinalization } from './CoverLetterFinalization';
// Phase 2: CoverLetterSkeleton removed - skeleton is now a state in DraftEditor, not a separate component
import { CoverLetterDraftView } from './CoverLetterDraftView';
import { CoverLetterDraftEditor } from './CoverLetterDraftEditor'; // Phase 1: New shared editor
import { DraftProgressBanner } from './DraftProgressBanner'; // Progress banner moved to modal level
import { ContentCard } from '@/components/shared/ContentCard';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { AddSectionFromLibraryModal, type InvocationType } from './AddSectionFromLibraryModal';
import { SectionInsertButton } from '@/components/template-blurbs/SectionInsertButton';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { useToast } from '@/hooks/use-toast';
import { transformMetricsToMatchData, getUnresolvedRatingCriteria } from './useMatchMetricsDetails';
import { computeSectionAttribution } from './useSectionAttribution';
import type { CoverLetterDraft, JobDescriptionRecord, ParsedJobDescription } from '@/types/coverLetters';
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from '@/types/workHistory';
import { getApplicableStandards } from '@/config/contentStandards';
import { logAStreamEvent } from '@/lib/telemetry';

const MIN_JOB_DESCRIPTION_LENGTH = 50;

// Feature flag for A-phase streaming insights (Task 5)
const ENABLE_A_PHASE_INSIGHTS = true;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Dev-only logging helper (Task 5: streaming wiring diagnostics)
const devLog = (...args: unknown[]) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

type TemplateSummary = {
  id: string;
  name: string;
};

/**
 * CoverLetterModal - Unified Modal for Create and Edit
 * 
 * Phase 3: Single modal with thin wrappers
 * - All behavior lives here
 * - CoverLetterCreateModal and CoverLetterEditModal are thin wrappers
 * - DO NOT add logic to the wrapper files
 * 
 * Rollback point: e5ac588 (Phase 2 complete)
 */

interface CoverLetterModalProps {
  mode: 'create' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  
  // Create mode props
  onCoverLetterCreated?: (draft: CoverLetterDraft) => void;
  
  // Edit mode props
  initialDraft?: CoverLetterDraft | null;
  onSave?: () => void;
}

export const CoverLetterModal = ({
  mode,
  isOpen,
  onClose,
  onCoverLetterCreated,
  initialDraft = null,
  onSave,
}: CoverLetterModalProps) => {
  const { user } = useAuth();
  const { goals, setGoals } = useUserGoals();
  
  const [jobContent, setJobContent] = useState('');
  const [jobInputError, setJobInputError] = useState<string | null>(null);
  const [isParsingJobDescription, setIsParsingJobDescription] = useState(false);
  const [jdStreamingMessages, setJdStreamingMessages] = useState<string[]>([]);
  const [preParsedJD, setPreParsedJD] = useState<JobDescriptionRecord | null>(null);
  const [isPreParsing, setIsPreParsing] = useState(false);
  const [preParsedContent, setPreParsedContent] = useState('');
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateSections, setTemplateSections] = useState<CoverLetterSection[]>([]); // Phase 2: for skeleton
  const [jobDescriptionRecord, setJobDescriptionRecord] = useState<JobDescriptionRecord | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [selectedGap, setSelectedGap] = useState<Gap & { section_id?: string } | null>(null);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  // Phase 3: Initial tab based on mode (create starts with JD, edit starts with draft)
  const [mainTab, setMainTab] = useState<'job-description' | 'cover-letter'>('cover-letter');
  // Phase 3: Track draft generation separately from streaming
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  
  // UNIFIED SKELETON: Track if user has ever clicked Generate
  const [generationHasStarted, setGenerationHasStarted] = useState(false);
  
  // PROGRESS FIX: Track peak progress to prevent backwards movement during regeneration
  const [peakProgress, setPeakProgress] = useState(0);
  
  // PROGRESS ANIMATION: Simulated progress during draft generation (30% → 95%)
  const [animatedDraftProgress, setAnimatedDraftProgress] = useState(30);
  const enhancedHydratedRef = useRef(false);
  
  // Set initial tab when modal opens based on mode
  useEffect(() => {
    if (isOpen) {
      setMainTab(mode === 'create' ? 'job-description' : 'cover-letter');
    }
  }, [isOpen, mode]);
  const [sectionFocusContent, setSectionFocusContent] = useState<Record<string, string>>({}); // Track content at focus time
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryInvocation, setLibraryInvocation] = useState<InvocationType | null>(null);
  const [workHistoryLibrary, setWorkHistoryLibrary] = useState<WorkHistoryCompany[]>([]);
  const [savedSections, setSavedSections] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const { toast } = useToast();
  const preParseControllerRef = useRef<AbortController | null>(null);
  const preParseRequestIdRef = useRef(0);
  // Load work history and saved sections for library modal
  useEffect(() => {
    const loadLibraryData = async () => {
      if (!user?.id) return;

      setIsLibraryLoading(true);
      setLibraryError(null);

      try {
        // Fetch companies, work_items (roles), and stories in parallel
        const [
          { data: companies, error: companiesError },
          { data: workItems, error: workItemsError },
          { data: stories, error: storiesError }
        ] = await Promise.all([
          supabase.from('companies').select('id, name, description, created_at, updated_at').eq('user_id', user.id),
          supabase.from('work_items').select('id, title, description, company_id, start_date, end_date, tags, created_at, updated_at').eq('user_id', user.id),
          supabase.from('stories').select('id, title, content, status, confidence, tags, work_item_id, created_at, updated_at').eq('user_id', user.id)
        ]);

        if (companiesError) throw companiesError;
        if (workItemsError) throw workItemsError;
        if (storiesError) throw storiesError;

        // Build proper nested structure: Company → Roles → Blurbs
        const companyMap = new Map<string, WorkHistoryCompany>();
        const roleMap = new Map<string, WorkHistoryRole>();

        const ensureCompany = (companyId?: string | null): WorkHistoryCompany => {
          const fallbackId = companyId ?? 'unknown-company';
          if (!companyMap.has(fallbackId)) {
            const companyRecord = (companies || []).find((c) => c.id === fallbackId);
            companyMap.set(fallbackId, {
              id: fallbackId,
              name: companyRecord?.name || 'Untitled Company',
              description: companyRecord?.description || '',
              tags: [],
              source: 'resume',
              createdAt: companyRecord?.created_at || new Date().toISOString(),
              updatedAt: companyRecord?.updated_at || new Date().toISOString(),
              roles: []
            });
          }
          return companyMap.get(fallbackId)!;
        };

        // Build roles from work_items
        (workItems || []).forEach((item) => {
          const company = ensureCompany(item.company_id);
          const tagsArray = Array.isArray(item.tags) ? item.tags.map((t: unknown) => String(t)) : [];

          const role: WorkHistoryRole = {
            id: item.id,
            companyId: company.id,
            title: item.title || 'Role',
            type: 'full-time',
            startDate: item.start_date || '',
            endDate: item.end_date || undefined,
            description: item.description || '',
            tags: tagsArray,
            outcomeMetrics: [],
            blurbs: [],
            externalLinks: [],
            createdAt: item.created_at || new Date().toISOString(),
            updatedAt: item.updated_at || new Date().toISOString()
          };

          roleMap.set(item.id, role);
          company.roles.push(role);
        });

        // Attach stories (blurbs) to roles
        (stories || []).forEach((story) => {
          if (!story.work_item_id) return;
          const role = roleMap.get(story.work_item_id);
          if (!role) return;

          const blurb: WorkHistoryBlurb = {
            id: story.id,
            roleId: story.work_item_id,
            title: story.title || 'Untitled Story',
            content: story.content || '',
            outcomeMetrics: [],
            tags: Array.isArray(story.tags) ? story.tags.map((t: unknown) => String(t)) : [],
            source: 'resume',
            status: (story.status as WorkHistoryBlurb['status']) || 'draft',
            confidence: (story.confidence as WorkHistoryBlurb['confidence']) || 'medium',
            timesUsed: 0,
            linkedExternalLinks: [],
            hasGaps: false,
            gapCount: 0,
            createdAt: story.created_at || new Date().toISOString(),
            updatedAt: story.updated_at || new Date().toISOString()
          };

          role.blurbs.push(blurb);
        });

        // Convert map to array and filter to only companies with stories
        const result = Array.from(companyMap.values()).filter(
          (company) => company.roles.some((role) => role.blurbs.length > 0)
        );

        setWorkHistoryLibrary(result);
        setSavedSections([]);
      } catch (error) {
        console.error('[CoverLetterModal] Failed to load library data:', error);
        setLibraryError(error instanceof Error ? error.message : 'Failed to load library');
      } finally {
        setIsLibraryLoading(false);
      }
    };

    if (isOpen) {
      loadLibraryData();
    }
  }, [user?.id, isOpen]);

  const normalizedJobDescription = useMemo(() => {
    if (!jobDescriptionRecord) return null;
    const analysis = (jobDescriptionRecord.analysis as Record<string, any> | null) ?? {};
    const llmAnalysis = analysis.llm ?? {};
    const structured =
      jobDescriptionRecord.structuredData ??
      llmAnalysis.structuredData ??
      {};

    return {
      role: jobDescriptionRecord.role,
      company: jobDescriptionRecord.company,
      standardRequirements:
        structured.standardRequirements ??
        jobDescriptionRecord.standardRequirements ??
        llmAnalysis.standardRequirements ??
        [],
      preferredRequirements:
        structured.preferredRequirements ??
        jobDescriptionRecord.preferredRequirements ??
        llmAnalysis.preferredRequirements ??
        [],
      salary:
        structured.salary ??
        structured.compensation ??
        llmAnalysis.structuredData?.compensation,
      location: structured.location ?? llmAnalysis.structuredData?.location,
      workType: structured.workType ?? llmAnalysis.structuredData?.workType,
      structuredData: structured,
      analysis,
    };
  }, [jobDescriptionRecord]);

  const requirementLabelMap = useMemo(() => {
    if (!jobDescriptionRecord) return new Map<string, string>();
    const structured = normalizedJobDescription?.structuredData ?? {};
    const analysis = normalizedJobDescription?.analysis ?? {};
    const llmRequirements = (analysis as Record<string, any>).llm ?? {};
    const allRequirements = [
      ...(structured.standardRequirements ?? jobDescriptionRecord.standardRequirements ?? []),
      ...(structured.differentiatorRequirements ?? jobDescriptionRecord.differentiatorRequirements ?? []),
      ...(structured.preferredRequirements ?? jobDescriptionRecord.preferredRequirements ?? []),
      ...(llmRequirements.standardRequirements ?? []),
      ...(llmRequirements.preferredRequirements ?? []),
    ];

    const map = new Map<string, string>();
    allRequirements.forEach((req: any) => {
      if (!req) return;
      const id = String(req.id ?? req.requirement ?? req.label ?? req.detail ?? '');
      const label = req.requirement || req.label || req.detail;
      if (id && label && !map.has(id)) {
        map.set(id, label);
      }
    });
    return map;
  }, [jobDescriptionRecord, normalizedJobDescription]);

  const getRequirementTagsForSection = (section: { metadata?: { requirementsMatched?: string[] } }) => {
    const matchedIds = section.metadata?.requirementsMatched ?? [];
    if (!matchedIds.length) return [];
    return matchedIds
      .map(id => requirementLabelMap.get(String(id)) ?? null)
      .filter((label): label is string => Boolean(label));
  };

  const jobDescriptionService = useMemo(() => new JobDescriptionService(), []);
  const coverLetterDraftService = useMemo(() => new CoverLetterDraftService(), []);

  // Phase 3: Edit mode uses local state, create mode uses generation hook
  const [localDraft, setLocalDraft] = useState<CoverLetterDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Only use the draft generation hook in create mode
  const createModeHook = useCoverLetterDraft({
    userId: user?.id ?? '',
    service: coverLetterDraftService,
  });

  // Step 1: Initialize streaming hook (create mode only)
  const streamingHook = useCoverLetterJobStream({
    autoStart: true, // CRITICAL: Enable auto-polling after createJob
    pollIntervalMs: 2000,
    timeout: 300000,
  });

  // Dev-only: Log modal mount (Task 5: streaming wiring diagnostics)
  useEffect(() => {
    devLog('[CoverLetterModal] mounted', {
      mode,
      isOpen,
      hasUser: !!user?.id,
      hasStreamingHook: !!streamingHook,
      autoStart: true,
    });
  }, []);

  // Dev-only telemetry guards for stage/insight one-time events
  const emittedStagesRef = useRef({
    jdAnalysis: false,
    requirementAnalysis: false,
    goalsAndStrengths: false,
  });
  const insightsRenderedRef = useRef(false);
  // Track whether we've saved MwS data to the draft (to prevent duplicate saves)
  const mwsSavedRef = useRef(false);
  
  const jobState = mode === 'create' ? streamingHook.state : null;
  const isJobStreaming = mode === 'create' ? streamingHook.isStreaming : false;
  const createJob = mode === 'create' ? streamingHook.createJob : async () => { throw new Error('createJob not available in edit mode'); };

  // Task 5: A-phase streaming insights (read-only adapter)
  // Normalize jobState.stages into aPhaseInsights for banner and toolbar accordions
  // NEVER modifies draft-based metrics/requirements/gaps
  const aPhaseInsights = ENABLE_A_PHASE_INSIGHTS ? useAPhaseInsights(jobState) : null;

  // Task 5: Diagnostic logging for A-phase insights
  useEffect(() => {
    if (!ENABLE_A_PHASE_INSIGHTS || !aPhaseInsights) return;

    if (IS_DEV) {
      console.log('[CoverLetterModal] [STREAM] A-phase insights updated:', {
        stageFlags: aPhaseInsights.stageFlags,
        roleInsights: aPhaseInsights.roleInsights,
        jdRequirementSummary: aPhaseInsights.jdRequirementSummary,
        mws: aPhaseInsights.mws,
        companyContext: aPhaseInsights.companyContext,
      });
    }

    // Log individual stage completion
    if (aPhaseInsights.stageFlags.hasJdAnalysis) {
      if (IS_DEV) console.log('[CoverLetterModal] [STREAM] jdAnalysis stage complete');
      if (!emittedStagesRef.current.jdAnalysis) {
        emittedStagesRef.current.jdAnalysis = true;
        logAStreamEvent('stream_cover_letter_stage_completed', { stage: 'jdAnalysis' });
      }
    }
    if (aPhaseInsights.stageFlags.hasRequirementAnalysis) {
      if (IS_DEV) console.log('[CoverLetterModal] [STREAM] requirementAnalysis stage complete');
      if (!emittedStagesRef.current.requirementAnalysis) {
        emittedStagesRef.current.requirementAnalysis = true;
        logAStreamEvent('stream_cover_letter_stage_completed', { stage: 'requirementAnalysis' });
      }
    }
    if (aPhaseInsights.stageFlags.hasGoalsAndStrengths) {
      if (IS_DEV) console.log('[CoverLetterModal] [STREAM] goalsAndStrengths stage complete');
      if (!emittedStagesRef.current.goalsAndStrengths) {
        emittedStagesRef.current.goalsAndStrengths = true;
        logAStreamEvent('stream_cover_letter_stage_completed', { stage: 'goalsAndStrengths' });
      }
    }
    if (aPhaseInsights.stageFlags.phaseComplete) {
      if (IS_DEV) console.log('[CoverLetterModal] [STREAM] All A-phase stages complete');
    }

    // Insights rendered signal (first time we have any insight block populated)
    const hasAnyInsight =
      !!aPhaseInsights.roleInsights ||
      !!aPhaseInsights.jdRequirementSummary ||
      !!aPhaseInsights.mws ||
      !!aPhaseInsights.companyContext;
    if (hasAnyInsight && !insightsRenderedRef.current) {
      insightsRenderedRef.current = true;
      logAStreamEvent('stream_cover_letter_insights_rendered', {
        hasRoleInsights: !!aPhaseInsights.roleInsights,
        hasRequirementSummary: !!aPhaseInsights.jdRequirementSummary,
        hasMws: !!aPhaseInsights.mws,
        hasCompanyContext: !!aPhaseInsights.companyContext,
      });
    }
  }, [aPhaseInsights]);

  // In create mode, use the hook. In edit mode, use local state.
  const draft = mode === 'create' ? createModeHook.draft : localDraft;

  // FALLBACK: Persist MwS data to draft if not already present
  // Primary path: Edge function persists MwS to job_descriptions.analysis,
  // then generateDraftFast reads it and includes in draft.llm_feedback.mws
  // Fallback: If race condition occurs (draft created before MwS calculated),
  // this useEffect will persist MwS when streaming completes.
  useEffect(() => {
    // Only in create mode, when we have both draft and MwS data
    if (mode !== 'create') return;
    if (!draft?.id) return;
    if (!aPhaseInsights?.mws) return;
    if (mwsSavedRef.current) return; // Already saved this session
    
    // Skip if draft already has MwS (primary path succeeded)
    if (draft.mws || (draft.llmFeedback as Record<string, unknown>)?.mws) {
      if (IS_DEV) {
        console.log('[CoverLetterModal] MwS already in draft, skipping fallback persistence');
      }
      return;
    }
    
    const saveMws = async () => {
      try {
        const draftService = new CoverLetterDraftService(supabase);
        await draftService.saveMwsData(draft.id, aPhaseInsights.mws!);
        mwsSavedRef.current = true;
        if (IS_DEV) {
          console.log('[CoverLetterModal] MwS data persisted via FALLBACK path:', draft.id);
        }
      } catch (error) {
        console.error('[CoverLetterModal] Failed to save MwS data:', error);
        // Non-critical - don't show user error
      }
    };
    
    saveMws();
  }, [mode, draft?.id, draft?.mws, draft?.llmFeedback, aPhaseInsights?.mws]);
  
  // ============================================================================
  // SKELETON VISIBILITY (GENERATION-TRIGGERED ONLY)
  // ============================================================================
  // showSkeleton = isGeneratingDraft (only after user clicks Generate)
  // Do NOT show skeleton just because draft is null (initial modal state)
  
  const showSkeleton = isGeneratingDraft;
  
  // ============================================================================
  // DRAFT-ONLY DATA (NO STREAMING)
  // ============================================================================
  // Streaming is ONLY used for progress banner/bar, NOT for data display
  
  // Metrics come ONLY from draft
  const effectiveMetrics = draft?.enhancedMatchData?.metrics || [];
  
  // Requirements come ONLY from draft
  const effectiveCoreRequirements = draft?.enhancedMatchData?.coreRequirementDetails || [];
  const effectivePreferredRequirements = draft?.enhancedMatchData?.preferredRequirementDetails || [];
  // Shared metrics object (Phase A stream → draft) for toolbar + Go/No-Go
  const sharedMatchMetrics = useMemo(() => {
    const stage = jobState?.stages?.requirementAnalysis?.data as any;
    const enhanced = draft?.enhancedMatchData;
    if (!stage && !enhanced) return null;

    if (stage) {
      const coreReqs = stage.coreRequirements || [];
      const prefReqs = stage.preferredRequirements || [];
      const goalsReqs = stage.goalMatches || [];
      return {
        coreRequirements: {
          met: coreReqs.filter((r: any) => r.demonstrated || r.met).length,
          total: coreReqs.length,
          items: coreReqs.map((r: any, idx: number) => ({
            id: r.id || `core-${idx}`,
            requirement: r.requirement || r.detail || r.label || 'Requirement',
            demonstrated: r.demonstrated === true || r.met === true,
          })),
        },
        preferredRequirements: {
          met: prefReqs.filter((r: any) => r.demonstrated || r.met).length,
          total: prefReqs.length,
          items: prefReqs.map((r: any, idx: number) => ({
            id: r.id || `pref-${idx}`,
            requirement: r.requirement || r.detail || r.label || 'Requirement',
            demonstrated: r.demonstrated === true || r.met === true,
          })),
        },
        goals: {
          met: goalsReqs.filter((g: any) => g.met).length,
          total: goalsReqs.length,
          items: goalsReqs.map((g: any, idx: number) => ({
            id: g.id || `goal-${idx}`,
            requirement: g.requirement || g.label || 'Goal',
            demonstrated: g.met === true,
          })),
        },
      };
    }

    const enhancedMetrics = enhanced?.metrics;
    if (enhanced) {
      const coreReqs = enhanced.coreRequirementDetails || [];
      const prefReqs = enhanced.preferredRequirementDetails || [];
      const goalsReqs = enhanced.goalMatches || [];
      return {
        coreRequirements: {
          met: coreReqs.filter((r: any) => r.demonstrated).length,
          total: coreReqs.length,
          items: coreReqs.map((r: any, idx: number) => ({
            id: r.id || `core-${idx}`,
            requirement: r.requirement || r.detail || r.label || 'Requirement',
            demonstrated: !!r.demonstrated,
          })),
        },
        preferredRequirements: {
          met: prefReqs.filter((r: any) => r.demonstrated).length,
          total: prefReqs.length,
          items: prefReqs.map((r: any, idx: number) => ({
            id: r.id || `pref-${idx}`,
            requirement: r.requirement || r.detail || r.label || 'Requirement',
            demonstrated: !!r.demonstrated,
          })),
        },
        goals: {
          met: goalsReqs.filter((g: any) => g.met).length,
          total: goalsReqs.length,
          items: goalsReqs.map((g: any, idx: number) => ({
            id: g.id || `goal-${idx}`,
            requirement: g.requirement || g.label || 'Goal',
            demonstrated: g.met === true,
          })),
        },
        metrics: enhancedMetrics,
      };
    }

    return null;
  }, [jobState?.stages?.requirementAnalysis?.data, draft?.enhancedMatchData]);
  const setDraft = mode === 'create' ? createModeHook.setDraft : setLocalDraft;
  const workpad = mode === 'create' ? createModeHook.workpad : null;
  const streamingSections = mode === 'create' ? createModeHook.streamingSections : {};
  const progress = mode === 'create' ? createModeHook.progress : 0;
  const isGenerating = mode === 'create' ? createModeHook.isGenerating : false;
  const metricsLoading = mode === 'create' ? createModeHook.metricsLoading : false;
  const isMutating = mode === 'create' ? createModeHook.isMutating : isSaving;
  const isFinalizing = mode === 'create' ? createModeHook.isFinalizing : false;
  const generationError = mode === 'create' ? createModeHook.error : null;
  const generateDraft = mode === 'create' ? createModeHook.generateDraft : async () => {};

  // Hydrate enhancedMatchData onto draft when present in llmFeedback or persisted backend
  useEffect(() => {
    if (mode !== 'create') return;
    if (!draft?.id) return;
    if (enhancedHydratedRef.current) return;

    // If draft already has enhanced data, mark hydrated
    if (draft.enhancedMatchData) {
      enhancedHydratedRef.current = true;
      return;
    }

    const enhancedFromFeedback = (draft.llmFeedback as any)?.enhancedMatchData;
    if (enhancedFromFeedback) {
      setDraft({ ...draft, enhancedMatchData: enhancedFromFeedback });
      enhancedHydratedRef.current = true;
      return;
    }

    // Fallback: fetch latest draft once to hydrate enhanced data if available
    (async () => {
      try {
        const refreshed = await coverLetterDraftService.getDraft(draft.id);
        if (refreshed?.enhancedMatchData) {
          setDraft(refreshed);
          enhancedHydratedRef.current = true;
        }
      } catch (err) {
        console.warn('[CoverLetterModal] Fallback hydrate failed:', err);
      }
    })();
  }, [mode, draft?.id, draft?.enhancedMatchData, draft?.llmFeedback, setDraft, coverLetterDraftService]);
  
  // Step 2: Auto-load draft when streaming job completes
  // PHASE 3: Log streaming results when job completes
  useEffect(() => {
    if (mode !== 'create') return;
    if (jobState?.status !== 'complete') return;
    
    // User-requested diagnostic logging for streaming gaps
    console.log('[CoverLetterModal] Streaming result diagnostics:', {
      hasSectionGaps: !!jobState.result?.sectionGaps,
      sectionGapsLength: jobState.result?.sectionGaps?.length || 0,
      sectionGaps: jobState.result?.sectionGaps,
    });
    
    console.log('[CoverLetterModal] Streaming job completed:', {
      hasMetrics: !!jobState.result?.metrics,
      metricsCount: jobState.result?.metrics?.length || 0,
      hasSectionGaps: !!jobState.result?.sectionGaps,
      hasRequirements: !!jobState.result?.requirements,
    });
  }, [mode, jobState?.status, jobState?.result]);
  
  const updateSection = mode === 'create' ? createModeHook.updateSection : async (sectionId: string, content: string) => {
    // Edit mode: update section locally
    if (!draft) return;
    const updatedSections = draft.sections?.map(s =>
      s.id === sectionId ? { ...s, content } : s
    ) || [];
    setLocalDraft({ ...draft, sections: updatedSections });
  };
  const recalculateMetrics = mode === 'create' ? createModeHook.recalculateMetrics : async () => {};
  const finalizeDraft = mode === 'create' ? createModeHook.finalizeDraft : async () => {};
  const setWorkpad = mode === 'create' ? createModeHook.setWorkpad : () => {};
  const setTemplateId = mode === 'create' ? createModeHook.setTemplateId : () => {};
  const setJobDescriptionId = mode === 'create' ? createModeHook.setJobDescriptionId : () => {};
  const clearError = mode === 'create' ? createModeHook.clearError : () => {};
  const resetProgress = mode === 'create' ? createModeHook.resetProgress : () => {};

  // Phase 3: Initialize draft and load job description in edit mode
  useEffect(() => {
    const initializeEditMode = async () => {
      if (mode === 'edit' && initialDraft && isOpen) {
        setLocalDraft(initialDraft);
        
        // First check if draft has jobDescription field directly
        if ((initialDraft as any).jobDescription) {
          setJobContent((initialDraft as any).jobDescription);
        }
        
        // Load the job description record for metrics/analysis
        if (initialDraft.jobDescriptionId) {
          try {
            const { data, error } = await supabase
              .from('job_descriptions')
              .select('*')
              .eq('id', initialDraft.jobDescriptionId)
              .single();
            
            if (error) {
              console.error('[CoverLetterModal] Failed to load job description:', error);
              return;
            }
            
            if (data) {
              setJobDescriptionRecord(data);
              
              // Only set jobContent if not already set from draft
              if (!jobContent) {
                // Try various field names for the raw text
                const rawText = (data.structured_data as any)?.rawText 
                  || (data.structured_data as any)?.text
                  || (data as any).raw_text
                  || (data as any).rawText;
                
                if (rawText) {
                  setJobContent(rawText);
                }
              }
            }
          } catch (err) {
            console.error('[CoverLetterModal] Exception loading job description:', err);
          }
        }
      }
    };
    
    initializeEditMode();
  }, [mode, initialDraft, isOpen]);

  // PHASE 3: Auto-load removed - draft is set directly in handleGenerateDraft
  // No need to wait for streaming completion, generateDraft() already saves and returns the draft

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (!user?.id) {
      setTemplates([]);
      setTemplateError('Sign in to generate cover letters.');
      return;
    }

    let cancelled = false;
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      setTemplateError(null);
      const { data, error } = await supabase
        .from('cover_letter_templates')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20);

      if (cancelled) return;

      if (error) {
        setTemplateError(error.message);
        setTemplates([]);
      } else {
        const summaries = (data ?? []).map(({ id, name }) => ({
          id,
          name: name || 'Untitled Template',
        }));
        setTemplates(summaries);
        if (summaries.length > 0) {
          const nextTemplateId = selectedTemplateId ?? summaries[0].id;
          setSelectedTemplateId(nextTemplateId);
          setTemplateId(nextTemplateId);
        }
      }
      setTemplatesLoading(false);
    };

    fetchTemplates();
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id, selectedTemplateId, setTemplateId]);

  // Phase 2: Load template sections for skeleton
  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateSections([]);
      return;
    }

    let cancelled = false;
    const fetchTemplateSections = async () => {
      const { data, error } = await supabase
        .from('cover_letter_templates')
        .select('sections')
        .eq('id', selectedTemplateId)
        .single();

      if (cancelled || error || !data) {
        if (!cancelled && error) {
          console.warn('[CoverLetterModal] Failed to load template sections:', error);
        }
        return;
      }

      // Normalize sections to expected format
      // Use template section IDs directly (already canonical from DB)
      const sections = (data.sections || []).map((section: any, idx: number) => ({
        id: section.id || `template-${idx}`, // Use DB ID directly
        title: section.title || section.slug || 'Section',
        slug: section.slug || `section-${idx}`,
        type: section.type || 'body',
        content: '', // Empty for skeleton
      }));

      console.log('[CoverLetterModal] Template sections loaded:', 
        sections.map(s => ({ id: s.id, title: s.title })));

      setTemplateSections(sections);
    };

    fetchTemplateSections();
    return () => {
      cancelled = true;
    };
  }, [selectedTemplateId, supabase]);

  useEffect(() => {
    if (!draft) {
      setSectionDrafts({});
      return;
    }
    const map = draft.sections.reduce((acc, section) => {
      acc[section.id] = section.content;
      return acc;
    }, {} as Record<string, string>);
    setSectionDrafts(map);
  }, [draft]);

  useEffect(() => {
    if (!isOpen) {
      setMainTab('job-description');
      resetViewState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Removed: Auto-switching to cover-letter tab prevents users from viewing job description
  // Users should be able to freely switch between tabs

  // Pre-parse job description in the background when user pastes content
  useEffect(() => {
    const trimmed = jobContent.trim();

    const cleanupRunningController = () => {
      if (preParseControllerRef.current) {
        preParseControllerRef.current.abort();
        preParseControllerRef.current = null;
      }
    };

    if (!user?.id || trimmed.length < MIN_JOB_DESCRIPTION_LENGTH) {
      cleanupRunningController();
      setIsPreParsing(false);
      if (trimmed.length < MIN_JOB_DESCRIPTION_LENGTH) {
        setPreParsedJD(null);
        setPreParsedContent('');
      }
      return;
    }

    if (trimmed === preParsedContent) {
      return;
    }

    cleanupRunningController();
    const controller = new AbortController();
    preParseControllerRef.current = controller;
    const requestId = ++preParseRequestIdRef.current;

    const timerId = window.setTimeout(async () => {
      setIsPreParsing(true);
      try {
        const record = await jobDescriptionService.parseAndCreate(user.id, trimmed, {
          url: null,
          onProgress: () => {},
          onToken: () => {},
          signal: controller.signal,
        });

        if (preParseRequestIdRef.current !== requestId) {
          return;
        }

        setPreParsedJD(record);
        setPreParsedContent(trimmed);
        
        // PERF: Fire-and-forget pre-analysis while user reviews the parsed JD
        // This saves 15-25s when they click "Generate" because jdAnalysis will be cached
        supabase.functions.invoke('preanalyze-jd', {
          body: { jobDescriptionId: record.id },
        }).then(() => {
          console.log('[CoverLetterModal] Pre-analysis triggered for JD:', record.id);
        }).catch((err) => {
          // Non-blocking - if it fails, the main pipeline will just do the analysis
          console.warn('[CoverLetterModal] Pre-analysis failed (non-blocking):', err);
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.warn('[CoverLetterCreateModal] Pre-parse failed, will parse on generate', error);
        if (preParseRequestIdRef.current === requestId) {
          setPreParsedJD(null);
        }
      } finally {
        if (preParseRequestIdRef.current === requestId) {
          setIsPreParsing(false);
        }
      }
    }, 1000); // Debounce 1s after user stops typing

    return () => {
      controller.abort();
      clearTimeout(timerId);
    };
  }, [jobContent, user?.id, preParsedContent, jobDescriptionService]);

  // PROGRESS FIX: Update peak progress tracker (must be at top level, not in render)
  // Progress calculation for banner/bar (A-phase stages only)
  useEffect(() => {
    let currentProgress = 0;
    
    // If draft exists, we're done
    if (draft) {
      currentProgress = 100;
    }
    // Else if streaming job active, track A-phase stages
    else if (isJobStreaming) {
      // Task 6: Map A-phase stages to progress
      // 0% → 10% → 20% → 30% (A-phase complete) → 100% (draft complete)
      const flags = aPhaseInsights?.stageFlags;
      if (flags?.hasGoalsAndStrengths) {
        currentProgress = 30;
      } else if (flags?.hasRequirementAnalysis) {
        currentProgress = 20;
      } else if (flags?.hasJdAnalysis) {
        currentProgress = 10;
      } else {
        currentProgress = 0;
      }
    }
    // Else if generating draft (no streaming), hold at 30
    else if (isGeneratingDraft) {
      currentProgress = 30;
    }
    
    // Update peak if we've advanced
    if (currentProgress > peakProgress) {
      setPeakProgress(currentProgress);
    }
    
    // Reset peak when generation completes
    if (!showSkeleton && currentProgress === 100) {
      setPeakProgress(0);
    }
  }, [draft, aPhaseInsights, isJobStreaming, isGeneratingDraft, peakProgress, showSkeleton]);

  // PROGRESS ANIMATION: Simulate progress during draft generation (30% → 95%)
  // This provides visual feedback during the slow 60-90s draft generation phase
  useEffect(() => {
    if (!isGeneratingDraft) {
      // Reset animation when not generating
      setAnimatedDraftProgress(30);
      return;
    }
    
    // Start at 30% (analysis complete), animate to 95% (almost done)
    let currentProgress = 30;
    setAnimatedDraftProgress(30);
    
    // Increment progress every 2 seconds
    // Total animation: 30% → 95% over ~65 seconds (typical draft time)
    const interval = setInterval(() => {
      currentProgress += 1; // +1% every 2s
      if (currentProgress <= 95) {
        setAnimatedDraftProgress(currentProgress);
      } else {
        clearInterval(interval); // Hold at 95% until draft completes
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isGeneratingDraft]);

  const resetViewState = () => {
    setJobContent('');
    setJobInputError(null);
    setJobDescriptionRecord(null);
    setSectionDrafts({});
    setSavingSections({});
    setJdStreamingMessages([]);
    setPreParsedJD(null);
    setIsPreParsing(false);
    setPreParsedContent('');
    clearError();
    resetProgress();
    setDraft(null);
    setWorkpad(null);
    setJobDescriptionId(null);
    setFinalizationOpen(false);
    setFinalizationError(null);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateId(templateId);
  };

  const handleGenerateDraft = async () => {
    if (!user?.id) {
      setJobInputError('Sign in to draft cover letters.');
      return;
    }
    if (!selectedTemplateId) {
      setJobInputError('Create a cover letter template before generating drafts.');
      return;
    }
    if (jobContent.trim().length < MIN_JOB_DESCRIPTION_LENGTH) {
      setJobInputError(
        `Please paste the full job description (at least ${MIN_JOB_DESCRIPTION_LENGTH} characters).`,
      );
      return;
    }

    setJobInputError(null);
    clearError();
    resetProgress();
    setFinalizationError(null);
    setJdStreamingMessages([]);

    try {
      let record: JobDescriptionRecord;
      
      // If we have a pre-parsed JD and the content hasn't changed, reuse it
      if (preParsedJD && jobContent.trim() === preParsedContent) {
        console.log('[CoverLetterCreateModal] Reusing pre-parsed JD, skipping parse step');
        record = preParsedJD;
        setJdStreamingMessages(['Job description analysis complete (cached).']);
      } else {
        // Otherwise, parse the JD with progress feedback
        setIsParsingJobDescription(true);
        record = await jobDescriptionService.parseAndCreate(user.id, jobContent.trim(), {
          url: null, // URL ingestion hidden for MVP (see TODO in renderJobDescriptionTab)
          onProgress: (message) => {
            setJdStreamingMessages(prev => {
              const last = prev[prev.length - 1];
              // Dedupe consecutive identical messages
              if (last === message) return prev;
              return [...prev, message];
            });
          },
          onToken: (token, aggregate) => {
            // Update last message with token preview for live feedback
            setJdStreamingMessages(prev => {
              const base = prev.slice(0, -1);
              const preview = aggregate.slice(-50); // Last 50 chars for preview
              return [...base, `Parsing… ${preview}${preview.length < aggregate.length ? '…' : ''}`];
            });
          },
        });
        setJdStreamingMessages(prev => [...prev, 'Job description analysis complete.']);
        setIsParsingJobDescription(false);
      }
      
      setJobDescriptionRecord(record);
      setJobDescriptionId(record.id);
      
      // UNIFIED SKELETON: Switch to draft tab and mark generation as started
      setMainTab('cover-letter');
      setGenerationHasStarted(true); // Mark that user clicked Generate (persists across entire flow)
      setIsGeneratingDraft(true); // Track draft generation state
      console.log('[CoverLetterModal] Generation started - switched to cover-letter tab, skeleton should be visible');
      
      // PHASE 3: Start BOTH streaming (analysis) and draft generation IN PARALLEL
      console.log('[CoverLetterModal] Starting parallel operations:', {
        streaming: { type: 'coverLetter', jobDescriptionId: record.id, templateId: selectedTemplateId },
        draftGeneration: { userId: user.id, jobDescriptionId: record.id, templateId: selectedTemplateId },
      });
      
      // No dependencies - both start immediately
      console.log('[CoverLetterModal] About to start Promise.allSettled with 2 operations');
      
      const [streamingResult, draftResult] = await Promise.allSettled([
        // 1. Streaming job (analysis: metrics, gaps, requirements)
        createJob('coverLetter', {
          jobDescriptionId: record.id,
          templateId: selectedTemplateId,
        }).then(result => {
          console.log('[CoverLetterModal] createJob resolved:', result);
          return result;
        }).catch(err => {
          console.error('[CoverLetterModal] createJob rejected:', err);
          throw err;
        }),
        // 2. Draft generation - FAST PATH (sections only, metrics in background)
        // PERF: generateDraftFast returns in ~2-5s with sections
        // Background metrics calculation happens non-blocking
        coverLetterDraftService.generateDraftFast({
          userId: user.id,
          templateId: selectedTemplateId,
          jobDescriptionId: record.id,
          onProgress: update => {
            console.log(`[generateDraftFast] ${update.phase}: ${update.message}`);
          },
          onSectionBuilt: (section, index, total) => {
            console.log(`[generateDraftFast] Section ${index + 1}/${total} built: ${section.title}`);
          },
        }).then(result => {
          console.log('[CoverLetterModal] generateDraftFast resolved with', result.draft.sections.length, 'sections');
          return result;
        }).catch(err => {
          console.error('[CoverLetterModal] generateDraftFast rejected:', err);
          throw err;
        }),
      ]);
      
      console.log('[CoverLetterModal] Promise.allSettled complete:', {
        streamingStatus: streamingResult.status,
        draftStatus: draftResult.status,
      });
      
      // Handle streaming result
      if (streamingResult.status === 'fulfilled') {
        console.log('[CoverLetterModal] Streaming job started successfully, jobId:', streamingResult.value);
        // Results will be logged by useEffect when jobState.status becomes 'complete'
      } else {
        console.warn('[CoverLetterModal] Streaming job failed (non-blocking):', streamingResult.reason);
      }
      
      // Handle draft generation result
      if (draftResult.status === 'fulfilled') {
        const generatedDraft = draftResult.value.draft;
        
        // User-requested diagnostic logging for gaps
        console.log('[CoverLetterModal] Draft result diagnostics:', {
          hasEnhancedMatchData: !!generatedDraft.enhancedMatchData,
          hasSectionGapInsights: !!generatedDraft.enhancedMatchData?.sectionGapInsights,
          sectionGapInsightsLength: generatedDraft.enhancedMatchData?.sectionGapInsights?.length || 0,
          sectionGapInsights: generatedDraft.enhancedMatchData?.sectionGapInsights,
        });
        
        console.log('[CoverLetterModal] Draft generated successfully:', {
          draftId: generatedDraft.id,
          sectionCount: generatedDraft.sections.length,
          sectionTitles: generatedDraft.sections.map((s: any) => s.title),
          hasEnhancedMatchData: !!generatedDraft.enhancedMatchData,
          hasMetrics: !!generatedDraft.enhancedMatchData?.metrics,
          hasSectionGaps: !!generatedDraft.enhancedMatchData?.sectionGapInsights,
          metricsCount: generatedDraft.enhancedMatchData?.metrics?.length || 0,
        });
        setDraft(generatedDraft);
        setIsGeneratingDraft(false); // Draft generation complete
      } else {
        console.error('[CoverLetterModal] Draft generation failed:', draftResult.reason);
        setIsGeneratingDraft(false); // Clear flag even on error
        throw new Error(`Failed to generate draft: ${draftResult.reason?.message || 'Unknown error'}`);
      }
      
      // Tab already switched before operations started (so skeleton shows)
      // Draft is now set, DraftEditor will transition from skeleton to content
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate cover letter draft.';
      setJobInputError(message);
      setJdStreamingMessages(prev => [...prev, `Error: ${message}`]);
    } finally {
      setIsParsingJobDescription(false);
      setIsGeneratingDraft(false); // Ensure flag is cleared
    }
  };

  const handleSectionChange = (sectionId: string, value: string) => {
    setSectionDrafts(prev => ({
      ...prev,
      [sectionId]: value,
    }));
  };

  const handleSectionReset = (sectionId: string) => {
    if (!draft) return;
    const original = draft.sections.find(section => section.id === sectionId);
    if (!original) return;
    setSectionDrafts(prev => ({
      ...prev,
      [sectionId]: original.content,
    }));
  };

  const handleSectionSave = async (sectionId: string) => {
    if (!draft) return;
    const content = sectionDrafts[sectionId];
    if (content === undefined) return;
    setSavingSections(prev => ({
      ...prev,
      [sectionId]: true,
    }));

    try {
      const updatedDraft = await updateSection({ sectionId, content });
      const map = updatedDraft.sections.reduce((acc, section) => {
        acc[section.id] = section.content;
        return acc;
      }, {} as Record<string, string>);
      setSectionDrafts(map);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update section content.';
      setJobInputError(message);
    } finally {
      setSavingSections(prev => ({
        ...prev,
        [sectionId]: false,
      }));
    }
  };

  // Add Section from Library handlers
  const handleInsertBetweenSections = (insertIndex: number) => {
    if (!draft) return;
    const sections = draft.sections || [];

    // Infer section type from neighbors
    let preferredType: 'intro' | 'body' | 'closing' = 'body';
    if (insertIndex === 0) {
      preferredType = 'intro';
    } else if (insertIndex >= sections.length) {
      preferredType = 'closing';
    }

    setLibraryInvocation({
      type: 'insert_here',
      insertIndex,
      preferredSectionType: preferredType,
    });
    setShowLibraryModal(true);
  };

  const handleInsertSection = async (insertIndex: number, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    if (!draft) return;
    
    try {
      const newSection = {
        id: `section-${Date.now()}`,
        type: libraryInvocation?.preferredSectionType || 'body',
        slug: libraryInvocation?.preferredSectionType || 'body',
        title: source.title || 'New Section',
        content,
        source,
        order: insertIndex,
      };

      // Insert the new section at the specified index
      const updatedSections = [...draft.sections];
      updatedSections.splice(insertIndex, 0, newSection);

      // Reorder all sections
      const reorderedSections = updatedSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      // Update draft in state
      setDraft({ ...draft, sections: reorderedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      toast({
        title: "Section added",
        description: "Content from library has been inserted",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterCreateModal] Failed to insert section:', error);
      toast({
        title: "Failed to add section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleReplaceSection = async (sectionId: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    if (!draft) return;

    try {
      // Update section content
      const updatedSections = draft.sections.map(section =>
        section.id === sectionId ? { ...section, content, source, title: source.title || section.title } : section
      );

      // Update draft in state
      setDraft({ ...draft, sections: updatedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: updatedSections,
      });

      toast({
        title: "Section replaced",
        description: "Content from library has been inserted",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterCreateModal] Failed to replace section:', error);
      toast({
        title: "Failed to replace section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Phase 1: Handlers extracted for DraftEditor
  const handleSectionDuplicate = async (section: any, sectionIndex: number) => {
    if (!draft) return;
    try {
      const newSection = {
        id: `section-${Date.now()}`,
        type: section.type,
        slug: section.slug,
        title: `${section.title} (Copy)`,
        content: section.content,
        order: sectionIndex + 1,
      };

      const updatedSections = [...draft.sections];
      updatedSections.splice(sectionIndex + 1, 0, newSection);

      const reorderedSections = updatedSections.map((s, index) => ({
        ...s,
        order: index,
      }));

      setDraft({ ...draft, sections: reorderedSections });

      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      toast({
        title: "Section duplicated",
        description: "A copy has been created below this section",
      });
    } catch (error) {
      console.error('[CoverLetterCreateModal] Failed to duplicate section:', error);
      toast({
        title: "Failed to duplicate section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSectionDelete = async (sectionId: string) => {
    if (!draft) return;
    const section = draft.sections.find(s => s.id === sectionId);
    if (!section) return;
    if (!confirm(`Delete "${section.title}" section?`)) return;

    try {
      const updatedSections = draft.sections.filter(s => s.id !== sectionId);

      const reorderedSections = updatedSections.map((s, index) => ({
        ...s,
        order: index,
      }));

      setDraft({ ...draft, sections: reorderedSections });

      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      toast({
        title: "Section deleted",
        description: "The section has been removed",
      });
    } catch (error) {
      console.error('[CoverLetterCreateModal] Failed to delete section:', error);
      toast({
        title: "Failed to delete section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInsertFromLibrary = (sectionId: string, sectionType: 'intro' | 'body' | 'closing', sectionIndex: number) => {
    setLibraryInvocation({
      type: 'replace_or_insert_below',
      sectionId,
      sectionType,
      sectionIndex,
    });
    setShowLibraryModal(true);
  };

  const handleSectionFocus = (sectionId: string, content: string) => {
    setSectionFocusContent(prev => ({
      ...prev,
      [sectionId]: content,
    }));
  };

  const handleSectionBlur = async (
    sectionId: string,
    newContent: string,
    jobDescriptionRecord: JobDescriptionRecord | null,
    goals: any,
    draftParam: CoverLetterDraft | null
  ) => {
    const focusContent = sectionFocusContent[sectionId] ?? draft?.sections.find(s => s.id === sectionId)?.content;
    
    // Only recalculate if content changed since focus
    if (newContent !== focusContent && jobDescriptionRecord && goals && draftParam) {
      try {
        await handleSectionSave(sectionId);
        
        // Trigger metrics recalculation
        await recalculateMetrics(draftParam, jobDescriptionRecord, goals);
      } catch (error) {
        console.error('[CoverLetterCreateModal] Failed to save/recalculate on blur:', error);
      }
    }
  };

  const handleInsertBelow = async (sectionIndex: number, sectionType: string, content: string, source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }) => {
    if (!draft) return;

    try {
      const newSection = {
        id: `section-${Date.now()}`,
        type: sectionType,
        slug: sectionType,
        title: source.title || 'New Section',
        content,
        source,
        order: sectionIndex + 1,
      };

      // Insert the new section after the specified index
      const updatedSections = [...draft.sections];
      updatedSections.splice(sectionIndex + 1, 0, newSection);

      // Reorder all sections
      const reorderedSections = updatedSections.map((section, index) => ({
        ...section,
        order: index,
      }));

      // Update draft in state
      setDraft({ ...draft, sections: reorderedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      toast({
        title: "Section added",
        description: "Content from library has been inserted below",
      });

      setShowLibraryModal(false);
    } catch (error) {
      console.error('[CoverLetterCreateModal] Failed to insert section below:', error);
      toast({
        title: "Failed to add section",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleFinalize = () => {
    setFinalizationError(null);
    setFinalizationOpen(true);
  };

  const handleFinalizeConfirm = async () => {
    if (!draft) return;

    const finalSections = draft.sections.map(section => ({
      ...section,
      content: sectionDrafts[section.id] ?? section.content,
    }));

    setFinalizationError(null);

    try {
      const finalizedDraft = await finalizeDraft({ sections: finalSections });
      if (onCoverLetterCreated) {
        onCoverLetterCreated(finalizedDraft);
      }
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to finalize cover letter draft.';
      setFinalizationError(message);
    }
  };

  const handleClose = (shouldCloseModal = true) => {
    resetViewState();
    if (shouldCloseModal) {
      onClose();
    }
  };

  const isBusy = isGenerating || isParsingJobDescription;

  const renderProgress = () => {
    // Hide progress card once everything is complete
    if (draft && !isGenerating && !metricsLoading) return null;

    const hasProgress = progress.length > 0 || jdStreamingMessages.length > 0 || metricsLoading;
    if (!hasProgress) return null;

    // Group progress by phase and show only the latest message per phase
    const phaseGroups = progress.reduce((acc, update) => {
      acc[update.phase] = update.message;
      return acc;
    }, {} as Record<string, string>);

    const phaseLabels: Record<string, string> = {
      jd_parse: 'Job Description Analysis',
      content_match: 'Draft Generation',
      metrics: 'Calculating Metrics',
      gap_detection: 'Gap Detection',
      finalized: 'Finalized',
    };

    // Filter out phases we don't want to show (jd_parse if we have streaming messages, metrics if metricsLoading, finalized always)
    const filteredPhases = Object.entries(phaseGroups).filter(([phase]) => {
      if (phase === 'finalized') return false; // Never show finalized
      if (phase === 'jd_parse' && jdStreamingMessages.length > 0) return false; // Use streaming messages instead
      if (phase === 'metrics' && metricsLoading) return false; // Use metricsLoading UI instead
      return true;
    });

    return (
      <Card className="border-muted-foreground/20 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Generation progress</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Follow each stage as we analyze and assemble your cover letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Show phases */}
          {filteredPhases.map(([phase, message]) => (
            <div key={phase} className="flex items-start gap-2">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide min-w-[180px]">
                {phaseLabels[phase] || phase}
              </span>
              <span className="text-sm text-muted-foreground flex-1">{message}</span>
            </div>
          ))}

          {/* Show metrics loading if active (takes priority over metrics phase) */}
          {metricsLoading && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide min-w-[180px] flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Calculating Metrics
              </span>
              <span className="text-sm text-muted-foreground flex-1">
                Analyzing how well your draft matches the job requirements...
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderJobDescriptionTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Job description</CardTitle>
            <CardDescription>
              Paste the full role description so we can analyze requirements and tailor your draft.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Pro tip for LinkedIn copying */}
            <Alert className="bg-primary/5 border-primary/20">
              <AlertTitle className="flex items-center gap-2 text-sm font-medium">
                💡 Pro tip for LinkedIn job posts
              </AlertTitle>
              <AlertDescription className="text-xs mt-2 space-y-2">
                <p>
                  When copying from LinkedIn, click "Show more" first, then select everything that describes the role and the company. Narrata uses that context to tailor your letter.
                </p>
                <p className="text-muted-foreground">
                  To get the best results, try to avoid extra UI text (comments, buttons, "people also viewed," etc.).
                </p>
              </AlertDescription>
            </Alert>
            
            {/* TODO: Re-enable job description URL ingestion once MVP supports remote fetching. Tracked in docs/backlog/HIDDEN_FEATURES.md */}
            <div className="relative">
              <Textarea
                placeholder="Paste job description here..."
                rows={16}
                value={jobContent}
                onChange={event => setJobContent(event.target.value)}
                disabled={isBusy}
              />
              {isPreParsing && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{jobContent.trim().length} characters</span>
              <span>Minimum {MIN_JOB_DESCRIPTION_LENGTH} characters required</span>
            </div>

            {jobInputError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to process job description</AlertTitle>
                <AlertDescription>{jobInputError}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Clear button (left) - with confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy || !jobContent.trim()}
                  >
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear job description?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the job description you've entered. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => setJobContent('')}>
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Generate button (right) - primary CTA */}
              <Button
                type="button"
                className="gap-2"
                onClick={handleGenerateDraft}
                disabled={
                  isBusy ||
                  !user?.id ||
                  !selectedTemplateId ||
                  templates.length === 0
                }
              >
                {isParsingJobDescription || isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" />
                    Generate cover letter
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDraftTab = () => {
    // Show progressive sections if available (streaming from backend)
    if (!draft && streamingSections.length > 0 && jobDescriptionRecord) {
      return (
        <div className="space-y-6">
          {renderProgress()}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building your personalized draft
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Sections appear as soon as they are assembled so you can start reading right away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoverLetterDraftView
                sections={streamingSections}
                jobDescription={normalizedJobDescription ? { ...normalizedJobDescription, id: jobDescriptionRecord?.id || '' } : undefined}
                enhancedMatchData={null}
                ratingCriteria={undefined}
                contentStandards={null}
              />
            </CardContent>
          </Card>
        </div>
      );
    }

    // Show empty state only if no draft and not generating
    if (!draft && !showSkeleton) {
      if (IS_DEV) console.log('[CoverLetterModal] Showing empty state (no draft)');
      return (
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Generate a draft first by pasting the job description.
          </CardContent>
        </Card>
      );
    }
    
    if (IS_DEV) console.log('[CoverLetterModal] Rendering DraftEditor with showSkeleton=', showSkeleton);

    // EARLY METRICS DISPLAY: Transform effectiveMetrics to MatchMetricsData format
    // Uses streaming data if draft not ready, draft data when available
    let matchMetrics = transformMetricsToMatchData(
      effectiveMetrics && Array.isArray(effectiveMetrics) 
        ? effectiveMetrics 
        : (effectiveMetrics ? [effectiveMetrics] : [])
    );

    // PHASE 3: EARLY REQUIREMENTS DISPLAY - Always show counts from streaming or draft
    // Toolbar must NEVER be blank - use streaming data immediately, override with draft when ready
    const totalCoreReqs = effectiveCoreRequirements?.length ?? 0;
    const totalPrefReqs = effectivePreferredRequirements?.length ?? 0;
    // Note: totalStandards is calculated per-section based on section type (intro/body/closing)
    
    // Extract rating criteria from llmFeedback
    const ratingData = draft?.llmFeedback?.rating as any;
    if (ratingData?.criteria && Array.isArray(ratingData.criteria)) {
      matchMetrics.ratingCriteria = ratingData.criteria.map((c: any) => ({
        id: c.id || '',
        label: c.label || '',
        met: c.met === true,
        evidence: c.evidence || '',
        suggestion: c.suggestion || '',
      }));
    }

    // Extract content standards from llmFeedback (NEW: section-level attribution)
    const contentStandards = draft?.llmFeedback?.contentStandards as any;

    // FIX 1: Check analytics.overallScore first (for finalized drafts)
    const analyticsScore = draft?.analytics?.overallScore;
    if (analyticsScore !== undefined && analyticsScore !== null) {
      matchMetrics.overallScore = analyticsScore;
      if (process.env.NODE_ENV === 'development') {
        console.log('[CoverLetterCreateModal] Using analytics.overallScore:', analyticsScore);
      }
    }
    
    // FIX 2: Calculate score from criteria data if rating metric missing
    if (matchMetrics.overallScore === undefined) {
      if (matchMetrics.ratingCriteria && matchMetrics.ratingCriteria.length > 0) {
        const metCount = matchMetrics.ratingCriteria.filter(c => c.met).length;
        const totalCount = matchMetrics.ratingCriteria.length;
        if (totalCount > 0) {
          const calculatedScore = Math.round((metCount / totalCount) * 100);
          matchMetrics.overallScore = calculatedScore;
          if (process.env.NODE_ENV === 'development') {
            console.log('[CoverLetterCreateModal] Calculated score from criteria:', calculatedScore, `(${metCount}/${totalCount})`);
          }
        }
      } else {
        // FIX 3: Calculate score from hardcoded criteria logic (matches CoverLetterRatingInsights)
        // When isPostHIL=false: 3/11 criteria met (hardcoded true) = 27%
        // When isPostHIL=true: 10/11 criteria met (7 from isPostHIL + 3 hardcoded) = 91%
        // Drafts are not finalized, so isPostHIL=false
        const calculatedScore = 27;
        matchMetrics.overallScore = calculatedScore;
        if (process.env.NODE_ENV === 'development') {
          console.log('[CoverLetterCreateModal] Calculated score from draft status (draft, not finalized):', calculatedScore);
        }
      }
    }
    
    // Ensure atsScore falls back to draft.atsScore if metric unavailable
    if (matchMetrics.atsScore === 0 && draft?.atsScore) {
      matchMetrics.atsScore = draft.atsScore;
    }

    // Progress for banner/bar (A-phase stages + draft only)
    // Task 6: Progress driven by aPhaseInsights.stageFlags only
    let progressPercent = 0;
    
    if (draft) {
      progressPercent = 100; // Draft complete
    } else if (isGeneratingDraft) {
      progressPercent = animatedDraftProgress; // Animated 30% → 95%
    } else if (isJobStreaming) {
      // A-phase stages (0% → 30%)
      // Task 6: Map A-phase stages to progress
      const flags = aPhaseInsights?.stageFlags;
      if (flags?.hasGoalsAndStrengths) {
        progressPercent = 30;
      } else if (flags?.hasRequirementAnalysis) {
        progressPercent = 20;
      } else if (flags?.hasJdAnalysis) {
        progressPercent = 10;
      } else {
        progressPercent = 0;
      }
    }
    
    // PROGRESS FIX: Never go backwards during same generation session
    // On regenerate: old draft exists + new job starts → would reset to 0%
    // Solution: Track peak and never go below it while skeleton is showing
    if (showSkeleton && progressPercent < peakProgress) {
      progressPercent = peakProgress; // Hold at peak during regeneration
    }
    
    // Diagnostic logging at top of render
    if (IS_DEV) {
      console.log('[CoverLetterModal] Render state:', {
        showSkeleton,
        hasDraft: !!draft,
        isJobStreaming,
        isGeneratingDraft,
        progressPercent,
        jobStatus: jobState?.status,
        stageKeys: Object.keys(jobState?.stages || {}),
        // Task 6: A-phase stage flags (source of truth for progress)
        aPhaseStageFlags: {
          hasJdAnalysis: aPhaseInsights?.stageFlags.hasJdAnalysis,
          hasRequirementAnalysis: aPhaseInsights?.stageFlags.hasRequirementAnalysis,
          hasGoalsAndStrengths: aPhaseInsights?.stageFlags.hasGoalsAndStrengths,
        },
      });
      
      // Task 5: A-phase props to DraftEditor logging
      console.log('[A-PHASE] props to DraftEditor', {
        hasAPhaseInsights: !!aPhaseInsights,
        isJobStreaming,  // Critical for progress banner chips
        showSkeleton,    // Controls showProgressBanner
        stageFlags: aPhaseInsights?.stageFlags,
      });
    }
    
    return (
      <>
        {/* UNIFIED LOADING: Progress banner removed from here - now in DraftEditor */}
        
        {/* Error handling */}
        {jobState?.status === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>
              {jobState.error?.message || 'An error occurred while generating your cover letter. Please try again.'}
            </AlertDescription>
          </Alert>
        )}

        <CoverLetterDraftEditor
        draft={draft}
        jobDescription={normalizedJobDescription}
        matchMetrics={matchMetrics}
        isStreaming={showSkeleton} // UNIFIED LOADING: Single flag for skeleton vs content
        jobState={jobState}
        templateSections={templateSections}
        showProgressBanner={false} // Banner now rendered at modal level, above tabs
        progressPercent={progressPercent} // Progress 0-100
        progressState={{
          hasAnalysis: !!draft, // Use draft existence (not jobState)
          isJobStreaming,
          isGeneratingDraft,
          aPhaseInsights, // Task 5: A-phase streaming insights for banner
        }} // State for banner label/chips
        aPhaseInsights={aPhaseInsights} // Task 7: A-phase streaming insights for toolbar accordions
        isPostHIL={false}
        metricsLoading={metricsLoading}
        generationError={generationError}
        jobInputError={jobInputError}
        sectionDrafts={sectionDrafts}
        savingSections={savingSections}
        sectionFocusContent={sectionFocusContent}
        onSectionChange={handleSectionChange}
        onSectionSave={handleSectionSave}
        onSectionFocus={handleSectionFocus}
        onSectionBlur={handleSectionBlur}
        onSectionDuplicate={handleSectionDuplicate}
        onSectionDelete={handleSectionDelete}
        onInsertBetweenSections={handleInsertBetweenSections}
        onInsertFromLibrary={handleInsertFromLibrary}
        onEnhanceSection={(gapData) => {
          setSelectedGap(gapData);
          setShowContentGenerationModal(true);
        }}
        onAddMetrics={(sectionId) => {
          console.log('Add metrics to section:', sectionId);
        }}
        onEditGoals={() => setShowGoalsModal(true)}
      />
      </>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => (!open ? handleClose() : undefined)}>
      <DialogContent className="dialog-top-anchored max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        {/* Compact header - shows company/role after draft exists, with Save/Preview CTAs */}
        <DialogHeader className="pb-2 w-full flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            {draft && jobDescriptionRecord?.company && jobDescriptionRecord?.role
              ? `${jobDescriptionRecord.company}: ${jobDescriptionRecord.role}`
              : 'Draft cover letter'}
          </DialogTitle>
          {/* Save and Preview buttons - only show when draft exists */}
          {draft && (
            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFinalizationOpen(true)}
                disabled={showSkeleton}
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  if (draft?.id) {
                    try {
                      await coverLetterDraftService.updateDraft(draft.id, {
                        sections: draft.sections,
                      });
                      toast({
                        title: 'Draft saved',
                        description: 'Your changes have been saved.',
                      });
                      onSave?.();
                    } catch (error) {
                      toast({
                        title: 'Save failed',
                        description: 'Unable to save draft. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }
                }}
                disabled={showSkeleton}
              >
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Progress banner - above tabs during generation */}
        {showSkeleton && (
          <div className="w-full mb-2">
            <DraftProgressBanner
              aPhaseStageFlags={aPhaseInsights?.stageFlags}
              aPhaseData={{
                jdRequirementSummary: aPhaseInsights?.jdRequirementSummary,
                mws: aPhaseInsights?.mws,
              }}
              hasDraftSections={Boolean(draft?.sections?.length)}
              sectionCount={draft?.sections?.length}
              hasMetrics={Boolean(draft?.enhancedMatchData?.coreRequirementDetails)}
              coreRequirementsMet={draft?.enhancedMatchData?.coreRequirementDetails?.filter((r: any) => r.demonstrated).length}
              coreRequirementsTotal={draft?.enhancedMatchData?.coreRequirementDetails?.length}
              overallScore={draft?.enhancedMatchData?.overallScore}
            />
          </div>
        )}

        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'job-description' | 'cover-letter')} className="flex flex-col flex-1 min-h-0 w-full">
          {/* Phase 3: Both modes show both tabs. Create starts on JD tab, Edit starts on Draft tab. */}
          <TabsList className="grid grid-cols-2 w-full flex-shrink-0 mb-4">
            <TabsTrigger value="job-description">Job description</TabsTrigger>
            <TabsTrigger value="cover-letter" disabled={mode === 'create' && !draft && !showSkeleton}>
              {mode === 'create' ? 'Cover letter' : 'Draft'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job-description" className="flex-1 overflow-y-auto">{renderJobDescriptionTab()}</TabsContent>
          <TabsContent value="cover-letter" className="flex-1 overflow-hidden">{renderDraftTab()}</TabsContent>
        </Tabs>
      </DialogContent>
      {draft && (
        <CoverLetterFinalization
          isOpen={finalizationOpen}
          onClose={() => setFinalizationOpen(false)}
          onBackToDraft={() => setFinalizationOpen(false)}
          onFinalizeConfirm={handleFinalizeConfirm}
          isFinalizing={isFinalizing}
          errorMessage={finalizationError}
          sections={draft.sections.map(section => ({
            ...section,
            content: sectionDrafts[section.id] ?? section.content,
          }))}
          metrics={draft.metrics}
          differentiators={draft.differentiatorSummary}
          analytics={draft.analytics}
          job={{
            company: jobDescriptionRecord?.company ?? draft.company,
            role: jobDescriptionRecord?.role ?? draft.role,
          }}
          draftId={draft.id}
          draftUpdatedAt={draft.updatedAt}
          // Post-HIL means B-phase has completed. While generating, keep false.
          isPostHIL={Boolean(draft && !showSkeleton)}
        />
      )}
      <ContentGenerationModal
        isOpen={showContentGenerationModal}
        onClose={() => {
          setShowContentGenerationModal(false);
          setSelectedGap(null);
        }}
        gap={selectedGap ? {
          id: selectedGap.id,
          type: selectedGap.type,
          severity: selectedGap.severity,
          description: selectedGap.description,
          suggestion: selectedGap.suggestion,
          paragraphId: selectedGap.paragraphId,
          origin: selectedGap.origin,
          existingContent: selectedGap.existingContent,
          // Pass through rich gap structure
          gaps: selectedGap.gaps,
          gapSummary: selectedGap.gapSummary,
          ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
          // Pass section attribution to show what's working in HIL
          sectionAttribution: selectedGap.sectionAttribution
        } : null}
        onApplyContent={async (content: string) => {
          if (!selectedGap || !draft) return;
          
          // Use the section_id from selectedGap (set when gap was clicked)
          const sectionId = selectedGap.section_id;
          
          if (sectionId) {
            // Update the section content
            setSectionDrafts(prev => ({
              ...prev,
              [sectionId]: content,
            }));
            
            // Save the section
            try {
              await handleSectionSave(sectionId);
              
              // Trigger metrics recalculation after HIL content is applied (immediately, no debounce)
              if (jobDescriptionRecord && goals && draft) {
                try {
                  await recalculateMetrics({
                    jobDescription: jobDescriptionRecord as ParsedJobDescription,
                    userGoals: goals,
                  });
                  console.log('[CoverLetterCreateModal] Metrics recalculated after HIL content applied');
                } catch (error) {
                  console.error('[CoverLetterCreateModal] Failed to recalculate metrics:', error);
                  // Don't block UI on recalculation failure
                }
              }
              
              // Note: Gap resolution is tracked via enhancedMatchData in the database
              // After HIL, metrics are recalculated and gaps are updated
              console.log('[CoverLetterCreateModal] Gap resolved for section:', sectionId);
            } catch (error) {
              console.error('[CoverLetterCreateModal] Failed to apply generated content:', error);
            }
          }
          
          setShowContentGenerationModal(false);
          setSelectedGap(null);
        }}
      />

    </Dialog>

    {/* Add Section from Library Modal - rendered outside main dialog to avoid nesting issues */}
    {showLibraryModal && libraryInvocation && (
      <AddSectionFromLibraryModal
        isOpen={showLibraryModal}
        onClose={() => {
          setShowLibraryModal(false);
          setLibraryInvocation(null);
        }}
        invocation={libraryInvocation}
        jobDescription={jobDescriptionRecord?.structured_data?.rawText || jobDescriptionRecord?.analysis?.llm?.rawText}
        workHistoryLibrary={workHistoryLibrary}
        savedSections={savedSections}
        isLibraryLoading={isLibraryLoading}
        libraryError={libraryError}
        onReplace={handleReplaceSection}
        onInsertBelow={handleInsertBelow}
        onInsertHere={async (insertIndex: number, sectionType: string, content: string, source: any) => {
          await handleInsertSection(insertIndex, content, source);
        }}
      />
    )}

    {/* User Goals Modal - rendered outside main dialog to avoid nesting issues */}
    <UserGoalsModal
      isOpen={showGoalsModal}
      onClose={() => setShowGoalsModal(false)}
      onSave={setGoals}
      initialGoals={goals || undefined}
    />
  </>
  );
};
