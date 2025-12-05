import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar,
  LayoutTemplate,
  Plus,
  Search
} from "lucide-react";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";
import { CoverLetterViewModal } from "@/components/cover-letters/CoverLetterViewModal";
import { CoverLetterEditModal } from "@/components/cover-letters/CoverLetterEditModal";
import { UserGoalsModal } from "@/components/user-goals/UserGoalsModal";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  CoverLetterTemplateService,
  type CoverLetterSummary
} from "@/services/coverLetterTemplateService";
import type {
  CoverLetterGeneratedSection,
  CoverLetterSection
} from "@/types/workHistory";

type CoverLetterStatus = "draft" | "reviewed" | "finalized";

interface CoverLetterAnalytics {
  atsScore?: number | null;
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

const parseSummary = (feedback: Record<string, unknown> | null): string | null => {
  if (!feedback) {
    return null;
  }
  const candidate = feedback.summary ?? feedback.notes ?? null;
  return typeof candidate === "string" && candidate.trim().length > 0 ? candidate : null;
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
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    jobDescriptionContent: summary.jobDescription?.content ?? "",
    jobDescriptionUrl: summary.jobDescription?.url ?? null,
    sections: summary.sections,
    templateSections: summary.templateSections,
    llmFeedback: summary.llmFeedback,
    analytics: {
      atsScore: parseAtsScore(summary.llmFeedback),
      rating: parseRating(summary.llmFeedback),
      summary: parseSummary(summary.llmFeedback)
    }
  };
};

const toModalPayload = (coverLetter: CoverLetterListItem): ModalCoverLetterPayload => {
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

  return {
    ...coverLetter,
    content: { sections },
    jobDescription: coverLetter.jobDescriptionContent,
    enhancedMatchData, // Agent C: pass through to modals
  };
};

const getStatusTone = (status: CoverLetterStatus): string => {
  switch (status) {
    case "finalized":
      return "bg-success text-success-foreground";
    case "reviewed":
      return "bg-primary/10 text-primary";
    default:
      return "bg-warning text-warning-foreground";
  }
};

const getStatusLabel = (status: CoverLetterStatus): string => {
  switch (status) {
    case "finalized":
      return "Finalized";
    case "reviewed":
      return "Reviewed";
    default:
      return "Draft";
  }
};

const formatShortDate = (value: string): string =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

export default function CoverLetters() {
  const { user } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CoverLetterStatus>("all");

  // Persist modal state in sessionStorage to prevent loss on tab switch
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(() => {
    const saved = sessionStorage.getItem('coverLetterCreateModalOpen');
    return saved === 'true';
  });

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false); // Agent C: goals CTA
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false); // Agent C: add story CTA
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
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    fetchCoverLetters();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchCoverLetters]);

  const filteredCoverLetters = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return coverLetters.filter((letter) => {
      const matchesSearch =
        term.length === 0 ||
        letter.title.toLowerCase().includes(term) ||
        letter.company.toLowerCase().includes(term) ||
        letter.position.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ? true : letter.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coverLetters, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    if (coverLetters.length === 0) {
      return {
        total: 0,
        finalized: 0,
        drafts: 0,
        averageAts: null as number | null,
        lastUpdated: null as string | null
      };
    }

    const finalized = coverLetters.filter((item) => item.status === "finalized").length;
    const drafts = coverLetters.filter((item) => item.status === "draft").length;

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
      finalized,
      drafts,
      averageAts,
      lastUpdated
    };
  }, [coverLetters]);

  const handleCreateNew = () => setIsCreateModalOpen(true);

  const handleCoverLetterCreated = async () => {
    setIsCreateModalOpen(false);
    await fetchCoverLetters();
  };

  const handleView = (coverLetter: CoverLetterListItem) => {
    setSelectedCoverLetter(coverLetter);
    setIsViewModalOpen(true);
  };

  const handleEdit = (coverLetter: CoverLetterListItem) => {
    setSelectedCoverLetter(coverLetter);
    setIsEditModalOpen(true);
  };

  // Agent C: Handler for "Edit Goals" CTA
  const handleEditGoals = () => {
    setIsGoalsModalOpen(true);
  };

  const handleGoalsSaved = async () => {
    setIsGoalsModalOpen(false);
    // Optionally refresh data to show updated goals
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
              <Button variant="secondary" asChild>
                <Link to="/cover-letter-template">
                  <LayoutTemplate className="h-4 w-4 mr-2" />
                  Edit Template
                </Link>
              </Button>
              <Button onClick={handleCreateNew}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Letter
              </Button>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatsCard
              title="Total Letters"
              value={stats.total}
              description=""
              icon={Calendar}
            />
            <StatsCard
              title="Finalized"
              value={stats.finalized}
              description=""
              icon={Calendar}
            />
            <StatsCard
              title="Drafts"
              value={stats.drafts}
              description=""
              icon={Calendar}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
              <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Search by company, role, or title"
                  value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
            </div>
            <div className="flex gap-2">
              <Button
                variant={statusFilter === "all" ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "draft" ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
              >
                Drafts
              </Button>
              <Button
                variant={statusFilter === "reviewed" ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter("reviewed")}
              >
                Reviewed
              </Button>
              <Button
                variant={statusFilter === "finalized" ? "default" : "secondary"}
                size="sm"
                onClick={() => setStatusFilter("finalized")}
              >
                Finalized
              </Button>
            </div>
          </div>

          {filteredCoverLetters.length === 0 && !isLoading ? (
            <EmptyState
              title="No cover letters yet"
              description="Generate your first cover letter to populate this workspace."
              action={{
                label: "Create cover letter",
                onClick: handleCreateNew
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {filteredCoverLetters.map((coverLetter) => (
                <Card
                  key={coverLetter.id}
                  className="shadow-soft transition-all duration-200 hover:shadow-medium cursor-pointer"
                  onClick={() => handleEdit(coverLetter)}
                >
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">{coverLetter.title}</CardTitle>
                      <Badge className={getStatusTone(coverLetter.status)}>
                        {getStatusLabel(coverLetter.status)}
                      </Badge>
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
                          27%
                        </p>
                      </div>
                      <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Readiness
                        </p>
                        <p className="text-lg font-semibold text-foreground">
                          Strong
                        </p>
                      </div>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )}
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
      
      <CoverLetterViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        coverLetter={modalPayload}
        onEditGoals={handleEditGoals}
        onAddStory={handleAddStory}
        onEnhanceSection={handleEnhanceSection}
        onAddMetrics={handleAddMetrics}
      />
      
      <CoverLetterEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        coverLetter={modalPayload}
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
      />

      <AddStoryModal
        open={isAddStoryModalOpen}
        onOpenChange={setIsAddStoryModalOpen}
        onSave={handleStorySaved}
        isViewAllContext={true}
      />
    </div>
  );
}