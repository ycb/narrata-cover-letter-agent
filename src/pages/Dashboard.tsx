import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCompletionModal from "@/components/auth/ProfileCompletionModal";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import {
  FileText,
  LayoutTemplate,
  Plus,
  ArrowRight,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { LoadingState } from '@/components/shared/LoadingState';
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

  // Import new simplified v2 components
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
  const { user, profile, getOAuthData, needsProfileCompletion, updateProfile, isDemo } = useAuth();
  const gapSummary = useGapSummary();
  const interactiveRowBase = "w-full text-left rounded-lg p-3 transition-colors hover:bg-muted/50";

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
              variant="cta-primary"
              size="lg"
              className="gap-2 mt-9"
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
                  if (!isDemo) {
                    await updateProfile({ preferred_dashboard: 'onboarding' } as any);
                  }
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

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <StatsCard
            title="Stories"
            value={dashboardData.stats.stories}
            description="Work history entries"
            icon={FileText}
            trend={{ 
              value: `+${dashboardData.stats.lastMonthStories} this month`, 
              isPositive: dashboardData.stats.lastMonthStories > 0,
              change: dashboardData.stats.lastMonthStories
            }}
            onClick={() => navigate('/work-history')}
          />
          <StatsCard
            title="Saved Sections"
            value={dashboardData.stats.savedSections}
            description="Reusable cover letter blocks"
            icon={LayoutTemplate}
            trend={{
              value: `+${dashboardData.stats.lastMonthSavedSections} this month`,
              isPositive: dashboardData.stats.lastMonthSavedSections > 0,
              change: dashboardData.stats.lastMonthSavedSections,
            }}
            onClick={() => navigate('/saved-sections')}
          />
          <StatsCard
            title="Cover Letters"
            value={dashboardData.stats.coverLetters}
            description="Generated this month"
            icon={Mail}
            trend={{
              value: `+${dashboardData.stats.lastMonthCoverLetters} this month`,
              isPositive: dashboardData.stats.lastMonthCoverLetters > 0,
              change: dashboardData.stats.lastMonthCoverLetters
            }}
            onClick={() => navigate('/cover-letters')}
          />
          <StatsCard
            title="Interviews"
            value={dashboardData.stats.interviews}
            description="Outcome tracked"
            icon={ArrowRight}
            trend={{
              value: `+${dashboardData.stats.lastMonthInterviews} this month`,
              isPositive: dashboardData.stats.lastMonthInterviews > 0,
              change: dashboardData.stats.lastMonthInterviews
            }}
            onClick={() => navigate('/cover-letters')}
          />
          <TotalGapsWidget
            gapSummary={gapSummary.data}
            isLoading={gapSummary.isLoading}
            onClick={() => {
              // Navigate to onboarding dashboard to review gaps
              navigate('/dashboard/onboarding?scrollTo=tabs');
            }}
          />
        </div>

        <Card className="shadow-soft mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-semibold">Outcome Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Applied</p>
                <p className="text-lg font-semibold text-foreground">
                  {dashboardData.outcomes.applied}
                </p>
              </div>
              <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Interview</p>
                <p className="text-lg font-semibold text-foreground">
                  {dashboardData.outcomes.interview}
                </p>
              </div>
              <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">No Response</p>
                <p className="text-lg font-semibold text-foreground">
                  {dashboardData.outcomes.noResponse}
                </p>
              </div>
              <div className="rounded-lg border border-muted/40 bg-muted/10 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Not Selected</p>
                <p className="text-lg font-semibold text-foreground">
                  {dashboardData.outcomes.notSelected}
                </p>
              </div>
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              Interview rate: {dashboardData.outcomes.interviewRate}%
            </div>
          </CardContent>
        </Card>

        {/* MVP Dashboard Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Roles Targeted (based on roles applied for) */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Top Roles Targeted</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardData.topRoles.map((role, index) => (
                <button
                  key={index}
                  className={`${interactiveRowBase} bg-transparent`}
                  onClick={() => navigate(`/cover-letters?roleBucket=${encodeURIComponent(role.bucketKey)}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{role.title}</span>
                    <Badge variant="secondary" className="shrink-0">
                      {role.percentage}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last applied: {role.lastApplied} • {role.count} {role.count === 1 ? 'job' : 'jobs'}
                  </div>
                </button>
              ))}
              {dashboardData.topRoles.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No role targeting data available</p>
                  <p className="text-xs">Paste a job description to start tracking roles</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current PM Level */}
          <LevelCard levelData={levelData} isLoading={isLevelLoading} onRecalculate={() => recalculate()} />

          {/* PM Skills */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">PM Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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

                    return (
                      <button
                        key={competency.key}
                        onClick={() => navigate(`/assessment?competency=${competency.key}`)}
                        className={interactiveRowBase}
                      >
                        <div className="mb-2">
                          <span className="text-sm font-medium">{competency.name}</span>
                        </div>
                        <ConfidenceBar percentage={percentage} />
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
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
