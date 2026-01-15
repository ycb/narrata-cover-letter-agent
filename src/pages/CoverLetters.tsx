import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GrammarInput } from "@/components/ui/grammar-input";
import { 
  Calendar,
  LayoutTemplate,
  MoreHorizontal,
  Plus,
  Search,
  Trash2
} from "lucide-react";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";
import { CoverLetterEditModal } from "@/components/cover-letters/CoverLetterEditModal";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { useAuth } from "@/contexts/AuthContext";
import { useUserGoals } from "@/contexts/UserGoalsContext";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CoverLetterTemplateService,
  type CoverLetterSummary
} from "@/services/coverLetterTemplateService";
import type {
  CoverLetterGeneratedSection,
  CoverLetterSection
} from "@/types/workHistory";
import type { CoverLetterOutcomeStatus } from "@/types/coverLetters";
import { classifyRoleToBucket } from "@/lib/roleBuckets";

type CoverLetterStatus = "draft" | "reviewed" | "finalized";
type CoverLetterDisplayStatus = "draft" | "applied" | CoverLetterOutcomeStatus;
type CoverLetterFilter = "all" | CoverLetterDisplayStatus;

interface CoverLetterAnalytics {
  atsScore?: number | null;
  overallScore?: number | null;
  readiness?: string | null;
  rating?: string | null;
  summary?: string | null;
}

interface CoverLetterListItem {
  id: string;
  templateId: string;
  templateName: string | null;
  jobDescriptionId: string;
  title: string;
  company: string;
  position: string;
  status: CoverLetterStatus;
  outcomeStatus?: CoverLetterOutcomeStatus | null;
  appliedAt?: string | null;
  outcomeUpdatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  jobDescriptionContent: string;
  jobDescriptionUrl: string | null;
  sections: CoverLetterGeneratedSection[];
  templateSections: CoverLetterSection[];
  llmFeedback: Record<string, unknown> | null;
  analytics: CoverLetterAnalytics;
}

interface ModalCoverLetterPayload extends CoverLetterListItem {
    content: {
    sections: Array<{
      id: string;
      type: string;
      title?: string;
      content: string;
      isEnhanced: boolean;
      source?: any;
    }>;
  };
  jobDescription: string;
  enhancedMatchData?: import('@/types/coverLetters').EnhancedMatchData; // Agent C: detailed match data
}

const parseAtsScore = (feedback: Record<string, unknown> | null): number | null => {
  if (!feedback) {
    return null;
  }

  const candidate =
    feedback.atsScore ??
    feedback.ats_score ??
    feedback.score ??
    feedback.ats ??
    null;

  if (typeof candidate === "number") {
    return candidate;
  }

  if (typeof candidate === "string") {
    const parsed = Number.parseFloat(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseRating = (feedback: Record<string, unknown> | null): string | null => {
  if (!feedback) {
    return null;
  }

  const candidate =
    feedback.coverLetterRating ??
    feedback.rating ??
    feedback.verdict ??
    feedback.status ??
    null;

  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate
    : null;
};

const parseOverallScore = (feedback: Record<string, unknown> | null): number | null => {
  if (!feedback) {
    return null;
  }

  const candidate =
    (feedback as any)?.contentStandards?.aggregated?.overallScore ??
    (feedback as any)?.content_standards?.aggregated?.overallScore ??
    (feedback as any)?.metrics?.overallScore ??
    (feedback as any)?.metrics?.overall_score ??
    (feedback as any)?.overallScore ??
    (feedback as any)?.overall_score ??
    null;

  if (typeof candidate === "number") {
    return Number.isFinite(candidate) ? candidate : null;
  }

  if (typeof candidate === "string") {
    const parsed = Number.parseFloat(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const parseSummary = (feedback: Record<string, unknown> | null): string | null => {
  if (!feedback) {
    return null;
  }
  const candidate = feedback.summary ?? feedback.notes ?? null;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
};

const parseReadiness = (analytics: Record<string, unknown> | null): string | null => {
  if (!analytics) {
    return null;
  }
  const candidate = (analytics as any).readiness ?? null;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate;
  }
  if (candidate && typeof candidate === "object") {
    const rating = (candidate as any).rating ?? (candidate as any).label ?? null;
    return typeof rating === "string" && rating.trim().length > 0 ? rating : null;
  }
  const readinessLabel = (analytics as any).readinessLabel ?? null;
  return typeof readinessLabel === "string" && readinessLabel.trim().length > 0
    ? readinessLabel
    : null;
};

const transformSummary = (summary: CoverLetterSummary): CoverLetterListItem => {
  const company = summary.jobDescription?.company ?? "Unknown company";
  const position = summary.jobDescription?.role ?? "Role";
  const title = [position, company].filter(Boolean).join(" • ") || "Cover Letter";

  return {
    id: summary.id,
    templateId: summary.templateId,
    templateName: summary.templateName,
    jobDescriptionId: summary.jobDescriptionId,
    title,
    company,
    position,
    status: summary.status,
    outcomeStatus: summary.outcomeStatus ?? null,
    appliedAt: summary.appliedAt ?? null,
    outcomeUpdatedAt: summary.outcomeUpdatedAt ?? null,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    jobDescriptionContent: summary.jobDescription?.content ?? "",
    jobDescriptionUrl: summary.jobDescription?.url ?? null,
    sections: summary.sections,
    templateSections: summary.templateSections,
    llmFeedback: summary.llmFeedback,
    analytics: {
      atsScore: parseAtsScore(summary.llmFeedback),
      overallScore: parseOverallScore(summary.llmFeedback),
      readiness: parseReadiness(summary.analytics),
      rating: parseRating(summary.llmFeedback),
      summary: parseSummary(summary.llmFeedback)
    }
  };
};

const toModalPayload = (coverLetter: CoverLetterListItem): ModalCoverLetterPayload => {
  // ALWAYS LOG (even in production) for debugging
  console.log('🔍 [toModalPayload] START - coverLetter.id:', coverLetter.id);
  console.log('🔍 [toModalPayload] llmFeedback keys:', coverLetter.llmFeedback ? Object.keys(coverLetter.llmFeedback) : 'NO LLM FEEDBACK');
  
  const sectionsSource =
    coverLetter.sections.length > 0
      ? coverLetter.sections
      : coverLetter.templateSections.map((section) => ({
          id: section.id,
          sectionId: section.id,
          content: section.staticContent ?? "",
          isModified: false
        }));

  const sections = sectionsSource.map((section, index) => {
    const templateSection = coverLetter.templateSections.find(
      (candidate) => candidate.id === section.sectionId
    );
    const fallbackType =
      index === 0
        ? "intro"
        : index === sectionsSource.length - 1
          ? "closing"
          : "paragraph";

    return {
      id: section.id ?? section.sectionId ?? `section-${index}`,
      type: templateSection?.type ?? fallbackType,
      title: (section as any).title ?? templateSection?.title,
      content:
        (section as CoverLetterGeneratedSection).content ??
        templateSection?.staticContent ??
        "",
      isEnhanced: templateSection?.isStatic === false,
      source: (section as any).source
    };
  });

  // Agent C: Extract enhancedMatchData from llmFeedback
  const enhancedMatchData = coverLetter.llmFeedback?.enhancedMatchData as 
    import('@/types/coverLetters').EnhancedMatchData | undefined;

  // ALWAYS LOG (even in production) for debugging
  console.log('🔍 [toModalPayload] enhancedMatchData extracted:', {
    hasEnhancedMatchData: !!enhancedMatchData,
    enhancedMatchDataKeys: enhancedMatchData ? Object.keys(enhancedMatchData) : [],
    hasSectionGapInsights: !!(enhancedMatchData as any)?.sectionGapInsights,
    sectionGapInsightsLength: (enhancedMatchData as any)?.sectionGapInsights?.length,
  });

  const result = {
    ...coverLetter,
    content: { sections },
    jobDescription: coverLetter.jobDescriptionContent,
    enhancedMatchData, // Agent C: pass through to modals
  };
  
  console.log('🔍 [toModalPayload] RESULT - has enhancedMatchData:', !!result.enhancedMatchData);
  console.log('🔍 [toModalPayload] RESULT - enhancedMatchData keys:', result.enhancedMatchData ? Object.keys(result.enhancedMatchData) : []);
  
  return result;
};

const getStatusToneFromDisplay = (status: CoverLetterDisplayStatus): string => {
  switch (status) {
    case "interview":
      return "bg-success text-success-foreground";
    case "applied":
      return "bg-primary/10 text-primary";
    case "no_response":
      return "bg-muted/70 text-muted-foreground";
    case "not_selected":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-warning text-warning-foreground";
  }
};

const getStatusLabelFromDisplay = (status: CoverLetterDisplayStatus): string => {
  switch (status) {
    case "interview":
      return "Interview";
    case "applied":
      return "Applied";
    case "no_response":
      return "No Response";
    case "not_selected":
      return "Not Selected";
    default:
      return "Draft";
  }
};

const normalizeCoverLetterStatus = (status: CoverLetterStatus): "draft" | "finalized" =>
  status === "reviewed" ? "draft" : status;

const getDisplayStatus = (
  status: CoverLetterStatus,
  outcomeStatus?: CoverLetterOutcomeStatus | null
): CoverLetterDisplayStatus => {
  const normalizedStatus = normalizeCoverLetterStatus(status);
  if (normalizedStatus === "draft") {
    return "draft";
  }
  if (outcomeStatus) {
    return outcomeStatus;
  }
  return "applied";
};

const formatShortDate = (value: string): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const AUTO_NO_RESPONSE_DAYS = 30;
const FILTER_BUTTON_CLASS = "h-8 px-3 text-xs";

const getAppliedAt = (coverLetter: CoverLetterListItem): string | null =>
  coverLetter.appliedAt ?? coverLetter.createdAt ?? coverLetter.updatedAt ?? null;

const isAutoNoResponseCandidate = (coverLetter: CoverLetterListItem): boolean => {
  if (normalizeCoverLetterStatus(coverLetter.status) !== "finalized") {
    return false;
  }
  if (coverLetter.outcomeStatus) {
    return false;
  }
  const appliedAt = getAppliedAt(coverLetter);
  if (!appliedAt) {
    return false;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUTO_NO_RESPONSE_DAYS);
  return new Date(appliedAt) < cutoff;
};

export default function CoverLetters() {
  const { user, isDemo } = useAuth();
  const { goals: userGoals, setGoals } = useUserGoals();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<CoverLetterFilter>("all");

  // Persist modal state in sessionStorage to prevent loss on tab switch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(() => {
    const saved = sessionStorage.getItem('coverLetterCreateModalOpen');
    return saved === 'true';
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false); // Agent C: goals CTA
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false); // Agent C: add story CTA
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [coverLetterToDelete, setCoverLetterToDelete] = useState<CoverLetterListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [storyCTAContext, setStoryCTAContext] = useState<{requirement?: string; severity?: string} | null>(null);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<CoverLetterListItem | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetterListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Persist create modal state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('coverLetterCreateModalOpen', String(isCreateModalOpen));
  }, [isCreateModalOpen]);

  const applyAutoNoResponse = useCallback(
    async (letters: CoverLetterListItem[]) => {
      if (!user?.id || isDemo) {
        return;
      }

      const hasCandidates = letters.some(isAutoNoResponseCandidate);
      if (!hasCandidates) {
        return;
      }

      try {
        const { updatedIds, outcomeUpdatedAt } =
          await CoverLetterTemplateService.autoApplyNoResponse({
            userId: user.id,
            days: AUTO_NO_RESPONSE_DAYS,
          });

        if (!mountedRef.current || updatedIds.length === 0) {
          return;
        }

        setCoverLetters((prev) =>
          prev.map((letter) =>
            updatedIds.includes(letter.id)
              ? {
                  ...letter,
                  outcomeStatus: "no_response",
                  outcomeUpdatedAt,
                  updatedAt: outcomeUpdatedAt,
                }
              : letter
          )
        );
      } catch (error) {
        console.warn("[CoverLetters] Auto no-response update failed:", error);
      }
    },
    [isDemo, user?.id]
  );

  const fetchCoverLetters = useCallback(async () => {
    if (!user?.id) {
      if (mountedRef.current) {
        setCoverLetters([]);
        setIsLoading(false);
        setLoadError(null);
      }
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const summaries = await CoverLetterTemplateService.getUserCoverLetters(user.id);
      if (!mountedRef.current) {
        return;
      }

      const mapped = summaries.map(transformSummary);
      setCoverLetters(mapped);
      void applyAutoNoResponse(mapped);
    } catch (err) {
      if (!mountedRef.current) {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to load cover letters";
      setLoadError(message);
      setCoverLetters([]);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyAutoNoResponse, user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCoverLetters();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCoverLetters]);

  const filteredCoverLetters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const roleBucket = (searchParams.get('roleBucket') || '').trim();
    return coverLetters.filter((letter) => {
      const matchesSearch =
        term.length === 0 ||
        letter.title.toLowerCase().includes(term) ||
        letter.company.toLowerCase().includes(term) ||
        letter.position.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all"
          ? true
          : getDisplayStatus(letter.status, letter.outcomeStatus) === statusFilter;

      const matchesRoleBucket = roleBucket
        ? classifyRoleToBucket(letter.position).key === roleBucket
        : true;

      return matchesSearch && matchesStatus && matchesRoleBucket;
    });
  }, [coverLetters, searchParams, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    if (coverLetters.length === 0) {
      return {
        total: 0,
        applied: 0,
        interviews: 0,
        drafts: 0,
        lastMonthTotal: 0,
        lastMonthApplied: 0,
        lastMonthInterviews: 0,
        lastMonthDrafts: 0,
        averageAts: null as number | null,
        lastUpdated: null as string | null
      };
    }

    const applied = coverLetters.filter(
      (item) => normalizeCoverLetterStatus(item.status) === "finalized"
    ).length;
    const interviews = coverLetters.filter(
      (item) => item.outcomeStatus === "interview"
    ).length;
    const drafts = coverLetters.filter(
      (item) => normalizeCoverLetterStatus(item.status) === "draft"
    ).length;

    // Calculate monthly stats (created in the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const lastMonthLetters = coverLetters.filter((item) => 
      new Date(item.createdAt) >= thirtyDaysAgo
    );
    
    const lastMonthTotal = lastMonthLetters.length;
    const lastMonthApplied = lastMonthLetters.filter(
      (item) => normalizeCoverLetterStatus(item.status) === "finalized"
    ).length;
    const lastMonthInterviews = lastMonthLetters.filter(
      (item) => item.outcomeStatus === "interview"
    ).length;
    const lastMonthDrafts = lastMonthLetters.filter(
      (item) => normalizeCoverLetterStatus(item.status) === "draft"
    ).length;

    const atsScores = coverLetters
      .map((item) => item.analytics.atsScore)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    const averageAts =
      atsScores.length > 0
        ? Math.round(atsScores.reduce((acc, value) => acc + value, 0) / atsScores.length)
        : null;

    const lastUpdated = coverLetters
      .map((item) => item.updatedAt)
      .sort()
      .reverse()[0];

    return {
      total: coverLetters.length,
      applied,
      interviews,
      drafts,
      lastMonthTotal,
      lastMonthApplied,
      lastMonthInterviews,
      lastMonthDrafts,
      averageAts,
      lastUpdated
    };
  }, [coverLetters]);

  const handleCreateNew = () => setIsCreateModalOpen(true);

  const handleCoverLetterCreated = async () => {
    setIsCreateModalOpen(false);
    await fetchCoverLetters();
  };

  const handleEdit = (coverLetter: CoverLetterListItem) => {
    setSelectedCoverLetter(coverLetter);
    setIsEditModalOpen(true);
  };

  const handleConfirmDelete = (coverLetter: CoverLetterListItem) => {
    setCoverLetterToDelete(coverLetter);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!coverLetterToDelete) return;
    try {
      setIsDeleting(true);
      await CoverLetterTemplateService.deleteCoverLetter(coverLetterToDelete.id);
      toast({
        title: "Cover letter deleted",
        description: "The draft has been removed.",
      });
      setIsDeleteDialogOpen(false);
      setCoverLetterToDelete(null);
      await fetchCoverLetters();
    } catch (error) {
      console.error("[CoverLetters] deleteCoverLetter failed:", error);
      toast({
        title: "Delete failed",
        description: "Unable to delete cover letter. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOutcomeChange = async (
    coverLetter: CoverLetterListItem,
    nextStatus: CoverLetterOutcomeStatus | "applied"
  ) => {
    if (isDemo) {
      return;
    }
    if (normalizeCoverLetterStatus(coverLetter.status) !== "finalized") {
      return;
    }

    const outcomeStatus = nextStatus === "applied" ? null : nextStatus;
    const appliedAt = getAppliedAt(coverLetter) ?? new Date().toISOString();

    try {
      const { outcomeUpdatedAt } =
        await CoverLetterTemplateService.updateCoverLetterOutcome({
          coverLetterId: coverLetter.id,
          outcomeStatus,
          appliedAt,
        });

      if (!mountedRef.current) {
        return;
      }

      setCoverLetters((prev) =>
        prev.map((letter) =>
          letter.id === coverLetter.id
            ? {
                ...letter,
                outcomeStatus,
                appliedAt,
                outcomeUpdatedAt,
                updatedAt: outcomeUpdatedAt,
              }
            : letter
        )
      );

      toast({
        title: "Status updated",
        description: outcomeStatus ? "Outcome saved." : "Status set to Applied.",
      });
    } catch (error) {
      console.error("[CoverLetters] Failed to update outcome:", error);
      toast({
        title: "Update failed",
        description: "Unable to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Agent C: Handler for "Edit Goals" CTA
  const handleEditGoals = () => {
    setIsGoalsModalOpen(true);
  };

  const handleGoalsSaved = async (updatedGoals: import('@/types/userGoals').UserGoals) => {
    await setGoals(updatedGoals);
    setIsGoalsModalOpen(false);
    await fetchCoverLetters();
  };

  // Agent C: Handler for "Add Story" CTA
  const handleAddStory = (requirement?: string, severity?: string) => {
    setStoryCTAContext({ requirement, severity });
    setIsAddStoryModalOpen(true);
  };

  const handleStorySaved = async (story: any) => {
    console.log('Story saved:', story);
    setIsAddStoryModalOpen(false);
    setStoryCTAContext(null);
    // TODO: Optionally show success toast
    // Optionally refresh data to show new story in experience matching
    await fetchCoverLetters();
  };

  // Agent C: Handler for "Enhance Section" CTA
  const handleEnhanceSection = (sectionId: string, requirement?: string) => {
    console.log('Enhance section:', sectionId, 'for requirement:', requirement);
    // This will be handled by the edit modal itself
    // Just pass the handler through so components can trigger it
  };

  // Agent C: Handler for "Add Metrics" CTA
  const handleAddMetrics = (sectionId?: string) => {
    console.log('Add metrics to section:', sectionId);
    // This will be handled by the edit modal itself
    // Just pass the handler through so components can trigger it
  };

  const modalPayload = selectedCoverLetter ? toModalPayload(selectedCoverLetter) : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">All Cover Letters</h1>
              <p className="text-muted-foreground">
                Manage drafts and keep track of your cover letter history
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isDemo && (
                <Button variant="secondary" asChild>
                  <Link
                    to="/cover-letter-template"
                  >
                    <LayoutTemplate className="h-4 w-4 mr-2" />
                    Edit Template
                  </Link>
                </Button>
              )}
              {!isDemo && (
                <Button
                  onClick={handleCreateNew}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Letter
                </Button>
              )}
            </div>
          </div>

          {isLoading && (
            <Card>
              <CardContent className="p-4">
                <LoadingState isLoading loadingText="Loading cover letters..." />
              </CardContent>
            </Card>
          )}

          {loadError && !isLoading && (
            <Card>
              <CardContent className="p-4 text-sm text-destructive">
                {loadError}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatsCard
              title="Total Letters"
              value={stats.total}
              description=""
              icon={Calendar}
              trend={{
                value: `+${stats.lastMonthTotal} this month`,
                isPositive: stats.lastMonthTotal > 0,
                change: stats.lastMonthTotal
              }}
            />
            <StatsCard
              title="Applied"
              value={stats.applied}
              description=""
              icon={Calendar}
              trend={{
                value: `+${stats.lastMonthApplied} this month`,
                isPositive: stats.lastMonthApplied > 0,
                change: stats.lastMonthApplied
              }}
            />
            <StatsCard
              title="Interviews"
              value={stats.interviews}
              description=""
              icon={Calendar}
              trend={{
                value: `+${stats.lastMonthInterviews} this month`,
                isPositive: stats.lastMonthInterviews > 0,
                change: stats.lastMonthInterviews
              }}
            />
            <StatsCard
              title="Drafts"
              value={stats.drafts}
              description=""
              icon={Calendar}
              trend={{
                value: `+${stats.lastMonthDrafts} this month`,
                isPositive: stats.lastMonthDrafts > 0,
                change: stats.lastMonthDrafts
              }}
            />
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-[420px] xl:max-w-[520px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <GrammarInput
                placeholder="Search by company, role, or title"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2 lg:ml-auto lg:flex-nowrap lg:justify-end">
              <Button
                variant={statusFilter === "all" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("draft")}
              >
                Drafts
              </Button>
              <Button
                variant={statusFilter === "applied" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("applied")}
              >
                Applied
              </Button>
              <Button
                variant={statusFilter === "interview" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("interview")}
              >
                Interview
              </Button>
              <Button
                variant={statusFilter === "no_response" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("no_response")}
              >
                No Response
              </Button>
              <Button
                variant={statusFilter === "not_selected" ? "default" : "secondary"}
                size="sm"
                className={FILTER_BUTTON_CLASS}
                onClick={() => setStatusFilter("not_selected")}
              >
                Not Selected
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredCoverLetters.map((coverLetter) => {
              const displayStatus = getDisplayStatus(
                coverLetter.status,
                coverLetter.outcomeStatus
              );
              const isFinalized =
                normalizeCoverLetterStatus(coverLetter.status) === "finalized";
              const canUpdateOutcome = !isDemo && isFinalized;

              return (
                <Card
                  key={coverLetter.id}
                  className="shadow-soft transition-all duration-200 hover:shadow-medium cursor-pointer"
                  onClick={() => handleEdit(coverLetter)}
                >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">{coverLetter.title}</CardTitle>
                      <div className="flex items-center gap-2">
                        {canUpdateOutcome ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="focus:outline-none"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Badge className={getStatusToneFromDisplay(displayStatus)}>
                                  {getStatusLabelFromDisplay(displayStatus)}
                                </Badge>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="start"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuLabel>Status</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={coverLetter.outcomeStatus ?? "applied"}
                                onValueChange={(value) =>
                                  handleOutcomeChange(
                                    coverLetter,
                                    value as CoverLetterOutcomeStatus | "applied"
                                  )
                                }
                              >
                                <DropdownMenuRadioItem value="applied">
                                  <Badge className={getStatusToneFromDisplay("applied")}>
                                    Applied
                                  </Badge>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="interview">
                                  <Badge className={getStatusToneFromDisplay("interview")}>
                                    Interview
                                  </Badge>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="no_response">
                                  <Badge className={getStatusToneFromDisplay("no_response")}>
                                    No Response
                                  </Badge>
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="not_selected">
                                  <Badge className={getStatusToneFromDisplay("not_selected")}>
                                    Not Selected
                                  </Badge>
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge className={getStatusToneFromDisplay(displayStatus)}>
                            {getStatusLabelFromDisplay(displayStatus)}
                          </Badge>
                        )}
                        {!isDemo && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              {canUpdateOutcome && (
                                <>
                                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                                  <DropdownMenuRadioGroup
                                    value={coverLetter.outcomeStatus ?? "applied"}
                                    onValueChange={(value) =>
                                      handleOutcomeChange(
                                        coverLetter,
                                        value as CoverLetterOutcomeStatus | "applied"
                                      )
                                    }
                                  >
                                    <DropdownMenuRadioItem value="applied">
                                      <Badge className={getStatusToneFromDisplay("applied")}>
                                        Applied
                                      </Badge>
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="interview">
                                      <Badge className={getStatusToneFromDisplay("interview")}>
                                        Interview
                                      </Badge>
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="no_response">
                                      <Badge className={getStatusToneFromDisplay("no_response")}>
                                        No Response
                                      </Badge>
                                    </DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="not_selected">
                                      <Badge className={getStatusToneFromDisplay("not_selected")}>
                                        Not Selected
                                      </Badge>
                                    </DropdownMenuRadioItem>
                                  </DropdownMenuRadioGroup>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleConfirmDelete(coverLetter)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete cover letter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Updated {formatShortDate(coverLetter.updatedAt)}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Overall Score
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {coverLetter.analytics.overallScore !== null && coverLetter.analytics.overallScore !== undefined
                            ? `${Math.round(coverLetter.analytics.overallScore)}%`
                            : "—"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Readiness
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          {coverLetter.analytics.readiness
                            ? coverLetter.analytics.readiness
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (char) => char.toUpperCase())
                            : coverLetter.analytics.rating
                              ? coverLetter.analytics.rating
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (char) => char.toUpperCase())
                              : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <CoverLetterCreateModal
        isOpen={isCreateModalOpen}
        onClose={async () => {
          setIsCreateModalOpen(false);
          // Refresh list in case a draft was created
          await fetchCoverLetters();
        }}
        onCoverLetterCreated={handleCoverLetterCreated}
      />
      
      <CoverLetterEditModal
        isOpen={isEditModalOpen}
        onClose={async () => {
          setIsEditModalOpen(false);
          await fetchCoverLetters();
        }}
        coverLetter={modalPayload}
        startInPreview={
          modalPayload
            ? normalizeCoverLetterStatus(modalPayload.status) === "finalized"
            : false
        }
        onSave={fetchCoverLetters}
        onEditGoals={handleEditGoals}
        onAddStory={handleAddStory}
        onEnhanceSection={handleEnhanceSection}
        onAddMetrics={handleAddMetrics}
      />

      <UserGoalsModal
        isOpen={isGoalsModalOpen}
        onClose={() => setIsGoalsModalOpen(false)}
        onSave={handleGoalsSaved}
        initialGoals={userGoals || undefined}
      />

      <AddStoryModal
        open={isAddStoryModalOpen}
        onOpenChange={setIsAddStoryModalOpen}
        onSave={handleStorySaved}
        isViewAllContext={true}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cover letter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this cover letter draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
