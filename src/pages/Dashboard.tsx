import { useState } from "react";
import { Link } from "react-router-dom";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { BlurbCard } from "@/components/blurbs/BlurbCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Target, 
  TrendingUp, 
  Plus, 
  Filter,
  Search,
  ArrowRight,
  Briefcase,
  Award,
  Clock,
  Users
} from "lucide-react";
import { Input } from "@/components/ui/input";
import CoverLetterCreateModal from "@/components/cover-letters/CoverLetterCreateModal";

// Import new v2 components
import { CoverageMap } from "@/components/dashboard/CoverageMap";
import { StoryStrength } from "@/components/dashboard/StoryStrength";
import { ResumeGapInsights } from "@/components/dashboard/ResumeGapInsights";
import { LastLetterSent } from "@/components/dashboard/LastLetterSent";
import { QuickActionsV2 } from "@/components/dashboard/QuickActionsV2";

// Import mock data
import { mockDashboardV2Data } from "@/lib/dashboard-data";

const Dashboard = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  const recentBlurbs = [
    {
      id: '1',
      title: 'Growth PM Leadership at SaaS Startup',
      content: 'Led cross-functional product team of 8 to drive 40% user acquisition growth through data-driven experimentation and customer research, resulting in $2M ARR increase.',
      status: 'approved' as const,
      confidence: 'high' as const,
      tags: ['Growth', 'Leadership', 'SaaS', 'Data-Driven'],
      lastUsed: '2 days ago',
      timesUsed: 12
    },
    {
      id: '2', 
      title: '0-1 Product Development Success',
      content: 'Built and launched MVP mobile platform from concept to 10K+ users in 6 months, collaborating with design and engineering to validate product-market fit.',
      status: 'draft' as const,
      confidence: 'medium' as const,
      tags: ['0-1', 'Mobile', 'MVP', 'Product-Market Fit'],
      lastUsed: '1 week ago',
      timesUsed: 8
    },
    {
      id: '3',
      title: 'Customer Research & Strategy',
      content: 'Conducted 50+ customer interviews and usability studies to inform product roadmap, leading to 25% improvement in user satisfaction scores.',
      status: 'needs-review' as const,
      confidence: 'high' as const,
      tags: ['Research', 'Strategy', 'Customer Experience'],
      lastUsed: '3 days ago',
      timesUsed: 15
    }
  ];

  // Transform mock data for QuickActionsV2
  const quickActions = mockDashboardV2Data.quickActions.map(action => ({
    ...action,
    icon: action.id.includes('strategy') ? Target : 
          action.id.includes('outcomes') ? TrendingUp :
          action.id.includes('leadership') ? Users : FileText,
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

        {/* Stats Grid */}
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
          {/* Main Content - Coverage Map and Story Strength */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coverage Map */}
            <CoverageMap 
              coverage={mockDashboardV2Data.coverageMap.competencies}
              overallCoverage={mockDashboardV2Data.coverageMap.overallCoverage}
              priorityGaps={mockDashboardV2Data.coverageMap.priorityGaps}
            />

            {/* Story Strength */}
            <StoryStrength storyStrength={mockDashboardV2Data.storyStrength} />

            {/* Resume Gap Insights */}
            <ResumeGapInsights gaps={mockDashboardV2Data.resumeGaps} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Smart Actions */}
            <QuickActionsV2 actions={quickActions} />

            {/* Last Letter Sent */}
            <LastLetterSent lastLetter={mockDashboardV2Data.lastLetter} />

            {/* Recent Activity */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-success mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Cover letter approved</p>
                    <p className="text-xs text-muted-foreground">Senior PM at TechCorp</p>
                    <p className="text-xs text-muted-foreground">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-accent mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New story created</p>
                    <p className="text-xs text-muted-foreground">Leadership experience</p>
                    <p className="text-xs text-muted-foreground">1 day ago</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-warning mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Profile updated</p>
                    <p className="text-xs text-muted-foreground">LinkedIn sync completed</p>
                    <p className="text-xs text-muted-foreground">3 days ago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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