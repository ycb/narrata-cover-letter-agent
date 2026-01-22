import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  ArrowRight
} from "lucide-react";
import { getConfidenceBadgeColor, textConfidenceToPercentage } from "@/utils/confidenceBadge";
import { CriteriaDisplay } from "./CriteriaDisplay";
import { StoryCard } from "./StoryCard";
import { DisputeFeedbackDialog } from "./DisputeFeedbackDialog";
import { isLinkedInScrapingEnabled } from "@/lib/flags";

interface LevelEvidence {
  currentLevel: string;
  nextLevel: string;
  confidence: string;
  resumeEvidence: {
    roleTitles: string[];
    duration: string;
    companyScale: string[];
  };
  storyEvidence: {
    totalStories: number;
    relevantStories: number;
    tagDensity: { tag: string; count: number }[];
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      tags: string[];
      sourceRole: string;
      sourceCompany: string;
      lastUsed: string;
      timesUsed: number;
      confidence: 'high' | 'medium' | 'low';
      outcomeMetrics?: string[];
      levelAssessment?: 'exceeds' | 'meets' | 'below';
    }>;
  };
  levelingFramework: {
    framework: string;
    criteria: string[];
    match: string;
    confidencePercentage?: number;
    metCriteria?: Array<{ criterion: string; met: boolean }>;
  };
  gaps: {
    area: string;
    description: string;
    examples: string[];
  }[];
  outcomeMetrics: {
    roleLevel: string[];
    storyLevel: string[];
    analysis: {
      totalMetrics: number;
      impactLevel: 'feature' | 'team' | 'org' | 'company';
      keyAchievements: string[];
    };
  };
}

interface LevelEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: LevelEvidence;
}

const LevelEvidenceModal = ({ isOpen, onClose, evidence }: LevelEvidenceModalProps) => {
  const scopeCategories: Array<{ label: string; regex: RegExp }> = [
    { label: 'Budget or revenue', regex: /\$|budget|revenue|arr|gmv|profit|p&l|ebitda/i },
    { label: 'Headcount or team size', regex: /headcount|team|people|hiring|organization|org\b|staff/i },
    { label: 'User or customer scale', regex: /users|customers|accounts|subscribers|mau|dau|active/i },
    { label: 'Global or market scale', regex: /global|international|countries|regions|worldwide|market share/i },
  ];

  const buildScopeSignals = (metrics: string[]) => {
    const seen = new Set<string>();
    return metrics
      .map((metric) => {
        const category = scopeCategories.find((c) => c.regex.test(metric))?.label;
        if (!category) return null;
        const key = `${category}:${metric}`;
        if (seen.has(key)) return null;
        seen.add(key);
        return { category, metric };
      })
      .filter(Boolean) as Array<{ category: string; metric: string }>;
  };

  // Get confidence percentage from evidence
  const getConfidencePercentage = (): number => {
    // Prefer explicit percentage from levelingFramework
    if (evidence.levelingFramework?.confidencePercentage !== undefined) {
      return evidence.levelingFramework.confidencePercentage;
    }
    
    // Try to parse from match string (e.g., "75% confident")
    const matchStr = evidence.levelingFramework?.match || '';
    const parsed = parseFloat(matchStr.replace('% confident', '').replace('%', ''));
    if (!isNaN(parsed)) {
      return Math.round(parsed);
    }
    
    // Fallback to text-based confidence conversion
    return textConfidenceToPercentage(evidence.confidence as 'high' | 'medium' | 'low');
  };

  // Helper functions for story display (similar to EvidenceModal)
  const getLevelAssessmentColor = (assessment?: string) => {
    switch (assessment) {
      case 'exceeds': return 'bg-success text-success-foreground';
      case 'meets': return 'bg-warning text-warning-foreground';
      case 'below': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getLevelAssessmentText = (assessment?: string) => {
    switch (assessment) {
      case 'exceeds': return 'exceeds expectations';
      case 'meets': return 'meets level';
      case 'below': return 'below level';
      default: return 'Unknown';
    }
  };

  const getStoryConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-blue-600 text-white';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Provide default values if evidence is undefined
  if (!evidence) {
    return null;
  }

  const locationHref = typeof window !== 'undefined' ? window.location.href : '';
  const disputeMetadata = {
    currentLevel: evidence.currentLevel,
    nextLevel: evidence.nextLevel,
    confidence: evidence.confidence,
    confidencePercentage: getConfidencePercentage(),
    resumeEvidence: evidence.resumeEvidence,
    storyIds: evidence.storyEvidence?.stories?.map((story) => story.id),
    storyTitles: evidence.storyEvidence?.stories?.map((story) => story.title),
    gaps: evidence.gaps,
    location: locationHref,
  };

  const combinedMetrics = [
    ...(evidence.outcomeMetrics?.roleLevel || []),
    ...(evidence.outcomeMetrics?.storyLevel || []),
  ]
    .map((metric) => metric?.trim())
    .filter(Boolean) as string[];

  const uniqueMetrics = Array.from(
    new Set(
      combinedMetrics.filter((metric) => metric.trim().length > 0 && !/^[%+\-]?$/.test(metric.trim()))
    )
  );
  const scopeSignals = buildScopeSignals(uniqueMetrics).slice(0, 8);

  const impactLevel = evidence.outcomeMetrics?.analysis?.impactLevel;
  const impactLabelMap: Record<string, string> = {
    feature: 'Feature level',
    team: 'Team level',
    org: 'Org level',
    company: 'Company level',
  };
  const impactLabel = impactLevel ? (impactLabelMap[impactLevel] || impactLevel) : 'N/A';
  const scopeSummary = scopeSignals.length > 0
    ? `Evidence includes ${scopeSignals.slice(0, 3).map((signal) => signal.metric).join(', ')}.`
    : 'No explicit scope signals detected yet.';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Don't close if feedback modal is open
        onClose();
      }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Evidence for {evidence.currentLevel} Assessment
              </DialogTitle>
              <DialogDescription className="text-base">
                    How we determined your current level
              </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                <DisputeFeedbackDialog
                  subject={`PM Level dispute: ${evidence.currentLevel} → ${evidence.nextLevel}`}
                  metadata={disputeMetadata}
                />
            </div>
          </div>
        </DialogHeader>

        <div>
                      {/* Level Summary */}
            <Card className="section-spacing">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Level Assessment Summary</CardTitle>
                <Badge className={getConfidenceBadgeColor(getConfidencePercentage())}>
                  {getConfidencePercentage()}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{evidence.currentLevel}</div>
                  <div className="text-muted-foreground">Current Level</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{evidence.nextLevel}</div>
                  <div className="text-muted-foreground">Next Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Evidence */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {isLinkedInScrapingEnabled() ? 'Resume & LinkedIn Evidence' : 'Resume Evidence'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Role Titles & Progression</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {(evidence.resumeEvidence?.roleTitles || []).map((title, index, array) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant="outline">
                      {title}
                    </Badge>
                      {index < array.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Companies</h4>
                <div className="flex flex-wrap gap-2">
                  {(evidence.resumeEvidence?.companyScale || []).map((company, index) => (
                    <Badge key={index} variant="secondary">
                      {company}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Experience</h4>
                <p className="text-sm text-muted-foreground">{evidence.resumeEvidence?.duration || 'N/A'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Scope Evidence */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Scope Evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="text-muted-foreground">
                Impact: <Badge variant="outline">{impactLabel}</Badge>
              </div>
              <p className="text-muted-foreground">{scopeSummary}</p>
            </CardContent>
          </Card>

          {/* Leveling Framework */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Leveling Framework for {evidence.currentLevel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <CriteriaDisplay criteria={evidence.levelingFramework?.metCriteria || []} />
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Tags That Contributed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(evidence.storyEvidence?.tagDensity || []).map((tag) => (
                  <Badge key={tag.tag} variant="outline">
                    {tag.tag} ({tag.count})
                  </Badge>
                ))}
                </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Outcome Metrics{uniqueMetrics.length > 0 ? ` (${uniqueMetrics.length})` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeMetrics
                metrics={uniqueMetrics}
              />
            </CardContent>
          </Card>

          {/* Stories */}
          <div className="section-spacing">
            <h3 className="text-lg font-semibold mb-4">
              {evidence.storyEvidence?.relevantStories || 0} {evidence.storyEvidence?.relevantStories === 1 ? 'Relevant Story' : 'Relevant Stories'}
            </h3>
            <div className="space-y-4">
              {(evidence.storyEvidence?.stories || []).map((story) => (
                <StoryCard
                  key={story.id}
                  id={story.id}
                  title={story.title}
                  content={story.content}
                  sourceCompany={story.sourceCompany}
                  sourceRole={story.sourceRole}
                  tags={story.tags}
                  levelAssessment={story.levelAssessment}
                  confidence={story.confidence}
                  getLevelAssessmentColor={getLevelAssessmentColor}
                  getLevelAssessmentText={getLevelAssessmentText}
                  getStoryConfidenceColor={getStoryConfidenceColor}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default LevelEvidenceModal;
