import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Play, Settings, FileText, Target, TrendingUp, Users } from 'lucide-react';
import { HILProvider } from '@/contexts/HILContext';
import { MainHILInterface } from '@/components/hil/MainHILInterface';
import type { WorkHistoryBlurb } from '@/types/workHistory';

// Demo data
const demoStory: WorkHistoryBlurb = {
  id: 'demo-story-1',
  roleId: 'demo-role-1',
  title: 'Product Leadership Story',
  content: 'Led cross-functional product development team to deliver innovative solutions.',
  outcomeMetrics: ['Delivered 3 major features', 'Improved user engagement by 40%'],
        tags: ['leadership', 'product management', 'cross functional'],
  source: 'manual',
  status: 'approved',
  confidence: 'high',
  timesUsed: 8,
  lastUsed: '2024-01-20T00:00:00Z',
  variations: [
    {
      id: 'demo-var-1',
      content: 'Led a cross-functional team of 12 product managers, designers, and engineers to deliver 3 major product features that increased user engagement by 40% and drove $2M in additional revenue.',
      filledGap: 'Team leadership and revenue impact',
      developedForJobTitle: 'Senior Product Manager',
      jdTags: ['leadership', 'cross functional', 'revenue'],
      outcomeMetrics: ['Led team of 12', 'Delivered 3 features', '40% engagement increase', '$2M revenue'],
      tags: ['leadership', 'team management', 'revenue'],
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'AI'
    },
    {
      id: 'demo-var-2',
      content: 'Orchestrated product strategy and roadmap development for a portfolio of 5 products, resulting in 25% improvement in time-to-market and 15% increase in customer satisfaction scores.',
      filledGap: 'Strategic planning and customer focus',
      developedForJobTitle: 'Senior Product Manager',
      jdTags: ['strategy', 'roadmap', 'customer satisfaction'],
      outcomeMetrics: ['5 products managed', '25% faster time-to-market', '15% satisfaction increase'],
      tags: ['strategy', 'roadmap', 'customer focus'],
      createdAt: '2024-01-02T00:00:00Z',
      createdBy: 'user'
    },
    {
      id: 'demo-var-3',
      content: 'Implemented data-driven decision making processes that improved feature success rate from 60% to 85%, while reducing development cycle time by 30%.',
      filledGap: 'Data-driven decision making',
      developedForJobTitle: 'Senior Product Manager',
      jdTags: ['data-driven', 'analytics', 'process improvement'],
      outcomeMetrics: ['85% feature success rate', '30% cycle time reduction'],
      tags: ['data-driven', 'analytics', 'process'],
      createdAt: '2024-01-03T00:00:00Z',
      createdBy: 'user-edited-AI'
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-20T00:00:00Z'
};

const demoJobKeywords = [
  'product management',
  'leadership',
  'cross functional',
  'strategy',
  'data-driven',
  'customer focus',
  'revenue growth',
  'team management',
  'roadmap',
  'analytics'
];

export function HILDemo() {
  const [showHIL, setShowHIL] = useState(false);
  const [updatedContent, setUpdatedContent] = useState<string>('');

  const handleStartHIL = () => {
    setShowHIL(true);
  };

  const handleCloseHIL = () => {
    setShowHIL(false);
  };

  const handleContentUpdated = (content: string) => {
    setUpdatedContent(content);
    setShowHIL(false);
  };

  if (showHIL) {
    return (
      <HILProvider>
        <MainHILInterface
          story={demoStory}
          targetRole="Senior Product Manager"
          jobKeywords={demoJobKeywords}
          onContentUpdated={handleContentUpdated}
          onClose={handleCloseHIL}
        />
      </HILProvider>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Human-in-the-Loop Demo</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Experience the complete HIL workflow for content creation and refinement. 
            This demo showcases AI-powered analysis, human collaboration, and iterative improvement.
          </p>
        </div>

        {/* Demo Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Gap Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                AI-powered analysis identifies content gaps and improvement opportunities based on job requirements.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">ATS Optimization</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automated scoring and keyword optimization to ensure your content passes through Applicant Tracking Systems.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">PM Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Role-specific competency analysis and alignment scoring for Product Manager positions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Demo Story */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Demo Story: {demoStory.title}
              </CardTitle>
              <Badge variant="outline">{demoStory.variations?.length || 0} Variations</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Original Content:</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {demoStory.content}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-2">Target Role:</h4>
                <Badge variant="secondary">Senior Product Manager</Badge>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Key Job Requirements:</h4>
                <div className="flex flex-wrap gap-1">
                  {demoJobKeywords.slice(0, 6).map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center">
          <Button 
            onClick={handleStartHIL}
            size="lg"
            className="flex items-center gap-2"
          >
            <Play className="h-5 w-5" />
            Start HIL Workflow
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Click to experience the complete Human-in-the-Loop editing process
          </p>
        </div>

        {/* Updated Content Display */}
        {updatedContent && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-success" />
                HIL-Enhanced Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                <p className="text-sm">{updatedContent}</p>
              </div>
              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setUpdatedContent('')}
                >
                  Clear
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleStartHIL}
                >
                  Edit Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              HIL Features Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold">Content Analysis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Gap analysis with impact scoring</li>
                  <li>• ATS compatibility checking</li>
                  <li>• Role-specific competency assessment</li>
                  <li>• Truth verification and fact-checking</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">AI Collaboration</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Smart content suggestions</li>
                  <li>• Multiple generation types</li>
                  <li>• One-click content application</li>
                  <li>• Real-time optimization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
