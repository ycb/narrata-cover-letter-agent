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
  RotateCw,
  Clock
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";
import { SpecializationCard } from "@/components/assessment/SpecializationCard";
import { CompetencyCard } from "@/components/assessment/CompetencyCard";
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

// Helper function to map PM level code to display text
const getLevelDisplay = (levelCode: string): string => {
  const levelMap: Record<string, string> = {
    'l3': 'Associate Product Manager',
    'l4': 'Product Manager',
    'l5': 'Senior Product Manager',
    'l6': 'Staff/Principal Product Manager',
    'm1': 'Group Product Manager',
    'm2': 'Director of Product',
  };
  return levelMap[levelCode.toLowerCase()] || levelCode;
};

// Helper function to map confidence score to text
const getConfidenceText = (score: number): string => {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
};

// Helper function to map percentage score to level text
const getCompetencyLevel = (percentage: number): string => {
  if (percentage >= 90) return 'Advanced';
  if (percentage >= 70) return 'Proficient';
  if (percentage >= 50) return 'Needs Work';
  return 'Developing';
};

// Helper function to map score to percentage (0-100)
// NOTE: For evidence-based confidence, use calculateEvidenceBasedConfidence instead
const scoreToPercentage = (score: number, max: number = 3): number => {
  return Math.round((score / max) * 100);
};

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
  
  // Map competency scores to the expected format
  const competencies = [
    {
      domain: "Product Execution",
      score: getEvidenceBasedScore("Product Execution", competencyScores.execution || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Execution", competencyScores.execution || 0)),
      rawScore: competencyScores.execution || 0, // 0-3 scale for percentage calculation
      evidence: signals?.execution_evidence || "Based on your work history and achievements",
      tags: ["Execution", "Delivery", "Technical"],
      description: "Measures your ability to deliver products effectively",
      evidenceStories: signals?.execution_stories || []
    },
    {
      domain: "Customer Insight",
      score: getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Customer Insight", competencyScores.customer_insight || 0)),
      rawScore: competencyScores.customer_insight || 0,
      evidence: signals?.customer_evidence || "Based on your user research and customer focus",
      tags: ["Research", "User Experience", "Customer"],
      description: "Assesses your understanding of user needs",
      evidenceStories: signals?.customer_stories || []
    },
    {
      domain: "Product Strategy",
      score: getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Product Strategy", competencyScores.strategy || 0)),
      rawScore: competencyScores.strategy || 0,
      evidence: signals?.strategy_evidence || "Based on your strategic initiatives",
      tags: ["Strategy", "Vision", "Roadmap"],
      description: "Evaluates your strategic thinking and planning",
      evidenceStories: signals?.strategy_stories || []
    },
    {
      domain: "Influencing People",
      score: getEvidenceBasedScore("Influencing People", competencyScores.influence || 0),
      level: getCompetencyLevel(getEvidenceBasedScore("Influencing People", competencyScores.influence || 0)),
      rawScore: competencyScores.influence || 0,
      evidence: signals?.influence_evidence || "Based on your leadership examples",
      tags: ["Leadership", "Collaboration", "Stakeholder"],
      description: "Measures your ability to lead and influence",
      evidenceStories: signals?.influence_stories || []
    }
  ];

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
    levelDescription: levelData?.levelDescription || `Product manager with a focus on ${roleType?.[0] || 'general product management'}`,
    inferenceSource: levelData?.inferenceSource || "Based on your profile and work history",
    competencies,
    roleArchetypes: roleArchetypes.slice(0, 4), // Max 4 role archetypes
    levelProgression,
    roleArchetypeEvidence: levelData?.roleArchetypeEvidence || {},
    levelEvidence: levelData?.levelEvidence || {},
    evidenceByCompetency: levelData?.evidenceByCompetency || {},
    recommendations: Array.isArray(recommendations) ? recommendations : []
  };
};

interface AssessmentProps {
  initialSection?: string;
}

function Assessment({ initialSection = 'overview' }: AssessmentProps) {
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
  const lastAnalyzedRelative = lastAnalyzedAt
    ? formatDistanceToNow(new Date(lastAnalyzedAt), { addSuffix: true })
    : null;
  const lastAnalyzedExact = lastAnalyzedAt ? format(new Date(lastAnalyzedAt), 'PPpp') : null;

  const analysisSteps = useMemo<StreamingStepState[]>(() => {
    const competencyCount = Object.keys(levelData?.evidenceByCompetency ?? {}).length;
    const currentLevelLabel =
      levelData?.levelEvidence?.currentLevel ||
      levelData?.displayLevel ||
      assessmentData?.currentLevel ||
      "Product Manager";

    const fetchStatus: StreamingStepState["status"] = error
      ? "error"
      : (isLoading || isRecalculating || (isBackgroundAnalyzing && !levelData))
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
  }, [assessmentData?.currentLevel, error, isBackgroundAnalyzing, isLoading, isRecalculating, levelData]);

  const analysisStatus: StreamingLifecycleStatus = error
    ? "error"
    : (isLoading || isRecalculating || (isBackgroundAnalyzing && !levelData))
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

  // Handle showing evidence for a competency
  const handleShowEvidence = (competency: any) => {
    setSelectedCompetency(competency.domain);

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

  // Show loading state
  if (!assessmentData && (isLoading || isRecalculating || (isBackgroundAnalyzing && !levelData))) {
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

  // Show error state
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
                      variant="secondary"
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

  // Show empty state - no data available
  if (!assessmentData) {
    // Check if user is trying to view a specialization section
    const isSpecializationSection = initialSection?.startsWith('specialization-') || 
                                    searchParams.get('section')?.startsWith('specialization-');
    
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
                        variant="secondary"
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
                  </>
                )}
          </div>
        </div>
          </div>
        </main>
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
    roleArchetypeEvidence,
    levelEvidence,
    evidenceByCompetency,
    recommendations
  } = assessmentData;

  // Render the assessment UI with the dynamic data
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6">
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PM Level Assessment</h1>
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

      {(analysisStatus !== "complete" || analysisEvents.length > 0) && (
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

        {/* Role Archetypes Section */}
        <Card id="role-specializations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Role Specializations
            </CardTitle>
            <CardDescription>
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>
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
    </div>
  );
}

export default Assessment;
