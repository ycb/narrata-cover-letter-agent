import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicatorWithTooltips } from '@/components/cover-letters/ProgressIndicatorWithTooltips';

export default function TooltipDemo() {
  // Mock metrics data
  const mockMetrics = {
    goalsMatch: 'strong',
    experienceMatch: 'average',
    coverLetterRating: 'weak',
    atsScore: 65,
    coreRequirementsMet: { met: 2, total: 4 },
    preferredRequirementsMet: { met: 1, total: 4 }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">
            Cover Letter Progress Tooltips Demo
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Hover over any metric below to see detailed breakdowns and checklists in a full-width tooltip. 
            This demonstrates progressive disclosure for cover letter creation guidance.
          </p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
            <CardDescription>
              Interactive tooltips provide detailed insights into each metric
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Desktop:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Hover over any metric badge to open full-width tooltip</li>
                  <li>• Move mouse into tooltip content to keep it open</li>
                  <li>• Move mouse away to close (with small delay)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Mobile:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Tap on any metric badge to open tooltip</li>
                  <li>• Tap outside to close</li>
                  <li>• Content stacks vertically for mobile viewing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Indicator with Tooltips */}
        <Card>
          <CardHeader>
            <CardTitle>Cover Letter Progress Analysis</CardTitle>
            <CardDescription>
              Hover over any metric to see detailed breakdown and recommendations in a full-width tooltip
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressIndicatorWithTooltips metrics={mockMetrics} />
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match with Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Shows how well your cover letter aligns with your career goals. 
                Currently disabled until user goals are configured.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Match with Experience</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Compares job requirements against your work history, 
                showing specific matches and confidence levels.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cover Letter Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Best practices checklist including compelling opening, 
                quantified impact, action verbs, and more.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ATS Score</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Technical requirements breakdown: content quality, 
                file format, skills keywords, and structure.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Core Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Essential job requirements with checkmarks showing 
                which ones are demonstrated in your cover letter.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preferred Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nice-to-have requirements that can give you an edge 
                in the application process.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
