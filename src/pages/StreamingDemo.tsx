import { useState } from 'react';
import { useCoverLetterJobStream } from '../hooks/useJobStream';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { CheckCircle2, Loader2, XCircle, TrendingUp, Target, Briefcase } from 'lucide-react';
import type { CoverLetterStreamState } from '../types/jobs';

export default function StreamingDemo() {
  const [jobDescriptionId, setJobDescriptionId] = useState('');
  const { state, createJob, isStreaming, error, reset } = useCoverLetterJobStream({
    onProgress: (stage, data) => {
      console.log(`[Demo] Progress - ${stage}:`, data);
    },
    onComplete: (result) => {
      console.log('[Demo] Complete:', result);
    },
    onError: (err) => {
      console.error('[Demo] Error:', err);
    },
  });

  const handleStart = async () => {
    if (!jobDescriptionId) {
      alert('Please enter a job description ID');
      return;
    }

    try {
      await createJob('coverLetter', {
        jobDescriptionId,
      });
    } catch (err) {
      console.error('Failed to create job:', err);
    }
  };

  const handleReset = () => {
    reset();
    setJobDescriptionId('');
  };

  const typedState = state as CoverLetterStreamState | null;
  const basicMetrics = typedState?.stages.basicMetrics;
  const requirements = typedState?.stages.requirementAnalysis;
  const gaps = typedState?.stages.sectionGaps;

  // Calculate progress percentage
  const getProgress = () => {
    if (!typedState) return 0;
    const stages = Object.keys(typedState.stages).length;
    const total = 3; // basicMetrics, requirementAnalysis, sectionGaps
    return (stages / total) * 100;
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Streaming MVP Demo</h1>
          <p className="text-muted-foreground">
            Test the new SSE-based streaming architecture for cover letter generation
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Start New Job</CardTitle>
            <CardDescription>
              Enter a job description ID to test the streaming pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={jobDescriptionId}
                onChange={(e) => setJobDescriptionId(e.target.value)}
                placeholder="Job Description ID (UUID)"
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={isStreaming}
              />
              <Button onClick={handleStart} disabled={isStreaming || !jobDescriptionId}>
                {isStreaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Streaming...
                  </>
                ) : (
                  'Start Job'
                )}
              </Button>
              {typedState && (
                <Button onClick={handleReset} variant="outline">
                  Reset
                </Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Job Status */}
        {typedState && (
          <Card>
            <CardHeader>
              <CardTitle>Job Status</CardTitle>
              <CardDescription>Job ID: {typedState.jobId}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status: {typedState.status}</span>
                  <span>{Math.round(getProgress())}%</span>
                </div>
                <Progress value={getProgress()} />
              </div>

              {/* Stage indicators */}
              <div className="grid grid-cols-3 gap-4">
                <StageCard
                  title="Basic Metrics"
                  status={basicMetrics ? 'complete' : isStreaming ? 'loading' : 'pending'}
                  icon={<TrendingUp className="h-5 w-5" />}
                />
                <StageCard
                  title="Requirements"
                  status={requirements ? 'complete' : isStreaming ? 'loading' : 'pending'}
                  icon={<Target className="h-5 w-5" />}
                />
                <StageCard
                  title="Section Gaps"
                  status={gaps ? 'complete' : isStreaming ? 'loading' : 'pending'}
                  icon={<Briefcase className="h-5 w-5" />}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stage Results */}
        {basicMetrics && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Metrics</CardTitle>
              <CardDescription>Quick analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard label="ATS Score" value={basicMetrics.atsScore} max={100} />
                <MetricCard label="Goals Match" value={basicMetrics.goalsMatch} max={100} />
                <MetricCard label="Experience" value={basicMetrics.experienceMatch} max={100} />
                <MetricCard label="Fit Score" value={basicMetrics.initialFitScore} max={100} />
              </div>
              {basicMetrics.topThemes && basicMetrics.topThemes.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Top Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {basicMetrics.topThemes.map((theme: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Requirement Analysis</CardTitle>
              <CardDescription>
                {requirements.requirementsMet} of {requirements.totalRequirements} requirements met
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requirements.coreRequirements &&
                  requirements.coreRequirements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Core Requirements</h4>
                      <div className="space-y-2">
                        {requirements.coreRequirements.map((req: any, i: number) => (
                          <RequirementCard key={i} requirement={req} />
                        ))}
                      </div>
                    </div>
                  )}
                {requirements.preferredRequirements &&
                  requirements.preferredRequirements.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Preferred Requirements</h4>
                      <div className="space-y-2">
                        {requirements.preferredRequirements.map((req: any, i: number) => (
                          <RequirementCard key={i} requirement={req} />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {gaps && (
          <Card>
            <CardHeader>
              <CardTitle>Section Gaps</CardTitle>
              <CardDescription>{gaps.totalGaps} gaps identified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {gaps.sections &&
                  gaps.sections.map((section: any, i: number) => (
                    <div key={i} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{section.title}</h4>
                      {section.gaps && section.gaps.length > 0 ? (
                        <div className="space-y-2">
                          {section.gaps.map((gap: any, j: number) => (
                            <div key={j} className="bg-muted p-3 rounded-md text-sm">
                              <div className="font-medium text-orange-600">{gap.type}</div>
                              <div className="text-muted-foreground">{gap.description}</div>
                              <div className="mt-1 text-primary">{gap.suggestion}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No gaps found</p>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Result */}
        {typedState?.status === 'complete' && typedState.result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Job Complete!</AlertTitle>
            <AlertDescription>
              Final metrics: ATS {typedState.result.metrics.atsScore}, {typedState.result.gapCount}{' '}
              gaps identified
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StageCard({
  title,
  status,
  icon,
}: {
  title: string;
  status: 'pending' | 'loading' | 'complete';
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-4 border rounded-lg ${
        status === 'complete'
          ? 'bg-green-50 border-green-200'
          : status === 'loading'
            ? 'bg-blue-50 border-blue-200'
            : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div
        className={
          status === 'complete'
            ? 'text-green-600'
            : status === 'loading'
              ? 'text-blue-600'
              : 'text-gray-400'
        }
      >
        {status === 'loading' ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground capitalize">{status}</div>
      </div>
      {status === 'complete' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
    </div>
  );
}

function MetricCard({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100;
  return (
    <div className="border rounded-lg p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            percentage >= 70 ? 'bg-green-500' : percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function RequirementCard({ requirement }: { requirement: any }) {
  return (
    <div
      className={`flex items-start gap-3 p-3 border rounded-lg ${
        requirement.met ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="mt-1">
        {requirement.met ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-gray-400" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium">{requirement.text}</div>
        {requirement.evidence && (
          <div className="text-sm text-muted-foreground mt-1">{requirement.evidence}</div>
        )}
      </div>
    </div>
  );
}

