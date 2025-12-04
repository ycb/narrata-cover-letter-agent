import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Users,
  Lightbulb,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Info,
  RotateCw,
  Clock,
  Loader2,
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";
import { SpecializationCard } from "@/components/assessment/SpecializationCard";
import { CompetencyCard } from "@/components/assessment/CompetencyCard";
import { CareerLadder } from "@/components/assessment/CareerLadder";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePMLevel } from "@/hooks/usePMLevel";
import { usePMLevelsJobStream } from "@/hooks/useJobStream";
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceProgressColor, getConfidenceBadgeColor, textConfidenceToPercentage } from "@/utils/confidenceBadge";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import type { PMLevelInference, RoleType } from "@/types/content";
import { StreamingProgress } from "@/components/shared/StreamingProgress";
import type {
  StreamingStepState,
  StreamingTimelineEvent,
  StreamingLifecycleStatus,
} from "@/hooks/useStreamingProgress";
import { LoadingState } from "@/components/shared/LoadingState";

const SNAPSHOT_STORAGE_PREFIX = "pm-level-snapshot";

type LevelSnapshot = {
  lastAnalyzedAt: string;
  displayLevel: string;
  confidence: number;
  roleType: RoleType[];
  deltaSummary?: string;
};

type ChangeSummary = {
  analyzedAt: string;
  headline: string;
  items: string[];
};

const getConfidenceText = (score: number): string => {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
};

const getCompetencyLevel = (percentage: number): string => {
  if (percentage >= 90) return "Advanced";
  if (percentage >= 70) return "Proficient";
  if (percentage >= 50) return "Needs Work";
  return "Developing";
};

const scoreToPercentage = (score: number, max: number = 3): number => {
  return Math.round((score / max) * 100);
};

function formatRoleTypeName(key: string): string {
  const nameMap: Record<string, string> = {
    growth: "Growth PM",
    platform: "Platform PM",
    ai_ml: "AI/ML PM",
    founding: "Founding PM",
    technical: "Technical PM",
    general: "General PM",
  };
  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");
}

const buildSnapshot = (data: PMLevelInference): LevelSnapshot => ({
  lastAnalyzedAt: data.lastAnalyzedAt ?? new Date().toISOString(),
  displayLevel: data.displayLevel,
  confidence: data.confidence ?? 0,
  roleType: Array.isArray(data.roleType) ? [...data.roleType] : [],
  deltaSummary: data.deltaSummary,
});

const buildChangeSummary = (previous: LevelSnapshot, current: PMLevelInference): ChangeSummary => {
  const items: string[] = [];

  if (previous.displayLevel !== current.displayLevel) {
    items.push(`Level changed from ${previous.displayLevel} to ${current.displayLevel}.`);
  }

  const previousConfidence = Math.round((previous.confidence ?? 0) * 100);
  const currentConfidence = Math.round((current.confidence ?? 0) * 100);
  if (previousConfidence !== currentConfidence) {
    const direction = currentConfidence > previousConfidence ? "increased" : "decreased";
    items.push(`Confidence ${direction} from ${previousConfidence}% to ${currentConfidence}%.`);
  }

  const previousRoles = previous.roleType || [];
  const currentRoles = Array.isArray(current.roleType) ? current.roleType : [];
  const addedRoles = currentRoles.filter((role) => !previousRoles.includes(role));
  const removedRoles = previousRoles.filter((role) => !currentRoles.includes(role));

  if (addedRoles.length > 0) {
    items.push(`New specialization matches: ${addedRoles.map(formatRoleTypeName).join(", ")}.`);
  }

  if (removedRoles.length > 0) {
    items.push(`No longer detecting: ${removedRoles.map(formatRoleTypeName).join(", ")}.`);
  }

  if (current.deltaSummary && current.deltaSummary.trim().length > 0) {
    items.push(current.deltaSummary.trim());
  }

  if (items.length === 0) {
    items.push("Analysis refreshed. No major changes detected.");
  }

  const uniqueItems = Array.from(new Set(items));

  const headline =
    previous.displayLevel !== current.displayLevel
      ? "Your PM level changed"
      : uniqueItems.length > 1
      ? "Updates to your PM assessment"
      : "PM assessment refreshed";

  return {
    analyzedAt: current.lastAnalyzedAt ?? new Date().toISOString(),
    headline,
    items: uniqueItems,
  };
};

const transformLevelData = (levelData: any) => {
  if (!levelData) return null;

  const {
    competencyScores = {
      execution: 0,
      customer_insight: 0,
      strategy: 0,
      influence: 0,
    },
    recommendations = [],
    displayLevel = "PM",
    confidence = 0.5,
    signals = {},
    roleType = [],
    evidenceByCompetency = {},
    roleArchetypeEvidence = {},
  } = levelData;

  const dimensionMap: Record<string, string> = {
    "Product Execution": "execution",
    "Customer Insight": "customer_insight",
    "Product Strategy": "strategy",
    "Influencing People": "influence",
  };

  const getEvidenceBasedScore = (domain: string, rawScore: number): number => {
    const dimensionKey = dimensionMap[domain];
    const evidence = evidenceByCompetency?.[dimensionKey];

    if (evidence) {
      return calculateEvidenceBasedConfidence({
        competencyScore: rawScore,
        evidence: evidence.evidence || [],
        matchedTags: evidence.matchedTags || [],
        overallConfidence: evidence.overallConfidence,
      });
    }

    return scoreToPercentage(rawScore);
  };

  const competencies = [
    {
      domain: "Product Execution",
      score: getEvidenceBasedScore("Product Execution", competencyScores.execution || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Execution", competencyScores.execution || 0)),
      rawScore: competencyScores.execution || 0,
      evidence: signals?.execution_evidence || "Based on your work history and achievements",
      tags: ["Execution", "Delivery", "Technical"],
      description: "Measures your ability to deliver products effectively",
      evidenceStories: signals?.execution_stories || [],
    },
    {
      domain: "Customer Insight",
      score: getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0)),
      rawScore: competencyScores.customer_insight || 0,
      evidence: signals?.customer_evidence || "Based on your user research and customer focus",
      tags: ["Research", "User Experience", "Customer"],
      description: "Assesses your understanding of user needs",
      evidenceStories: signals?.customer_stories || [],
    },
    {
      domain: "Product Strategy",
      score: getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0)),
      rawScore: competencyScores.strategy || 0,
      evidence: signals?.strategy_evidence || "Based on your strategic initiatives",
      tags: ["Strategy", "Vision", "Roadmap"],
      description: "Evaluates your strategic thinking and planning",
      evidenceStories: signals?.strategy_stories || [],
    },
    {
      domain: "Influencing People",
      score: getEvidenceBasedScore("Influencing People", competencyScores.influence || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Influencing People", competencyScores.influence || 0)),
      rawScore: competencyScores.influence || 0,
      evidence: signals?.influence_evidence || "Based on your leadership examples",
      tags: ["Leadership", "Collaboration", "Stakeholder"],
      description: "Measures your ability to lead and influence",
      evidenceStories: signals?.influence_stories || [],
    },
  ];

  const validSpecializations = ["growth", "platform", "ai_ml", "founding"];

  const roleArchetypes =
    Array.isArray(roleType) && roleType.length > 0
      ? roleType
          .filter((roleTypeKey: string) => validSpecializations.includes(roleTypeKey))
          .map((roleTypeKey: string) => {
            const evidence = roleArchetypeEvidence[roleTypeKey];
            const formattedName = formatRoleTypeName(roleTypeKey);

            return {
              type: formattedName,
              typeKey: roleTypeKey,
              match: evidence?.matchScore || 80,
              description: evidence?.description || `${formattedName} product management focus`,
              evidence: `Based on your ${roleTypeKey.toLowerCase()} experience`,
              typicalProfile: evidence?.description || `Experience with ${roleTypeKey.toLowerCase()} products and initiatives`,
            };
          })
      : [];

  const levelProgression = [
    {
      level: "Associate PM",
      description: "0-2 years, feature delivery",
      current: displayLevel?.toLowerCase().includes("associate") || displayLevel === "L3",
    },
    {
      level: "Product Manager",
      description: "2-4 years, product ownership",
      current: displayLevel?.toLowerCase().includes("product manager") || displayLevel === "L4",
    },
    {
      level: "Senior PM",
      description: "4-7 years, strategic execution",
      current: displayLevel?.toLowerCase().includes("senior") || displayLevel === "L5",
    },
    {
      level: "Staff/Principal PM",
      description: "7-10 years, product strategy",
      current:
        displayLevel?.toLowerCase().includes("staff") ||
        displayLevel?.toLowerCase().includes("principal") ||
        displayLevel === "L6",
    },
    {
      level: "Director+",
      description: "10+ years, organizational leadership",
      current:
        displayLevel?.toLowerCase().includes("director") ||
        displayLevel?.toLowerCase().includes("vp") ||
        displayLevel?.toLowerCase().includes("head of") ||
        ["M1", "M2"].includes(displayLevel),
    },
  ];

  const currentLevelIndex = levelProgression.findIndex((l) => l.current);
  const fallbackNextLevel =
    currentLevelIndex < levelProgression.length - 1
      ? levelProgression[currentLevelIndex + 1]?.level
      : levelProgression[levelProgression.length - 1]?.level;

  const nextLevel = levelData?.levelEvidence?.nextLevel || fallbackNextLevel || "Staff/Principal Product Manager";

  return {
    currentLevel: levelData?.levelEvidence?.currentLevel || displayLevel || "Product Manager",
    confidence: getConfidenceText(confidence),
    nextLevel,
    levelDescription:
      levelData?.levelDescription || `Product manager with a focus on ${roleType?.[0] || "general product management"}`,
    inferenceSource: levelData?.inferenceSource || "Based on your profile and work history",
    competencies,
    roleArchetypes: roleArchetypes.slice(0, 4),
    levelProgression,
    roleArchetypeEvidence: levelData?.roleArchetypeEvidence || {},
    levelEvidence: levelData?.levelEvidence || {},
    evidenceByCompetency: levelData?.evidenceByCompetency || {},
    recommendations: Array.isArray(recommendations) ? recommendations : [],
  };
};

interface AssessmentProps {
  initialSection?: string;
}

function Assessment({ initialSection = "overview" }: AssessmentProps) {
  const { user } = useAuth();
  const {
    levelData,
    isLoading,
    error,
    recalculate,
    isRecalculating,
    isBackgroundAnalyzing,
    backgroundError,
    activeProfileId,
  } = usePMLevel();
  const profileKey = `${user?.id ?? "anon"}::${activeProfileId ?? "default"}`;
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialSection);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [levelEvidenceModalOpen, setLevelEvidenceModalOpen] = useState(false);
  const [roleEvidenceModalOpen, setRoleEvidenceModalOpen] = useState(false);
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastAnalyzedAt = levelData?.lastAnalyzedAt;
  const lastAnalyzedRelative = lastAnalyzedAt ? formatDistanceToNow(new Date(lastAnalyzedAt), { addSuffix: true }) : null;
  const lastAnalyzedExact = lastAnalyzedAt ? format(new Date(lastAnalyzedAt), "PPpp") : null;
  const shouldShowStreaming = isAnalyzing || isRecalculating || isBackgroundAnalyzing;
  const isInitialAnalysisStreaming = !assessmentData && shouldShowStreaming;

  // Streaming PM Levels job (polling)
  const {
    state: pmJob,
    createJob: createPMJob,
    isStreaming: isPMStreaming,
    error: pmJobError,
  } = usePMLevelsJobStream({ pollIntervalMs: 2000, timeout: 300000 });

  const handlePMLevelsRecalcStreaming = async () => {
    try {
      if (!activeProfileId) {
        await recalculate();
        return;
      }
      await createPMJob("pmLevels" as any, { profileId: activeProfileId } as any);
      // When streaming completes, refresh query
      const timer = window.setInterval(() => {
        if (pmJob?.status === "complete") {
          window.clearInterval(timer);
          // Use existing hook path to refresh UI state
          recalculate();
        }
      }, 1000);
    } catch (e) {
      console.error("[Assessment] PM Levels streaming recalc failed", e);
      await recalculate();
    }
  };

  const analysisSteps = useMemo<StreamingStepState[]>(() => {
    const competencyCount = Object.keys(levelData?.evidenceByCompetency ?? {}).length;
    const currentLevelLabel =
      levelData?.levelEvidence?.currentLevel || levelData?.displayLevel || assessmentData?.currentLevel || "Product Manager";

    const fetchStatus: StreamingStepState["status"] =
      error ? "error" : shouldShowStreaming ? "running" : levelData ? "success" : "pending";

    const steps: StreamingStepState[] = [
      {
        id: "fetch-level",
        label: "Fetch PM level",
        status: fetchStatus,
        detail: error
          ? error instanceof Error
            ? error.message
            : String(error)
          : levelData
          ? `Current level: ${currentLevelLabel}`
          : "Retrieving latest assessment data",
      },
      {
        id: "aggregate-evidence",
        label: "Aggregate evidence",
        status: levelData ? "success" : fetchStatus === "running" ? "pending" : "pending",
        detail: levelData ? `${competencyCount} competency areas evaluated` : "Waiting for assessment results",
      },
      {
        id: "prepare-insights",
        label: "Prepare insights",
        status: levelData ? "success" : fetchStatus === "running" ? "pending" : "pending",
        detail: levelData ? "Insights ready to review" : "Preparing personalized recommendations",
      },
    ];

    if (isBackgroundAnalyzing && levelData) {
      steps[0] = {
        ...steps[0],
        status: "running",
        detail: "Refreshing analysis with latest profile updates",
      };
    }

    return steps;
  }, [assessmentData?.currentLevel, error, isBackgroundAnalyzing, levelData, shouldShowStreaming]);

  const analysisStatus: StreamingLifecycleStatus = error ? "error" : shouldShowStreaming ? "streaming" : "complete";

  const analysisEvents = useMemo<StreamingTimelineEvent[]>(() => {
    if (backgroundError) {
      return [
        {
          id: "analysis-error",
          message: backgroundError,
          tone: "error",
          timestamp: Date.now(),
        },
      ];
    }

    if (isBackgroundAnalyzing) {
      return [
        {
          id: "analysis-background",
          message: "Background analysis in progress",
          tone: "info",
          timestamp: Date.now(),
        },
      ];
    }

    return [];
  }, [backgroundError, isBackgroundAnalyzing]);

  useEffect(() => {
    if (levelData) {
      const transformedData = transformLevelData(levelData);
      setAssessmentData(transformedData);
    } else if (!isLoading) {
      setAssessmentData(null);
    }
  }, [levelData, isLoading]);

  useEffect(() => {
    if (!levelData?.lastAnalyzedAt || typeof window === "undefined") {
      return;
    }

    const snapshotKey = `${SNAPSHOT_STORAGE_PREFIX}:${profileKey}`;
    let previousSnapshot: LevelSnapshot | null = null;

    try {
      const storedValue = window.localStorage.getItem(snapshotKey);
      if (storedValue) {
        previousSnapshot = JSON.parse(storedValue) as LevelSnapshot;
      }
    } catch (storageError) {
      console.warn("[Assessment] Unable to read stored PM level snapshot:", storageError);
    }

    if (!previousSnapshot) {
      try {
        window.localStorage.setItem(snapshotKey, JSON.stringify(buildSnapshot(levelData)));
      } catch (persistError) {
        console.warn("[Assessment] Unable to persist PM level snapshot:", persistError);
      }
      setChangeSummary(null);
      setIsSummaryDismissed(false);
      return;
    }

    if (previousSnapshot.lastAnalyzedAt === levelData.lastAnalyzedAt) {
      return;
    }

    const summary = buildChangeSummary(previousSnapshot, levelData);
    setChangeSummary(summary);
    setIsSummaryDismissed(false);

    try {
      window.localStorage.setItem(snapshotKey, JSON.stringify(buildSnapshot(levelData)));
    } catch (persistError) {
      console.warn("[Assessment] Unable to persist PM level snapshot:", persistError);
    }
  }, [levelData, profileKey]);

  useEffect(() => {
    const section = searchParams.get("section") || initialSection;
    setActiveTab(section);

    if (section?.startsWith("specialization-")) {
      const scrollToSpecializations = () => {
        const element = document.getElementById("role-specializations");
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: "smooth" });
          return true;
        }
        return false;
      };

      if (!scrollToSpecializations()) {
        setTimeout(() => {
          scrollToSpecializations();
        }, 300);
      }
    }

    // Handle competency query param to auto-open evidence modal
    const competencyParam = searchParams.get("competency");
    if (competencyParam && assessmentData?.competencies && !evidenceModalOpen) {
      const competencyMap: Record<string, string> = {
        'execution': 'Product Execution',
        'customer_insight': 'Customer Insight',
        'strategy': 'Product Strategy',
        'influence': 'Influencing People'
      };
      
      const competencyName = competencyMap[competencyParam];
      const competency = assessmentData.competencies.find((c: any) => c.domain === competencyName);
      
      if (competency) {
        setTimeout(() => {
          handleShowEvidence(competency);
        }, 100);
      }
    }
  }, [searchParams, initialSection, assessmentData, evidenceModalOpen]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "overview") {
      params.set("section", activeTab);
      navigate(`?${params.toString()}`, { replace: true });
    } else {
      navigate("", { replace: true });
    }
  }, [activeTab, navigate]);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    recalculate();
  };

  useEffect(() => {
    if (!isRecalculating && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [isRecalculating, isAnalyzing]);

  const handleShowEvidence = (competency: any) => {
    setSelectedCompetency(competency.domain);

    const dimensionMap: Record<string, string> = {
      "Product Execution": "execution",
      "Customer Insight": "customer_insight",
      "Product Strategy": "strategy",
      "Influencing People": "influence",
    };

    const dimensionKey = dimensionMap[competency.domain];
    const realEvidence = dimensionKey && assessmentData?.evidenceByCompetency?.[dimensionKey];

    setSelectedEvidence({
      evidence: realEvidence?.evidence || competency.evidenceStories || [],
      matchedTags: realEvidence?.matchedTags || competency.tags || [],
      overallConfidence:
        realEvidence?.overallConfidence ||
        (competency.level === "Advanced" ? "high" : competency.level === "Proficient" ? "medium" : "low"),
      competencyScore: competency.rawScore,
      currentLevel: assessmentData?.currentLevel,
    });
    setEvidenceModalOpen(true);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <div className="p-6 border rounded-lg bg-destructive/5 border-destructive/30">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-6 h-6 text-destructive mt-0.5" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium text-destructive">Error Loading Assessment</h3>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p>We encountered an issue while loading your PM level assessment:</p>
                    <div className="mt-2 p-3 bg-background rounded-md border border-border">
                      <code className="text-sm break-all">
                        {error instanceof Error ? error.message : String(error)}
                      </code>
                    </div>
                    <p className="mt-3">
                      This might be due to a temporary issue. Please try again or contact support if the problem persists.
                    </p>
                  </div>
                  <div className="mt-4 space-x-3">
                    <Button variant="default" onClick={() => window.location.reload()}>
                      <RotateCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="secondary" onClick={handlePMLevelsRecalcStreaming} disabled={isRecalculating || isPMStreaming}>
                      {isRecalculating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Recalculating...
                        </>
                      ) : (
                        <>
                          <RotateCw className="w-4 h-4 mr-2" />
                          Recalculate PM Level
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isInitialAnalysisStreaming) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <StreamingProgress steps={analysisSteps} status={analysisStatus} events={analysisEvents} showTimeline />
            <p className="mt-4 text-sm text-muted-foreground">
              We're evaluating your experience to refresh the assessment. Add more approved stories or update your work history
              to improve accuracy.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!assessmentData && isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
            <LoadingState isLoading loadingText="Loading PM level assessment..." />
          </div>
        </main>
      </div>
    );
  }

  if (!assessmentData) {
    const isSpecializationSection =
      initialSection?.startsWith("specialization-") || searchParams.get("section")?.startsWith("specialization-");

    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
              <div className="p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight mb-2">PM Level Assessment</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
                  {isSpecializationSection
                    ? "Run an analysis to see your specialization matches. Add work history and stories to get detailed insights."
                    : "Get a detailed analysis of your product management level based on your experience, skills, and achievements. Understand your strengths and areas for growth with personalized recommendations."}
                </p>

                {backgroundError ? (
                  <div className="max-w-2xl mx-auto mb-8">
                    <div className="p-6 border border-destructive/40 bg-destructive/10 rounded-lg text-left">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                        <div>
                          <h3 className="text-lg font-semibold text-destructive mb-1">We couldn't finish the analysis</h3>
                          <p className="text-sm text-muted-foreground">{backgroundError}</p>
                          <div className="flex flex-wrap gap-3 mt-4">
                            <Button onClick={handleRunAnalysis} disabled={isAnalyzing || isRecalculating}>
                              {(isAnalyzing || isRecalculating) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  <RotateCw className="w-4 h-4 mr-2" />
                                  Try Again
                                </>
                              )}
                            </Button>
                            <Button variant="ghost" onClick={() => setActiveTab("how-it-works")}>
                              Learn More
                            </Button>
                            <Button variant="ghost" onClick={() => navigate("/work-history")}>
                              Update Work History
                            </Button>
                            <Button variant="ghost" onClick={() => navigate("/stories")}>
                              Add Stories
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/30 border rounded-lg p-6 mb-8 text-left max-w-2xl mx-auto">
                      <h3 className="font-medium mb-3 flex items-center">
                        <Info className="w-4 h-4 mr-2 text-amber-500" />
                        How it works
                      </h3>
                      <ul className="space-y-3 text-sm text-muted-foreground">
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>We'll analyze your work history, achievements, and skills</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Compare against industry benchmarks for different PM levels</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Provide personalized recommendations for growth</span>
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                      <Button onClick={handleRunAnalysis} disabled={isAnalyzing || isRecalculating} size="lg" className="px-8 py-6 text-base">
                        {(isAnalyzing || isRecalculating) ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing Your Profile...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-5 h-5 mr-2" />
                            Run PM Level Analysis
                          </>
                        )}
                      </Button>

                      <Button variant="secondary" size="lg" className="px-8 py-6 text-base" onClick={() => setActiveTab("how-it-works")}>
                        <Info className="w-5 h-5 mr-2" />
                        Learn More
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                      This may take a few minutes. You'll receive a notification when it's ready.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const {
    currentLevel,
    confidence,
    nextLevel,
    levelDescription,
    inferenceSource,
    competencies,
    roleArchetypes,
    levelProgression,
    roleArchetypeEvidence,
    levelEvidence,
    evidenceByCompetency,
    recommendations,
  } = assessmentData;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">PM Level Assessment</h1>
              <p className="text-muted-foreground">{inferenceSource}</p>
            </div>
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
              {lastAnalyzedRelative && (
                <Badge variant="outline" className="flex items-center gap-1" title={lastAnalyzedExact ?? undefined}>
                  <Clock className="h-3 w-3" />
                  {`Last analyzed ${lastAnalyzedRelative}`}
                </Badge>
              )}
            </div>
          </div>

          {(shouldShowStreaming || analysisEvents.length > 0) && (
            <Card>
              <CardContent className="p-4">
                <StreamingProgress
                  steps={analysisSteps}
                  status={analysisStatus}
                  events={analysisEvents}
                  showTimeline={analysisEvents.length > 0}
                />
              </CardContent>
            </Card>
          )}

          {changeSummary && !isSummaryDismissed && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-semibold">{changeSummary.headline}</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc pl-5">
                      {changeSummary.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsSummaryDismissed(true)} className="self-start md:self-start">
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">You are a {currentLevel}</h2>
                {(() => {
                  const confidencePercentage =
                    levelEvidence?.levelingFramework?.confidencePercentage !== undefined
                      ? levelEvidence.levelingFramework.confidencePercentage
                      : textConfidenceToPercentage(confidence as "high" | "medium" | "low");

                  return (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-sm text-muted-foreground">{inferenceSource}</p>
                      <Badge className={getConfidenceBadgeColor(confidencePercentage)}>
                        {confidencePercentage}% confidence
                      </Badge>
                    </div>
                  );
                })()}

                <div className="pt-2">
                  <Button size="lg" onClick={() => setLevelEvidenceModalOpen(true)} className="px-6">
                    View Evidence for Overall Level
                    <TrendingUp className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">PM Career Ladder</h3>
              <CareerLadder
                currentLevelCode={levelData?.inferredLevel || "L4"}
                currentLevelDisplay={currentLevel}
                onViewEvidence={() => setLevelEvidenceModalOpen(true)}
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Current Level</h4>
                  <div className="mt-2 text-lg font-semibold">{currentLevel}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-muted-foreground">Target Next Level</h4>
                  <div className="mt-2 text-lg font-semibold">{nextLevel}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Core Competencies
              </CardTitle>
              <CardDescription>Your strengths and areas for growth across key PM domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {competencies.map((competency: any) => (
                  <CompetencyCard
                    key={competency.domain}
                    domain={competency.domain}
                    level={competency.level}
                    score={competency.score}
                    description={competency.description}
                    onViewEvidence={() => handleShowEvidence(competency)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card id="role-specializations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Specializations
              </CardTitle>
              <CardDescription>How your profile matches PM specializations</CardDescription>
            </CardHeader>
            <CardContent>
              {roleArchetypes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {roleArchetypes.map((archetype: any) => {
                    const evidence =
                      roleArchetypeEvidence[archetype.typeKey] || roleArchetypeEvidence[archetype.type];
                    const hasEvidence = evidence && evidence.matchScore > 0;

                    return (
                      <SpecializationCard
                        key={archetype.type}
                        type={archetype.type}
                        match={archetype.match}
                        description={archetype.description || archetype.typicalProfile || ""}
                        tags={evidence?.tagAnalysis?.slice(0, 5).map((t: any) => t.tag) || []}
                        experienceLevel={archetype.experienceLevel}
                        onViewEvidence={() => {
                          if (hasEvidence) {
                            setSelectedRole(archetype.typeKey || archetype.type);
                            setRoleEvidenceModalOpen(true);
                          } else {
                            const sectionMap: Record<string, string> = {
                              growth: "specialization-growth",
                              platform: "specialization-platform",
                              ai_ml: "specialization-ai_ml",
                              founding: "specialization-founding",
                            };
                            const section = sectionMap[archetype.typeKey] || "overview";
                            setActiveTab(section);
                            navigate(`/assessment?section=${section}`);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No specializations detected: add stories to see new matches</p>
                </div>
              )}
            </CardContent>
          </Card>

          {recommendations && recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Growth Recommendations
                </CardTitle>
                <CardDescription>Actionable insights to help you advance your PM career</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(() => {
                    const narrataTypes = ["quantify-metrics", "add-story"];
                    const sortedRecommendations = [...recommendations].sort((a, b) => {
                      const aIsNarrata = narrataTypes.includes(a.type);
                      const bIsNarrata = narrataTypes.includes(b.type);

                      if (aIsNarrata && !bIsNarrata) return -1;
                      if (!aIsNarrata && bIsNarrata) return 1;

                      const priorityOrder = { high: 0, medium: 1, low: 2 } as const;
                      return priorityOrder[a.priority] - priorityOrder[b.priority];
                    });

                    return sortedRecommendations.map((rec: any, index: number) => (
                      <Card key={rec.id || index}>
                        <CardContent className="p-4">
                          <h4 className="font-medium mb-2">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground">{rec.description}</p>
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <EvidenceModal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        evidence={selectedEvidence?.evidence || []}
        matchedTags={selectedEvidence?.matchedTags || []}
        overallConfidence={selectedEvidence?.overallConfidence || "medium"}
        competency={selectedCompetency || ""}
        competencyScore={selectedEvidence?.competencyScore}
        currentLevel={selectedEvidence?.currentLevel || currentLevel}
      />

      <LevelEvidenceModal
        isOpen={levelEvidenceModalOpen}
        onClose={() => setLevelEvidenceModalOpen(false)}
        evidence={{
          currentLevel: levelEvidence?.currentLevel || currentLevel || "Product Manager",
          nextLevel: levelEvidence?.nextLevel || nextLevel || "Staff/Principal Product Manager",
          confidence: confidence || "medium",
          resumeEvidence: levelEvidence?.resumeEvidence || {
            roleTitles: [],
            duration: "N/A",
            companyScale: [],
          },
          storyEvidence: levelEvidence?.storyEvidence || {
            totalStories: 0,
            relevantStories: 0,
            tagDensity: [],
          },
          levelingFramework: levelEvidence?.levelingFramework || {
            framework: "N/A",
            criteria: [],
            match: "N/A",
          },
          gaps: levelEvidence?.gaps || [],
          outcomeMetrics: levelEvidence?.outcomeMetrics || {
            roleLevel: [],
            storyLevel: [],
            analysis: {
              totalMetrics: 0,
              impactLevel: "feature",
              keyAchievements: [],
            },
          },
        }}
      />

      <RoleEvidenceModal
        isOpen={roleEvidenceModalOpen}
        onClose={() => setRoleEvidenceModalOpen(false)}
        evidence={roleArchetypeEvidence[selectedRole || ""] || {
          roleType: selectedRole || "Unknown",
          matchScore: 0,
          description: "",
          industryPatterns: [],
          problemComplexity: { level: "N/A", examples: [], evidence: [] },
          workHistory: [],
          tagAnalysis: [],
          gaps: [],
          outcomeMetrics: {
            roleLevel: [],
            storyLevel: [],
            analysis: { totalMetrics: 0, impactLevel: "feature", keyAchievements: [] },
          },
        }}
      />
    </div>
  );
}

export default Assessment;
