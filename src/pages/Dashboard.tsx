import { useState } from "react";
import { Link } from "react-router-dom";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Target, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Clock
} from "lucide-react";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Import new simplified v2 components
import { CoverageMapSimplified } from "@/components/dashboard/CoverageMapSimplified";
import { StoryGapsAndStrength } from "@/components/dashboard/StoryGapsAndStrength";
import { TopActionNeeded } from "@/components/dashboard/TopActionNeeded";
import { RecentActivityCollapsible } from "@/components/dashboard/RecentActivityCollapsible";

// Import mock data
import { mockDashboardV2Data } from "@/lib/dashboard-data";

const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Transform mock data for TopActionNeeded
  const topActions = mockDashboardV2Data.quickActions.map(action => ({
    ...action,
    category: action.id.includes('strategy') ? 'stories' as const :
              action.id.includes('outcomes') ? 'improvement' as const :
              action.id.includes('leadership') ? 'stories' as const : 'stories' as const
  }));

  // Mock activity data
  const recentActivities = [
    {
      id: '1',
      type: 'cover-letter' as const,
      title: 'Cover letter sent',
      description: 'Senior PM at TechCorp',
      time: '2 hours ago',
      status: 'success' as const
    },
    {
      id: '2',
      type: 'story' as const,
      title: 'New story created',
      description: 'Leadership experience',
      time: '1 day ago',
      status: 'info' as const
    },
    {
      id: '3',
      type: 'profile' as const,
      title: 'Profile updated',
      description: 'LinkedIn sync completed',
      time: '3 days ago',
      status: 'warning' as const
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <main className="container mx-auto px-4 pb-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground top-padding-only">
                Welcome back, Alex
              </h1>
              <p className="text-muted-foreground mt-1">
                Ready to craft your next truth-based cover letter?
              </p>
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

        {/* Metrics Overview - Simplified */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Stories"
            value={47}
            description="Approved narratives ready to use"
            icon={FileText}
            trend={{ value: "+3 this week", isPositive: true }}
          />
          <StatsCard
            title="Cover Letters"
            value={23}
            description="Generated this month"
            icon={Target}
            trend={{ value: "+12% vs last month", isPositive: true }}
          />
          <StatsCard
            title="Coverage"
            value={`${mockDashboardV2Data.coverageMap.overallCoverage}%`}
            description="PM competency coverage"
            icon={TrendingUp}
            trend={{ value: "+5% this month", isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Simplified Structure */}
          <div className="lg:col-span-2 space-y-6">
            {/* Top Action Needed - Primary Focus */}
            <TopActionNeeded actions={topActions} />

            {/* Story Gaps & Strength - Consolidated */}
            <StoryGapsAndStrength 
              storyStrength={mockDashboardV2Data.storyStrength}
              gaps={mockDashboardV2Data.resumeGaps}
              coverage={mockDashboardV2Data.coverageMap.competencies}
            />

            {/* Coverage Map - Simplified */}
            <CoverageMapSimplified 
              coverage={mockDashboardV2Data.coverageMap.competencies}
              overallCoverage={mockDashboardV2Data.coverageMap.overallCoverage}
              priorityGaps={mockDashboardV2Data.coverageMap.priorityGaps}
            />
          </div>

          {/* Sidebar - Simplified */}
          <div className="space-y-6">
            {/* Recent Activity - Collapsed by Default */}
            <RecentActivityCollapsible activities={recentActivities} />

            {/* Pro Tip */}
            <Card className="shadow-soft bg-accent-light border-accent">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-accent mb-1">Pro Tip</p>
                    <p className="text-sm text-accent">
                      Focus on high-priority competency gaps first to improve your overall coverage and story strength.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Cover Letter Create Modal */}
      <CoverLetterCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default Dashboard;