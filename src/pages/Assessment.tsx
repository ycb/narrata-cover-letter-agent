import { useState, useEffect } from "react";
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
  RotateCw
} from "lucide-react";
import EvidenceModal from "@/components/assessment/EvidenceModal";
import LevelEvidenceModal from "@/components/assessment/LevelEvidenceModal";
import RoleEvidenceModal from "@/components/assessment/RoleEvidenceModal";
import { SpecializationCard } from "@/components/assessment/SpecializationCard";
import { CompetencyCard } from "@/components/assessment/CompetencyCard";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePMLevel } from "@/hooks/usePMLevel";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceProgressColor, getConfidenceBadgeColor } from "@/utils/confidenceBadge";
import { cn } from "@/lib/utils";

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
    evidenceByCompetency = {}
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
  const { levelData, isLoading, error, recalculate, isRecalculating } = usePMLevel();
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialSection);
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [showLeadershipTrack, setShowLeadershipTrack] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<any>(null);
  const [levelEvidenceModalOpen, setLevelEvidenceModalOpen] = useState(false);
  const [roleEvidenceModalOpen, setRoleEvidenceModalOpen] = useState(false);

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
                  variant="outline" 
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
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Recalculate PM Level
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state - no data available
  if (!assessmentData) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-background rounded-xl border shadow-sm overflow-hidden">
          <div className="p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">PM Level Assessment</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Get a detailed analysis of your product management level based on your experience, skills, and achievements.
              Understand your strengths and areas for growth with personalized recommendations.
            </p>
            
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
                variant="outline" 
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
          </div>
        </div>
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
    levelProgression,
    roleArchetypeEvidence,
    levelEvidence,
    evidenceByCompetency,
    recommendations
  } = assessmentData;

  // Render the assessment UI with the dynamic data
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">PM Level Assessment</h1>
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
                <div 
                  key={competency.domain}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleShowEvidence(competency)}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{competency.domain}</h4>
                    <Badge className={getConfidenceBadgeColor(competency.score)}>
                      {competency.level}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Confidence</span>
                      <span>{competency.score}%</span>
                    </div>
                    <Progress 
                      value={competency.score} 
                      className={cn("h-2", getConfidenceProgressColor(competency.score))} 
                    />
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Role Archetypes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Role Specializations
            </CardTitle>
            <CardDescription>
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
              </div>
            </CardContent>
          </Card>
        )}
      </div>

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
        evidence={roleArchetypeEvidence[selectedRole || '']}
      />
    </div>
  );
}

export default Assessment;
