/**
 * Development tool for testing and visualizing job description cleaning
 * Usage: Add to a dev route or use in Storybook
 */

import { useState } from 'react';
import { clean, type CleanResult } from '@/lib/jobDescriptionCleaning';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SAMPLE_POSTING = `Senior Product Manager
Google
Mountain View, CA
Posted 3 days ago
100+ applicants

Apply now
Save this job
Share

About Google:
We're a technology company focused on organizing the world's information.

Responsibilities:
- Define product vision and roadmap
- Lead cross-functional teams
- Drive customer research

Qualifications:
- 5+ years PM experience
- Technical background
- MBA preferred

People also viewed
Similar jobs at Google`;

const PLATFORMS = [
  { value: 'generic', label: 'Generic' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'levels', label: 'Levels.fyi' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'google_jobs', label: 'Google Jobs' },
  { value: 'ziprecruiter', label: 'ZipRecruiter' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'monster', label: 'Monster' },
];

export function JobCleaningDebugger() {
  const [input, setInput] = useState(SAMPLE_POSTING);
  const [platform, setPlatform] = useState('google_jobs');
  const [result, setResult] = useState<CleanResult | null>(null);

  const handleClean = () => {
    const cleanResult = clean(input, platform);
    setResult(cleanResult);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High Quality';
    if (confidence >= 0.5) return 'Medium Quality';
    return 'Low Quality';
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job Description Cleaning Debugger</h1>
        <p className="text-muted-foreground">
          Test the job description cleaning service and see what gets removed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Input</CardTitle>
          <CardDescription>
            Paste a job posting (or use the sample) and select the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="input">Job Posting Text</Label>
            <Textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={12}
              className="font-mono text-sm"
              placeholder="Paste job posting here..."
            />
          </div>

          <Button onClick={handleClean} size="lg" className="w-full">
            Clean Job Posting
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Statistics</span>
                <Badge className={getConfidenceColor(result.confidence)}>
                  {getConfidenceLabel(result.confidence)} ({(result.confidence * 100).toFixed(1)}%)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Original Lines</p>
                  <p className="text-2xl font-bold">
                    {input.split('\n').filter(l => l.trim()).length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cleaned Lines</p>
                  <p className="text-2xl font-bold">
                    {result.cleaned.split('\n').filter(l => l.trim()).length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Removed Lines</p>
                  <p className="text-2xl font-bold text-red-600">
                    {result.removed.length}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold">
                    {(result.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="comparison">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="comparison">Side-by-Side</TabsTrigger>
              <TabsTrigger value="removed">Removed Lines</TabsTrigger>
              <TabsTrigger value="cleaned">Cleaned Only</TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Original</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg max-h-[600px] overflow-auto">
                      {input}
                    </pre>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cleaned</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg max-h-[600px] overflow-auto">
                      {result.cleaned}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="removed">
              <Card>
                <CardHeader>
                  <CardTitle>Removed Lines ({result.removed.length})</CardTitle>
                  <CardDescription>
                    These lines were identified as noise and removed from the posting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {result.removed.length === 0 ? (
                    <p className="text-muted-foreground">No noise detected!</p>
                  ) : (
                    <div className="space-y-2">
                      {result.removed.map((line, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800"
                        >
                          <Badge variant="outline" className="shrink-0">
                            {i + 1}
                          </Badge>
                          <code className="text-sm font-mono flex-1">{line}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cleaned">
              <Card>
                <CardHeader>
                  <CardTitle>Cleaned Text</CardTitle>
                  <CardDescription>
                    This is what will be sent to the LLM for parsing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg max-h-[600px] overflow-auto">
                    {result.cleaned}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

