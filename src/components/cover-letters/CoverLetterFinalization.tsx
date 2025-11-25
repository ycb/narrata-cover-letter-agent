import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Copy,
  Download,
  Mail,
  Share2,
  ArrowLeft,
  Sparkles,
  Target,
  FileText,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  CoverLetterAnalytics,
  CoverLetterDraftSection,
  CoverLetterMatchMetric,
  DifferentiatorInsight,
} from '@/types/coverLetters';
import { cn } from '@/lib/utils';

interface CoverLetterFinalizationProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToDraft: () => void;
  sections: CoverLetterDraftSection[];
  metrics: CoverLetterMatchMetric[];
  differentiators: DifferentiatorInsight[];
  analytics?: CoverLetterAnalytics;
  job?: {
    company?: string | null;
    role?: string | null;
  };
  onFinalizeConfirm?: () => void;
  isFinalizing?: boolean;
  errorMessage?: string | null;
}

const getScoreFromMetric = (metric: CoverLetterMatchMetric | undefined): number | null => {
  if (!metric) return null;
  if (metric.type === 'score') return Math.round(metric.value);
  if (metric.type === 'strength') {
    switch (metric.strength) {
      case 'strong':
        return 90;
      case 'average':
        return 70;
      case 'weak':
        return 45;
      default:
        return null;
    }
  }
  return null;
};

const getRequirementMetric = (metric: CoverLetterMatchMetric | undefined) => {
  if (!metric || metric.type !== 'requirement') return { met: 0, total: 0 };
  return { met: metric.met, total: metric.total };
};

const buildLetter = (sections: CoverLetterDraftSection[]): string =>
  sections
    .slice()
    .sort((a, b) => a.order - b.order)
    .map(section => section.content?.trim())
    .filter(Boolean)
    .join('\n\n');

const computeWordCount = (sections: CoverLetterDraftSection[]): number =>
  sections.reduce((acc, section) => acc + (section.metadata?.wordCount ?? 0), 0);

export function CoverLetterFinalization({
  isOpen,
  onClose,
  onBackToDraft,
  sections,
  metrics,
  differentiators,
  analytics,
  job,
  onFinalizeConfirm,
  isFinalizing = false,
  errorMessage,
}: CoverLetterFinalizationProps) {
  const [copied, setCopied] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections],
  );

  const finalLetter = useMemo(() => buildLetter(sortedSections), [sortedSections]);
  const wordCount = analytics?.wordCount ?? computeWordCount(sortedSections);
  const sectionCount = analytics?.sections ?? sortedSections.length;

  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const atsMetric = safeMetrics.find(metric => metric.key === 'ats');
  const ratingMetric = safeMetrics.find(metric => metric.key === 'rating');
  const coreMetric = safeMetrics.find(metric => metric.key === 'coreRequirements');
  const preferredMetric = safeMetrics.find(metric => metric.key === 'preferredRequirements');

  const atsScore = getScoreFromMetric(atsMetric);
  const ratingScore = getScoreFromMetric(ratingMetric);
  const coreCoverage = getRequirementMetric(coreMetric);
  const preferredCoverage = getRequirementMetric(preferredMetric);

  const differentiatorCoverage = analytics?.differentiatorCoverage ?? {
    addressed: differentiators?.filter(item => item.status === 'addressed').length ?? 0,
    missing: differentiators?.filter(item => item.status !== 'addressed').length ?? 0,
    total: differentiators?.length ?? 0,
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(finalLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy cover letter:', error);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([finalLetter], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'cover-letter.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={open => (!open ? onClose() : undefined)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToDraft}
                  className="mt-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-2xl font-bold">Review & Finalize</DialogTitle>
                  <DialogDescription className="text-base mt-1">
                    Ensure your letter highlights the right differentiators before saving.
                  </DialogDescription>
                  {job && (job.company || job.role) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                      {job.company && (
                        <Badge variant="outline" className="gap-1">
                          <BuildingIcon className="h-3 w-3" />
                          {job.company}
                        </Badge>
                      )}
                      {job.role && (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" />
                          {job.role}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Assisted
                </Badge>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Target className="h-3 w-3 mr-1" />
                  Differentiator Ready
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <Card className="bg-gradient-to-r from-success/5 to-primary/5 border-success/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Final Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center text-sm">
                  <MetricChip label="ATS Score" value={atsScore !== null ? `${atsScore}%` : '—'} />
                  <MetricChip
                    label="Overall Score"
                    value={ratingScore !== null ? `${ratingScore}%` : '—'}
                  />
                  <MetricChip label="Core Reqs Met" value={`${coreCoverage.met}/${coreCoverage.total}`} />
                  <MetricChip
                    label="Preferred Reqs"
                    value={`${preferredCoverage.met}/${preferredCoverage.total}`}
                  />
                  <MetricChip label="Word Count" value={wordCount.toString()} />
                  <MetricChip label="Sections" value={sectionCount.toString()} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-primary/20 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Differentiator Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                    Addressed: {differentiatorCoverage.addressed}
                  </Badge>
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    Missing: {differentiatorCoverage.missing}
                  </Badge>
                  <Badge variant="outline">
                    Total: {differentiatorCoverage.total}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {differentiators?.map(item => (
                    <div
                      key={item.requirementId}
                      className={cn(
                        'rounded-md border p-3 text-sm transition-colors',
                        item.status === 'addressed'
                          ? 'border-success/30 bg-success/5'
                          : 'border-muted bg-muted/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{item.label}</span>
                        <Badge
                          variant={item.status === 'addressed' ? 'outline' : 'secondary'}
                          className={cn(
                            'text-xs uppercase',
                            item.status === 'addressed'
                              ? 'bg-success/10 text-success border-success/30'
                              : 'text-muted-foreground',
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.summary}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-success/20 bg-success/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Final Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-6 font-serif text-sm leading-relaxed whitespace-pre-line">
                  {finalLetter}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button onClick={handleCopy} variant="outline" className="h-12 flex items-center gap-2">
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </Button>
              <Button onClick={handleDownload} variant="outline" className="h-12 flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download as Text
              </Button>
              <Button
                onClick={() => setShowShareModal(true)}
                variant="outline"
                className="h-12 flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              {onFinalizeConfirm && (
                <Button
                  onClick={onFinalizeConfirm}
                  className="h-12 flex items-center gap-2"
                  disabled={isFinalizing}
                >
                  {isFinalizing && <LoaderIcon className="h-4 w-4 animate-spin" />}
                  {isFinalizing ? 'Finalizing…' : 'Finalize & Save'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Cover Letter</DialogTitle>
            <DialogDescription>
              Choose how you would like to share your polished cover letter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Mail className="h-4 w-4 mr-2" />
              Email to yourself
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Share2 className="h-4 w-4 mr-2" />
              Copy shareable link
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export to PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-md border border-primary/10 bg-background/60 p-3">
      <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-lg font-semibold text-primary">{value}</div>
    </div>
  );
}

function LoaderIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" {...props}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>;
}

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}
