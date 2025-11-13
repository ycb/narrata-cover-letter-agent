import { useEffect, useMemo, useState } from 'react';
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
import { MatchComponent } from './MatchComponent';
import { CoverLetterFinalization } from './CoverLetterFinalization';
import type { CoverLetterDraft, JobDescriptionRecord } from '@/types/coverLetters';

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
  const [jobDescriptionMethod, setJobDescriptionMethod] = useState<'paste' | 'url'>('paste');
  const [jobContent, setJobContent] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobInputError, setJobInputError] = useState<string | null>(null);
  const [isParsingJobDescription, setIsParsingJobDescription] = useState(false);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [jobDescriptionRecord, setJobDescriptionRecord] = useState<JobDescriptionRecord | null>(null);
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({});
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [mainTab, setMainTab] = useState<'job-description' | 'cover-letter'>('job-description');
  const [finalizationOpen, setFinalizationOpen] = useState(false);
  const [finalizationError, setFinalizationError] = useState<string | null>(null);

  const jobDescriptionService = useMemo(() => new JobDescriptionService(), []);
  const coverLetterDraftService = useMemo(() => new CoverLetterDraftService(), []);

  const {
    draft,
    workpad,
    progress,
    isGenerating,
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

  const resetViewState = () => {
    setJobContent('');
    setJobUrl('');
    setJobInputError(null);
    setJobDescriptionRecord(null);
    setSectionDrafts({});
    setSavingSections({});
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
    setIsParsingJobDescription(true);

    try {
      const record = await jobDescriptionService.parseAndCreate(user.id, jobContent.trim(), {
        url: jobDescriptionMethod === 'url' ? jobUrl || null : null,
      });
      setJobDescriptionRecord(record);
      setJobDescriptionId(record.id);
      await generateDraft({
        templateId: selectedTemplateId,
        jobDescriptionId: record.id,
      });
      setMainTab('cover-letter');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate cover letter draft.';
      setJobInputError(message);
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
    if (!progress.length) return null;
    return (
      <Card className="border-muted-foreground/20 bg-muted/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Generation progress</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Follow each stage as we parse the job description and assemble your cover letter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ul className="space-y-1 text-sm">
            {progress.map(update => (
              <li
                key={`${update.phase}-${update.timestamp}`}
                className="flex items-start gap-2"
              >
                <Badge
                  variant="outline"
                  className="mt-0.5 text-[11px] uppercase tracking-wide"
                >
                  {update.phase.replace(/-/g, ' ')}
                </Badge>
                <span className="text-muted-foreground">{update.message}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  const renderJobDescriptionTab = () => (
    <div className="space-y-6">
      <Card className="border-muted-foreground/20 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Job description</CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                Paste the full job description so we can analyze responsibilities and
                requirement signals.
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Keep it under 5,000 characters
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Template</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <Select
                value={selectedTemplateId ?? undefined}
                onValueChange={handleTemplateChange}
                disabled={templatesLoading || isBusy || !templates.length}
              >
                <SelectTrigger className="w-full md:w-72">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templatesLoading && (
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading templates…
                </Badge>
              )}
            </div>
            {templateError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to load templates</AlertTitle>
                <AlertDescription>{templateError}</AlertDescription>
              </Alert>
            )}
            {!templateError && !templatesLoading && templates.length === 0 && (
              <Alert variant="default">
                <AlertTitle>No templates found</AlertTitle>
                <AlertDescription>
                  Create a cover letter template first so we know how to structure the draft.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold">Input method</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={jobDescriptionMethod === 'paste' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setJobDescriptionMethod('paste')}
              >
                Paste description
              </Button>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled>
                      Import from URL
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm text-muted-foreground">
                      Coming soon — automatically fetch and parse job descriptions from URLs.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {jobDescriptionMethod === 'paste' ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Paste the full job description here..."
                rows={16}
                value={jobContent}
                onChange={event => setJobContent(event.target.value)}
                disabled={isBusy}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{jobContent.trim().length} characters</span>
                <span>Minimum {MIN_JOB_DESCRIPTION_LENGTH} characters required</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="https://company.com/careers/job-posting"
                value={jobUrl}
                disabled
                onChange={event => setJobUrl(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                URL ingestion is not yet available. Please paste the job description above instead.
              </p>
            </div>
          )}

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
              {isParsingJobDescription ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing job description…
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

  const renderDraftTab = () => {
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

        <MatchComponent
          metrics={draft.metrics}
          differentiators={draft.differentiatorSummary}
          isLoading={isGenerating}
        />

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
            const badgeVariant = section.status.hasGaps
              ? 'destructive'
              : section.status.isModified
              ? 'secondary'
              : 'outline';

            return (
              <Card key={section.id} className="border-muted-foreground/20 shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {section.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {section.slug.replace(/-/g, ' ')}
                    </CardDescription>
                  </div>
                  <Badge variant={badgeVariant} className="gap-1">
                    <FileText className="h-3 w-3" />
                    {section.status.hasGaps
                      ? 'Needs attention'
                      : section.status.isModified
                      ? 'Updated'
                      : 'Auto-generated'}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={editedContent}
                    onChange={event => handleSectionChange(section.id, event.target.value)}
                    rows={8}
                    className="resize-y"
                  />
                  <div className="flex flex-wrap items-center gap-2">
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-muted-foreground"
                      disabled
                    >
                      <Pencil className="h-4 w-4" />
                      AI assist (coming soon)
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                AI assisted
              </Badge>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                Role targeted
              </Badge>
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
    </Dialog>
  );
};

