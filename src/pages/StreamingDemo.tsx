import { useState } from 'react';
import { useCoverLetterJobStream } from '../hooks/useJobStream';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

import {
  CheckCircle2,
  Loader2,
  XCircle,
  TrendingUp,
  Target,
  Briefcase
} from 'lucide-react';

import type { CoverLetterStreamState } from '../types/jobs';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StreamingDemo() {
  const [jobDescriptionId, setJobDescriptionId] = useState(
    '73efcffd-bd5f-48da-98ca-5f319474fcd9'
  );

  const { state, createJob, isStreaming, error, reset } = useCoverLetterJobStream({
    onProgress: (stage, data) => {
      console.log(`[Demo] Progress: ${stage}`, data);
    },
    onComplete: (result) => {
      console.log('[Demo] COMPLETE:', result);
    },
    onError: (err) => {
      console.error('[Demo] ERROR:', err);
    },
  });

  const typedState = state as CoverLetterStreamState | null;

  const basic = typedState?.stages.basicMetrics;
  const reqs = typedState?.stages.requirementAnalysis;
  const gaps = typedState?.stages.sectionGaps;

  // --------------------------------------------------------------------------
  // **PROGRESS CALCULATION**
  // --------------------------------------------------------------------------

  const computeProgress = () => {
    if (!typedState) return 0;

    const TARGET_STAGES = [
      'basicMetrics',
      'requirementAnalysis',
      'sectionGaps'
    ] as const;

    const completed = TARGET_STAGES.filter(
      (stage) => typedState.stages?.[stage]?.status === 'complete'
    ).length;

    return Math.round((completed / TARGET_STAGES.length) * 100);
  };

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleStart = async () => {
    if (!jobDescriptionId) return;

    try {
      await createJob('coverLetter', { jobDescriptionId });
    } catch (err) {
      console.error('Job creation failed:', err);
    }
  };

  const handleReset = () => {
    reset();
    setJobDescriptionId('');
  };

  const progress = computeProgress();

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Streaming MVP Demo</h1>
          <p className="text-muted-foreground">
            Real-time staged pipeline for cover letters (polling-based)
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Start New Job</CardTitle>
            <CardDescription>Enter a job description ID to test pipeline</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={jobDescriptionId}
                onChange={(e) => setJobDescriptionId(e.target.value)}
                placeholder="Job Description ID"
                className="flex-1 px-3 py-2 border rounded-md"
                disabled={isStreaming}
              />

              <Button onClick={handleStart} disabled={isStreaming || !jobDescriptionId}>
                {isStreaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  'Start Job'
                )}
              </Button>

              {typedState && (
                <Button onClick={handleReset} variant="outline">Reset</Button>
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
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Status: {typedState.status}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              {/* Stage Cards */}
              <div className="grid grid-cols-3 gap-4">
                <StageCard
                  title="Basic Metrics"
                  icon={<TrendingUp className="h-5 w-5" />}
                  complete={basic?.status === 'complete'}
                  loading={isStreaming && !basic}
                />

                <StageCard
                  title="Requirements"
                  icon={<Target className="h-5 w-5" />}
                  complete={reqs?.status === 'complete'}
                  loading={isStreaming && !reqs}
                />

                <StageCard
                  title="Section Gaps"
                  icon={<Briefcase className="h-5 w-5" />}
                  complete={gaps?.status === 'complete'}
                  loading={isStreaming && !gaps}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* BASIC METRICS */}
        {basic && (
          <MetricsSection basic={basic.data} />
        )}

        {/* REQUIREMENTS */}
        {reqs && (
          <RequirementsSection reqs={reqs.data} />
        )}

        {/* GAPS */}
        {gaps && (
          <GapsSection gaps={gaps.data} />
        )}

        {/* Job Complete */}
        {typedState?.status === 'complete' && typedState.result && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Job Complete</AlertTitle>
            <AlertDescription>
              ATS {typedState.result.metrics.atsScore}, {typedState.result.gapCount} gaps found
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

function StageCard({
  title,
  icon,
  complete,
  loading
}: {
  title: string;
  icon: React.ReactNode;
  complete: boolean;
  loading: boolean;
}) {
  const status = complete ? 'complete' : loading ? 'loading' : 'pending';

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
      <div className={
        status === 'complete'
          ? 'text-green-600'
          : status === 'loading'
          ? 'text-blue-600'
          : 'text-gray-400'
      }>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : icon}
      </div>

      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground capitalize">{status}</div>
      </div>

      {complete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// METRICS SECTION
// ---------------------------------------------------------------------------

function MetricsSection({ basic }: { basic: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Metrics</CardTitle>
        <CardDescription>Quick assessment</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="ATS Score" value={basic.atsScore} />
          <MetricCard label="Goals Match" value={basic.goalsMatch} />
          <MetricCard label="Experience" value={basic.experienceMatch} />
          <MetricCard label="Fit Score" value={basic.initialFitScore} />
        </div>

        {basic.topThemes?.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Top Themes</h4>
            <div className="flex flex-wrap gap-2">
              {basic.topThemes.map((t: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// REQUIREMENTS SECTION
// ---------------------------------------------------------------------------

function RequirementsSection({ reqs }: { reqs: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requirement Analysis</CardTitle>
        <CardDescription>
          {reqs.requirementsMet} of {reqs.totalRequirements} requirements met
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {reqs.coreRequirements?.length > 0 && (
            <RequirementGroup title="Core Requirements" list={reqs.coreRequirements} />
          )}

          {reqs.preferredRequirements?.length > 0 && (
            <RequirementGroup title="Preferred Requirements" list={reqs.preferredRequirements} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RequirementGroup({ title, list }: any) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      <div className="space-y-2">
        {list.map((req: any, i: number) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 border rounded-lg ${
              req.met ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="mt-1">
              {req.met ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="text-sm font-medium">{req.text}</div>
              {req.evidence && (
                <p className="text-sm text-muted-foreground mt-1">{req.evidence}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GAPS SECTION
// ---------------------------------------------------------------------------

function GapsSection({ gaps }: { gaps: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Section Gaps</CardTitle>
        <CardDescription>{gaps.totalGaps} gaps identified</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {gaps.sections.map((sec: any, idx: number) => (
          <div key={idx} className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">{sec.title}</h4>

            {sec.gaps?.length > 0 ? (
              <div className="space-y-2">
                {sec.gaps.map((g: any, j: number) => (
                  <div
                    key={j}
                    className="bg-muted p-3 rounded-md text-sm"
                  >
                    <div className="font-medium text-orange-600">{g.type}</div>
                    <div className="text-muted-foreground">{g.description}</div>
                    <div className="mt-1 text-primary">{g.suggestion}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No gaps found</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// METRIC CARD
// ---------------------------------------------------------------------------

function MetricCard({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="border rounded-lg p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>

      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${
            pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}