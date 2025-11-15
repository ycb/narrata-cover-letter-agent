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
import { ProgressIndicatorWithTooltips } from './ProgressIndicatorWithTooltips';
import { CoverLetterFinalization } from './CoverLetterFinalization';
import { CoverLetterSkeleton } from './CoverLetterSkeleton';
import { ContentCard } from '@/components/shared/ContentCard';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import type { CoverLetterDraft, JobDescriptionRecord } from '@/types/coverLetters';
import type { Gap } from '@/services/gapTransformService';

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
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);
  const preParseControllerRef = useRef<AbortController | null>(null);
  const preParseRequestIdRef = useRef(0);
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
        jobDescriptionRecord.standard_requirements ??
        llmAnalysis.standardRequirements ??
        [],
      preferredRequirements:
        structured.preferredRequirements ??
        jobDescriptionRecord.preferred_requirements ??
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
      ...(structured.standardRequirements ?? jobDescriptionRecord.standard_requirements ?? []),
      ...(structured.differentiatorRequirements ?? jobDescriptionRecord.differentiator_requirements ?? []),
      ...(structured.preferredRequirements ?? jobDescriptionRecord.preferred_requirements ?? []),
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

  useEffect(() => {
    if (draft && mainTab !== 'cover-letter') {
      setMainTab('cover-letter');
    }
  }, [draft, mainTab]);

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
    const hasProgress = progress.length > 0 || jdStreamingMessages.length > 0;
    if (!hasProgress) return null;

    // Group progress by phase and show only the latest message per phase
    const phaseGroups = progress.reduce((acc, update) => {
      acc[update.phase] = update.message;
      return acc;
    }, {} as Record<string, string>);

    const phaseLabels: Record<string, string> = {
      jd_parse: 'Parsing',
      content_match: 'Draft Generation',
      metrics: 'Calculating Metrics',
      gap_detection: 'Gap Detection',
    };

    return (
      <Card className="border-muted-foreground/20 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Generation progress</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Follow each stage as we analyze and assemble your cover letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {jdStreamingMessages.length > 0 && jdStreamingMessages[jdStreamingMessages.length - 1] && (
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide min-w-[180px]">
                Job Description Analysis
              </span>
              <span className="text-sm text-muted-foreground flex-1">
                {jdStreamingMessages[jdStreamingMessages.length - 1]}
              </span>
            </div>
          )}

          {Object.entries(phaseGroups).map(([phase, message]) => (
            <div key={phase} className="flex items-start gap-2">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide min-w-[180px]">
                {phaseLabels[phase] || phase}
              </span>
              <span className="text-sm text-muted-foreground flex-1">{message}</span>
            </div>
          ))}
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
              {preParsedJD && jobContent.trim() === preParsedContent && !isPreParsing && (
                <div className="absolute top-2 right-2 flex items-center gap-2 text-xs text-success bg-success/10 backdrop-blur-sm px-2 py-1 rounded-md border border-success/20">
                  <span className="text-success">✓</span>
                  Job description analyzed
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
                    {isParsingJobDescription ? 'Job Description Analysis' :
                     progress[progress.length - 1]?.phase === 'jd_parse' ? 'Parsing' :
                     progress[progress.length - 1]?.phase === 'content_match' ? 'Draft Generation' :
                     progress[progress.length - 1]?.phase === 'metrics' ? 'Calculating Metrics' :
                     progress[progress.length - 1]?.phase === 'gap_detection' ? 'Gap Detection' :
                     'Generating'}
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
                variant="outline"
                onClick={() => setJobContent('')}
                disabled={isBusy}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {renderProgress()}
      </div>
    );
  };

  const renderDraftTab = () => {
    // Show progressive sections if available (streaming from backend)
    if (!draft && streamingSections.length > 0 && jobDescriptionRecord) {
      return (
        <div className="space-y-6">
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
                jobDescription={normalizedJobDescription ?? undefined}
              />
            </CardContent>
          </Card>
          {renderProgress()}
        </div>
      );
    }

    // Show skeleton while generating (after JD is parsed)
    if (!draft && isGenerating && jobDescriptionRecord && user) {
      return (
        <div className="space-y-6">
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
          {renderProgress()}
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

    return (
      <div className="space-y-6">
        {(generationError || jobInputError) && (
          <Alert variant="destructive">
            <AlertTitle>Cover letter generation issue</AlertTitle>
            <AlertDescription>
              {generationError ?? jobInputError ?? 'Unable to generate cover letter.'}
            </AlertDescription>
          </Alert>
        )}

        {/* AGENT D: Show metrics loading indicator */}
        {metricsLoading && (
          <Alert className="border-primary/20 bg-primary/5">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <AlertTitle>Calculating match metrics</AlertTitle>
            <AlertDescription>
              Analyzing how well your draft matches the job requirements. You can edit sections while this completes.
            </AlertDescription>
          </Alert>
        )}

        {(() => {
          // Transform draft.metrics to HILProgressMetrics format
          const metricsMap = new Map(draft.metrics.map(m => [m.key, m]));
          
          const goalsMetric = metricsMap.get('goals');
          const experienceMetric = metricsMap.get('experience');
          const ratingMetric = metricsMap.get('rating');
          const atsMetric = metricsMap.get('ats');
          const coreReqsMetric = metricsMap.get('coreRequirements');
          const preferredReqsMetric = metricsMap.get('preferredRequirements');
          
          const hilMetrics = {
            goalsMatch: goalsMetric && goalsMetric.type === 'strength' 
              ? goalsMetric.strength 
              : 'weak',
            experienceMatch: experienceMetric && experienceMetric.type === 'strength'
              ? experienceMetric.strength
              : 'weak',
            coverLetterRating: ratingMetric && ratingMetric.type === 'strength'
              ? ratingMetric.strength
              : 'weak',
            atsScore: atsMetric && atsMetric.type === 'score'
              ? Math.round(atsMetric.value)
              : draft.atsScore || 0,
            coreRequirementsMet: coreReqsMetric && coreReqsMetric.type === 'requirement'
              ? { met: coreReqsMetric.met, total: coreReqsMetric.total }
              : { met: 0, total: 0 },
            preferredRequirementsMet: preferredReqsMetric && preferredReqsMetric.type === 'requirement'
              ? { met: preferredReqsMetric.met, total: preferredReqsMetric.total }
              : { met: 0, total: 0 },
          };
          
          return (
            <ProgressIndicatorWithTooltips
              metrics={hilMetrics}
              isPostHIL={false}
              isLoading={metricsLoading} // AGENT D: Pass metrics loading state
              enhancedMatchData={draft.enhancedMatchData}
              goNoGoAnalysis={undefined}
              jobDescription={normalizedJobDescription ?? undefined}
              onEditGoals={() => setShowGoalsModal(true)}
              onAddStory={(requirement, severity) => {
                // TODO: Open story creation modal
                console.log('Add story for requirement:', requirement);
              }}
              onEnhanceSection={(sectionId, requirement) => {
                // TODO: Open section enhancement flow
                console.log('Enhance section:', sectionId, 'for requirement:', requirement);
              }}
              onAddMetrics={(sectionId) => {
                // TODO: Open metrics addition flow
                console.log('Add metrics to section:', sectionId);
              }}
            />
          );
        })()}

        {jobDescriptionRecord && (
          <Card className="border-muted-foreground/20 bg-muted/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Job description snapshot</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                We parsed these details from the job description to guide the draft.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Company
                </span>
                <p className="font-medium">{jobDescriptionRecord.company}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  Role
                </span>
                <p className="font-medium">{jobDescriptionRecord.role}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {draft.sections.map(section => {
            const editedContent = sectionDrafts[section.id] ?? section.content;
            const isDirty = editedContent !== section.content;
            const isSaving = !!savingSections[section.id];
            
            // Agent C: Get section-specific gap insights (same helper as CoverLetterDraftView)
            const getSectionGapInsights = (sectionSlug: string) => {
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
              
              // If no sectionGapInsights, fallback to old heuristic
              if (!draft.enhancedMatchData?.sectionGapInsights) {
                const unmetCoreReqs = draft.enhancedMatchData?.coreRequirementDetails?.filter(
                  (req: any) => !req.demonstrated
                ) || [];
                const unmetPreferredReqs = draft.enhancedMatchData?.preferredRequirementDetails?.filter(
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
                };
              }
              
              // New behavior: use sectionGapInsights
              const normalizedSlugs = normalizeSlug(sectionSlug);
              const sectionInsight = draft.enhancedMatchData.sectionGapInsights.find(
                insight => normalizedSlugs.includes(insight.sectionSlug.toLowerCase())
              );
              
              if (!sectionInsight) {
                return { promptSummary: null, gaps: [] };
              }
              
              const gaps = sectionInsight.requirementGaps.map(gap => ({
                id: gap.id,
                title: gap.label,
                description: `${gap.rationale} ${gap.recommendation}`,
              }));
              
              return {
                promptSummary: sectionInsight.promptSummary,
                gaps,
              };
            };
            
            const { promptSummary, gaps: gapObjects } = getSectionGapInsights(section.slug);
            const hasGaps = gapObjects.length > 0;
            
            return (
              <ContentCard
                key={section.id}
                title={section.title}
                content={undefined} // Don't show preview when editable (Textarea displays it)
                tags={getRequirementTagsForSection(section)}
                hasGaps={hasGaps}
                gaps={gapObjects}
                gapSummary={promptSummary} // Agent C: Pass rubric summary for section guidance
                isGapResolved={!hasGaps}
                onGenerateContent={hasGaps ? () => {
                  // Open HIL workflow with first gap
                  const firstGap = gapObjects[0];
                  if (firstGap) {
                    setSelectedGap({ 
                      id: firstGap.id, 
                      type: 'core-requirement',
                      severity: 'high',
                      description: firstGap.description,
                      suggestion: firstGap.description,
                      origin: 'ai',
                      section_id: section.id
                    });
                    setShowContentGenerationModal(true);
                  }
                } : undefined}
                onDismissGap={hasGaps ? () => {
                  // Note: Dismissing gaps not currently supported in MVP
                  // Would require updating enhancedMatchData or persisting dismissed state
                  console.log('Gap dismissed for section:', section.id);
                } : undefined}
                tagsLabel="Job Requirements"
                showUsage={false}
                renderChildrenBeforeTags={true}
                className={cn(hasGaps && 'border-warning')}
              >
                {/* Inline editable Textarea */}
                <div className="mb-6">
                  <Textarea
                    value={editedContent}
                    onChange={event => handleSectionChange(section.id, event.target.value)}
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
                      variant="outline"
                      onClick={() => handleSectionReset(section.id)}
                      disabled={!isDirty || isSaving}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </ContentCard>
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
            <Button type="button" variant="outline" onClick={() => handleClose()}>
              Close
            </Button>
            <Button type="button" className="gap-2" onClick={handleFinalize}>
              <FileText className="h-4 w-4" />
              Finalize letter
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={open => (!open ? handleClose() : undefined)}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
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

        <Tabs value={mainTab} onValueChange={setMainTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:w-96">
            <TabsTrigger value="job-description">Job description</TabsTrigger>
            <TabsTrigger value="cover-letter" disabled={!draft}>
              Cover letter
            </TabsTrigger>
          </TabsList>

          <TabsContent value="job-description">{renderJobDescriptionTab()}</TabsContent>
          <TabsContent value="cover-letter">{renderDraftTab()}</TabsContent>
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

