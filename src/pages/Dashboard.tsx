import { Header } from "@/components/layout/Header";
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
  Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";

const Dashboard = () => {
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header currentPage="dashboard" />
      
      <main className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, Alex
              </h1>
              <p className="text-muted-foreground mt-1">
                Ready to craft your next truth-based cover letter?
              </p>
            </div>
            <Button variant="brand" size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create New Letter
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Blurbs"
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
            title="Success Rate"
            value="34%"
            description="Interview to application ratio"
            icon={TrendingUp}
            trend={{ value: "+8% improvement", isPositive: true }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Blurbs */}
          <div className="lg:col-span-2">
            <Card className="shadow-medium">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-accent" />
                    Recent Blurbs
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="Search blurbs..." 
                        className="pl-9 w-64"
                      />
                    </div>
                                <Button variant="tertiary" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentBlurbs.map((blurb) => (
                  <BlurbCard key={blurb.id} {...blurb} />
                ))}
                <div className="pt-4">
                  <Button variant="secondary" className="w-full">
                    View All Blurbs
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="secondary" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Blurb
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Update Work History
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Award className="h-4 w-4 mr-2" />
                  View PM Assessment
                </Button>
              </CardContent>
            </Card>

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
                    <p className="text-sm font-medium">New blurb created</p>
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
                      Review and update your blurbs monthly to keep them current with your latest achievements.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;