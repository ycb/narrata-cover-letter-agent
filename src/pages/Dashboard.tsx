import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCompletionModal from "@/components/auth/ProfileCompletionModal";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  ArrowLeft,
  Mail,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { LoadingState } from '@/components/shared/LoadingState';
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Import new simplified v2 components
import { StoryGapsAndStrength } from "@/components/dashboard/StoryGapsAndStrength";
import { TopActionNeeded } from "@/components/dashboard/TopActionNeeded";
import { LevelCard } from "@/components/dashboard/LevelCard";

// Import real data hook
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePMLevel } from "@/hooks/usePMLevel";
import { useNavigate } from "react-router-dom";
import { useGapSummary } from "@/hooks/useGapSummary";
import { TotalGapsWidget } from "@/components/dashboard/TotalGapsWidget";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const { levelData, isLoading: isLevelLoading, recalculate } = usePMLevel();
  const { user, profile, getOAuthData, needsProfileCompletion, updateProfile } = useAuth();
  const gapSummary = useGapSummary();

  // Check if user needs profile completion (e.g., magic link users)
  useEffect(() => {
    if (user && profile && needsProfileCompletion()) {
      setShowProfileCompletion(true);
    }
  }, [user, profile, needsProfileCompletion]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingState
          isLoading={true}
          loadingText="Loading your dashboard..."
        />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingState
          isLoading={false}
          error={error}
          onRetry={refetch}
          errorTitle="Error Loading Dashboard"
        />
      </div>
    );
  }

  // Show empty state if no data
  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <FileText className="w-8 h-8 text-gray-400 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900">No Data Available</h3>
          <p className="text-gray-600">Complete your onboarding to see your dashboard.</p>
          <Button asChild>
            <Link to="/onboarding">Complete Onboarding</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Transform data for TopActionNeeded (using mock actions for now)
  const topActions = [
    {
      id: 'strategy-gap',
      title: 'Strengthen Product Strategy',
      description: 'Add strategic planning examples',
      priority: 'high' as const,
      action: '/work-history',
      context: { role: 'Senior PM', company: 'TechCorp' }
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 pb-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground top-padding-only">
                  {(() => {
                    const oauthData = getOAuthData();
                    const firstName = oauthData.firstName;
                    const fullName = oauthData.fullName || profile?.full_name;
                    const displayName = firstName || fullName || user?.email?.split('@')[0];
                    return displayName ? `Welcome back, ${displayName}` : 'Welcome back';
                  })()}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {(() => {
                    const oauthData = getOAuthData();
                    const firstName = oauthData.firstName;
                    if (firstName) {
                      return `Ready to land your next interview with strategic storytelling?`;
                    }
                    return 'Ready to land your next interview with strategic storytelling?';
                  })()}
                </p>
              </div>
            </div>
            <Button
              variant="brand"
              size="lg"
              className="gap-2 cta-center"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Create New Letter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Dashboard Toggle Banner */}
        <Card className="border-purple-200 bg-purple-50 mb-8">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                onClick={async () => {
                  await updateProfile({ preferred_dashboard: 'onboarding' } as any);
                  navigate('/dashboard/onboarding');
                }}
                className="bg-white hover:bg-purple-100 border border-purple-300"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                View Onboarding Dashboard
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-purple-900">
                  Still refining your stories and sections?
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Switch to the onboarding dashboard to review gaps and complete tasks
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Overview - Stories + Cover Letters + Total Gaps (2 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Stories"
            value={dashboardData.stats.stories}
            description="Work history entries"
            icon={FileText}
            trend={{ 
              value: `+${dashboardData.stats.lastMonthStories} this month`, 
              isPositive: dashboardData.stats.lastMonthStories > 0 
            }}
            onClick={() => navigate('/work-history')}
          />
          <StatsCard
            title="Cover Letters"
            value={dashboardData.stats.coverLetters}
            description="Generated this month"
            icon={Mail}
            trend={{
              value: `+${dashboardData.stats.lastMonthCoverLetters} this month`,
              isPositive: dashboardData.stats.lastMonthCoverLetters > 0
            }}
            onClick={() => navigate('/cover-letters')}
          />
          <div className="col-span-1 md:col-span-2">
            <TotalGapsWidget
              gapSummary={gapSummary.data}
              isLoading={gapSummary.isLoading}
              onClick={() => {
                // Navigate to onboarding dashboard to review gaps
                navigate('/dashboard/onboarding?scrollTo=tabs');
              }}
            />
          </div>
        </div>

        {/* 4 Small Modules - Top Action + Content Health + Top Roles + Level Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Top Action Needed */}
          <TopActionNeeded actions={topActions} />

          {/* Content Health */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Content Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-success/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-success rounded-full"></div>
                    <Link to="/work-history" className="text-sm font-medium hover:underline">
                      Stories
                    </Link>
                  </div>
                  <Badge variant="secondary">12 active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-warning/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-warning rounded-full"></div>
                    <Link to="/cover-letter-template?tab=saved" className="text-sm font-medium hover:underline">
                      Saved Sections
                    </Link>
                  </div>
                  <Badge variant="secondary">8 sections</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <Link to="/cover-letters" className="text-sm font-medium hover:underline">
                      Cover Letters
                    </Link>
                  </div>
                  <Badge variant="secondary">3 drafts</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Roles Targeted */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                Top Roles Targeted
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {dashboardData.topRoles.map((role, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{role.title}</span>
                      <Badge variant="secondary">{role.count} jobs ({role.percentage}%)</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last applied: {role.lastApplied}
                    </div>
                  </div>
                ))}
                {dashboardData.topRoles.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p className="text-sm">No role targeting data available</p>
                    <p className="text-xs">Complete onboarding to see your targets</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* PM Level Card */}
          <LevelCard 
            levelData={levelData} 
            isLoading={isLevelLoading}
            onRecalculate={() => recalculate()}
          />
        </div>


        {/* 2 Large Modules Side by Side - Story Gaps + PM Competency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Story Gaps & Strength - Left Side */}
          <StoryGapsAndStrength
            storyStrength={dashboardData.storyStrength}
            gaps={dashboardData.resumeGaps}
            coverage={dashboardData.coverageMap.competencies}
          />

          {/* PM Core Competencies - Right Side */}
          <Card className="shadow-soft col-span-1 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                PM Core Competencies
              </CardTitle>
              <CardDescription>Your strengths across key PM domains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levelData?.competencyScores && Object.keys(levelData.competencyScores).length > 0 ? (
                  [
                    {
                      name: "Product Execution",
                      score: levelData.competencyScores.execution || 0,
                      key: 'execution'
                    },
                    {
                      name: "Customer Insight",
                      score: levelData.competencyScores.customer_insight || 0,
                      key: 'customer_insight'
                    },
                    {
                      name: "Product Strategy",
                      score: levelData.competencyScores.strategy || 0,
                      key: 'strategy'
                    },
                    {
                      name: "Influencing People",
                      score: levelData.competencyScores.influence || 0,
                      key: 'influence'
                    }
                  ].map((competency) => {
                    const percentage = Math.round((competency.score / 3) * 100);
                    const level = percentage >= 90 ? "Advanced" : percentage >= 70 ? "Proficient" : percentage >= 50 ? "Developing" : "Needs Work";
                    const badgeColor = percentage >= 80 ? "bg-green-100 text-green-800" : percentage >= 60 ? "bg-blue-100 text-blue-800" : percentage >= 40 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800";
                    
                    return (
                      <button
                        key={competency.key}
                        onClick={() => navigate(`/assessment?competency=${competency.key}`)}
                        className="flex flex-col gap-2 p-3 rounded-lg border hover:border-primary/50 hover:bg-accent/50 transition-all text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-muted-foreground">{competency.name}</span>
                          <Badge className={`text-xs ${badgeColor}`}>{level}</Badge>
                        </div>
                        <div className="text-lg font-bold">{percentage}%</div>
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    <p className="text-sm">No assessment data available.</p>
                    <p className="text-xs">Complete your PM Level Assessment to see your competencies.</p>
                    <Button variant="secondary" size="sm" className="mt-4" onClick={() => navigate('/assessment')}>
                      Go to Assessment
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Cover Letter Create Modal */}
      <CoverLetterCreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <ProfileCompletionModal 
        isOpen={showProfileCompletion}
        onComplete={() => setShowProfileCompletion(false)}
      />
    </div>
  );
};

export default Dashboard;