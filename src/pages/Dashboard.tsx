import { useState } from "react";
import { Link } from "react-router-dom";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Mail
} from "lucide-react";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Import new simplified v2 components
import { CoverageMapSimplified } from "@/components/dashboard/CoverageMapSimplified";
import { StoryGapsAndStrength } from "@/components/dashboard/StoryGapsAndStrength";
import { TopActionNeeded } from "@/components/dashboard/TopActionNeeded";

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

        {/* Metrics Overview - 3 Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Stories"
            value={12}
            description="Work history entries"
            icon={FileText}
            trend={{ value: "+3 this month", isPositive: true }}
          />
          <StatsCard
            title="Cover Letters"
            value={23}
            description="Generated this month"
            icon={Mail}
            trend={{ value: "+12% vs last month", isPositive: true }}
          />
          <StatsCard
            title="Senior PM Skills Coverage"
            value="85%"
            description="PM skills coverage"
            icon={TrendingUp}
            trend={{ value: "+8% improvement this month", isPositive: true }}
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
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Sr. Product Manager</span>
                    <Badge variant="secondary">10 jobs (66%)</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last applied: 2 days ago
                  </div>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Lead PM</span>
                    <Badge variant="secondary">3 jobs (20%)</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last applied: 1 week ago
                  </div>
                </div>

                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">Principal PM</span>
                    <Badge variant="secondary">2 jobs (13%)</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last applied: 2 weeks ago
                  </div>
                </div>
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
            storyStrength={mockDashboardV2Data.storyStrength}
            gaps={mockDashboardV2Data.resumeGaps}
            coverage={mockDashboardV2Data.coverageMap.competencies}
          />

          {/* Coverage Map - Right Side */}
          <CoverageMapSimplified 
            coverage={mockDashboardV2Data.coverageMap.competencies}
            overallCoverage={mockDashboardV2Data.coverageMap.overallCoverage}
            priorityGaps={mockDashboardV2Data.coverageMap.priorityGaps}
          />
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