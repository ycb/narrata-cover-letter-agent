import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertTriangle,
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
import { MatchMetricsToolbar } from './MatchMetricsToolbar';
import { CoverLetterFinalization } from './CoverLetterFinalization';
import { CoverLetterSkeleton } from './CoverLetterSkeleton';
import { CoverLetterDraftView } from './CoverLetterDraftView';
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
import type { Gap } from '@/services/gapTransformService';
import { getApplicableStandards } from '@/config/contentStandards';

const MIN_JOB_DESCRIPTION_LENGTH = 50;

type TemplateSummary = {
  id: string;
  name: string;
};

interface CoverLetterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoverLetterCreated?: (draft: CoverLetterDraft) => void;
}

export const CoverLetterCreateModal = ({
  isOpen,
  onClose,
  onCoverLetterCreated,
}: CoverLetterCreateModalProps) => {
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
  const [jobDescriptionRecord, setJobDescriptionRecord] = useState<JobDescriptionRecord | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [selectedGap, setSelectedGap] = useState<Gap & { section_id?: string } | null>(null);
  const [showContentGenerationModal, setShowContentGenerationModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [mainTab, setMainTab] = useState<'job-description' | 'cover-letter'>('job-description');
  const [sectionFocusContent, setSectionFocusContent] = useState<Record<string, string>>({}); // Track content at focus time
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryInvocation, setLibraryInvocation] = useState<InvocationType | null>(null);
  const [workHistoryLibrary, setWorkHistoryLibrary] = useState<any[]>([]);
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
        // Load work history companies with stories
        const { data: workItems } = await supabase
          .from('work_items')
          .select('id, title, company_id')
          .eq('user_id', user.id);

        const { data: stories } = await supabase
          .from('approved_content')
          .select('id, title, content, work_item_id')
          .eq('user_id', user.id);

        // Group stories by work item
        const workItemMap = new Map<string, any[]>();
        stories?.forEach(story => {
          if (!workItemMap.has(story.work_item_id)) {
            workItemMap.set(story.work_item_id, []);
          }
          workItemMap.get(story.work_item_id)?.push(story);
        });

        // Build company structure
        const companies = (workItems || []).map(item => ({
          id: item.company_id || item.id,
          name: item.title,
          blurbs: workItemMap.get(item.id) || [],
        }));

        setWorkHistoryLibrary(companies);

        // Load saved sections (templates)
        // For now, just set empty array - can be implemented later
        setSavedSections([]);
      } catch (error) {
        console.error('[CoverLetterCreateModal] Failed to load library data:', error);
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

  const {
    draft,
    workpad,
    streamingSections,
    progress,
    isGenerating,
    metricsLoading, // AGENT D: Extract metrics loading state
    pendingSectionInsights, // AGENT D: Heuristic gap insights
    isMutating,
    isFinalizing,
    error: generationError,
    generateDraft,
    updateSection,
    recalculateMetrics,
    finalizeDraft,
    setDraft,
    setWorkpad,
    setTemplateId,
    setJobDescriptionId,
    clearError,
    resetProgress,
  } = useCoverLetterDraft({
    userId: user?.id ?? '',
    service: coverLetterDraftService,
  });

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
      
      const { draft: generatedDraft } = await generateDraft({
        templateId: selectedTemplateId,
        jobDescriptionId: record.id,
      });
      
      // Note: We don't call onCoverLetterCreated here because it closes the modal
      // The draft is saved to DB and will appear in the list when user closes/finalizes
      // onCoverLetterCreated is only called when finalizing (see handleFinalize)
      
      // Note: Gap detection is now handled via enhancedMatchData (no need for separate GapDetectionService calls)
      // Gaps are already calculated during draft generation and stored in draft.enhancedMatchData
      // The old GapDetectionService calls were causing an 8-second delay
      
      setMainTab('cover-letter');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate cover letter draft.';
      setJobInputError(message);
      setJdStreamingMessages(prev => [...prev, `Error: ${message}`]);
    } finally {
      setIsParsingJobDescription(false);
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
                💡 Pro tip: Copying from LinkedIn?
              </AlertTitle>
              <AlertDescription className="text-xs mt-2 space-y-2">
                <p>
                  If there's an "About the company" section, <strong>FIRST expand that by clicking "show more"</strong>. 
                  THEN select — starting at the top to highlight text describing <strong>BOTH the role and company</strong>. 
                  We'll use those details to make your letter stand out!
                </p>
                <p className="text-muted-foreground">
                  Please try to minimize including text that doesn't relate, as this creates a garbage in / garbage out situation.
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

            <div className="flex flex-wrap items-center gap-3">
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
              <Button
                type="button"
                variant="secondary"
                onClick={() => setJobContent('')}
                disabled={isBusy}
              >
                Clear
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

    // Show skeleton while generating (after JD is parsed)
    if (!draft && isGenerating && jobDescriptionRecord && user) {
      return (
        <div className="space-y-6">
          {renderProgress()}
          <Card className="border-muted-foreground/20 bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Generating your cover letter...
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                We're matching your stories to the job requirements and drafting tailored content.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CoverLetterSkeleton
                company={jobDescriptionRecord.company}
                role={jobDescriptionRecord.role}
                userName={user.user_metadata?.full_name || 'Your Name'}
                userEmail={user.email || ''}
              />
            </CardContent>
          </Card>
        </div>
      );
    }
    
    if (!draft) {
      return (
        <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
          <CardContent className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Generate a draft first by pasting the job description.
          </CardContent>
        </Card>
      );
    }

    // Transform draft.metrics to MatchMetricsData format
    let matchMetrics = transformMetricsToMatchData(draft.metrics || []);

    // Calculate job-level totals for requirement denominators (fixes "2/0" display bug)
    const totalCoreReqs = draft.enhancedMatchData?.coreRequirementDetails?.length ?? 0;
    const totalPrefReqs = draft.enhancedMatchData?.preferredRequirementDetails?.length ?? 0;
    // Note: totalStandards is calculated per-section based on section type (intro/body/closing)
    
    // Extract rating criteria from llmFeedback
    const ratingData = draft.llmFeedback?.rating as any;
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
    const contentStandards = draft.llmFeedback?.contentStandards as any;

    // FIX 1: Check analytics.overallScore first (for finalized drafts)
    const analyticsScore = draft.analytics?.overallScore;
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
    if (matchMetrics.atsScore === 0 && draft.atsScore) {
      matchMetrics.atsScore = draft.atsScore;
    }

    return (
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Toolbar */}
        <div className="bg-card flex-shrink-0">
          <MatchMetricsToolbar
            metrics={matchMetrics}
            isPostHIL={false}
            isLoading={metricsLoading}
            enhancedMatchData={draft.enhancedMatchData}
            goNoGoAnalysis={undefined}
            jobDescription={normalizedJobDescription ?? undefined}
            sections={draft.sections.map(s => ({ id: s.id, type: s.type }))}
            onEditGoals={() => setShowGoalsModal(true)}
            onEnhanceSection={(sectionId, requirement, ratingCriteria) => {
              // Open section enhancement flow with rating criteria if provided
              const section = draft.sections.find(s => s.id === sectionId);
              if (section) {
                const existingContent = sectionDrafts[sectionId] ?? section.content ?? '';
                const paragraphIdMap: Record<string, string> = {
                  'intro': 'intro',
                  'introduction': 'intro',
                  'paragraph': 'experience',
                  'experience': 'experience',
                  'closer': 'closing',
                  'closing': 'closing',
                  'signature': 'closing'
                };
                const paragraphId = paragraphIdMap[section.type] || paragraphIdMap[section.slug] || 'experience';
                
                // Get requirement gaps for this section from enhancedMatchData
                const sectionInsight = draft.enhancedMatchData?.sectionGapInsights?.find(
                  (insight: any) => insight.sectionId === sectionId || insight.sectionSlug === section.slug || insight.sectionSlug === section.type
                );
                const requirementGaps = sectionInsight?.requirementGaps?.map((gap: any) => ({
                  id: gap.id,
                  title: gap.label,
                  description: `${gap.rationale} ${gap.recommendation}`,
                })) || [];
                
                // Convert rating criteria to gap format if provided
                const gapsFromRating = ratingCriteria?.map(rc => ({
                  id: rc.id,
                  title: rc.label,
                  description: `${rc.description}. ${rc.suggestion}`,
                })) || [];
                
                // Keep requirement gaps and rating criteria gaps separate
                const gapSummaryParts: string[] = [];
                if (requirementGaps.length > 0) {
                  gapSummaryParts.push(`${requirementGaps.length} requirement gap${requirementGaps.length > 1 ? 's' : ''}`);
                }
                if (gapsFromRating.length > 0) {
                  gapSummaryParts.push(`${gapsFromRating.length} content quality criteria: ${gapsFromRating.map(g => g.title).join(', ')}`);
                }
                
                setSelectedGap({
                  id: requirement ? `section-${sectionId}-${requirement}` : `section-${sectionId}-enhancement`,
                  type: 'content-enhancement',
                  severity: 'medium',
                  description: requirement || `Enhance ${section.title || section.type} section to improve content quality score`,
                  suggestion: requirement || `Add detail that directly addresses content quality criteria`,
                  origin: 'ai',
                  section_id: sectionId,
                  paragraphId: paragraphId,
                  existingContent: existingContent,
                  // Store requirement gaps and rating criteria gaps separately
                  gaps: requirementGaps,
                  ratingCriteriaGaps: gapsFromRating,
                  gapSummary: gapSummaryParts.length > 0 ? gapSummaryParts.join(' • ') : null,
                });
                setShowContentGenerationModal(true);
              }
            }}
            onAddMetrics={(sectionId) => {
              // TODO: Open metrics addition flow
              console.log('Add metrics to section:', sectionId);
            }}
            className="h-full border-0"
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 pl-6 pb-6">
            {(generationError || jobInputError) && (
              <Alert variant="destructive">
                <AlertTitle>Cover letter generation issue</AlertTitle>
                <AlertDescription>
                  {generationError ?? jobInputError ?? 'Unable to generate cover letter.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Show progress card at top when metrics are loading */}
            {renderProgress()}

        <div className="space-y-4">
          {/* Add Section button at the top */}
          <SectionInsertButton onClick={() => handleInsertBetweenSections(0)} />
          
          {draft.sections.map((section, sectionIndex) => {
            const editedContent = sectionDrafts[section.id] ?? section.content;
            const isDirty = editedContent !== section.content;
            const isSaving = !!savingSections[section.id];
            
            // Agent C: Get section-specific gap insights (same helper as CoverLetterDraftView)
            // AGENT D: Now also checks pendingSectionInsights for instant feedback
            const getSectionGapInsights = (sectionId: string, sectionSlug: string) => {
              // AGENT D: Check for pending heuristic insight first
              const pendingInsight = pendingSectionInsights[sectionId];

              console.log(`[AGENT D] Modal getSectionGapInsights for section ${sectionId}:`, {
                sectionId,
                sectionSlug,
                hasPendingInsight: !!pendingInsight,
                pendingInsight,
                hasEnhancedMatchData: !!draft.enhancedMatchData,
                sectionGapInsights: draft.enhancedMatchData?.sectionGapInsights,
                sectionGapInsightsCount: draft.enhancedMatchData?.sectionGapInsights?.length,
                fullEnhancedMatchData: draft.enhancedMatchData,
                pendingSectionInsightsKeys: Object.keys(pendingSectionInsights)
              });

              // Normalize section slug to match sectionGapInsights
              const normalizeSlug = (slug: string) => {
                const aliases: Record<string, string[]> = {
                  'introduction': ['introduction', 'intro', 'opening'],
                  'experience': ['experience', 'exp', 'background', 'body'],
                  'closing': ['closing', 'conclusion', 'signature'],
                  'signature': ['signature', 'closing', 'signoff'],
                };

                const lowerSlug = slug.toLowerCase();
                for (const [canonical, variations] of Object.entries(aliases)) {
                  if (variations.includes(lowerSlug)) {
                    return variations;
                  }
                }
                return [lowerSlug];
              };

              // If no enhancedMatchData at all, we're likely still loading metrics
              // Check if we have pending insight to show meanwhile
              if (!draft.enhancedMatchData) {
                if (pendingInsight) {
                  console.log(`[AGENT D] Showing heuristic gaps for section ${sectionId}:`, pendingInsight);
                  // Show pending heuristic insight while waiting for LLM
                  const gaps = pendingInsight.requirementGaps.map(gap => ({
                    id: gap.id,
                    title: gap.label,
                    description: `${gap.rationale} ${gap.recommendation}`,
                  }));

                  return {
                    promptSummary: pendingInsight.promptSummary || 'Quick analysis (calculating full metrics...)',
                    gaps,
                    isLoading: true, // Still loading LLM insights
                  };
                }

                console.log(`[AGENT D] No pending insight found for section ${sectionId}, returning empty`);
                return {
                  promptSummary: null,
                  gaps: [],
                  isLoading: true,
                };
              }
              
              // If no sectionGapInsights, fallback to old heuristic
              if (!draft.enhancedMatchData.sectionGapInsights) {
                const unmetCoreReqs = draft.enhancedMatchData.coreRequirementDetails?.filter(
                  (req: any) => !req.demonstrated
                ) || [];
                const unmetPreferredReqs = draft.enhancedMatchData.preferredRequirementDetails?.filter(
                  (req: any) => !req.demonstrated
                ) || [];
                const allGaps = [...unmetCoreReqs, ...unmetPreferredReqs];
                
                return {
                  promptSummary: null,
                  gaps: allGaps.map((req: any, index: number) => ({
                    id: req.id || `gap-${index}`,
                    title: req.requirement || 'Missing requirement',
                    description: req.evidence || 'Not addressed in draft',
                  })),
                  isLoading: false,
                };
              }
              
              // New behavior: use sectionGapInsights
              // PHASE 2: Match by sectionId first (exact match), fallback to sectionSlug
              let sectionInsight = draft.enhancedMatchData.sectionGapInsights.find(
                insight => insight.sectionId === sectionId
              );

              // Fallback: if no exact ID match, try slug matching (for backward compatibility)
              if (!sectionInsight) {
                const normalizedSlugs = normalizeSlug(sectionSlug);
                sectionInsight = draft.enhancedMatchData.sectionGapInsights.find(
                  insight => normalizedSlugs.includes(insight.sectionSlug?.toLowerCase())
                );
              }

              if (!sectionInsight) {
                return { promptSummary: null, gaps: [], isLoading: false };
              }
              
              const gaps = sectionInsight.requirementGaps.map(gap => ({
                id: gap.id,
                title: gap.label,
                description: `${gap.rationale} ${gap.recommendation}`,
              }));
              
              return {
                promptSummary: sectionInsight.promptSummary,
                gaps,
                isLoading: false,
              };
            };
            
            const { promptSummary, gaps: gapObjects, isLoading: gapsLoading } = getSectionGapInsights(section.id, section.slug);
            const hasGaps = gapObjects.length > 0;

            // Strip trailing periods from gap summary for cover letters
            const cleanGapSummary = promptSummary ? promptSummary.replace(/\.+$/, '') : null;

            // Compute section-level attribution using pure function (safe to call in map)
            const hasAttributionData = draft.enhancedMatchData != null || contentStandards != null || (matchMetrics?.ratingCriteria && matchMetrics.ratingCriteria.length > 0);
            const { attribution: sectionAttribution } = computeSectionAttribution({
              sectionId: section.id,
              sectionType: section.slug || section.type,
              enhancedMatchData: draft.enhancedMatchData,
              ratingCriteria: matchMetrics?.ratingCriteria,
              contentStandards: contentStandards || null,
            });

            // Format section title: replace dashes with spaces and capitalize first letter
            const formattedTitle = section.title
              ? section.title.replace(/-/g, ' ').charAt(0).toUpperCase() + section.title.replace(/-/g, ' ').slice(1)
              : '';

            // Calculate section-type-specific totalStandards
            // Use position as fallback if slug/type don't match known values
            // Note: sectionIndex comes from map signature above
            const sectionTypeForStandards: 'intro' | 'body' | 'closing' = (() => {
              // First try slug (semantic type from LLM)
              if (section.slug === 'intro' || section.slug === 'introduction') return 'intro';
              if (section.slug === 'closing' || section.slug === 'conclusion' || section.slug === 'closer') return 'closing';

              // Then try type (UI display type)
              if (section.type === 'intro' || section.type === 'introduction') return 'intro';
              if (section.type === 'closing' || section.type === 'conclusion' || section.type === 'closer') return 'closing';

              // Fallback: Use position-based heuristic
              if (sectionIndex === 0) return 'intro'; // First section is intro
              if (sectionIndex === draft.sections.length - 1) return 'closing'; // Last section is closing
              return 'body'; // Everything else is body
            })();
            const totalStandardsForSection = getApplicableStandards(sectionTypeForStandards).length;

            return (
              <div key={section.id}>
              <ContentCard
                title={formattedTitle}
                content={undefined} // Don't show preview when editable (Textarea displays it)
                sectionAttributionData={hasAttributionData ? sectionAttribution : undefined}
                totalCoreReqs={totalCoreReqs}
                totalPrefReqs={totalPrefReqs}
                totalStandards={totalStandardsForSection}
                tagsLabel={undefined} // Cover letters don't use legacy tags - show SectionInspector instead
                hasGaps={hasGaps}
                gaps={gapObjects}
                gapSummary={cleanGapSummary} // Agent C: Pass rubric summary for section guidance (no trailing periods)
                isGapResolved={!hasGaps}
                onEdit={() => {
                  // Focus the textarea for this section
                  const textarea = document.querySelector(`textarea[data-section-id="${section.id}"]`) as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.focus();
                    textarea.select();
                  }
                }}
                onDuplicate={async () => {
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

                    // Insert the duplicated section after the current one
                    const updatedSections = [...draft.sections];
                    updatedSections.splice(sectionIndex + 1, 0, newSection);

                    // Reorder all sections
                    const reorderedSections = updatedSections.map((s, index) => ({
                      ...s,
                      order: index,
                    }));

                    // Update draft in state
                    setDraft({ ...draft, sections: reorderedSections });

                    // Save to database
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
                }}
                onDelete={async () => {
                  if (!draft) return;
                  if (!confirm(`Delete "${section.title}" section?`)) return;

                  try {
                    // Remove the section
                    const updatedSections = draft.sections.filter(s => s.id !== section.id);

                    // Reorder remaining sections
                    const reorderedSections = updatedSections.map((s, index) => ({
                      ...s,
                      order: index,
                    }));

                    // Update draft in state
                    setDraft({ ...draft, sections: reorderedSections });

                    // Save to database
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
                }}
                onInsertFromLibrary={() => {
                  // Open library modal for Replace or Insert Below
                  setLibraryInvocation({
                    type: 'replace_or_insert_below',
                    sectionId: section.id,
                    sectionType: sectionTypeForStandards,
                    sectionIndex: sectionIndex,
                  });
                  setShowLibraryModal(true);
                }}
                onGenerateContent={() => {
                  // Always open HIL workflow - create gap object if no gaps exist
                  const existingContent = sectionDrafts[section.id] ?? section.content ?? '';
                  // Map section type to paragraphId for the gap service
                  const paragraphIdMap: Record<string, string> = {
                    'intro': 'intro',
                    'introduction': 'intro',
                    'paragraph': 'experience',
                    'experience': 'experience',
                    'closer': 'closing',
                    'closing': 'closing',
                    'signature': 'closing'
                  };
                  const paragraphId = paragraphIdMap[section.type] || paragraphIdMap[section.slug] || 'experience';
                  
                  // Extract unresolved rating criteria to pass to HIL workflow
                  const unresolvedRatingCriteria = matchMetrics?.ratingCriteria 
                    ? getUnresolvedRatingCriteria(matchMetrics.ratingCriteria)
                    : undefined;
                  
                  // Convert rating criteria to gap format if provided
                  const gapsFromRating = unresolvedRatingCriteria?.map(rc => ({
                    id: rc.id,
                    title: rc.label,
                    description: `${rc.evidence || rc.description || ''}. ${rc.suggestion || ''}`.trim(),
                  })) || [];
                  
                  const firstGap = gapObjects[0];
                  if (firstGap) {
                    // Use existing gap
                    setSelectedGap({
                      id: firstGap.id,
                      type: 'core-requirement',
                      severity: 'high',
                      description: firstGap.description,
                      suggestion: firstGap.description,
                      origin: 'ai',
                      section_id: section.id,
                      paragraphId: paragraphId,
                      existingContent: existingContent,
                      // Pass through rich gap structure from ContentCard
                      gaps: gapObjects,
                      ratingCriteriaGaps: gapsFromRating,
                      gapSummary: cleanGapSummary,
                      // Pass section attribution to show what's working in HIL (always pass, even if empty)
                      sectionAttribution: sectionAttribution
                    });
                  } else {
                    // Create synthetic gap for HIL flow when no gaps exist
                    const gapSummaryParts: string[] = [];
                    if (gapsFromRating.length > 0) {
                      gapSummaryParts.push(`${gapsFromRating.length} content quality criteria: ${gapsFromRating.map(g => g.title).join(', ')}`);
                    }

                    setSelectedGap({
                      id: `section-${section.id}-enhancement`,
                      type: 'content-enhancement',
                      severity: 'medium',
                      description: `Enhance ${section.title} section with more specific content and quantifiable achievements`,
                      suggestion: `Add detail that directly speaks to ${section.title.toLowerCase()} requirements and demonstrates your experience`,
                      origin: 'ai',
                      section_id: section.id,
                      paragraphId: paragraphId,
                      existingContent: existingContent,
                      ratingCriteriaGaps: gapsFromRating,
                      gapSummary: gapSummaryParts.length > 0 ? gapSummaryParts.join(' • ') : null,
                      // Pass section attribution to show what's working in HIL (always pass, even if empty)
                      sectionAttribution: sectionAttribution
                    });
                  }
                  setShowContentGenerationModal(true);
                }}
                showUsage={false}
                renderChildrenBeforeTags={true}
                className={cn(hasGaps && 'border-warning')}
              >
                {/* Inline editable Textarea */}
                <div className="mb-6">
                  <Textarea
                    data-section-id={section.id}
                    value={editedContent}
                    onFocus={() => {
                      // Track content at focus time
                      setSectionFocusContent(prev => ({
                        ...prev,
                        [section.id]: editedContent,
                      }));
                    }}
                    onChange={event => handleSectionChange(section.id, event.target.value)}
                    onBlur={async (event) => {
                      const newContent = event.target.value;
                      const focusContent = sectionFocusContent[section.id] ?? section.content;
                      
                      // Only recalculate if content changed since focus
                      if (newContent !== focusContent && jobDescriptionRecord && goals && draft) {
                        // Save the section first
                        try {
                          await handleSectionSave(section.id);
                          
                          // Trigger metrics recalculation
                          setIsRecalculating(true);
                          try {
                            await recalculateMetrics({
                              jobDescription: jobDescriptionRecord as ParsedJobDescription,
                              userGoals: goals,
                            });
                            console.log('[CoverLetterCreateModal] Metrics recalculated after manual edit');
                          } catch (error) {
                            console.error('[CoverLetterCreateModal] Failed to recalculate metrics:', error);
                            // Don't block UI on recalculation failure
                          } finally {
                            setIsRecalculating(false);
                          }
                        } catch (error) {
                          console.error('[CoverLetterCreateModal] Failed to save section:', error);
                        }
                      }
                    }}
                    rows={8}
                    className="resize-y"
                    placeholder="Enter cover letter content..."
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleSectionSave(section.id)}
                      disabled={!isDirty || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save changes
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => handleSectionReset(section.id)}
                      disabled={!isDirty || isSaving}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
                
                {/* Agent C: Show loading skeleton for pending gap insights */}
                {gapsLoading && !hasGaps && (
                  <div className="mt-6 pt-6 border-t border-muted">
                    <div className="bg-muted/20 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-4 w-4 bg-muted rounded"></div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-muted rounded"></div>
                        <div className="h-3 w-5/6 bg-muted rounded"></div>
                      </div>
                    </div>
                  </div>
                )}
              </ContentCard>
              
              {/* Add Section button after each section */}
              <SectionInsertButton onClick={() => handleInsertBetweenSections(sectionIndex + 1)} />
            </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {workpad && (
            <Badge variant="outline" className="gap-1">
              <RefreshCw className="h-3 w-3 animate-spin-slow text-primary" />
              Last checkpoint: {workpad.lastPhase ?? 'draft'}
            </Badge>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => handleClose()}>
              Close
            </Button>
            <Button type="button" className="gap-2" onClick={handleFinalize}>
              <FileText className="h-4 w-4" />
              Finalize letter
            </Button>
          </div>
        </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => (!open ? handleClose() : undefined)}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <DialogTitle className="text-3xl font-bold">
                Draft cover letter
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                Paste the job description so we can analyze requirements, match your best stories,
                and draft a tailored cover letter.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={mainTab} onValueChange={(value) => setMainTab(value as 'job-description' | 'cover-letter')} className="flex flex-col flex-1 min-h-0">
          <TabsList className="grid grid-cols-2 w-full flex-shrink-0 mb-4">
            <TabsTrigger value="job-description">Job description</TabsTrigger>
            <TabsTrigger value="cover-letter" disabled={!draft}>
              Cover letter
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

export default CoverLetterCreateModal;

