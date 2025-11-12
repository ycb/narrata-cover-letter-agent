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
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceBadgeColor, textConfidenceToPercentage } from "@/utils/confidenceBadge";
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
  }, [searchParams, initialSection, assessmentData]);

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
                    <Button variant="secondary" onClick={() => recalculate()} disabled={isRecalculating}>
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
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb, 
  BarChart3,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit,
  Info,
  FileText,
  Link,
<<<<<<< HEAD
  RotateCw,
  Clock
=======
  RotateCw
>>>>>>> origin/main
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";
import { SpecializationCard } from "@/components/assessment/SpecializationCard";
import { CompetencyCard } from "@/components/assessment/CompetencyCard";
<<<<<<< HEAD
import { CareerLadder } from "@/components/assessment/CareerLadder";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePMLevel } from "@/hooks/usePMLevel";
import { Loader2 } from "lucide-react";
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceProgressColor, getConfidenceBadgeColor, textConfidenceToPercentage } from "@/utils/confidenceBadge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format } from "date-fns";
import type { PMLevelInference, RoleType } from "@/types/content";
import { StreamingProgress } from "@/components/shared/StreamingProgress";
import type { StreamingStepState, StreamingTimelineEvent, StreamingLifecycleStatus } from "@/hooks/useStreamingProgress";
import { LoadingState } from "@/components/shared/LoadingState";
=======
import { usePrototype } from "@/contexts/PrototypeContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePMLevel } from "@/hooks/usePMLevel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
>>>>>>> origin/main

// Helper function to map PM level code to display text
const getLevelDisplay = (levelCode: string): string => {
  const levelMap: Record<string, string> = {
<<<<<<< HEAD
    'l3': 'Associate Product Manager',
    'l4': 'Product Manager',
    'l5': 'Senior Product Manager',
    'l6': 'Staff/Principal Product Manager',
    'm1': 'Group Product Manager',
    'm2': 'Director of Product',
=======
    'l3': 'Product Manager',
    'l4': 'Senior PM',
    'l5': 'Staff PM',
    'l6': 'Principal PM',
    'm1': 'Group PM',
    'm2': 'Director of PM',
>>>>>>> origin/main
  };
  return levelMap[levelCode.toLowerCase()] || levelCode;
};

// Helper function to map confidence score to text
const getConfidenceText = (score: number): string => {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
};

<<<<<<< HEAD
// Helper function to map percentage score to level text
const getCompetencyLevel = (percentage: number): string => {
  if (percentage >= 90) return 'Advanced';
  if (percentage >= 70) return 'Proficient';
  if (percentage >= 50) return 'Needs Work';
=======
// Helper function to map score to level text
const getCompetencyLevel = (score: number): string => {
  if (score >= 2.5) return 'Strong';
  if (score >= 1.5) return 'Solid';
  if (score >= 0.5) return 'Emerging';
>>>>>>> origin/main
  return 'Developing';
};

// Helper function to map score to percentage (0-100)
<<<<<<< HEAD
// NOTE: For evidence-based confidence, use calculateEvidenceBasedConfidence instead
=======
>>>>>>> origin/main
const scoreToPercentage = (score: number, max: number = 3): number => {
  return Math.round((score / max) * 100);
};

<<<<<<< HEAD
// Helper to format role type key to display name
function formatRoleTypeName(key: string): string {
  const nameMap: Record<string, string> = {
    'growth': 'Growth PM',
    'platform': 'Platform PM',
    'ai_ml': 'AI/ML PM',
    'founding': 'Founding PM',
    'technical': 'Technical PM',
    'general': 'General PM'
  };
  return nameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
}

const SNAPSHOT_STORAGE_PREFIX = 'pm-level-snapshot';

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
    const direction = currentConfidence > previousConfidence ? 'increased' : 'decreased';
    items.push(`Confidence ${direction} from ${previousConfidence}% to ${currentConfidence}%.`);
  }

  const previousRoles = previous.roleType || [];
  const currentRoles = Array.isArray(current.roleType) ? current.roleType : [];
  const addedRoles = currentRoles.filter((role) => !previousRoles.includes(role));
  const removedRoles = previousRoles.filter((role) => !currentRoles.includes(role));

  if (addedRoles.length > 0) {
    items.push(`New specialization matches: ${addedRoles.map(formatRoleTypeName).join(', ')}.`);
  }

  if (removedRoles.length > 0) {
    items.push(`No longer detecting: ${removedRoles.map(formatRoleTypeName).join(', ')}.`);
  }

  if (current.deltaSummary && current.deltaSummary.trim().length > 0) {
    items.push(current.deltaSummary.trim());
  }

  if (items.length === 0) {
    items.push('Analysis refreshed. No major changes detected.');
  }

  const uniqueItems = Array.from(new Set(items));

  const headline =
    previous.displayLevel !== current.displayLevel
      ? 'Your PM level changed'
      : uniqueItems.length > 1
        ? 'Updates to your PM assessment'
        : 'PM assessment refreshed';

  return {
    analyzedAt: current.lastAnalyzedAt ?? new Date().toISOString(),
    headline,
    items: uniqueItems,
  };
};

=======
>>>>>>> origin/main
// Transform PMLevelInference to the expected format
const transformLevelData = (levelData: any) => {
  if (!levelData) return null;

  const { 
    competencyScores = { 
      execution: 0, 
      customer_insight: 0, 
      strategy: 0, 
      influence: 0 
    }, 
    recommendations = [], 
    displayLevel = 'PM', 
    confidence = 0.5,
    signals = {},
<<<<<<< HEAD
    roleType = [],
    evidenceByCompetency = {},
    roleArchetypeEvidence = {}
  } = levelData;
  
  // Map competency domain to dimension key
  const dimensionMap: Record<string, string> = {
    'Product Execution': 'execution',
    'Customer Insight': 'customer_insight',
    'Product Strategy': 'strategy',
    'Influencing People': 'influence'
  };

  // Helper to get evidence-based confidence for a competency
  const getEvidenceBasedScore = (domain: string, rawScore: number): number => {
    const dimensionKey = dimensionMap[domain];
    const evidence = evidenceByCompetency?.[dimensionKey];
    
    if (evidence) {
      return calculateEvidenceBasedConfidence({
        competencyScore: rawScore,
        evidence: evidence.evidence || [],
        matchedTags: evidence.matchedTags || [],
        overallConfidence: evidence.overallConfidence
      });
    }
    
    // Fallback to simple percentage if no evidence available
    return scoreToPercentage(rawScore);
  };
  
=======
    roleType = []
  } = levelData;
  
>>>>>>> origin/main
  // Map competency scores to the expected format
  const competencies = [
    {
      domain: "Product Execution",
<<<<<<< HEAD
      score: getEvidenceBasedScore("Product Execution", competencyScores.execution || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Execution", competencyScores.execution || 0)),
      rawScore: competencyScores.execution || 0, // 0-3 scale for percentage calculation
=======
      level: getCompetencyLevel(competencyScores.execution || 0),
      score: scoreToPercentage(competencyScores.execution || 0),
>>>>>>> origin/main
      evidence: signals?.execution_evidence || "Based on your work history and achievements",
      tags: ["Execution", "Delivery", "Technical"],
      description: "Measures your ability to deliver products effectively",
      evidenceStories: signals?.execution_stories || []
    },
    {
      domain: "Customer Insight",
<<<<<<< HEAD
      score: getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0)),
      rawScore: competencyScores.customer_insight || 0,
=======
      level: getCompetencyLevel(competencyScores.customer_insight || 0),
      score: scoreToPercentage(competencyScores.customer_insight || 0),
>>>>>>> origin/main
      evidence: signals?.customer_evidence || "Based on your user research and customer focus",
      tags: ["Research", "User Experience", "Customer"],
      description: "Assesses your understanding of user needs",
      evidenceStories: signals?.customer_stories || []
    },
    {
      domain: "Product Strategy",
<<<<<<< HEAD
      score: getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0)),
      rawScore: competencyScores.strategy || 0,
=======
      level: getCompetencyLevel(competencyScores.strategy || 0),
      score: scoreToPercentage(competencyScores.strategy || 0),
>>>>>>> origin/main
      evidence: signals?.strategy_evidence || "Based on your strategic initiatives",
      tags: ["Strategy", "Vision", "Roadmap"],
      description: "Evaluates your strategic thinking and planning",
      evidenceStories: signals?.strategy_stories || []
    },
    {
      domain: "Influencing People",
<<<<<<< HEAD
      score: getEvidenceBasedScore("Influencing People", competencyScores.influence || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Influencing People", competencyScores.influence || 0)),
      rawScore: competencyScores.influence || 0,
=======
      level: getCompetencyLevel(competencyScores.influence || 0),
      score: scoreToPercentage(competencyScores.influence || 0),
>>>>>>> origin/main
      evidence: signals?.influence_evidence || "Based on your leadership examples",
      tags: ["Leadership", "Collaboration", "Stakeholder"],
      description: "Measures your ability to lead and influence",
      evidenceStories: signals?.influence_stories || []
    }
  ];

<<<<<<< HEAD
  // Map role archetypes from roleType - filter out 'general' and 'technical'
  // Only show the 4 main specializations: growth, platform, ai_ml, founding
  const validSpecializations = ['growth', 'platform', 'ai_ml', 'founding'];
  
  const roleArchetypes = Array.isArray(roleType) && roleType.length > 0 
    ? roleType
        .filter((roleTypeKey: string) => validSpecializations.includes(roleTypeKey))
        .map((roleTypeKey: string) => {
          // Get evidence for this role type
          const evidence = roleArchetypeEvidence[roleTypeKey];
          const formattedName = formatRoleTypeName(roleTypeKey);
          
          return {
            type: formattedName,
            typeKey: roleTypeKey, // Store original key for evidence lookup
            match: evidence?.matchScore || 80, // Use evidence match score if available
            description: evidence?.description || `${formattedName} product management focus`,
            evidence: `Based on your ${roleTypeKey.toLowerCase()} experience`,
            typicalProfile: evidence?.description || `Experience with ${roleTypeKey.toLowerCase()} products and initiatives`
          };
        })
    : [];
=======
  // Map role archetypes from roleType or use defaults
  const roleArchetypes = Array.isArray(roleType) && roleType.length > 0 
    ? roleType.map((role: string) => ({
        type: role,
        match: 80, // Default match percentage
        description: `${role} product management focus`,
        evidence: `Based on your ${role.toLowerCase()} experience`,
        typicalProfile: `Experience with ${role.toLowerCase()} products and initiatives`
      }))
    : [
        {
          type: "General PM",
          match: 100,
          description: "Versatile product management skills",
          evidence: "Based on your diverse experience",
          typicalProfile: "Experience across multiple product areas and business functions"
        }
      ];
>>>>>>> origin/main

  // Level progression based on displayLevel
  const levelProgression = [
    { 
      level: "Associate PM", 
      description: "0-2 years, feature delivery",
      current: displayLevel?.toLowerCase().includes('associate') || displayLevel === 'L3'
    },
    { 
      level: "Product Manager", 
      description: "2-4 years, product ownership",
      current: displayLevel?.toLowerCase().includes('product manager') || displayLevel === 'L4'
    },
    { 
      level: "Senior PM", 
      description: "4-7 years, strategic execution", 
      current: displayLevel?.toLowerCase().includes('senior') || displayLevel === 'L5'
    },
    { 
      level: "Staff/Principal PM", 
      description: "7-10 years, product strategy", 
      current: displayLevel?.toLowerCase().includes('staff') || 
               displayLevel?.toLowerCase().includes('principal') || 
               displayLevel === 'L6'
    },
    { 
      level: "Director+", 
      description: "10+ years, organizational leadership", 
      current: displayLevel?.toLowerCase().includes('director') || 
               displayLevel?.toLowerCase().includes('vp') ||
               displayLevel?.toLowerCase().includes('head of') ||
               ['M1', 'M2'].includes(displayLevel)
    }
  ];

<<<<<<< HEAD
  // Find current level for next level calculation (fallback only)
  const currentLevelIndex = levelProgression.findIndex(l => l.current);
  const fallbackNextLevel = currentLevelIndex < levelProgression.length - 1 
    ? levelProgression[currentLevelIndex + 1]?.level 
    : levelProgression[levelProgression.length - 1]?.level;

  // Use nextLevel from levelEvidence if available (correctly formatted), otherwise use fallback
  const nextLevel = levelData?.levelEvidence?.nextLevel || fallbackNextLevel || 'Staff/Principal Product Manager';

  return {
    currentLevel: levelData?.levelEvidence?.currentLevel || displayLevel || 'Product Manager',
    confidence: getConfidenceText(confidence),
    nextLevel: nextLevel,
=======
  // Find current level for next level calculation
  const currentLevelIndex = levelProgression.findIndex(l => l.current);
  const nextLevel = currentLevelIndex < levelProgression.length - 1 
    ? levelProgression[currentLevelIndex + 1]?.level 
    : levelProgression[levelProgression.length - 1]?.level;

  return {
    currentLevel: displayLevel || 'PM',
    confidence: getConfidenceText(confidence),
    nextLevel: nextLevel || 'Senior PM',
>>>>>>> origin/main
    levelDescription: levelData?.levelDescription || `Product manager with a focus on ${roleType?.[0] || 'general product management'}`,
    inferenceSource: levelData?.inferenceSource || "Based on your profile and work history",
    competencies,
    roleArchetypes: roleArchetypes.slice(0, 4), // Max 4 role archetypes
    levelProgression,
    roleArchetypeEvidence: levelData?.roleArchetypeEvidence || {},
    levelEvidence: levelData?.levelEvidence || {},
<<<<<<< HEAD
    evidenceByCompetency: levelData?.evidenceByCompetency || {},
=======
>>>>>>> origin/main
    recommendations: Array.isArray(recommendations) ? recommendations : []
  };
};

interface AssessmentProps {
  initialSection?: string;
}

function Assessment({ initialSection = 'overview' }: AssessmentProps) {
<<<<<<< HEAD
  const { user } = useAuth();
  const {
    levelData,
    isLoading,
    error,
    recalculate,
    isRecalculating,
    isBackgroundAnalyzing,
    backgroundError,
    activeProfileId
  } = usePMLevel();
  const profileKey = `${user?.id ?? 'anon'}::${activeProfileId ?? 'default'}`;
=======
  const { levelData, isLoading, error, recalculate, isRecalculating } = usePMLevel();
>>>>>>> origin/main
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialSection);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
<<<<<<< HEAD
=======
  const [showLeadershipTrack, setShowLeadershipTrack] = useState(false);
>>>>>>> origin/main
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [levelEvidenceModalOpen, setLevelEvidenceModalOpen] = useState(false);
  const [roleEvidenceModalOpen, setRoleEvidenceModalOpen] = useState(false);
<<<<<<< HEAD
  const [changeSummary, setChangeSummary] = useState<ChangeSummary | null>(null);
  const [isSummaryDismissed, setIsSummaryDismissed] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastAnalyzedAt = levelData?.lastAnalyzedAt;
  const lastAnalyzedRelative = lastAnalyzedAt
    ? formatDistanceToNow(new Date(lastAnalyzedAt), { addSuffix: true })
    : null;
  const lastAnalyzedExact = lastAnalyzedAt ? format(new Date(lastAnalyzedAt), 'PPpp') : null;
  const shouldShowStreaming = isAnalyzing || isRecalculating || isBackgroundAnalyzing;
  const isInitialAnalysisStreaming = !assessmentData && shouldShowStreaming;

  const analysisSteps = useMemo<StreamingStepState[]>(() => {
    const competencyCount = Object.keys(levelData?.evidenceByCompetency ?? {}).length;
    const currentLevelLabel =
      levelData?.levelEvidence?.currentLevel ||
      levelData?.displayLevel ||
      assessmentData?.currentLevel ||
      "Product Manager";

    const fetchStatus: StreamingStepState["status"] = error
      ? "error"
      : shouldShowStreaming
        ? "running"
        : levelData
          ? "success"
          : "pending";

    const steps: StreamingStepState[] = [
      {
        id: "fetch-level",
        label: "Fetch PM level",
        status: fetchStatus,
        detail: error
          ? (error instanceof Error ? error.message : String(error))
          : levelData
            ? `Current level: ${currentLevelLabel}`
            : "Retrieving latest assessment data"
      },
      {
        id: "aggregate-evidence",
        label: "Aggregate evidence",
        status: levelData ? "success" : fetchStatus === "running" ? "pending" : "pending",
        detail: levelData
          ? `${competencyCount} competency areas evaluated`
          : "Waiting for assessment results"
      },
      {
        id: "prepare-insights",
        label: "Prepare insights",
        status: levelData ? "success" : fetchStatus === "running" ? "pending" : "pending",
        detail: levelData ? "Insights ready to review" : "Preparing personalized recommendations"
      }
    ];

    if (isBackgroundAnalyzing && levelData) {
      steps[0] = {
        ...steps[0],
        status: "running",
        detail: "Refreshing analysis with latest profile updates"
      };
    }

    return steps;
  }, [assessmentData?.currentLevel, error, isBackgroundAnalyzing, levelData, shouldShowStreaming]);

  const analysisStatus: StreamingLifecycleStatus = error
    ? "error"
    : shouldShowStreaming
      ? "streaming"
      : "complete";

  const analysisEvents = useMemo<StreamingTimelineEvent[]>(() => {
    if (backgroundError) {
      return [
        {
          id: "analysis-error",
          message: backgroundError,
          tone: "error",
          timestamp: Date.now()
        }
      ];
    }

    if (isBackgroundAnalyzing) {
      return [
        {
          id: "analysis-background",
          message: "Background analysis in progress",
          tone: "info",
          timestamp: Date.now()
        }
      ];
    }

    return [];
  }, [backgroundError, isBackgroundAnalyzing]);

  // Transform level data when it changes
  useEffect(() => {
    if (levelData) {
      const transformedData = transformLevelData(levelData);
      setAssessmentData(transformedData);
    } else if (!isLoading) {
      // No level data available
      setAssessmentData(null);
    }
  }, [levelData, isLoading]);

  useEffect(() => {
    if (!levelData?.lastAnalyzedAt || typeof window === 'undefined') {
      return;
    }

    const snapshotKey = `${SNAPSHOT_STORAGE_PREFIX}:${profileKey}`;
    let previousSnapshot: LevelSnapshot | null = null;

    try {
      const storedValue = window.localStorage.getItem(snapshotKey);
      if (storedValue) {
        previousSnapshot = JSON.parse(storedValue) as LevelSnapshot;
      }
    } catch (error) {
      console.warn('[Assessment] Unable to read stored PM level snapshot:', error);
    }

    if (!previousSnapshot) {
      try {
        window.localStorage.setItem(snapshotKey, JSON.stringify(buildSnapshot(levelData)));
      } catch (error) {
        console.warn('[Assessment] Unable to persist PM level snapshot:', error);
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
    } catch (error) {
      console.warn('[Assessment] Unable to persist PM level snapshot:', error);
    }
  }, [levelData, profileKey]);

  // Handle initial section from URL
  useEffect(() => {
    const section = searchParams.get('section') || initialSection;
    setActiveTab(section);
    
    // If navigating to a specialization section, scroll to Role Specializations section
    if (section?.startsWith('specialization-')) {
      // Wait for component to render, then scroll
      const scrollToSpecializations = () => {
        const element = document.getElementById('role-specializations');
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
          return true;
        }
        return false;
      };
      
      // Try immediately, then retry if element not found
      if (!scrollToSpecializations()) {
        setTimeout(() => {
          scrollToSpecializations();
        }, 300);
      }
    }
  }, [searchParams, initialSection, assessmentData]);
=======
  
  const { setPrototypeState } = usePrototype();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Transform level data when it changes
  useEffect(() => {
    if (levelData) {
      console.log('Level data received:', levelData);
      const transformedData = transformLevelData(levelData);
      console.log('Transformed data:', transformedData);
      setAssessmentData(transformedData);
    } else if (!isLoading) {
      // No level data available
      console.log('No level data available');
      setAssessmentData(null);
    }
  }, [levelData, isLoading]);

  // Handle initial section from URL
  useEffect(() => {
    const section = searchParams.get('section') || initialSection;
    setActiveTab(section);
  }, [searchParams, initialSection]);
>>>>>>> origin/main

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') {
      params.set('section', activeTab);
      navigate(`?${params.toString()}`, { replace: true });
    } else {
      // Remove section param if it's the default 'overview' tab
      navigate('', { replace: true });
    }
  }, [activeTab, navigate]);

  // Handle run analysis
  const handleRunAnalysis = async () => {
<<<<<<< HEAD
      setIsAnalyzing(true);
    // Use mutation callback - toast will be shown in usePMLevel hook after completion
    recalculate();
  };
  
  // Update isAnalyzing state when recalculating completes
  useEffect(() => {
    if (!isRecalculating && isAnalyzing) {
      setIsAnalyzing(false);
    }
  }, [isRecalculating, isAnalyzing]);
=======
    try {
      setIsAnalyzing(true);
      await recalculate();
      toast.success('Analysis completed successfully');
    } catch (err) {
      console.error('Error running analysis:', err);
      toast.error('Failed to run analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
>>>>>>> origin/main

  // Handle showing evidence for a competency
  const handleShowEvidence = (competency: any) => {
    setSelectedCompetency(competency.domain);
<<<<<<< HEAD

    // Map competency domain to PMDimension key
    const dimensionMap: Record<string, string> = {
      'Product Execution': 'execution',
      'Customer Insight': 'customer_insight',
      'Product Strategy': 'strategy',
      'Influencing People': 'influence'
    };

    const dimensionKey = dimensionMap[competency.domain];
    const realEvidence = dimensionKey && evidenceByCompetency?.[dimensionKey];

    setSelectedEvidence({
      evidence: realEvidence?.evidence || competency.evidenceStories || [],
      matchedTags: realEvidence?.matchedTags || competency.tags || [],
      overallConfidence: realEvidence?.overallConfidence ||
                        (competency.level === 'Advanced' ? 'high' :
                         competency.level === 'Proficient' ? 'medium' : 'low'),
      competencyScore: competency.rawScore, // Pass raw score (0-3) for percentage calculation
      currentLevel: currentLevel // Pass current level for criteria title
    });
    setEvidenceModalOpen(true);
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-3xl mx-auto">
=======
    setSelectedEvidence(competency.evidenceStories?.[0] || null);
    setEvidenceModalOpen(true);
  };

  // Show loading state
  if (isLoading || isRecalculating) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-6 max-w-md mx-auto">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h2 className="text-2xl font-bold mb-2">Analyzing Your PM Level</h2>
          <p className="text-muted-foreground mb-6">We're evaluating your experience and skills to determine your product management level.</p>
          <div className="space-y-2 text-sm text-muted-foreground text-left">
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Reviewing your work history and achievements</span>
            </div>
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Analyzing your impact and influence</span>
            </div>
            <div className="flex items-center">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              <span>Comparing with industry benchmarks</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
>>>>>>> origin/main
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
                <p className="mt-3">This might be due to a temporary issue. Please try again or contact support if the problem persists.</p>
              </div>
              <div className="mt-4 space-x-3">
                <Button 
                  variant="default" 
                  onClick={() => window.location.reload()}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
<<<<<<< HEAD
                      variant="secondary"
=======
                  variant="outline" 
>>>>>>> origin/main
                  onClick={() => recalculate()}
                  disabled={isRecalculating}
                >
                  {isRecalculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    <>
<<<<<<< HEAD
                          <RotateCw className="w-4 h-4 mr-2" />
=======
                      <RefreshCw className="w-4 h-4 mr-2" />
>>>>>>> origin/main
                      Recalculate PM Level
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
<<<<<<< HEAD
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
            <StreamingProgress
              steps={analysisSteps}
              status={analysisStatus}
              events={analysisEvents}
              showTimeline
            />
            <p className="mt-4 text-sm text-muted-foreground">
              We're evaluating your experience to refresh the assessment. Add more approved stories or update your work history to improve accuracy.
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
=======
>>>>>>> origin/main
      </div>
    );
  }

  // Show empty state - no data available
  if (!assessmentData) {
<<<<<<< HEAD
    // Check if user is trying to view a specialization section
    const isSpecializationSection = initialSection?.startsWith('specialization-') || 
                                    searchParams.get('section')?.startsWith('specialization-');
    
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
=======
    return (
      <div className="p-6 max-w-4xl mx-auto">
>>>>>>> origin/main
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">PM Level Assessment</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
<<<<<<< HEAD
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
                          <h3 className="text-lg font-semibold text-destructive mb-1">
                            We couldn't finish the analysis
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {backgroundError}
                          </p>
                          <div className="flex flex-wrap gap-3 mt-4">
                            <Button
                              onClick={handleRunAnalysis}
                              disabled={isAnalyzing || isRecalculating}
                            >
                              {isAnalyzing || isRecalculating ? (
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
                            <Button
                              variant="ghost"
                              onClick={() => setActiveTab('how-it-works')}
                            >
                              Learn More
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
=======
              Get a detailed analysis of your product management level based on your experience, skills, and achievements.
              Understand your strengths and areas for growth with personalized recommendations.
            </p>
            
>>>>>>> origin/main
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
              <Button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || isRecalculating}
                size="lg"
                className="px-8 py-6 text-base"
              >
                {isAnalyzing || isRecalculating ? (
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
              
              <Button 
<<<<<<< HEAD
                        variant="secondary"
=======
                variant="outline" 
>>>>>>> origin/main
                size="lg"
                className="px-8 py-6 text-base"
                onClick={() => setActiveTab('how-it-works')}
              >
                <Info className="w-5 h-5 mr-2" />
                Learn More
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              This may take a few minutes. You'll receive a notification when it's ready.
            </p>
<<<<<<< HEAD
                  </>
                )}
          </div>
        </div>
          </div>
        </main>
=======
          </div>
        </div>
>>>>>>> origin/main
      </div>
    );
  }

  // Destructure data from assessmentData
  const {
    currentLevel,
    confidence,
    nextLevel,
    levelDescription,
    inferenceSource,
    competencies,
    roleArchetypes,
<<<<<<< HEAD
    roleArchetypeEvidence,
    levelEvidence,
    evidenceByCompetency,
=======
    levelProgression,
    roleArchetypeEvidence,
    levelEvidence,
>>>>>>> origin/main
    recommendations
  } = assessmentData;

  // Render the assessment UI with the dynamic data
  return (
<<<<<<< HEAD
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
=======
>>>>>>> origin/main
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PM Level Assessment</h1>
<<<<<<< HEAD
              <p className="text-muted-foreground">{inferenceSource}</p>
        </div>
            <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
              {lastAnalyzedRelative && (
                <Badge
                  variant="outline"
                  className="flex items-center gap-1"
                  title={lastAnalyzedExact ?? undefined}
                >
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
                <Button 
                    variant="ghost"
                  size="sm"
                    onClick={() => setIsSummaryDismissed(true)}
                    className="self-start md:self-start"
                >
                    Dismiss
                </Button>
              </div>
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          {/* Level Assessment Summary Card */}
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {/* Level Header Section */}
                <h2 className="text-3xl font-bold tracking-tight">
                  You are a {currentLevel}
                </h2>

                {/* Basis and Confidence on single line */}
                {(() => {
                  // Get confidence percentage from levelEvidence or convert from text
                  const confidencePercentage = levelEvidence?.levelingFramework?.confidencePercentage !== undefined
                    ? levelEvidence.levelingFramework.confidencePercentage
                    : textConfidenceToPercentage(confidence as 'high' | 'medium' | 'low');

                  return (
                    <div className="flex items-center justify-center gap-2">
                  <p className="text-sm text-muted-foreground">
                        {inferenceSource}
                      </p>
                      <Badge className={getConfidenceBadgeColor(confidencePercentage)}>
                        {confidencePercentage}% confidence
                      </Badge>
                    </div>
                  );
                })()}

                {/* Primary CTA */}
                <div className="pt-2">
                  <Button 
                    size="lg"
                    onClick={() => setLevelEvidenceModalOpen(true)}
                    className="px-6"
                  >
                    View Evidence for Overall Level
                    <TrendingUp className="w-4 h-4 ml-2" />
                  </Button>
                </div>
            </div>
            </CardContent>
          </Card>

        {/* Career Ladder Card */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-xl font-semibold mb-4">PM Career Ladder</h3>
            <CareerLadder
              currentLevelCode={levelData?.inferredLevel || 'L4'}
              currentLevelDisplay={currentLevel}
              onViewEvidence={() => setLevelEvidenceModalOpen(true)}
            />
=======
          <p className="text-muted-foreground">
            {levelDescription} • {inferenceSource}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isRecalculating}
          >
            {isAnalyzing || isRecalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Recalculating...
              </>
            ) : (
              <>
                <RotateCw className="w-4 h-4 mr-2" />
                Recalculate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Level Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Your PM Level
            </CardTitle>
            <CardDescription>
              Based on your experience, skills, and impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold">{currentLevel}</h3>
                  <p className="text-sm text-muted-foreground">
                    Confidence: <span className="capitalize">{confidence}</span>
                  </p>
                </div>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setLevelEvidenceModalOpen(true)}
                >
                  <Info className="w-4 h-4 mr-2" />
                  View Evidence
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Level Progression</span>
                  <button 
                    className="text-primary hover:underline text-sm"
                    onClick={() => setShowLeadershipTrack(!showLeadershipTrack)}
                  >
                    {showLeadershipTrack ? 'Hide' : 'Show'} Leadership Track
                  </button>
                </div>
                
                <div className="relative pt-1">
                  <div className="flex items-center justify-between">
                    {levelProgression.map((level: any, index: number) => (
                      <div 
                        key={level.level} 
                        className={`relative flex-1 ${index < levelProgression.length - 1 ? 'mr-2' : ''}`}
                      >
                        <div 
                          className={`text-xs text-center ${level.current ? 'font-bold text-primary' : 'text-muted-foreground'}`}
                        >
                          {level.level}
                        </div>
                        {level.current && (
                          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="relative h-2 mt-2 overflow-hidden bg-gray-100 rounded-full">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary rounded-full"
                      style={{
                        width: `${(levelProgression.findIndex((l: any) => l.current) + 1) / levelProgression.length * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {showLeadershipTrack && (
                <div className="p-4 mt-4 border rounded-md bg-muted/20">
                  <h4 className="mb-2 font-medium">Leadership Track</h4>
                  <p className="text-sm text-muted-foreground">
                    As you progress in your career, you'll take on more strategic responsibilities and leadership roles.
                    The next step after {currentLevel} is typically {nextLevel}.
                  </p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setLevelEvidenceModalOpen(true)}
                  >
                    <Info className="w-4 h-4 mr-2" />
                    View Leadership Track Details
                  </Button>
                </div>
              )}
            </div>
>>>>>>> origin/main
          </CardContent>
        </Card>

        {/* Competencies Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Core Competencies
            </CardTitle>
            <CardDescription>
              Your strengths and areas for growth across key PM domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {competencies.map((competency: any) => (
<<<<<<< HEAD
                <CompetencyCard
                  key={competency.domain}
                  domain={competency.domain}
                  level={competency.level}
                  score={competency.score}
                  description={competency.description}
                  onViewEvidence={() => handleShowEvidence(competency)}
                />
=======
                <div 
                  key={competency.domain}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleShowEvidence(competency)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{competency.domain}</h4>
                    <span className={`text-sm px-2 py-1 rounded-full ${
                      competency.level === 'Strong' ? 'bg-green-100 text-green-800' :
                      competency.level === 'Solid' ? 'bg-blue-100 text-blue-800' :
                      competency.level === 'Emerging' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {competency.level}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress</span>
                      <span>{competency.score}%</span>
                    </div>
                    <Progress value={competency.score} className="h-2" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {competency.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {competency.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
>>>>>>> origin/main
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Archetypes Section */}
<<<<<<< HEAD
        <Card id="role-specializations">
=======
        <Card>
>>>>>>> origin/main
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Role Specializations
            </CardTitle>
            <CardDescription>
<<<<<<< HEAD
              How your profile matches PM specializations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {roleArchetypes.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
                {roleArchetypes.map((archetype: any) => {
                  // Get evidence data using the typeKey (original roleType enum value)
                  const evidence = roleArchetypeEvidence[archetype.typeKey] || roleArchetypeEvidence[archetype.type];
                  const hasEvidence = evidence && evidence.matchScore > 0;

                  return (
                    <SpecializationCard
                  key={archetype.type}
                      type={archetype.type}
                      match={archetype.match}
                      description={archetype.description || archetype.typicalProfile || ''}
                      tags={evidence?.tagAnalysis?.slice(0, 5).map((t: any) => t.tag) || []}
                      experienceLevel={archetype.experienceLevel}
                      onViewEvidence={() => {
                        if (hasEvidence) {
                          // Store both display name and key for modal lookup
                          setSelectedRole(archetype.typeKey || archetype.type);
                    setRoleEvidenceModalOpen(true);
                        } else {
                          // Navigate to specialization section to show empty state
                          const sectionMap: Record<string, string> = {
                            growth: 'specialization-growth',
                            platform: 'specialization-platform',
                            ai_ml: 'specialization-ai_ml',
                            founding: 'specialization-founding'
                          };
                          const section = sectionMap[archetype.typeKey] || 'overview';
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
                <p className="text-muted-foreground">
                  No specializations detected: add stories to see new matches
                    </p>
                  </div>
            )}
=======
              How your profile matches different PM specializations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {roleArchetypes.map((archetype: any) => (
                <div 
                  key={archetype.type}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedRole(archetype.type);
                    setRoleEvidenceModalOpen(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{archetype.type}</h4>
                    <div className="flex items-center">
                      <span className="text-sm font-medium mr-2">{archetype.match}%</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${archetype.match}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {archetype.description}
                  </p>
                  <div className="mt-3">
                    <span className="text-xs font-medium">Typical Profile:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {archetype.typicalProfile}
                    </p>
                  </div>
                </div>
              ))}
            </div>
>>>>>>> origin/main
          </CardContent>
        </Card>

        {/* Recommendations Section */}
        {recommendations && recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Growth Recommendations
              </CardTitle>
              <CardDescription>
                Actionable insights to help you advance your PM career
              </CardDescription>
            </CardHeader>
            <CardContent>
<<<<<<< HEAD
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  // Sort recommendations: Narrata-specific types first, then general
                  const narrataTypes = ['quantify-metrics', 'add-story'];
                  const sortedRecommendations = [...recommendations].sort((a, b) => {
                    const aIsNarrata = narrataTypes.includes(a.type);
                    const bIsNarrata = narrataTypes.includes(b.type);
                    
                    // Narrata-specific items first
                    if (aIsNarrata && !bIsNarrata) return -1;
                    if (!aIsNarrata && bIsNarrata) return 1;
                    
                    // Within same category, sort by priority (high > medium > low)
                    const priorityOrder = { high: 0, medium: 1, low: 2 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                  });
                  
                  return sortedRecommendations.map((rec: any, index: number) => (
                    <Card key={rec.id || index}>
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      </CardContent>
                    </Card>
                  ));
                })()}
=======
              <div className="space-y-4">
                {recommendations.map((rec: any, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {rec.priority === 'high' ? (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                      ) : rec.priority === 'medium' ? (
                        <Info className="w-5 h-5 text-blue-500" />
                      ) : (
                        <Lightbulb className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{rec.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {rec.description}
                      </p>
                      {rec.suggestedAction && (
                        <div className="mt-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-sm"
                          >
                            {rec.suggestedAction}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
>>>>>>> origin/main
              </div>
            </CardContent>
          </Card>
        )}
      </div>
<<<<<<< HEAD
      </main>

      {/* Modals */}
      <EvidenceModal
        isOpen={evidenceModalOpen}
        onClose={() => setEvidenceModalOpen(false)}
        evidence={selectedEvidence?.evidence || []}
        matchedTags={selectedEvidence?.matchedTags || []}
        overallConfidence={selectedEvidence?.overallConfidence || 'medium'}
        competency={selectedCompetency || ''}
        competencyScore={selectedEvidence?.competencyScore}
        currentLevel={selectedEvidence?.currentLevel || currentLevel}
      />

      <LevelEvidenceModal
        isOpen={levelEvidenceModalOpen}
        onClose={() => setLevelEvidenceModalOpen(false)}
        evidence={{
          currentLevel: levelEvidence?.currentLevel || currentLevel || 'Product Manager',
          nextLevel: levelEvidence?.nextLevel || nextLevel || 'Staff/Principal Product Manager',
          confidence: confidence || 'medium',
          resumeEvidence: levelEvidence?.resumeEvidence || {
            roleTitles: [],
            duration: 'N/A',
            companyScale: []
          },
          storyEvidence: levelEvidence?.storyEvidence || {
            totalStories: 0,
            relevantStories: 0,
            tagDensity: []
          },
          levelingFramework: levelEvidence?.levelingFramework || {
            framework: 'N/A',
            criteria: [],
            match: 'N/A'
          },
          gaps: levelEvidence?.gaps || [],
          outcomeMetrics: levelEvidence?.outcomeMetrics || {
            roleLevel: [],
            storyLevel: [],
            analysis: {
              totalMetrics: 0,
              impactLevel: 'feature' as const,
              keyAchievements: []
            }
          }
        }}
      />

      <RoleEvidenceModal
        isOpen={roleEvidenceModalOpen}
        onClose={() => setRoleEvidenceModalOpen(false)}
        evidence={roleArchetypeEvidence[selectedRole || ''] || {
          roleType: selectedRole || 'Unknown',
          matchScore: 0,
          description: '',
          industryPatterns: [],
          problemComplexity: { level: 'N/A', examples: [], evidence: [] },
          workHistory: [],
          tagAnalysis: [],
          gaps: [],
          outcomeMetrics: { roleLevel: [], storyLevel: [], analysis: { totalMetrics: 0, impactLevel: 'feature', keyAchievements: [] } }
        }}
      />
=======

      {/* Modals */}
      <EvidenceModal
        open={evidenceModalOpen}
        onOpenChange={setEvidenceModalOpen}
        evidence={selectedEvidence}
        competency={selectedCompetency}
      />
      
      <LevelEvidenceModal
        open={levelEvidenceModalOpen}
        onOpenChange={setLevelEvidenceModalOpen}
        levelData={levelEvidence}
        currentLevel={currentLevel}
        nextLevel={nextLevel}
      />
      
      <RoleEvidenceModal
        open={roleEvidenceModalOpen}
        onOpenChange={setRoleEvidenceModalOpen}
        role={selectedRole}
        evidence={roleArchetypeEvidence[selectedRole || '']}
      />
>>>>>>> origin/main
    </div>
  );
}

export default Assessment;
