import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ProfileCompletionModal from "@/components/auth/ProfileCompletionModal";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  TrendingUp,
  Plus,
  ArrowRight,
  Mail,
  Loader2,
  AlertTriangle
} from "lucide-react";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Import new simplified v2 components
import { CoverageMapSimplified } from "@/components/dashboard/CoverageMapSimplified";
import { StoryGapsAndStrength } from "@/components/dashboard/StoryGapsAndStrength";
import { TopActionNeeded } from "@/components/dashboard/TopActionNeeded";

// Import real data hook
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const { data: dashboardData, isLoading, error, refetch } = useDashboardData();
  const { user, profile, getOAuthData, needsProfileCompletion } = useAuth();

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
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900">Error Loading Dashboard</h3>
          <p className="text-gray-600">{error}</p>
          <Button onClick={refetch} variant="secondary">
            Try Again
          </Button>
        </div>
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
                      return `Ready to land your next interview with strategic storytelling, ${firstName}?`;
                    }
                    return 'Ready to land your next interview with strategic storytelling?';
                  })()}
                </p>
                {/* OAuth Provider Info (for debugging) */}
                {process.env.NODE_ENV === 'development' && (() => {
                  const oauthData = getOAuthData();
                  return (
                    <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs">
                      <p className="text-red-800 font-bold">🔍 OAuth Debug Info:</p> <br />
                      <p className="text-red-700"><strong>Full Name:</strong> {oauthData.fullName || '❌ Not available'}</p>
                      <p className="text-red-700"><strong>First Name:</strong> {oauthData.firstName || '❌ Not available'}</p>
                      <p className="text-red-700"><strong>Last Name:</strong> {oauthData.lastName || '❌ Not available'}</p>
                      <p className="text-red-700"><strong>Avatar:</strong> {oauthData.picture ? '✅ Available' : '❌ Not available'}</p>
                      <p className="text-red-700"><strong>Profile ID:</strong> {profile?.id || '❌ Not available'}</p>
                      <p className="text-red-700"><strong>User Email:</strong> {user?.email || '❌ Not available'}</p>
                    </div>
                  );
                })()}
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

        {/* Metrics Overview - 3 Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Stories"
            value={dashboardData.stats.stories}
            description="Work history entries"
            icon={FileText}
            trend={{ 
              value: `+${dashboardData.stats.lastMonthStories} this month`, 
              isPositive: dashboardData.stats.lastMonthStories > 0 
            }}
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
          />
          <StatsCard
            title="Senior PM Skills Coverage"
            value={`${dashboardData.stats.skillsCoverage}%`}
            description="PM skills coverage"
            icon={TrendingUp}
            trend={{
              value: `+${dashboardData.stats.skillsImprovement}% improvement this month`,
              isPositive: dashboardData.stats.skillsImprovement > 0
            }}
          />
        </div>

        {/* 3 Small Modules - Top Action + Top Roles + Content Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Action Needed */}
          <TopActionNeeded actions={topActions} />

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
        </div>


        {/* 2 Large Modules Side by Side - Story Gaps + PM Competency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Story Gaps & Strength - Left Side */}
          <StoryGapsAndStrength
            storyStrength={dashboardData.storyStrength}
            gaps={dashboardData.resumeGaps}
            coverage={dashboardData.coverageMap.competencies}
          />

          {/* Coverage Map - Right Side */}
          <CoverageMapSimplified
            coverage={dashboardData.coverageMap.competencies}
            overallCoverage={dashboardData.coverageMap.overallCoverage}
            priorityGaps={dashboardData.coverageMap.priorityGaps}
          />
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