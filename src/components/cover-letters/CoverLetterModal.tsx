import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { GrammarTextarea } from '@/components/ui/grammar-textarea';
import { GrammarInput } from '@/components/ui/grammar-input';
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
import { ContentGenerationModalV3 } from '@/components/hil/ContentGenerationModalV3';
import { CoverLetterTemplateService } from '@/services/coverLetterTemplateService';
import { persistCoverLetterHilReuseArtifact } from '@/services/hilCoverLetterReuseService';
import { DraftGapSyncService } from '@/services/draftGapSyncService';
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { AddSectionFromLibraryModal, type InvocationType } from './AddSectionFromLibraryModal';
import { SectionInsertButton } from '@/components/template-blurbs/SectionInsertButton';
import { normalizeCoverLetterInsertionTarget, normalizeCoverLetterSections } from './sectionStructure';
import { useUserGoals } from '@/contexts/UserGoalsContext';
	import { useToast } from '@/hooks/use-toast';
	import { transformMetricsToMatchData, getUnresolvedRatingCriteria, useMatchMetricsDetails, type MatchMetricsData } from './useMatchMetricsDetails';
	import { computeGoNoGoModel } from './goNoGoModel';
	import { computeSectionAttribution } from './useSectionAttribution';
	import type { CoverLetterDraft, CoverLetterDraftSection, JobDescriptionRecord, ParsedJobDescription } from '@/types/coverLetters';
	import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from '@/types/workHistory';
		import { getApplicableStandards } from '@/config/contentStandards';
		import { logAStreamEvent } from '@/lib/telemetry';
		import { recordCoverLetterPerfEvent } from '@/lib/debug/coverLetterPerfDebug';
		import type { ContentVariationInsert } from '@/types/variations';

	const MIN_JOB_DESCRIPTION_LENGTH = 50;

function truncateHilText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars).trim()}…`;
}

function buildWorkHistoryHilSummary(workHistory: WorkHistoryCompany[]): string {
  const lines: string[] = [];
  const companies = (workHistory || []).slice(0, 6);
  for (const company of companies) {
    lines.push(`Company: ${company.name}`);
    const roles = (company.roles || []).slice(0, 3);
    for (const role of roles) {
      const tags = (role.tags || []).slice(0, 8);
      const roleMetrics = (role.outcomeMetrics || []).slice(0, 6);
      lines.push(`- Role: ${role.title}${tags.length ? ` (tags: ${tags.join(', ')})` : ''}`);
      if (role.description) lines.push(`  - Role scope: ${truncateHilText(role.description, 220)}`);
      if (roleMetrics.length) lines.push(`  - Role metrics: ${roleMetrics.join('; ')}`);

      // Include both approved and draft (drafts are still useful context for grounding).
      const blurbs = (role.blurbs || []).slice(0, 5);
      for (const blurb of blurbs) {
        const blurbTags = (blurb.tags || []).slice(0, 8);
        const blurbMetrics = (blurb.outcomeMetrics || []).slice(0, 6);
        const content = truncateHilText(blurb.content || '', 260);
        const status = blurb.status ? ` [${blurb.status}]` : '';
        lines.push(`  - Story: ${blurb.title}${status}${blurbTags.length ? ` (tags: ${blurbTags.join(', ')})` : ''}`);
        if (blurbMetrics.length) lines.push(`    - Story metrics: ${blurbMetrics.join('; ')}`);
        if (content) lines.push(`    ${content}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}

function buildFocusedWorkHistoryHilSummary(
  workHistory: WorkHistoryCompany[],
  storyId: string
): string {
  if (!storyId) return '';
  for (const company of workHistory || []) {
    for (const role of company.roles || []) {
      const blurb = (role.blurbs || []).find((item) => item.id === storyId);
      if (!blurb) continue;
      const lines: string[] = [];
      lines.push(`Company: ${company.name}`);
      const roleTags = (role.tags || []).slice(0, 8);
      const roleMetrics = (role.outcomeMetrics || []).slice(0, 6);
      lines.push(`- Role: ${role.title}${roleTags.length ? ` (tags: ${roleTags.join(', ')})` : ''}`);
      if (role.description) lines.push(`  - Role scope: ${truncateHilText(role.description, 220)}`);
      if (roleMetrics.length) lines.push(`  - Role metrics: ${roleMetrics.join('; ')}`);

      const blurbTags = (blurb.tags || []).slice(0, 8);
      const blurbMetrics = (blurb.outcomeMetrics || []).slice(0, 6);
      const content = truncateHilText(blurb.content || '', 320);
      const status = blurb.status ? ` [${blurb.status}]` : '';
      lines.push(`  - Story: ${blurb.title}${status}${blurbTags.length ? ` (tags: ${blurbTags.join(', ')})` : ''}`);
      if (blurbMetrics.length) lines.push(`    - Story metrics: ${blurbMetrics.join('; ')}`);
      if (content) lines.push(`    ${content}`);
      return lines.join('\n').trim();
    }
  }
  return '';
}

function buildDraftCoverageHilSummary(params: {
  enhancedMatchData: any;
  goals?: any;
  differentiatorSummary?: string | null;
}): string {
  const lines: string[] = [];
  const enhanced = params.enhancedMatchData;

  const goalLines = (() => {
    const list = Array.isArray(params.goals) ? params.goals : null;
    if (!list?.length) return [];
    return list
      .map((g: any) => (typeof g === 'string' ? g : g?.title ?? g?.label ?? g?.goalType ?? ''))
      .map((s: string) => String(s).trim())
      .filter(Boolean)
      .slice(0, 10);
  })();

  if (goalLines.length) {
    lines.push('User goals (high-level):');
    for (const g of goalLines) lines.push(`- ${g}`);
    lines.push('');
  }

  if (params.differentiatorSummary) {
    lines.push('User strengths / differentiators (summary):');
    lines.push(truncateHilText(String(params.differentiatorSummary), 500));
    lines.push('');
  }

  const addReqBlock = (title: string, reqs: any[], max: number) => {
    const items = (reqs || []).slice(0, max);
    if (!items.length) return;
    lines.push(title);
    for (const r of items) {
      const requirement = String(r?.requirement ?? '').trim();
      const evidence = truncateHilText(String(r?.evidence ?? ''), 160);
      const sections = Array.isArray(r?.sectionIds) ? r.sectionIds.slice(0, 3).join(', ') : '';
      if (!requirement) continue;
      lines.push(`- ${requirement}`);
      if (evidence) lines.push(`  evidence: ${evidence}`);
      if (sections) lines.push(`  where: ${sections}`);
    }
    lines.push('');
  };

  const demonstratedCore = (enhanced?.coreRequirementDetails ?? []).filter((r: any) => r?.demonstrated);
  const demonstratedPref = (enhanced?.preferredRequirementDetails ?? []).filter((r: any) => r?.demonstrated);

  addReqBlock('Already demonstrated in the current draft (avoid duplicating evidence verbatim):', demonstratedCore, 8);
  addReqBlock('Also demonstrated (preferred):', demonstratedPref, 6);

  const unmetCore = (enhanced?.coreRequirementDetails ?? [])
    .filter((r: any) => !r?.demonstrated)
    .map((r: any) => String(r?.requirement ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);
  const unmetPref = (enhanced?.preferredRequirementDetails ?? [])
    .filter((r: any) => !r?.demonstrated)
    .map((r: any) => String(r?.requirement ?? '').trim())
    .filter(Boolean)
    .slice(0, 12);

  if (unmetCore.length) {
    lines.push('Unmet core requirements to prioritize elsewhere in the draft:');
    for (const r of unmetCore) lines.push(`- ${r}`);
    lines.push('');
  }
  if (unmetPref.length) {
    lines.push('Unmet preferred requirements to consider:');
    for (const r of unmetPref) lines.push(`- ${r}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

function buildCoverLetterHilOutline(params: {
  draftSections: Array<{ id: string; type?: string; content?: string; title?: string }>;
  sectionDrafts: Record<string, string>;
  selectedSectionId?: string | null;
}): string {
  const lines: string[] = [];
  lines.push('Cover letter outline (ordered; excerpts):');
  for (const sec of params.draftSections) {
    const type = String((sec as any)?.type ?? '').trim() || 'section';
    const title = String((sec as any)?.title ?? '').trim();
    const marker = params.selectedSectionId && sec.id === params.selectedSectionId ? ' (editing now)' : '';
    const content = truncateHilText(String(params.sectionDrafts[sec.id] ?? (sec as any)?.content ?? ''), 320);
    lines.push(`- ${type}${title ? `: ${title}` : ''}${marker}`);
    if (content) lines.push(`  ${content}`);
  }
  return truncateHilText(lines.join('\n').trim(), 1800);
}

// Feature flag for A-phase streaming insights (Task 5)
const ENABLE_A_PHASE_INSIGHTS = true;
const IS_DEV = Boolean((import.meta as any)?.env?.DEV);

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
  startInPreview?: boolean;
  
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
  startInPreview = false,
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
  // `sectionDrafts` should only contain local overrides (edited but not yet persisted).
  // Do not mirror the full draft into this map; that causes user edits to be overwritten whenever
  // the draft object updates due to background Phase B updates (gaps/metrics/slot fills).
  const sectionDraftsDraftIdRef = useRef<string | null>(null);
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [selectedGap, setSelectedGap] = useState<Gap & { section_id?: string } | null>(null);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [saveToStoriesDialogOpen, setSaveToStoriesDialogOpen] = useState(false);
  const [saveToStoriesWorkItemId, setSaveToStoriesWorkItemId] = useState<string>('');
  const [saveToStoriesTitle, setSaveToStoriesTitle] = useState<string>('');
  const [saveToStoriesContent, setSaveToStoriesContent] = useState<string>('');
  const [saveToStoriesTags, setSaveToStoriesTags] = useState<string[]>([]);
  const [saveToStoriesSubmitting, setSaveToStoriesSubmitting] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  // Phase 3: Initial tab based on mode (create starts with JD, edit starts with draft)
  const [mainTab, setMainTab] = useState<'job-description' | 'cover-letter'>('cover-letter');
  // Create flow: Go/No-go is a discrete step before showing the draft UI
  const [createFlowStep, setCreateFlowStep] = useState<'fit-check' | 'draft'>('draft');
  const [streamingJobId, setStreamingJobId] = useState<string | null>(null);
  const editModePhaseBGapsDraftIdRef = useRef<string | null>(null);
  const editModePhaseBRefreshDraftIdRef = useRef<string | null>(null);
  const aPhaseStartMsRef = useRef<number | null>(null);
  const [aPhaseTimeout, setAPhaseTimeout] = useState(false);
  const [aPhaseRetrying, setAPhaseRetrying] = useState(false);
  const [aPhaseRetryAttempts, setAPhaseRetryAttempts] = useState(0);
  const [aPhaseHardError, setAPhaseHardError] = useState<string | null>(null);
  const aPhaseTerminalRef = useRef(false);
  const streamingJobIdRef = useRef<string | null>(null);
  // Phase 3: Track draft generation separately from streaming
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
	  const [phaseBTimeout, setPhaseBTimeout] = useState(false);
	  const [phaseBRetryAttempts, setPhaseBRetryAttempts] = useState(0);
	  const phaseBStartMsRef = useRef<number | null>(null);
	  // Perf debug (opt-in): capture timings without affecting normal UX.
	  const perfGenerateStartMsRef = useRef<number | null>(null);
	  const perfDraftReadyMsRef = useRef<number | null>(null);
	  const perfDraftIdRef = useRef<string | null>(null);
	  const perfPhaseACompleteRef = useRef(false);
	  const perfPhaseBGapsReadyDraftIdRef = useRef<string | null>(null);
	  
	  // UNIFIED SKELETON: Track if user has ever clicked Generate
	  const [generationHasStarted, setGenerationHasStarted] = useState(false);
  
  // PROGRESS FIX: Track peak progress to prevent backwards movement during regeneration
  const [peakProgress, setPeakProgress] = useState(0);
  
  // PROGRESS ANIMATION: Simulated progress during draft generation (30% → 95%)
  const [animatedDraftProgress, setAnimatedDraftProgress] = useState(30);
  const enhancedHydratedRef = useRef(false);
  const lastStableMetricsRef = useRef<MatchMetricsData | null>(null);
  
  // Set initial tab when modal FIRST opens based on mode
  // Use prevIsOpen ref to only run when transitioning from closed → open
  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    const wasClosedNowOpen = !prevIsOpenRef.current && isOpen;
    prevIsOpenRef.current = isOpen;
    
    if (wasClosedNowOpen) {
      setMainTab(mode === 'create' ? 'job-description' : 'cover-letter');
    }
  }, [isOpen, mode]);

  const [sectionFocusContent, setSectionFocusContent] = useState<Record<string, string>>({}); // Track content at focus time
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isManualRefreshLoading, setIsManualRefreshLoading] = useState(false);
  const [refreshStartedAt, setRefreshStartedAt] = useState<string | null>(null);
  const refreshPollingRef = useRef(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const previewInitializedRef = useRef(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryInvocation, setLibraryInvocation] = useState<InvocationType | null>(null);
  const [libraryInitialContentType, setLibraryInitialContentType] = useState<'story' | 'saved' | null>(null);
  const [libraryAutoAdvance, setLibraryAutoAdvance] = useState(false);
  const [workHistoryLibrary, setWorkHistoryLibrary] = useState<WorkHistoryCompany[]>([]);
  const [savedSections, setSavedSections] = useState<any[]>([]);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const { toast } = useToast();
  const preParseControllerRef = useRef<AbortController | null>(null);
  const preParsePromiseRef = useRef<Promise<JobDescriptionRecord> | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveSeqRef = useRef(0);
  const saveStatusTimerRef = useRef<number | null>(null);

  const waitForJdAnalysisCache = useCallback(
    async (jobDescriptionId: string, timeoutMs = 2500) => {
      const start = Date.now();
      const pollIntervalMs = 250;

      while (Date.now() - start < timeoutMs) {
        const { data, error } = await supabase
          .from('job_descriptions')
          .select('analysis')
          .eq('id', jobDescriptionId)
          .maybeSingle();

        if (error) {
          console.warn('[CoverLetterModal] Failed to check JD analysis cache:', error);
          return { found: false, waitedMs: Date.now() - start };
        }

        const analysis = data?.analysis as Record<string, unknown> | null;
        if (analysis?.roleInsights && analysis?.analyzedAt) {
          return { found: true, waitedMs: Date.now() - start };
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }

      return { found: false, waitedMs: Date.now() - start };
    },
    []
  );

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
          { data: stories, error: storiesError },
          savedSectionsResult,
        ] = await Promise.all([
          supabase.from('companies').select('id, name, description, created_at, updated_at').eq('user_id', user.id),
          supabase
            .from('work_items')
            .select('id, title, description, company_id, start_date, end_date, tags, metrics, created_at, updated_at')
            .eq('user_id', user.id),
          supabase
            .from('stories')
            .select('id, title, content, status, confidence, tags, metrics, work_item_id, created_at, updated_at')
            .eq('user_id', user.id),
          CoverLetterTemplateService.getUserSavedSections(user.id),
        ]);

        if (companiesError) throw companiesError;
        if (workItemsError) throw workItemsError;
        if (storiesError) throw storiesError;

        const storyIds = (stories || []).map((story) => story.id).filter(Boolean);
        let variationsByParent = new Map<string, any[]>();
        if (storyIds.length > 0) {
          const { data: variations, error: variationsError } = await supabase
            .from('content_variations')
            .select('id, content, parent_entity_id, target_job_title, gap_tags, created_at, created_by')
            .eq('user_id', user.id)
            .eq('parent_entity_type', 'approved_content')
            .in('parent_entity_id', storyIds)
            .order('created_at', { ascending: false });

          if (variationsError) {
            console.warn('[CoverLetterModal] Failed to load story variations for library:', variationsError);
          } else {
            (variations || []).forEach((variation: any) => {
              const parentId = variation.parent_entity_id;
              if (!parentId) return;
              const list = variationsByParent.get(parentId) || [];
              list.push(variation);
              variationsByParent.set(parentId, list);
            });
          }
        }

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
          const roleMetrics = Array.isArray((item as any).metrics)
            ? (item as any).metrics
                .map((m: any) => (m && typeof m.value === 'string' ? m.value : m?.value?.toString?.() ?? ''))
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

          const role: WorkHistoryRole = {
            id: item.id,
            companyId: company.id,
            title: item.title || 'Role',
            type: 'full-time',
            startDate: item.start_date || '',
            endDate: item.end_date || undefined,
            description: item.description || '',
            tags: tagsArray,
            outcomeMetrics: roleMetrics,
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

          const storyMetrics = Array.isArray((story as any).metrics)
            ? (story as any).metrics
                .map((m: any) => (m && typeof m.value === 'string' ? m.value : m?.value?.toString?.() ?? ''))
                .map((s: string) => s.trim())
                .filter(Boolean)
            : [];

          const blurb: WorkHistoryBlurb = {
            id: story.id,
            roleId: story.work_item_id,
            title: story.title || 'Untitled Story',
            content: story.content || '',
            outcomeMetrics: storyMetrics,
            tags: Array.isArray(story.tags) ? story.tags.map((t: unknown) => String(t)) : [],
            source: 'resume',
            status: (story.status as WorkHistoryBlurb['status']) || 'draft',
            confidence: (story.confidence as WorkHistoryBlurb['confidence']) || 'medium',
            timesUsed: 0,
            linkedExternalLinks: [],
            hasGaps: false,
            gapCount: 0,
            variations: (variationsByParent.get(story.id) || []).map((variation: any) => ({
              id: variation.id,
              content: variation.content,
              developedForJobTitle: variation.target_job_title || undefined,
              filledGap: undefined,
              jdTags: variation.gap_tags || [],
              tags: variation.gap_tags || [],
              createdAt: variation.created_at,
              createdBy: variation.created_by || 'AI',
            })),
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
        setSavedSections(savedSectionsResult ?? []);
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
      (jobDescriptionRecord as any).structured_data ??
      jobDescriptionRecord.structuredData ??
      llmAnalysis.structuredData ??
      {};

    return {
      role: jobDescriptionRecord.role,
      company: jobDescriptionRecord.company,
      standardRequirements:
        structured.standardRequirements ??
        (jobDescriptionRecord as any).standard_requirements ??
        jobDescriptionRecord.standardRequirements ??
        llmAnalysis.standardRequirements ??
        [],
      preferredRequirements:
        structured.preferredRequirements ??
        (jobDescriptionRecord as any).preferred_requirements ??
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
    // SSE is currently flaky in some environments (EventSource errors → polling).
    // Polling still supports partial stage updates because stream-job-process writes stages to DB.
    disableSSE: true,
    pollIntervalMs: 2000,
    timeout: 300000,
  });

  const refreshStreamingHook = useCoverLetterJobStream({
    autoStart: true,
    disableSSE: false,
    pollIntervalMs: 2000,
    timeout: 300000,
    streamMode: 'watch',
  });
  const refreshCompletionRef = useRef<{
    jobId: string;
    resolve: () => void;
    reject: (error: Error) => void;
  } | null>(null);
  const refreshJobIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const pending = refreshCompletionRef.current;
    const state = refreshStreamingHook.state;
    if (!pending || !state || state.jobId !== pending.jobId) return;
    if (state.status === 'complete') {
      pending.resolve();
      refreshCompletionRef.current = null;
    } else if (state.status === 'error') {
      pending.reject(new Error(state.error || 'Refresh failed'));
      refreshCompletionRef.current = null;
    }
  }, [refreshStreamingHook.state]);

  useEffect(() => {
    if (!refreshStreamingHook.error || !refreshCompletionRef.current) return;
    refreshCompletionRef.current.reject(new Error(refreshStreamingHook.error));
    refreshCompletionRef.current = null;
  }, [refreshStreamingHook.error]);

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

  const workHistoryHilSummary = useMemo(() => {
    const summary = buildWorkHistoryHilSummary(workHistoryLibrary);
    // Keep this bounded for prompt/token cost.
    return truncateHilText(summary, 2200);
  }, [workHistoryLibrary]);

  const focusedWorkHistoryHilSummary = useMemo(() => {
    if (!selectedGap?.section_id || !draft) return '';
    const section = draft.sections.find((sec) => sec.id === selectedGap.section_id);
    const source = (section as any)?.source as { kind?: string; entityId?: string | null } | null;
    if (source?.kind !== 'work_story' || !source.entityId) return '';
    const summary = buildFocusedWorkHistoryHilSummary(workHistoryLibrary, source.entityId);
    return summary ? truncateHilText(summary, 1800) : '';
  }, [draft, selectedGap?.section_id, workHistoryLibrary]);

  const effectiveWorkHistoryHilSummary = focusedWorkHistoryHilSummary || workHistoryHilSummary;

  const isRefreshDisabled = useMemo(() => {
    if (!draft?.id) return true;
    if (Object.keys(sectionDrafts).length > 0) return false;

    const phaseBCompletedAt = (draft.llmFeedback as any)?.phaseB?.completedAt;
    if (!phaseBCompletedAt) return false;
    const phaseBCompletedMs = Date.parse(phaseBCompletedAt);
    if (!Number.isFinite(phaseBCompletedMs)) return false;

    const lastContentUpdateMs = (draft.sections || []).reduce((max, section) => {
      const updatedAt = section.status?.lastUpdatedAt;
      if (!updatedAt) return max;
      const parsed = Date.parse(updatedAt);
      if (!Number.isFinite(parsed)) return max;
      return Math.max(max, parsed);
    }, 0);

    if (!lastContentUpdateMs) return false;
    return lastContentUpdateMs <= phaseBCompletedMs;
  }, [draft, sectionDrafts]);

  useEffect(() => {
    if (!isOpen) {
      previewInitializedRef.current = false;
      return;
    }
    if (!startInPreview || previewInitializedRef.current) {
      return;
    }
    if (!draft || draft.status !== 'finalized') {
      return;
    }
    setPreviewOnly(true);
    setFinalizationOpen(true);
    previewInitializedRef.current = true;
  }, [draft, isOpen, startInPreview]);

  useEffect(() => {
    lastStableMetricsRef.current = null;
  }, [draft?.id]);

  const fitCheckMatchDetails = useMatchMetricsDetails({
    jobDescription: normalizedJobDescription || undefined,
    enhancedMatchData: draft?.enhancedMatchData || undefined,
  });

  const draftCoverageHilSummary = useMemo(() => {
    const summary = buildDraftCoverageHilSummary({
      enhancedMatchData: draft?.enhancedMatchData,
      goals,
      differentiatorSummary:
        (draft as any)?.differentiatorSummary ?? (draft as any)?.differentiatorSummary?.summary ?? null,
    });
    return truncateHilText(summary, 1800);
  }, [draft?.enhancedMatchData, goals, (draft as any)?.differentiatorSummary]);

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
  const phaseAToolbarLoading = Boolean(
    isJobStreaming && !(aPhaseInsights?.stageFlags?.phaseComplete),
  );

  const aPhaseStages = jobState?.stages ?? {};
  const aPhaseFailed = ['jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths'].some((key) => {
    const status = (aPhaseStages as any)?.[key]?.status;
    return status === 'failed' || status === 'error';
  });
  // Fit check is "complete" once we can compute a stable Go/No-go model.
  // Do NOT gate on MwS; it can arrive late and should be treated as a pending input (not a blocker).
  const aPhaseComplete = Boolean(
    fitCheckMatchDetails.goalsComparisonReady &&
      aPhaseInsights?.stageFlags?.hasJdRequirementSummary &&
      aPhaseInsights?.stageFlags?.hasRequirementAnalysisData,
  );
	  const aPhaseTerminal = aPhaseComplete || aPhaseFailed;
	  const draftReady = Boolean(draft?.id);
		  const isFitCheckStep = mode === 'create' && generationHasStarted && createFlowStep === 'fit-check';
		  const autoAdvancedToDraftRef = useRef(false);
		  const phaseBGapsInFlight = Boolean(
		    mode === 'create' &&
		      generationHasStarted &&
		      !isFitCheckStep &&
		      draft &&
		      draft.enhancedMatchData?.sectionGapInsights === undefined,
		  );

	  // Perf debug (opt-in): record milestones to localStorage for quick latency stats.
	  useEffect(() => {
	    if (mode !== 'create') return;
	    if (!generationHasStarted) return;
	    if (!draft?.id) return;
	    if (perfDraftIdRef.current === draft.id) return;

	    perfDraftIdRef.current = draft.id;
	    perfDraftReadyMsRef.current = Date.now();

	    const start = perfGenerateStartMsRef.current;
	    recordCoverLetterPerfEvent('draft_ready', {
	      draftId: draft.id,
	      sectionCount: draft.sections?.length ?? 0,
	      msSinceGenerate: start ? Date.now() - start : null,
	    });
	  }, [mode, generationHasStarted, draft?.id]);

	  useEffect(() => {
	    if (mode !== 'create') return;
	    if (!generationHasStarted) return;
	    if (!aPhaseComplete) return;
	    if (perfPhaseACompleteRef.current) return;
	    perfPhaseACompleteRef.current = true;

	    const start = perfGenerateStartMsRef.current;
	    recordCoverLetterPerfEvent('phase_a_complete', {
	      jobId: streamingJobId,
	      msSinceGenerate: start ? Date.now() - start : null,
	    });
	  }, [mode, generationHasStarted, aPhaseComplete, streamingJobId]);

	  useEffect(() => {
	    if (mode !== 'create') return;
	    if (!generationHasStarted) return;
	    if (!draft?.id) return;
	    if (draft.enhancedMatchData?.sectionGapInsights === undefined) return;
	    if (perfPhaseBGapsReadyDraftIdRef.current === draft.id) return;
	    perfPhaseBGapsReadyDraftIdRef.current = draft.id;

	    const start = perfGenerateStartMsRef.current;
	    const ready = perfDraftReadyMsRef.current;
	    recordCoverLetterPerfEvent('phase_b_gaps_ready', {
	      draftId: draft.id,
	      gapsCount: (draft.enhancedMatchData as any)?.sectionGapInsights?.length ?? null,
	      msSinceGenerate: start ? Date.now() - start : null,
	      msSinceDraftReady: ready ? Date.now() - ready : null,
	    });
	  }, [mode, generationHasStarted, draft?.id, draft?.enhancedMatchData?.sectionGapInsights]);

	  const retryPhaseBGaps = useCallback(
	    (source: 'manual' | 'auto') => {
	      if (mode !== 'create') return;
	      if (!generationHasStarted) return;
	      if (isFitCheckStep) return;
	      const draftId = draft?.id;
	      const firstSectionId = draft?.sections?.[0]?.id;
	      if (!draftId || !firstSectionId) return;
	      // Don't enqueue concurrent refresh requests; they can pile up and worsen stalls.
	      if (createModeHook.sectionInsightsRefreshing?.size) return;

	      setPhaseBTimeout(false);
	      phaseBStartMsRef.current = Date.now();
	      setPhaseBRetryAttempts((n) => n + 1);
	      recordCoverLetterPerfEvent('retry_gaps', { source, draftId, sectionId: firstSectionId });
	      createModeHook.refreshSectionInsights(firstSectionId);
	      logAStreamEvent('phase_b_retry_gaps', { source, jobId: streamingJobId, draftId });
	    },
	    [
	      mode,
	      generationHasStarted,
	      isFitCheckStep,
	      draft?.id,
	      draft?.sections,
	      createModeHook.sectionInsightsRefreshing,
	      streamingJobId,
	    ],
	  );

  // Phase B stall detection (gaps): surface retry UI instead of appearing "stuck".
		  useEffect(() => {
		    if (mode !== 'create') return;
		    if (!generationHasStarted) {
		      setPhaseBTimeout(false);
		      phaseBStartMsRef.current = null;
		      return;
		    }
		    if (isFitCheckStep) return;
		    if (!draft?.id) return;

		    if (!phaseBGapsInFlight) {
		      setPhaseBTimeout(false);
		      phaseBStartMsRef.current = null;
		      return;
		    }

		    if (!phaseBStartMsRef.current) {
		      phaseBStartMsRef.current = Date.now();
		    }

		    const timer = window.setTimeout(() => {
		      setPhaseBTimeout(true);
		    }, 30000);

		    return () => window.clearTimeout(timer);
		  }, [
	      mode,
	      generationHasStarted,
	      isFitCheckStep,
	      draft?.id,
	      draft?.sections?.[0]?.id,
	      phaseBGapsInFlight,
	    ]);

	  // Automatic gap retry: if Phase B gaps haven't landed after a short grace period,
	  // trigger a single auto retry so users aren't forced to click "Retry gaps".
	  useEffect(() => {
	    if (mode !== 'create') return;
	    if (!generationHasStarted) return;
	    if (isFitCheckStep) return;
	    if (!phaseBGapsInFlight) return;
	    if (!phaseBTimeout) return;
	    if (phaseBRetryAttempts > 0) return;
	    retryPhaseBGaps('auto');
	  }, [
	    mode,
	    generationHasStarted,
	    isFitCheckStep,
	    phaseBGapsInFlight,
	    phaseBTimeout,
	    phaseBRetryAttempts,
	    retryPhaseBGaps,
	  ]);

  useEffect(() => {
    aPhaseTerminalRef.current = aPhaseTerminal;
  }, [aPhaseTerminal]);

  useEffect(() => {
    streamingJobIdRef.current = streamingJobId;
  }, [streamingJobId]);

	  // Do not auto-advance from Fit check to Draft.
	  // Product intent: Fit check is a discrete step the user can explore before proceeding.
	  // Auto-advance only once the draft itself is ready (Phase B can continue in the background).
	  useEffect(() => {
	    if (mode !== 'create') return;
	    if (!isFitCheckStep) return;
	    if (aPhaseHardError) return;
	    // The draft row (id) exists very early; only auto-advance once the draft content is ready to view.
	    if (!draftReady) return;
	    if (isGeneratingDraft) return;
	    if (autoAdvancedToDraftRef.current) return;
	    // Only auto-advance once all A-phase results required for the Fit Check experience are present
	    // (rating/confidence + MwS). Otherwise users get pushed to the draft before seeing the value.
	    const phaseACompleteForFitCheck = Boolean(
	      aPhaseInsights?.stageFlags?.phaseComplete &&
	        fitCheckMatchDetails.goalsComparisonReady &&
	        aPhaseInsights?.jdRequirementSummary &&
	        aPhaseInsights?.requirementAnalysis &&
	        aPhaseInsights?.mws,
	    );
	    if (!phaseACompleteForFitCheck) return;
	    // Only auto-advance once gaps are computed; otherwise the draft view can appear "stuck"
	    // at Computing gaps and score.
	    const hasPhaseBGaps = draft?.enhancedMatchData?.sectionGapInsights !== undefined;
	    if (!hasPhaseBGaps) return;
	    autoAdvancedToDraftRef.current = true;
	    // Give React a beat to paint the final rating/confidence before switching views.
	    window.setTimeout(() => {
	      setCreateFlowStep('draft');
	      setMainTab('cover-letter');
	      logAStreamEvent('gng_auto_advance_to_draft', { jobId: streamingJobId });
	    }, 1200);
	  }, [
	    mode,
	    isFitCheckStep,
	    aPhaseHardError,
	    draftReady,
	    isGeneratingDraft,
	    aPhaseInsights?.stageFlags?.phaseComplete,
	    aPhaseInsights?.jdRequirementSummary,
	    aPhaseInsights?.requirementAnalysis,
	    aPhaseInsights?.mws,
	    fitCheckMatchDetails.goalsComparisonReady,
	    draft?.enhancedMatchData?.sectionGapInsights,
	    streamingJobId,
	  ]);

  // If retrying and Phase A becomes terminal, clear retry state.
  useEffect(() => {
    if (mode !== 'create') return;
    if (!isFitCheckStep) return;
    if (!aPhaseRetrying) return;
    if (!aPhaseTerminal) return;
    setAPhaseRetrying(false);
    setAPhaseTimeout(false);
  }, [mode, isFitCheckStep, aPhaseRetrying, aPhaseTerminal]);

  // Promote job/stream errors to hard error during fit check.
  useEffect(() => {
    if (mode !== 'create') return;
    if (!isFitCheckStep) return;
    if (aPhaseHardError) return;
    const hookError = streamingHook.error;
    if (hookError) {
      setAPhaseHardError(hookError);
      logAStreamEvent('gng_phase_a_hard_error', { jobId: streamingJobId, error: hookError });
      return;
    }
    if (jobState?.status === 'error') {
      const msg = jobState.error?.message || 'Job failed';
      setAPhaseHardError(msg);
      logAStreamEvent('gng_phase_a_hard_error', { jobId: streamingJobId, error: msg });
    }
  }, [mode, isFitCheckStep, aPhaseHardError, streamingHook.error, jobState?.status, jobState?.error, streamingJobId]);

  // Timeout handling: show retry UI if Phase A stalls.
  useEffect(() => {
    if (mode !== 'create') return;
    if (!isFitCheckStep) {
      setAPhaseTimeout(false);
      setAPhaseRetrying(false);
      return;
    }
    if (aPhaseTerminal) {
      setAPhaseTimeout(false);
      setAPhaseRetrying(false);
      return;
    }
    if (aPhaseHardError) return;
    const start = aPhaseStartMsRef.current;
    if (!start) return;

    const timer = window.setTimeout(() => {
      setAPhaseTimeout(true);
      logAStreamEvent('gng_phase_a_timeout', {
        jobId: streamingJobId,
        elapsedMs: Date.now() - start,
      });

      // Automatic retry: reconnect to the same job stream (no new job).
      const jobId = streamingJobIdRef.current;
      if (!jobId) {
        setAPhaseHardError('Fit check could not retry (missing job id). Please start over.');
        logAStreamEvent('gng_phase_a_retry_failed', { jobId: null, reason: 'missing_job_id' });
        return;
      }
      setAPhaseRetrying(true);
      setAPhaseRetryAttempts((n) => n + 1);
      streamingHook.connect(jobId);
      logAStreamEvent('gng_retry_stream_auto', { jobId });

      // If Phase A is still not terminal after the retry window, force a hard error.
      window.setTimeout(() => {
        if (aPhaseTerminalRef.current) return;
        setAPhaseRetrying(false);
        setAPhaseHardError('Fit check timed out. Please start over.');
        logAStreamEvent('gng_phase_a_retry_failed', { jobId, reason: 'still_not_terminal' });
      }, 20000);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, [mode, isFitCheckStep, aPhaseTerminal, streamingJobId, aPhaseHardError, streamingHook]);
  
  // ============================================================================
  // DRAFT-ONLY DATA (NO STREAMING)
  // ============================================================================
  // Streaming is ONLY used for progress banner/bar, NOT for data display
  
  // Metrics come ONLY from draft
  const effectiveMetrics = draft?.enhancedMatchData?.metrics || draft?.metrics || [];
  
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
  const rawSetDraft = mode === 'create' ? createModeHook.setDraft : setLocalDraft;
  const setDraft = useCallback((nextDraft: CoverLetterDraft | null) => {
    if (!nextDraft?.sections?.length) {
      rawSetDraft(nextDraft);
      return;
    }

    const normalized = normalizeCoverLetterSections(nextDraft.sections);
    rawSetDraft(normalized.changed ? { ...nextDraft, sections: normalized.sections } : nextDraft);
  }, [rawSetDraft]);
  const workpad = mode === 'create' ? createModeHook.workpad : null;
  const streamingSections = mode === 'create' ? createModeHook.streamingSections : {};
  const progress = mode === 'create' ? createModeHook.progress : 0;
  const isGenerating = mode === 'create' ? createModeHook.isGenerating : false;
  const metricsLoading = mode === 'create' ? createModeHook.metricsLoading : false;
  const isMutating = mode === 'create' ? createModeHook.isMutating : isSaving;
  const isFinalizing = mode === 'create' ? createModeHook.isFinalizing : false;
  const generationError = mode === 'create' ? createModeHook.error : null;
  const generateDraft = mode === 'create' ? createModeHook.generateDraft : async () => {};

  useEffect(() => {
    if (!draft?.id || !draft.sections?.length) return;

    const normalized = normalizeCoverLetterSections(draft.sections);
    if (!normalized.changed) return;

    rawSetDraft({ ...draft, sections: normalized.sections });

    void coverLetterDraftService.updateDraft(draft.id, {
      sections: normalized.sections,
    }).catch((error) => {
      console.error('[CoverLetterModal] Failed to persist repaired section structure:', error);
      toast({
        title: 'Unable to repair draft structure',
        description: error instanceof Error ? error.message : 'Please refresh and try again.',
        variant: 'destructive',
      });
    });
  }, [coverLetterDraftService, draft, rawSetDraft, toast]);

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
  
  const updateSection = useCallback(
    async ({ sectionId, content }: { sectionId: string; content: string }) => {
      if (mode === 'create') {
        return createModeHook.updateSection({ sectionId, content });
      }

      // Edit mode: update section locally (server persistence handled by explicit "Save" button)
      if (!draft) return null;
      const updatedSections = draft.sections?.map((s) => (s.id === sectionId ? { ...s, content } : s)) || [];
      const updatedDraft = { ...draft, sections: updatedSections };
      setLocalDraft(updatedDraft);
      return updatedDraft;
    },
    [mode, createModeHook.updateSection, draft],
  );

  const normalizeVariationContent = useCallback((value: string): string => {
    const normalized = value.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    const sentences = normalized.split(/(?<=[.!?])\s+/);
    const seen = new Set<string>();
    const unique: string[] = [];
    sentences.forEach((sentence) => {
      const key = sentence.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      unique.push(sentence.trim());
    });
    return unique.join(' ');
  }, []);

  const normalizeTagValue = useCallback((value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const buildVariationTags = useCallback(
    (section: CoverLetterDraftSection) => {
      const sectionLabel = (section.title || section.slug || section.type || 'section').toString();
      const company = jobDescriptionRecord?.company ?? draft?.company ?? null;
      const role = jobDescriptionRecord?.role ?? draft?.role ?? null;
      const rawTags = [
        'cover letter',
        'story variation',
        sectionLabel ? `section ${sectionLabel}` : null,
        role ? `role ${role}` : null,
        company ? `company ${company}` : null,
      ].filter(Boolean) as string[];
      return Array.from(new Set(rawTags.map(normalizeTagValue).filter(Boolean)));
    },
    [jobDescriptionRecord?.company, jobDescriptionRecord?.role, draft?.company, draft?.role, normalizeTagValue],
  );

  const buildSavedSectionVariationTags = useCallback(
    (section: CoverLetterDraftSection) => {
      const sectionLabel = (section.title || section.slug || section.type || 'section').toString();
      const company = jobDescriptionRecord?.company ?? draft?.company ?? null;
      const role = jobDescriptionRecord?.role ?? draft?.role ?? null;
      const rawTags = [
        'cover letter',
        'saved section variation',
        sectionLabel ? `section ${sectionLabel}` : null,
        role ? `role ${role}` : null,
        company ? `company ${company}` : null,
      ].filter(Boolean) as string[];
      return Array.from(new Set(rawTags.map(normalizeTagValue).filter(Boolean)));
    },
    [jobDescriptionRecord?.company, jobDescriptionRecord?.role, draft?.company, draft?.role, normalizeTagValue],
  );

  const handleSaveSavedSectionVariation = useCallback(
    async (section: CoverLetterDraftSection, content: string) => {
      if (!user?.id) return;
      const sourceMeta = section.source as { entityId?: string | null; itemId?: string | null } | null;
      const sourceId = sourceMeta?.entityId ?? sourceMeta?.itemId ?? null;
      if (!sourceId) {
        toast({
          title: 'Save failed',
          description: 'This section is not linked to a saved section.',
          variant: 'destructive',
        });
        return;
      }

      const trimmed = String(content || '').trim();
      if (!trimmed) {
        toast({
          title: 'Nothing to save',
          description: 'Section content is empty.',
          variant: 'destructive',
        });
        return;
      }

      const cleaned = normalizeVariationContent(trimmed);
      if (!cleaned) {
        toast({
          title: 'Nothing to save',
          description: 'Section content is empty.',
          variant: 'destructive',
        });
        return;
      }

      const { data: savedSection, error: savedSectionError } = await supabase
        .from('saved_sections')
        .select('id, title, content')
        .eq('user_id', user.id)
        .eq('id', sourceId)
        .maybeSingle();

      if (savedSectionError) {
        toast({
          title: 'Save failed',
          description: 'Unable to load the saved section.',
          variant: 'destructive',
        });
        return;
      }

      const baseNormalized = normalizeVariationContent(String(savedSection?.content || ''));
      if (baseNormalized && cleaned === baseNormalized) {
        toast({
          title: 'No changes detected',
          description: 'This matches the saved section already.',
        });
        return;
      }

      const { data: existingVariations, error: existingError } = await supabase
        .from('content_variations')
        .select('id, content')
        .eq('user_id', user.id)
        .eq('parent_entity_type', 'saved_section')
        .eq('parent_entity_id', sourceId);

      if (!existingError) {
        const existingNormalized = new Set(
          (existingVariations || []).map((variation: any) =>
            normalizeVariationContent(String(variation.content || '')),
          ),
        );
        if (existingNormalized.has(cleaned)) {
          toast({
            title: 'Already saved',
            description: 'A matching variation already exists.',
          });
          return;
        }
      }

      const title = `Saved section variation – ${jobDescriptionRecord?.company ?? draft?.company ?? 'Company'} – ${
        section.title ?? savedSection?.title ?? 'Section'
      }`;

      const variationInsert: ContentVariationInsert = {
        user_id: user.id,
        parent_entity_type: 'saved_section',
        parent_entity_id: sourceId,
        title,
        content: cleaned,
        target_company: jobDescriptionRecord?.company ?? draft?.company ?? null,
        target_job_title: jobDescriptionRecord?.role ?? draft?.role ?? null,
        job_description_id: draft?.jobDescriptionId ?? null,
        gap_tags: buildSavedSectionVariationTags(section),
        created_by: 'user',
        times_used: 0,
      };

      const { error: insertError } = await supabase.from('content_variations').insert(variationInsert as any);
      if (insertError) {
        toast({
          title: 'Save failed',
          description: 'Unable to save variation.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Variation saved',
        description: 'Saved to variations for this section.',
      });
    },
    [
      buildSavedSectionVariationTags,
      draft?.company,
      draft?.jobDescriptionId,
      draft?.role,
      jobDescriptionRecord?.company,
      jobDescriptionRecord?.role,
      normalizeVariationContent,
      toast,
      user?.id,
    ],
  );

  const persistPreviewVariations = useCallback(
    async (sections: CoverLetterDraftSection[]) => {
      if (!user?.id || !draft?.id) return;

      const storySections = sections.filter(
        (section) => section.source?.kind === 'work_story' && section.source?.entityId,
      );
      if (storySections.length === 0) return;

      const storyIds = Array.from(
        new Set(storySections.map((section) => section.source.entityId).filter(Boolean)),
      ) as string[];
      if (storyIds.length === 0) return;

      const { data: stories, error: storyError } = await supabase
        .from('stories')
        .select('id, content, title')
        .eq('user_id', user.id)
        .in('id', storyIds);

      if (storyError) {
        console.warn('[CoverLetterModal] Failed to load base stories for variations:', storyError);
        return;
      }

      const storyById = new Map<string, { content: string; title?: string }>();
      (stories || []).forEach((story: any) => {
        if (!story?.id) return;
        storyById.set(story.id, { content: story.content ?? '', title: story.title ?? '' });
      });

      let variationsQuery = supabase
        .from('content_variations')
        .select('id, parent_entity_id, content')
        .eq('user_id', user.id)
        .eq('parent_entity_type', 'approved_content')
        .in('parent_entity_id', storyIds);

      if (draft?.jobDescriptionId) {
        variationsQuery = variationsQuery.eq('job_description_id', draft.jobDescriptionId);
      } else {
        variationsQuery = variationsQuery.is('job_description_id', null);
      }

      const { data: existingVariations, error: variationsError } = await variationsQuery;
      if (variationsError) {
        console.warn('[CoverLetterModal] Failed to load existing variations for preview:', variationsError);
        return;
      }

      const variationsByParent = new Map<string, string[]>();
      (existingVariations || []).forEach((variation: any) => {
        const parentId = variation.parent_entity_id;
        if (!parentId) return;
        const list = variationsByParent.get(parentId) || [];
        list.push(normalizeVariationContent(String(variation.content || '')));
        variationsByParent.set(parentId, list);
      });

      const inserts: ContentVariationInsert[] = [];
      storySections.forEach((section) => {
        const sourceEntityId = section.source?.entityId;
        if (!sourceEntityId) return;
        const draftContent = sectionDrafts[section.id] ?? section.content;
        const trimmed = String(draftContent || '').trim();
        if (!trimmed) return;

        const cleaned = normalizeVariationContent(trimmed);
        if (!cleaned) return;

        const baseStory = storyById.get(sourceEntityId);
        const baseNormalized = normalizeVariationContent(String(baseStory?.content || ''));
        if (baseNormalized && cleaned === baseNormalized) {
          return;
        }

        const existingNormalized = variationsByParent.get(sourceEntityId) || [];
        if (existingNormalized.includes(cleaned)) {
          return;
        }

        const title = `CL variation – ${jobDescriptionRecord?.company ?? draft?.company ?? 'Company'} – ${
          section.title ?? baseStory?.title ?? 'Story'
        }`;
        inserts.push({
          user_id: user.id,
          parent_entity_type: 'approved_content',
          parent_entity_id: sourceEntityId,
          title,
          content: cleaned,
          target_company: jobDescriptionRecord?.company ?? draft?.company ?? null,
          target_job_title: jobDescriptionRecord?.role ?? draft?.role ?? null,
          job_description_id: draft?.jobDescriptionId ?? null,
          gap_tags: buildVariationTags(section),
          created_by: 'user',
          times_used: 0,
        });
      });

      if (inserts.length === 0) return;
      const { error: insertError } = await supabase.from('content_variations').insert(inserts as any);
      if (insertError) {
        console.warn('[CoverLetterModal] Failed to persist preview variations (non-blocking):', insertError);
      }
    },
    [
      buildVariationTags,
      draft?.company,
      draft?.id,
      draft?.jobDescriptionId,
      draft?.role,
      jobDescriptionRecord?.company,
      jobDescriptionRecord?.role,
      normalizeVariationContent,
      sectionDrafts,
      user?.id,
    ],
  );

  useEffect(() => {
    if (!draft?.id) return;
    if (isFitCheckStep) return;
    if (showSkeleton) return;

    const hasLocalEdits = Object.keys(sectionDrafts).length > 0;
    if (!hasLocalEdits) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      const pendingDrafts = { ...sectionDrafts };
      if (Object.keys(pendingDrafts).length === 0) return;

      const autosaveSeq = ++autosaveSeqRef.current;
      setIsAutosaving(true);
      setSaveStatus('saving');
      if (saveStatusTimerRef.current) {
        window.clearTimeout(saveStatusTimerRef.current);
      }

      try {
        const mergedSections = (draft.sections || []).map((section) => ({
          ...section,
          content: pendingDrafts[section.id] ?? section.content,
        }));
        const sectionsById = new Map(
          (draft.sections || []).map((section) => [section.id, section] as const),
        );
        const updated = await coverLetterDraftService.updateDraft(draft.id, {
          sections: mergedSections,
        });
        if (updated && autosaveSeqRef.current === autosaveSeq) {
          setDraft(updated);
        }

        setSectionDrafts((prev) => {
          if (!prev || Object.keys(prev).length === 0) return prev;
          const next = { ...prev };
          Object.keys(pendingDrafts).forEach((sectionId) => {
            if (prev[sectionId] === pendingDrafts[sectionId]) {
              delete next[sectionId];
            }
          });
          return next;
        });
        setSaveStatus('saved');
        saveStatusTimerRef.current = window.setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (error) {
        console.error('[CoverLetterModal] Autosave failed:', error);
        setSaveStatus('idle');
        toast({
          title: 'Autosave failed',
          description:
            error instanceof Error ? error.message : 'Unable to autosave draft changes.',
          variant: 'destructive',
        });
      } finally {
        if (autosaveSeqRef.current === autosaveSeq) {
          setIsAutosaving(false);
        }
      }
    }, 1200);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [draft?.id, draft?.sections, isFitCheckStep, showSkeleton, sectionDrafts, setDraft, toast]);
  const recalculateMetrics = mode === 'create' ? createModeHook.recalculateMetrics : async () => {};
  const finalizeDraft =
    mode === 'create'
      ? createModeHook.finalizeDraft
      : async (args?: { sections?: CoverLetterDraftSection[] }) => {
          if (!draft?.id) {
            throw new Error('Draft not found.');
          }
          const { draft: finalized } = await coverLetterDraftService.finalizeDraft({
            draftId: draft.id,
            sections: args?.sections ?? draft.sections ?? [],
          });
          setDraft(finalized);
          return finalized;
        };
  const setWorkpad = mode === 'create' ? createModeHook.setWorkpad : () => {};
  const setTemplateId = mode === 'create' ? createModeHook.setTemplateId : () => {};
  const setJobDescriptionId = mode === 'create' ? createModeHook.setJobDescriptionId : () => {};
  const clearError = mode === 'create' ? createModeHook.clearError : () => {};
  const resetProgress = mode === 'create' ? createModeHook.resetProgress : () => {};

  // Phase 3: Initialize draft and load job description in edit mode
	  useEffect(() => {
	    const initializeEditMode = async () => {
	      if (mode === 'edit' && initialDraft && isOpen) {
	        // Always hydrate from DB; list views may pass a partial draft shape.
	        setLocalDraft(initialDraft);
	        try {
	          const refreshed = await coverLetterDraftService.getDraft(initialDraft.id);
	          if (refreshed) {
	            setLocalDraft(refreshed);

              // Older drafts may lack Phase B artifacts. If core requirements are missing, re-run Phase B.
              // Otherwise, only refresh gaps (fast path).
              const hasSectionGaps = refreshed.enhancedMatchData?.sectionGapInsights !== undefined;
              const hasCoreReqs = Array.isArray(refreshed.enhancedMatchData?.coreRequirementDetails);
              const hasPrefReqs = Array.isArray(refreshed.enhancedMatchData?.preferredRequirementDetails);
              const needsFullPhaseB = !hasCoreReqs || !hasPrefReqs;

              if (user?.id && initialDraft.jobDescriptionId) {
                if (needsFullPhaseB && editModePhaseBRefreshDraftIdRef.current !== refreshed.id) {
                  editModePhaseBRefreshDraftIdRef.current = refreshed.id;
                  coverLetterDraftService
                    .calculateMetricsForDraft(refreshed.id, user.id, initialDraft.jobDescriptionId)
                    .then(async () => {
                      const updated = await coverLetterDraftService.getDraft(refreshed.id);
                      if (updated) setLocalDraft(updated);
                    })
                    .catch((phaseBError) => {
                      console.warn('[CoverLetterModal] Phase B refresh failed in edit mode (non-blocking):', phaseBError);
                    });
                } else if (!hasSectionGaps && editModePhaseBGapsDraftIdRef.current !== refreshed.id) {
                  editModePhaseBGapsDraftIdRef.current = refreshed.id;
                  try {
                    await coverLetterDraftService.calculateSectionGapsForDraft(
                      refreshed.id,
                      user.id,
                      initialDraft.jobDescriptionId,
                    );
                    const updated = await coverLetterDraftService.getDraft(refreshed.id);
                    if (updated) setLocalDraft(updated);
                  } catch (gapError) {
                    console.warn('[CoverLetterModal] Failed to auto-refresh gaps in edit mode (non-blocking):', gapError);
                  }
                }
              }
	          }
	        } catch (error) {
	          console.warn('[CoverLetterModal] Failed to hydrate draft for edit mode (non-blocking):', error);
	        }
	        
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
	              // Backfill MwS from JD analysis into the draft if missing (common for older drafts).
	              const mwsFromJd = ((data as any)?.analysis as any)?.mws;
	              if (mwsFromJd && !(initialDraft as any)?.mws && !((initialDraft as any)?.llmFeedback as any)?.mws) {
	                try {
	                  await coverLetterDraftService.saveMwsData(initialDraft.id, mwsFromJd);
	                  const refreshed = await coverLetterDraftService.getDraft(initialDraft.id);
	                  if (refreshed) setLocalDraft(refreshed);
	                } catch (mwsError) {
	                  console.warn('[CoverLetterModal] Failed to backfill MwS into draft (non-blocking):', mwsError);
	                }
	              }
	              
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

        // If an existing draft is missing Phase B artifacts, backfill once (defensive).
        try {
          const latest = await coverLetterDraftService.getDraft(initialDraft.id);
          if (latest && latest.jobDescriptionId && user?.id) {
            const gapsReady = latest.enhancedMatchData?.sectionGapInsights !== undefined;
            const hasCoreReqs = Array.isArray(latest.enhancedMatchData?.coreRequirementDetails);
            const hasPrefReqs = Array.isArray(latest.enhancedMatchData?.preferredRequirementDetails);
            const needsFullPhaseB = !hasCoreReqs || !hasPrefReqs;

            if (needsFullPhaseB && editModePhaseBRefreshDraftIdRef.current !== latest.id) {
              editModePhaseBRefreshDraftIdRef.current = latest.id;
              coverLetterDraftService
                .calculateMetricsForDraft(latest.id, user.id, latest.jobDescriptionId)
                .then(async () => {
                  const refreshed = await coverLetterDraftService.getDraft(latest.id);
                  if (refreshed) setLocalDraft(refreshed);
                })
                .catch((phaseBError) => {
                  console.warn('[CoverLetterModal] Phase B backfill failed in edit mode (non-blocking):', phaseBError);
                });
            } else if (!gapsReady && editModePhaseBGapsDraftIdRef.current !== latest.id) {
              editModePhaseBGapsDraftIdRef.current = latest.id;
              coverLetterDraftService
                .calculateSectionGapsForDraft(latest.id, user.id, latest.jobDescriptionId)
                .then(async () => {
                  const refreshed = await coverLetterDraftService.getDraft(latest.id);
                  if (refreshed) setLocalDraft(refreshed);
                })
                .catch((phaseBError) => {
                  console.warn('[CoverLetterModal] Gaps backfill failed in edit mode (non-blocking):', phaseBError);
                });
            }
          }
        } catch (phaseBInitError) {
          console.warn('[CoverLetterModal] Failed to check Phase B status in edit mode (non-blocking):', phaseBInitError);
        }
	      }
	    };
	    
	    initializeEditMode();
	  }, [mode, initialDraft, isOpen, coverLetterDraftService, jobContent, user?.id]);

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
        // Most recent first, so edits show up immediately and the default selection
        // is the template the user most likely cares about.
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
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

        const preferredFromStorage = (() => {
          try {
            return localStorage.getItem(`coverLetter:lastTemplateId:${user.id}`);
          } catch {
            return null;
          }
        })();

        const availableIds = new Set(summaries.map(s => s.id));
        const nextTemplateId =
          (selectedTemplateId && availableIds.has(selectedTemplateId) ? selectedTemplateId : null) ||
          (preferredFromStorage && availableIds.has(preferredFromStorage) ? preferredFromStorage : null) ||
          (summaries[0]?.id ?? null);

        if (nextTemplateId) {
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
  }, [isOpen, user?.id, setTemplateId]);

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
      sectionDraftsDraftIdRef.current = null;
      setSectionDrafts({});
      return;
    }

    // Only clear local overrides when switching to a different draft.
    if (sectionDraftsDraftIdRef.current !== draft.id) {
      sectionDraftsDraftIdRef.current = draft.id;
      setSectionDrafts({});
      return;
    }

    // If the draft updates (Phase B, slot fills, etc.), keep local overrides,
    // but drop overrides for any sections that no longer exist.
    const currentSectionIds = new Set((draft.sections || []).map((s) => s.id));
    setSectionDrafts((prev) => {
      let changed = false;
      const next: Record<string, string> = { ...prev };
      for (const sectionId of Object.keys(next)) {
        if (!currentSectionIds.has(sectionId)) {
          delete next[sectionId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [draft?.id, draft?.sections]);

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
        const parsePromise = jobDescriptionService.findOrCreateJobDescription(user.id, trimmed, {
          url: null,
          onProgress: () => {},
          onToken: () => {},
          signal: controller.signal,
        });
        
        // Store promise so handleGenerate can wait for it
        preParsePromiseRef.current = parsePromise;
        
        const record = await parsePromise;

        if (preParseRequestIdRef.current !== requestId) {
          return;
        }

        setPreParsedJD(record);
        setPreParsedContent(trimmed);
        
        // PERF: Fire-and-forget pre-analysis while user reviews the parsed JD
        // This saves 15-25s when they click "Generate" because jdAnalysis will be cached
        // Only trigger if this was a fresh parse (not cached)
        if (!record.cached) {
          supabase.functions.invoke('preanalyze-jd', {
            body: { jobDescriptionId: record.id },
          }).then(() => {
            console.log('[CoverLetterModal] Pre-analysis triggered for JD:', record.id);
          }).catch((err) => {
            // Non-blocking - if it fails, the main pipeline will just do the analysis
            console.warn('[CoverLetterModal] Pre-analysis failed (non-blocking):', err);
          });
        }
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
          preParsePromiseRef.current = null;
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
    sectionDraftsDraftIdRef.current = null;
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
    setCreateFlowStep('draft');
    setStreamingJobId(null);
    setAPhaseTimeout(false);
    setAPhaseRetrying(false);
    setAPhaseRetryAttempts(0);
    setAPhaseHardError(null);
    setPhaseBTimeout(false);
	    setPhaseBRetryAttempts(0);
	    aPhaseStartMsRef.current = null;
	    phaseBStartMsRef.current = null;
	    streamingJobIdRef.current = null;
	    aPhaseTerminalRef.current = false;
	    setIsGeneratingDraft(false);
    setGenerationHasStarted(false);
    setPeakProgress(0);
    setFinalizationOpen(false);
    setFinalizationError(null);
    setPreviewOnly(false);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setTemplateId(templateId);
    if (user?.id) {
      try {
        localStorage.setItem(`coverLetter:lastTemplateId:${user.id}`, templateId);
      } catch {
        // ignore
      }
    }
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
    const trimmedContent = jobContent.trim();
    if (trimmedContent.length < MIN_JOB_DESCRIPTION_LENGTH) {
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
	    // Perf debug (opt-in): track end-to-end generation latency.
	    perfGenerateStartMsRef.current = Date.now();
	    perfDraftReadyMsRef.current = null;
	    perfDraftIdRef.current = null;
	    perfPhaseACompleteRef.current = false;
	    perfPhaseBGapsReadyDraftIdRef.current = null;
	    recordCoverLetterPerfEvent('generate_click', {
	      templateId: selectedTemplateId,
	      jobDescriptionLength: trimmedContent.length,
	    });

	    try {
      let record: JobDescriptionRecord;
      
      // If we have a pre-parsed JD and the content hasn't changed, reuse it
      if (preParsedJD && trimmedContent === preParsedContent) {
        console.log('[CoverLetterCreateModal] Reusing pre-parsed JD, skipping parse step');
        record = preParsedJD;
        setJdStreamingMessages(['Job description analysis complete (cached).']);
      } 
      // If pre-parse is in progress for the same content, wait for it to complete
      else if (isPreParsing && preParsePromiseRef.current && trimmedContent === preParsedContent) {
        console.log('[CoverLetterCreateModal] Pre-parse in progress, waiting for completion...');
        setJdStreamingMessages(['Analyzing job description...']);
        try {
          record = await preParsePromiseRef.current;
          setJdStreamingMessages(['Job description analysis complete.']);
          console.log('[CoverLetterCreateModal] Pre-parse completed, using result:', record.id);
        } catch (error) {
          // Pre-parse failed or was aborted, fall through to fresh parse
          console.warn('[CoverLetterCreateModal] Pre-parse failed, parsing fresh', error);
          setIsParsingJobDescription(true);
          record = await jobDescriptionService.findOrCreateJobDescription(user.id, trimmedContent, {
            url: null,
            onProgress: (message) => {
              setJdStreamingMessages(prev => {
                const last = prev[prev.length - 1];
                if (last === message) return prev;
                return [...prev, message];
              });
            },
            onToken: (token, aggregate) => {
              setJdStreamingMessages(prev => {
                const base = prev.slice(0, -1);
                const preview = aggregate.slice(-50);
                return [...base, `Parsing… ${preview}${preview.length < aggregate.length ? '…' : ''}`];
              });
            },
          });
          setJdStreamingMessages(prev => [...prev, record.cached ? 'Job description analysis complete (cached).' : 'Job description analysis complete.']);
          setIsParsingJobDescription(false);
        }
      }
      else {
        // Otherwise, find cached or parse the JD with progress feedback
        setIsParsingJobDescription(true);
        record = await jobDescriptionService.findOrCreateJobDescription(user.id, trimmedContent, {
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
        setJdStreamingMessages(prev => [...prev, record.cached ? 'Job description analysis complete (cached).' : 'Job description analysis complete.']);
        setIsParsingJobDescription(false);
      }
      
      setJobDescriptionRecord(record);
      setJobDescriptionId(record.id);

      // PERF: Trigger JD pre-analysis on generate, so jdAnalysis can hit cache even if user skipped the pre-parse wait.
      supabase.functions
        .invoke('preanalyze-jd', { body: { jobDescriptionId: record.id } })
        .then(() => {
          console.log('[CoverLetterModal] Pre-analysis triggered (generate flow) for JD:', record.id);
        })
        .catch((err) => {
          console.warn('[CoverLetterModal] Pre-analysis failed in generate flow (non-blocking):', err);
        });
      
      // UNIFIED SKELETON: Switch to draft tab and mark generation as started
      setMainTab('cover-letter');
      setGenerationHasStarted(true); // Mark that user clicked Generate (persists across entire flow)
      setIsGeneratingDraft(true); // Track draft generation state
      setCreateFlowStep('fit-check');
      setStreamingJobId(null);
      setAPhaseTimeout(false);
      setAPhaseRetrying(false);
      setAPhaseRetryAttempts(0);
      setAPhaseHardError(null);
      aPhaseStartMsRef.current = Date.now();
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
        }).then(jobId => {
          setStreamingJobId(jobId);
          streamingJobIdRef.current = jobId;
          console.log('[CoverLetterModal] createJob resolved:', jobId);
          return jobId;
        }).catch(err => {
          console.error('[CoverLetterModal] createJob rejected:', err);
          throw err;
        }),
        // 2. Draft generation (reuse hook) - ensures background metrics polling updates
        // the in-memory draft so gaps/score are not stuck in skeleton until refresh.
        generateDraft({
          templateId: selectedTemplateId,
          jobDescriptionId: record.id,
        }).then(result => {
          console.log('[CoverLetterModal] generateDraft resolved with', result.draft.sections.length, 'sections');
          return result;
        }).catch(err => {
          console.error('[CoverLetterModal] generateDraft rejected:', err);
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
    // Remove local override so UI falls back to the server-backed draft content.
    setSectionDrafts(prev => {
      if (!(sectionId in prev)) return prev;
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
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
      await updateSection({ sectionId, content });
      // Clear local override on successful persist; draft content will re-render from source of truth.
      setSectionDrafts(prev => {
        if (!(sectionId in prev)) return prev;
        const next = { ...prev };
        delete next[sectionId];
        return next;
      });

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

  const handleManualRefreshInsights = async () => {
    if (!draft?.id) {
      toast({
        title: 'No draft available',
        description: 'Generate or open a draft before refreshing insights.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Missing user session',
        description: 'Please sign in again before refreshing insights.',
        variant: 'destructive',
      });
      return;
    }

    const jobDescriptionId = draft.jobDescriptionId ?? jobDescriptionRecord?.id ?? null;
    if (!jobDescriptionId) {
      toast({
        title: 'Missing job description',
        description: 'Reload the draft to refresh requirements and gaps.',
        variant: 'destructive',
      });
      return;
    }

    if (isRefreshDisabled) return;
    if (isManualRefreshLoading) return;
    setIsManualRefreshLoading(true);

    const refreshStartMs = Date.now();
    const refreshStartIso = new Date().toISOString();
    setRefreshStartedAt(refreshStartIso);
    recordCoverLetterPerfEvent('refresh_insights_start', { draftId: draft.id, jobDescriptionId });

    try {
      refreshStreamingHook.reset();
      let refreshJobId: string | null = null;
      try {
        refreshJobId = await refreshStreamingHook.createJob(
          'coverLetter',
          {
            jobDescriptionId,
            draftId: draft.id,
            mode: 'refresh',
          },
          { autoProcess: false },
        );
      } catch (jobError) {
        console.warn('[CoverLetterModal] Unable to create refresh streaming job (non-blocking):', jobError);
      }
      if (refreshJobId) {
        refreshJobIdRef.current = refreshJobId;
      }

      // Persist any local edits so metrics/gaps are computed against the latest content.
      if (Object.keys(sectionDrafts).length > 0) {
        const mergedSections = (draft.sections || []).map((section) => ({
          ...section,
          content: sectionDrafts[section.id] ?? section.content,
        }));
        await coverLetterDraftService.updateDraft(draft.id, { sections: mergedSections });
        setSectionDrafts({});
      }

      const refreshPromise = coverLetterDraftService.calculateMetricsForDraft(
        draft.id,
        user.id,
        jobDescriptionId,
        undefined,
        { jobId: refreshJobId ?? undefined },
      ).catch((error) => {
        if (refreshCompletionRef.current && refreshCompletionRef.current.jobId === (refreshJobId ?? '')) {
          refreshCompletionRef.current.reject(error instanceof Error ? error : new Error(String(error)));
          refreshCompletionRef.current = null;
        }
        throw error;
      });

      refreshPollingRef.current = true;
      let lastUpdatedAt = draft.updatedAt;
      const pollPromise = (async () => {
        while (refreshPollingRef.current) {
          await new Promise(resolve => window.setTimeout(resolve, 2000));
          const latest = await coverLetterDraftService.getDraft(draft.id);
          if (!latest) continue;
          if (latest.updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = latest.updatedAt;
            setDraft(latest);
          }
        }
      })();
      const completionPromise = refreshJobId
        ? new Promise<void>((resolve, reject) => {
            refreshCompletionRef.current = { jobId: refreshJobId, resolve, reject };
            const state = refreshStreamingHook.state;
            if (state?.jobId === refreshJobId) {
              if (state.status === 'complete') resolve();
              if (state.status === 'error') reject(new Error(state.error || 'Refresh failed'));
            }
          })
        : refreshPromise.then(() => undefined);

      await Promise.all([refreshPromise, completionPromise]);

      const refreshed = await coverLetterDraftService.getDraft(draft.id);
      if (refreshed) {
        setDraft(refreshed);
      }

      recordCoverLetterPerfEvent('refresh_insights_complete', {
        draftId: draft.id,
        jobDescriptionId,
        durationMs: Date.now() - refreshStartMs,
      });
      toast({
        title: 'Insights refreshed',
        description: 'Gaps, metrics, and readiness are up to date.',
      });
    } catch (error) {
      console.error('[CoverLetterModal] Manual refresh failed:', error);
      recordCoverLetterPerfEvent('refresh_insights_failed', {
        draftId: draft.id,
        jobDescriptionId,
        durationMs: Date.now() - refreshStartMs,
        message: error instanceof Error ? error.message : String(error),
      });
      toast({
        title: 'Refresh failed',
        description:
          error instanceof Error ? error.message : 'Unable to refresh insights. Please try again.',
        variant: 'destructive',
      });
    } finally {
      refreshPollingRef.current = false;
      await new Promise(resolve => window.setTimeout(resolve, 0));
      setIsManualRefreshLoading(false);
      refreshCompletionRef.current = null;
      refreshJobIdRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (saveStatusTimerRef.current) {
        window.clearTimeout(saveStatusTimerRef.current);
      }
    };
  }, []);

  // Add Section from Library handlers
  const handleInsertBetweenSections = (insertIndex: number) => {
    if (!draft) return;
    const sections = draft.sections || [];
    const normalizedTarget = normalizeCoverLetterInsertionTarget(sections, insertIndex);

    setLibraryInvocation({
      type: 'insert_here',
      insertIndex: normalizedTarget.insertIndex,
      preferredSectionType: normalizedTarget.sectionType,
    });
    setLibraryInitialContentType(null);
    setLibraryAutoAdvance(false);
    setShowLibraryModal(true);
  };

  const toDraftSource = (source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string }) => {
    if (source.contentType === 'saved_section') {
      return { kind: 'saved_section' as const, entityId: source.itemId };
    }
    return { kind: 'work_story' as const, entityId: source.itemId };
  };

  const refreshDraftInsightsAfterLibraryChange = async (draftId: string) => {
    const jobDescriptionId = draft?.jobDescriptionId ?? jobDescriptionRecord?.id;
    if (!user?.id || !jobDescriptionId) return;
    try {
      await coverLetterDraftService.calculateSectionGapsForDraft(
        draftId,
        user.id,
        jobDescriptionId,
      );
      const refreshed = await coverLetterDraftService.getDraft(draftId);
      if (refreshed) {
        setDraft(refreshed);
      }
    } catch (error) {
      console.warn('[CoverLetterModal] Failed to refresh section gaps after library change:', error);
    }
  };

  const handleInsertSection = async (
    insertIndex: number,
    content: string,
    source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }
  ) => {
    if (!draft) return;
    
    try {
      const normalizedTarget = normalizeCoverLetterInsertionTarget(draft.sections || [], insertIndex);
      const newSection = {
        id: `section-${Date.now()}`,
        type: normalizedTarget.sectionType,
        slug: normalizedTarget.sectionType,
        title: source.title || 'New Section',
        content,
        source: toDraftSource(source),
        order: normalizedTarget.insertIndex,
      };

      // Insert the new section at the specified index
      const updatedSections = [...draft.sections];
      updatedSections.splice(normalizedTarget.insertIndex, 0, newSection);

      const reorderedSections = normalizeCoverLetterSections(updatedSections.map((section, index) => ({
        ...section,
        order: index,
      }))).sections;

      // Update draft in state
      setDraft({ ...draft, sections: reorderedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      if (source.contentType === 'saved_section') {
        await CoverLetterTemplateService.incrementSectionUsage(source.itemId);
      }

      toast({
        title: "Section added",
        description: "Content from library has been inserted",
      });

      void refreshDraftInsightsAfterLibraryChange(draft.id);

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

  const handleReorderSections = async (fromIndex: number, toIndex: number) => {
    if (!draft) return;
    const sections = [...draft.sections];
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= sections.length
    ) {
      return;
    }

    const [moved] = sections.splice(fromIndex, 1);
    let insertIndex = toIndex;
    if (fromIndex < toIndex) {
      insertIndex = insertIndex - 1;
    }

    if (insertIndex < 0) insertIndex = 0;
    if (insertIndex > sections.length) insertIndex = sections.length;

    sections.splice(insertIndex, 0, moved);
    const reorderedSections = normalizeCoverLetterSections(sections.map((section, index) => ({
      ...section,
      order: index,
    }))).sections;

    setDraft({ ...draft, sections: reorderedSections });
    try {
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });
    } catch (error) {
      console.error('[CoverLetterModal] Failed to reorder sections:', error);
      toast({
        title: 'Unable to reorder sections',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleReplaceSection = async (
    sectionId: string,
    content: string,
    source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }
  ) => {
    if (!draft) return;

    try {
      // Update section content
      const updatedSections = draft.sections.map(section =>
        section.id === sectionId
          ? { ...section, content, source: toDraftSource(source), title: source.title || section.title }
          : section
      );

      // Update draft in state
      setDraft({ ...draft, sections: updatedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: updatedSections,
      });

      if (source.contentType === 'saved_section') {
        await CoverLetterTemplateService.incrementSectionUsage(source.itemId);
      }

      toast({
        title: "Section replaced",
        description: "Content from library has been inserted",
      });

      void refreshDraftInsightsAfterLibraryChange(draft.id);

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

  const handleSectionDelete = async (sectionId: string) => {
    if (!draft) return;
    const section = draft.sections.find(s => s.id === sectionId);
    if (!section) return;
    if (!confirm(`Delete "${section.title}" section?`)) return;

    try {
      const updatedSections = draft.sections.filter(s => s.id !== sectionId);

      const reorderedSections = normalizeCoverLetterSections(updatedSections.map((s, index) => ({
        ...s,
        order: index,
      }))).sections;

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
    const preferredContentType = sectionType === 'intro' || sectionType === 'closing' ? 'saved' : 'story';
    setLibraryInvocation({
      type: 'replace_or_insert_below',
      sectionId,
      sectionType,
      sectionIndex,
    });
    setLibraryInitialContentType(preferredContentType);
    setLibraryAutoAdvance(true);
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

  const handleInsertBelow = async (
    sectionIndex: number,
    _sectionType: string,
    content: string,
    source: { kind: "library"; contentType: "story" | "saved_section"; itemId: string; title?: string }
  ) => {
    if (!draft) return;

    try {
      const normalizedTarget = normalizeCoverLetterInsertionTarget(draft.sections || [], sectionIndex + 1);
      const newSection = {
        id: `section-${Date.now()}`,
        type: normalizedTarget.sectionType,
        slug: normalizedTarget.sectionType,
        title: source.title || 'New Section',
        content,
        source: toDraftSource(source),
        order: normalizedTarget.insertIndex,
      };

      // Insert the new section after the specified index
      const updatedSections = [...draft.sections];
      updatedSections.splice(normalizedTarget.insertIndex, 0, newSection);

      const reorderedSections = normalizeCoverLetterSections(updatedSections.map((section, index) => ({
        ...section,
        order: index,
      }))).sections;

      // Update draft in state
      setDraft({ ...draft, sections: reorderedSections });

      // Save to database
      await coverLetterDraftService.updateDraft(draft.id, {
        sections: reorderedSections,
      });

      if (source.contentType === 'saved_section') {
        await CoverLetterTemplateService.incrementSectionUsage(source.itemId);
      }

      toast({
        title: "Section added",
        description: "Content from library has been inserted below",
      });

      void refreshDraftInsightsAfterLibraryChange(draft.id);

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
    setPreviewOnly(false);
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
      try {
        await persistPreviewVariations(finalSections);
      } catch (error) {
        console.warn('[CoverLetterModal] Failed to persist finalize variations (non-blocking):', error);
      }
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

  const generateButtonRef = useRef<HTMLButtonElement>(null);

  const renderJobDescriptionTab = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg font-semibold">Job description</CardTitle>
                <CardDescription>
                  Paste the full role description so we can analyze requirements and tailor your draft.
                </CardDescription>
              </div>
              {/* Generate button - only show if draft hasn't been generated yet */}
              {!draft && (
                <Button
                  ref={generateButtonRef}
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
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO: Re-enable job description URL ingestion once MVP supports remote fetching. Tracked in docs/backlog/HIDDEN_FEATURES.md */}
            <div className="relative">
              <GrammarTextarea
                placeholder="Paste job description here..."
                rows={8}
                value={jobContent}
                onChange={event => setJobContent(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Tab' && !event.shiftKey && generateButtonRef.current) {
                    event.preventDefault();
                    generateButtonRef.current.focus();
                  }
                }}
                disabled={isBusy}
                autoFocus={mode === 'create' && !draft}
                className="resize-y"
              />
              {isPreParsing && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded-md border border-muted">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Analyzing...
                </div>
              )}
            </div>

            {/* Character count below textarea for focus */}
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

            {/* Pro tip for LinkedIn copying - moved to bottom */}
            <Alert className="bg-primary/5 border-primary/20">
              <AlertTitle className="flex items-center gap-2 text-sm font-medium">
                💡 Pro tip for LinkedIn job posts
              </AlertTitle>
              <AlertDescription className="text-xs mt-2">
                <p>
                  When copying from LinkedIn, click "Show more" first, then select everything that describes the role and the company. Narrata uses that context to tailor your letter.
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderDraftTab = () => {
    const retryStream = () => {
      if (!streamingJobId) return;
      setAPhaseTimeout(false);
      setAPhaseRetrying(true);
      setAPhaseRetryAttempts((n) => n + 1);
      streamingHook.connect(streamingJobId);
      logAStreamEvent('gng_retry_stream', { jobId: streamingJobId });
    };

    // EARLY METRICS DISPLAY: preserve last stable metrics until a successful Phase B run lands.
    const hasPhaseBGaps = draft?.enhancedMatchData?.sectionGapInsights !== undefined;
    const rawMetrics = Array.isArray(effectiveMetrics) ? effectiveMetrics : (effectiveMetrics ? [effectiveMetrics] : []);
    const hasRawMetrics = rawMetrics.length > 0;
    const hasStableMetrics = Boolean(lastStableMetricsRef.current);
    const hasSuccessfulMetrics = hasRawMetrics && hasPhaseBGaps;
    const effectiveMetricsLoading = metricsLoading || (!hasSuccessfulMetrics && !hasStableMetrics);
    const usingStaleMetrics = !hasSuccessfulMetrics && hasStableMetrics;

    const matchMetrics = hasSuccessfulMetrics
      ? transformMetricsToMatchData(rawMetrics)
      : (lastStableMetricsRef.current ?? transformMetricsToMatchData([]));

    // Extract rating criteria from llmFeedback
    const ratingData = draft?.llmFeedback?.rating as any;
    if (!usingStaleMetrics && ratingData?.criteria && Array.isArray(ratingData.criteria)) {
      matchMetrics.ratingCriteria = ratingData.criteria.map((c: any) => ({
        id: c.id || '',
        label: c.label || '',
        met: c.met === true,
        evidence: c.evidence || '',
        suggestion: c.suggestion || '',
      }));
    }

    // FIX 1: Check analytics.overallScore first (for finalized drafts)
    const analyticsScore = draft?.analytics?.overallScore;
    if (!usingStaleMetrics && analyticsScore !== undefined && analyticsScore !== null) {
      matchMetrics.overallScore = analyticsScore;
      if (import.meta.env?.DEV) {
        console.log('[CoverLetterCreateModal] Using analytics.overallScore:', analyticsScore);
      }
    }

    // FIX 2: Calculate score from criteria data if rating metric missing
    if (!usingStaleMetrics && matchMetrics.overallScore === undefined && matchMetrics.ratingCriteria && matchMetrics.ratingCriteria.length > 0) {
      const metCount = matchMetrics.ratingCriteria.filter((c) => c.met).length;
      const totalCount = matchMetrics.ratingCriteria.length;
      if (totalCount > 0) {
        const calculatedScore = Math.round((metCount / totalCount) * 100);
        matchMetrics.overallScore = calculatedScore;
        if (import.meta.env?.DEV) {
          console.log(
            '[CoverLetterCreateModal] Calculated score from criteria:',
            calculatedScore,
            `(${metCount}/${totalCount})`,
          );
        }
      }
    }

    // Ensure atsScore falls back to draft.atsScore if metric unavailable
    if (!usingStaleMetrics && matchMetrics.atsScore === 0 && draft?.atsScore) {
      matchMetrics.atsScore = draft.atsScore;
    }

    // Persist stable metrics only when Phase B artifacts land.
    if (hasSuccessfulMetrics) {
      lastStableMetricsRef.current = matchMetrics;
    }

	    if (isFitCheckStep) {
	      const { goalMatches, goalsSummary, goalsComparisonReady } = fitCheckMatchDetails;
	      const aPhaseRequirementAnalysis = aPhaseInsights?.requirementAnalysis;
	      const phaseACoreRequirements = (aPhaseRequirementAnalysis?.coreRequirements || []).map((r: any) => ({
	        id: String(r.id),
	        requirement: String(r.text ?? ''),
	        demonstrated: Boolean(r.met),
	        evidence: r.evidence,
	      }));
	      const phaseAPrefRequirements = (aPhaseRequirementAnalysis?.preferredRequirements || []).map((r: any) => ({
	        id: String(r.id),
	        requirement: String(r.text ?? ''),
	        demonstrated: Boolean(r.met),
	        evidence: r.evidence,
	      }));
	
	      const fitCheckModel = computeGoNoGoModel({
	        goalsComparisonReady,
	        goalsSummaryPercentage: goalsSummary.percentage ?? 0,
	        goalMatches,
	        hasAPhaseRequirementAnalysis: Boolean(aPhaseRequirementAnalysis),
	        hasMwsData: Boolean(aPhaseInsights?.mws?.summaryScore !== undefined),
	        mwsSummaryScore: aPhaseInsights?.mws?.summaryScore ?? 0,
	        effectiveCoreRequirements: phaseACoreRequirements,
	        effectivePreferredRequirements: phaseAPrefRequirements,
	      });
	
	        return (
		        <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">
                  Is this job a match with your goals and skills?
                </h2>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetViewState();
                      setMainTab('job-description');
                      logAStreamEvent('gng_start_over_clicked', { jobId: streamingJobId });
                    }}
                  >
                    Start over
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setCreateFlowStep('draft');
                      setMainTab('cover-letter');
                      logAStreamEvent('gng_continue_to_draft_clicked', { jobId: streamingJobId });
                    }}
                    disabled={Boolean(aPhaseHardError) || (!draftReady && !aPhaseTerminal)}
                  >
                    Continue to draft
                  </Button>
                </div>
              </div>

		          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
		            <Card
		              className={cn(
		                'border border-border/40 bg-muted/10',
		                !fitCheckModel && 'fit-check-loading border-2 border-dashed border-primary/40 bg-primary/5',
		              )}
		            >
		              <CardContent className="p-4 flex flex-col items-center justify-center gap-2 min-h-[72px]">
		                <span className="text-xs uppercase tracking-wide text-muted-foreground">Rating</span>
		                <div
		                  className={cn(
		                    'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold',
		                    fitCheckModel
		                      ? (fitCheckModel.decision === 'go'
		                        ? 'border-success bg-success/10 text-success'
		                        : 'border-destructive bg-destructive/10 text-destructive')
		                      : 'border-muted bg-muted/10 text-muted-foreground',
		                  )}
		                >
		                  {fitCheckModel ? (fitCheckModel.decision === 'go' ? 'Go' : 'No-Go') : '—'}
		                </div>
		              </CardContent>
		            </Card>
		            <Card
		              className={cn(
		                'border border-border/40 bg-muted/10',
		                !fitCheckModel && 'fit-check-loading border-2 border-dashed border-primary/40 bg-primary/5',
		              )}
		            >
		              <CardContent className="p-4 flex flex-col items-center justify-center gap-2 min-h-[72px]">
		                <span className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</span>
		                <div className="px-3 py-1 rounded-full border border-border/60 text-sm font-semibold text-foreground bg-background">
		                  {fitCheckModel ? `${fitCheckModel.confidence}%` : '—'}
		                </div>
		              </CardContent>
		            </Card>
		          </div>

		          {(aPhaseHardError || aPhaseFailed || (aPhaseTimeout && !aPhaseTerminal)) && (
		            <div className="space-y-2">
		              {aPhaseHardError && (
		                <Alert variant="destructive">
		                  <AlertTriangle className="h-4 w-4" />
		                  <AlertTitle>Fit check failed</AlertTitle>
		                  <AlertDescription>{aPhaseHardError}</AlertDescription>
		                </Alert>
		              )}

		              {aPhaseFailed && (
		                <Alert variant="destructive">
		                  <AlertTriangle className="h-4 w-4" />
		                  <AlertTitle>Fit check unavailable</AlertTitle>
		                  <AlertDescription>
		                    One or more analysis stages failed. You can still continue to the draft.
		                  </AlertDescription>
		                </Alert>
		              )}

		              {aPhaseTimeout && !aPhaseTerminal && (
		                <Alert>
		                  <AlertTriangle className="h-4 w-4" />
		                  <AlertTitle>Still analyzing</AlertTitle>
		                  <AlertDescription className="flex items-center justify-between gap-3">
		                    <span>
		                      {aPhaseRetrying
		                        ? `Reconnecting… (${aPhaseRetryAttempts} retry${aPhaseRetryAttempts === 1 ? '' : 'ies'})`
		                        : 'Phase A is taking longer than expected. Try reconnecting.'}
		                    </span>
		                    <Button type="button" variant="outline" size="sm" onClick={retryStream}>
		                      <RefreshCw className="h-4 w-4 mr-2" />
		                      Retry
		                    </Button>
		                  </AlertDescription>
		                </Alert>
		              )}
		            </div>
		          )}

		          <div className="flex flex-col">
		            <MatchMetricsToolbar
		              metrics={matchMetrics}
		              isPostHIL={false}
		              isLoading={phaseAToolbarLoading}
		              layout="horizontal"
		              mode="fitCheck"
		              jobDescription={normalizedJobDescription || undefined}
		              enhancedMatchData={draft?.enhancedMatchData || undefined}
		              aPhaseInsights={aPhaseInsights || undefined}
		              jobId={jobState?.jobId || streamingJobId || undefined}
		              draftId={draft?.id}
		              draftUpdatedAt={draft?.updatedAt}
		              draftMws={draft?.mws ?? ((draft?.llmFeedback as any)?.mws ?? undefined)}
		              onEditGoals={() => setShowGoalsModal(true)}
		              className="border-0"
		            />
		          </div>
		
		        </div>
		      );
		    }

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

    // PHASE 3: EARLY REQUIREMENTS DISPLAY - Always show counts from streaming or draft
    // Toolbar must NEVER be blank - use streaming data immediately, override with draft when ready
    const totalCoreReqs = effectiveCoreRequirements?.length ?? 0;
    const totalPrefReqs = effectivePreferredRequirements?.length ?? 0;
    // Note: totalStandards is calculated per-section based on section type (intro/body/closing)
    
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
        toolbarIsLoading={phaseAToolbarLoading}
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
        metricsLoading={effectiveMetricsLoading}
        generationError={generationError}
        jobInputError={jobInputError}
        sectionDrafts={sectionDrafts}
        savingSections={savingSections}
        sectionFocusContent={sectionFocusContent}
        onSectionChange={handleSectionChange}
        onSectionSave={handleSectionSave}
        onSectionFocus={handleSectionFocus}
        onSectionBlur={handleSectionBlur}
        onSectionDelete={handleSectionDelete}
        onInsertBetweenSections={handleInsertBetweenSections}
        onInsertFromLibrary={handleInsertFromLibrary}
        onReorderSections={handleReorderSections}
        onSaveSavedSectionVariation={handleSaveSavedSectionVariation}
        onEnhanceSection={(gapData) => {
          setSelectedGap(gapData);
          setShowContentGenerationModal(true);
        }}
        onAddMetrics={(sectionId) => {
          console.log('Add metrics to section:', sectionId);
        }}
        onEditGoals={() => setShowGoalsModal(true)}
        onRefreshInsights={handleManualRefreshInsights}
        isRefreshLoading={isManualRefreshLoading}
        isRefreshDisabled={isRefreshDisabled}
        refreshStartedAt={refreshStartedAt}
      />
      </>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => (!open ? handleClose() : undefined)}>
      <DialogContent
        className={cn(
          "max-w-6xl flex flex-col h-[100vh] max-h-[100vh]",
          isFitCheckStep ? "overflow-y-auto" : "overflow-hidden",
        )}
        hideCloseButton={isFitCheckStep}
      >
        {/* Compact header - shows company/role after draft exists, with Save/Preview CTAs */}
        <DialogHeader className="pb-2 w-full flex flex-row items-center justify-between">
          <DialogTitle className={cn("text-xl font-semibold", isFitCheckStep && "sr-only")}>
            {isFitCheckStep
              ? 'Fit check'
              : (draft && jobDescriptionRecord?.company && jobDescriptionRecord?.role
                ? `${jobDescriptionRecord.company}: ${jobDescriptionRecord.role}`
                : 'Draft cover letter')}
          </DialogTitle>
	          {/* Save and Preview buttons - only show when draft exists and we're in the draft step */}
	          {draft && !isFitCheckStep && (
	            <div className="flex items-center gap-2 mr-8">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (draft?.sections?.length) {
                    try {
                      const previewSections = draft.sections.map((section) => ({
                        ...section,
                        content: sectionDrafts[section.id] ?? section.content,
                      }));
                      await persistPreviewVariations(previewSections);
                    } catch (error) {
                      console.warn('[CoverLetterModal] Failed to persist preview variations (non-blocking):', error);
                    }
                  }
                  setPreviewOnly(false);
                  setFinalizationOpen(true);
                }}
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
                      setSaveStatus('saving');
                      if (saveStatusTimerRef.current) {
                        window.clearTimeout(saveStatusTimerRef.current);
                      }
                      const mergedSections = (draft.sections || []).map((section) => ({
                        ...section,
                        content: sectionDrafts[section.id] ?? section.content,
                      }));
                      if (mergedSections.length) {
                        try {
                          await persistPreviewVariations(mergedSections);
                        } catch (error) {
                          console.warn('[CoverLetterModal] Failed to persist save variations (non-blocking):', error);
                        }
                      }
                      await coverLetterDraftService.updateDraft(draft.id, {
                        sections: mergedSections,
                      });
                      // Clear local overrides that were just persisted.
                      setSectionDrafts((prev) => {
                        if (!prev || Object.keys(prev).length === 0) return prev;
                        return {};
                      });
                      toast({
                        title: 'Draft saved',
                        description: 'Your changes have been saved.',
                      });
                      onSave?.();
                      setSaveStatus('saved');
                      saveStatusTimerRef.current = window.setTimeout(() => {
                        setSaveStatus('idle');
                      }, 2000);
                    } catch (error) {
                      console.error('[CoverLetterModal] Save failed:', error);
                      setSaveStatus('idle');
                      toast({
                        title: 'Save failed',
                        description:
                          error instanceof Error
                            ? error.message
                            : 'Unable to save draft. Please try again.',
                        variant: 'destructive',
                      });
                    }
                  }
                }}
                disabled={showSkeleton || saveStatus === 'saving'}
              >
                {saveStatus === 'saving' ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
              </Button>
            </div>
          )}
        </DialogHeader>

	        {/* Progress banner - only during initial generation (hide once draft exists) */}
	        {(() => {
	          if (mode !== 'create') return false;
	          if (!generationHasStarted) return false;
	          if (isFitCheckStep) return false;
	          if (draft?.id) return false;
	          return showSkeleton || metricsLoading || isJobStreaming;
	        })() && (
          <div className="w-full mb-2">
            <DraftProgressBanner
              aPhaseStageFlags={aPhaseInsights?.stageFlags}
              aPhaseData={{
                jdRequirementSummary: aPhaseInsights?.jdRequirementSummary,
                mws: aPhaseInsights?.mws,
              }}
              hasDraftSections={Boolean(draft?.sections?.length)}
              sectionCount={draft?.sections?.length}
              hasMetrics={draft?.enhancedMatchData?.sectionGapInsights !== undefined}
              coreRequirementsMet={draft?.enhancedMatchData?.coreRequirementDetails?.filter((r: any) => r.demonstrated || r.met).length}
              coreRequirementsTotal={draft?.enhancedMatchData?.coreRequirementDetails?.length}
              overallScore={typeof (draft?.analytics as any)?.overallScore === 'number' ? (draft?.analytics as any)?.overallScore : undefined}
            />
          </div>
        )}

        {mode === 'create' && generationHasStarted && !isFitCheckStep && phaseBTimeout && phaseBGapsInFlight && draft?.sections?.length ? (
          <Alert className="mb-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Gaps are taking longer than expected</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>
                You can keep editing, or retry gap detection.
                {phaseBRetryAttempts > 0 ? ` (Retries: ${phaseBRetryAttempts})` : ''}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  retryPhaseBGaps('manual');
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry gaps
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

	        {isFitCheckStep ? (
	          <div className="flex flex-col w-full">
	            {renderDraftTab()}
	          </div>
	        ) : mode === 'create' && !draft ? (
	          <div className="flex-1 overflow-y-auto">{renderJobDescriptionTab()}</div>
	        ) : (
	          <Tabs
	            value={mainTab}
	            onValueChange={(value) => setMainTab(value as 'job-description' | 'cover-letter')}
	            className="flex flex-col flex-1 min-h-0 w-full"
	          >
	            {/* Phase 3: Both modes show both tabs. Create starts on JD tab, Edit starts on Draft tab. */}
	            <TabsList className="grid grid-cols-2 w-full flex-shrink-0 mb-4">
	              <TabsTrigger value="job-description">Job description</TabsTrigger>
	              <TabsTrigger value="cover-letter" disabled={mode === 'create' && !draft && !showSkeleton}>
	                {mode === 'create' ? 'Cover letter' : 'Draft'}
	              </TabsTrigger>
	            </TabsList>

	            <TabsContent value="job-description" className="flex-1 overflow-y-auto">
	              {renderJobDescriptionTab()}
	            </TabsContent>
	            <TabsContent value="cover-letter" className="flex-1 overflow-hidden">
	              {renderDraftTab()}
	            </TabsContent>
	          </Tabs>
	        )}
      </DialogContent>
      {draft && (
        <CoverLetterFinalization
          isOpen={finalizationOpen}
          onClose={() => {
            if (previewOnly) {
              handleClose();
            } else {
              setFinalizationOpen(false);
            }
          }}
          onBackToDraft={() => {
            setPreviewOnly(false);
            setFinalizationOpen(false);
          }}
          onFinalizeConfirm={draft.status === 'finalized' ? undefined : handleFinalizeConfirm}
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
	      <ContentGenerationModalV3
          isOpen={showContentGenerationModal}
          onClose={() => {
            setShowContentGenerationModal(false);
            setSelectedGap(null);
          }}
          allowSaveToSavedSections={(() => {
            if (!selectedGap || !draft) return false;
            const section = draft.sections.find(sec => sec.id === selectedGap.section_id);
            const sourceKind = (section as any)?.source?.kind;
            return sourceKind === 'work_story';
          })()}
	          allowSaveToStories={(() => {
	            if (!selectedGap || !draft) return false;
	            const section = draft.sections.find(sec => sec.id === selectedGap.section_id);
	            const sourceKind = (section as any)?.source?.kind;
	            const sectionType = String((section as any)?.type ?? '').toLowerCase();
	            if (selectedGap.paragraphId === 'intro' || selectedGap.paragraphId === 'closing') return false;
	            if (sectionType === 'intro' || sectionType === 'closing' || sectionType === 'closer' || sectionType === 'conclusion') return false;
	            return sourceKind !== 'work_story';
	          })()}
          // Hide quality criteria in UI by default to reduce redundancy; still used by the LLM.
	          showQualityCriteriaInUI={false}
		          jobContext={{
		            role: jobDescriptionRecord?.role ?? draft?.role,
		            company: jobDescriptionRecord?.company ?? draft?.company,
		            coreRequirements: (() => {
		              const focus = selectedGap?.addresses ?? [];
		              const unmet = (draft?.enhancedMatchData?.coreRequirementDetails ?? [])
		                .filter((r: any) => !r?.demonstrated)
		                .map((r: any) => String(r?.requirement ?? '').trim())
		                .filter(Boolean);
		              return Array.from(new Set([...focus, ...unmet])).slice(0, 20);
		            })(),
		            preferredRequirements: (() => {
		              const unmet = (draft?.enhancedMatchData?.preferredRequirementDetails ?? [])
		                .filter((r: any) => !r?.demonstrated)
		                .map((r: any) => String(r?.requirement ?? '').trim())
		                .filter(Boolean);
		              return Array.from(new Set(unmet)).slice(0, 20);
		            })(),
		            jobDescriptionText:
		              (jobDescriptionRecord as any)?.structured_data?.rawText ||
		              (jobDescriptionRecord as any)?.analysis?.llm?.rawText ||
		              undefined,
		          }}
	          workHistorySummary={effectiveWorkHistoryHilSummary}
		          draftCoverageSummary={draftCoverageHilSummary}
		          gap={
		            selectedGap
		              ? {
                  id: selectedGap.id,
                  type: selectedGap.type,
                  severity: selectedGap.severity,
                  description: selectedGap.description,
                  suggestion: selectedGap.suggestion,
                  paragraphId: selectedGap.paragraphId,
                  origin: selectedGap.origin,
                  existingContent: selectedGap.existingContent,
                  gaps: selectedGap.gaps,
                  gapSummary: selectedGap.gapSummary,
                  ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
                  sectionAttribution: selectedGap.sectionAttribution,
                }
              : null
          }
          onApplyContent={async (content: string, options?: { saveToSavedSections?: boolean; saveToStories?: boolean }) => {
            if (!selectedGap || !draft) return;

            // Use the section_id from selectedGap (set when gap was clicked)
            const sectionId = selectedGap.section_id;
            const targetSection = sectionId ? draft.sections.find(sec => sec.id === sectionId) : undefined;

            const tagSeed: string[] = [
              ...(selectedGap.gaps?.map(g => g.title || g.description) ?? []),
              ...(selectedGap.ratingCriteriaGaps?.map(g => g.title || g.description) ?? []),
              selectedGap.description,
            ].filter(Boolean) as string[];
            const inferredTags = Array.from(
              new Set(['hil', 'cover-letter', ...tagSeed].map(t => String(t).trim()).filter(Boolean)),
            );
            let reuseResult: { variationId?: string; savedSectionId?: string } = {};
            let draftGapRecord: { id: string; category: string } | null = null;

            if (sectionId) {
              // Update the section content
              setSectionDrafts(prev => ({
                ...prev,
                [sectionId]: content,
              }));

              // Save the section
              try {
                await handleSectionSave(sectionId);

                if (jobDescriptionRecord && goals && draft) {
                  try {
                    await recalculateMetrics({
                      jobDescription: jobDescriptionRecord as ParsedJobDescription,
                      userGoals: goals,
                    });
                  } catch (error) {
                    console.error('[CoverLetterCreateModal] Failed to recalculate metrics:', error);
                  }
                }

                try {
                  if (targetSection && user?.id) {
                    if (draft?.id) {
                      const { gapId, gapCategory } = await DraftGapSyncService.upsertCoverLetterDraftGap({
                        userId: user.id,
                        draftId: draft.id,
                        sectionId,
                        severity: selectedGap.severity,
                        description: selectedGap.description,
                        suggestion: selectedGap.suggestion,
                        paragraphId: selectedGap.paragraphId,
                        requirementGaps: selectedGap.gaps,
                        ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
                      });
                      draftGapRecord = { id: gapId, category: gapCategory };
                    }

                    reuseResult = await persistCoverLetterHilReuseArtifact({
                      userId: user.id,
                      draft: {
                        id: draft.id,
                        jobDescriptionId: draft.jobDescriptionId,
                        role: jobDescriptionRecord?.role ?? draft.role,
                        company: jobDescriptionRecord?.company ?? draft.company,
                      },
                      section: targetSection as any,
                      content,
                      gap: {
                        paragraphId: selectedGap.paragraphId,
                        description: selectedGap.description,
                        gaps: selectedGap.gaps,
                        ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
                      },
                      gapRecord: draftGapRecord ?? undefined,
                    });
                    CoverLetterDraftService.invalidateUserContextCache(user.id);
                  }
                } catch (error) {
                  console.warn('[CoverLetterModal] Failed to persist HIL reuse artifact:', error);
                }
              } catch (error) {
                console.error('[CoverLetterCreateModal] Failed to apply generated content:', error);
              }
            }

            if (options?.saveToSavedSections) {
              if (!targetSection) {
                console.warn('[CoverLetterModal] saveToSavedSections requested but no target section found.');
              } else {
                const sourceKind = (targetSection as any)?.source?.kind;
                if (sourceKind !== 'work_story') {
                  console.warn('[CoverLetterModal] saveToSavedSections requested for non-work_story section.');
                }
              }
            }

            if (options?.saveToStories && user?.id) {
              if (targetSection && (targetSection as any)?.source?.kind === 'work_story') {
                console.log('[CoverLetterModal] Ignoring saveToStories for work_story section (use Save to Saved Sections)');
              } else {
                if (draft?.id && sectionId && !draftGapRecord) {
                  try {
                    const { gapId, gapCategory } = await DraftGapSyncService.upsertCoverLetterDraftGap({
                      userId: user.id,
                      draftId: draft.id,
                      sectionId,
                      severity: selectedGap.severity,
                      description: selectedGap.description,
                      suggestion: selectedGap.suggestion,
                      paragraphId: selectedGap.paragraphId,
                      requirementGaps: selectedGap.gaps,
                      ratingCriteriaGaps: selectedGap.ratingCriteriaGaps,
                    });
                    draftGapRecord = { id: gapId, category: gapCategory };
                  } catch (error) {
                    console.warn('[CoverLetterModal] Failed to upsert draft gap for story cross-post:', error);
                  }
                }

                const defaultTitle = tagSeed.length > 0 ? `Cover Letter: ${tagSeed[0]}` : 'Cover Letter Story';
                setSaveToStoriesTitle(defaultTitle);
                setSaveToStoriesContent(content);
                setSaveToStoriesTags(
                  draftGapRecord?.category
                    ? Array.from(new Set([...inferredTags, `gap:${draftGapRecord.category}`]))
                    : inferredTags,
                );
                setSaveToStoriesWorkItemId('');
                setSaveToStoriesDialogOpen(true);
              }
            }

            setShowContentGenerationModal(false);
            setSelectedGap(null);
          }}
        />

    </Dialog>

    <Dialog
      open={saveToStoriesDialogOpen}
      onOpenChange={(open) => {
        if (!open) {
          setSaveToStoriesDialogOpen(false);
          setSaveToStoriesWorkItemId('');
          setSaveToStoriesTitle('');
          setSaveToStoriesContent('');
          setSaveToStoriesTags([]);
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Save to stories</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={saveToStoriesWorkItemId} onValueChange={setSaveToStoriesWorkItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick the role to attach this story to" />
              </SelectTrigger>
              <SelectContent>
                {workHistoryLibrary
                  .flatMap((company) =>
                    company.roles.map((role) => ({
                      key: role.id,
                      value: role.id,
                      label: `${company.name} — ${role.title}`,
                    })),
                  )
                  .map((option) => (
                    <SelectItem key={option.key} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <GrammarInput value={saveToStoriesTitle} onChange={(e) => setSaveToStoriesTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2">
              {saveToStoriesTags.slice(0, 12).map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
              {saveToStoriesTags.length > 12 && (
                <Badge variant="outline">+{saveToStoriesTags.length - 12} more</Badge>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setSaveToStoriesDialogOpen(false)}
              disabled={saveToStoriesSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!user?.id) return;
                if (!saveToStoriesWorkItemId.trim()) {
                  toast({
                    title: 'Select a role',
                    description: 'Pick the role for this story.',
                    variant: 'destructive',
                  });
                  return;
                }
                if (!saveToStoriesTitle.trim()) {
                  toast({
                    title: 'Missing title',
                    description: 'Provide a story title.',
                    variant: 'destructive',
                  });
                  return;
                }

                setSaveToStoriesSubmitting(true);
                try {
                  const { error } = await supabase
                    .from('stories')
                    .insert({
                      user_id: user.id,
                      work_item_id: saveToStoriesWorkItemId,
                      title: saveToStoriesTitle.trim(),
                      content: saveToStoriesContent.trim(),
                      tags: saveToStoriesTags,
                      metrics: [],
                      source: 'manual',
                      status: 'approved',
                    } as any);
                  if (error) throw error;

                  CoverLetterDraftService.invalidateUserContextCache(user.id);
                  toast({ title: 'Saved to stories', description: 'Created a new story in your library.' });
                  setSaveToStoriesDialogOpen(false);
                } catch (error) {
                  console.error('[CoverLetterModal] Failed to create story from HIL content:', error);
                  toast({
                    title: 'Save failed',
                    description: error instanceof Error ? error.message : 'Unable to create story.',
                    variant: 'destructive',
                  });
                } finally {
                  setSaveToStoriesSubmitting(false);
                }
              }}
              disabled={saveToStoriesSubmitting}
            >
              {saveToStoriesSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save story
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Add Section from Library Modal - rendered outside main dialog to avoid nesting issues */}
    {showLibraryModal && libraryInvocation && (
      <AddSectionFromLibraryModal
        isOpen={showLibraryModal}
        onClose={() => {
          setShowLibraryModal(false);
          setLibraryInvocation(null);
          setLibraryInitialContentType(null);
          setLibraryAutoAdvance(false);
        }}
        invocation={libraryInvocation}
        jobDescription={jobDescriptionRecord?.structured_data?.rawText || jobDescriptionRecord?.analysis?.llm?.rawText}
        workHistoryLibrary={workHistoryLibrary}
        savedSections={savedSections}
        isLibraryLoading={isLibraryLoading}
        libraryError={libraryError}
        initialContentType={libraryInitialContentType ?? undefined}
        initialShowSelectionPanel={libraryAutoAdvance}
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
