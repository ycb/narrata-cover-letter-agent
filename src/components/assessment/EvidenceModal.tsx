import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceBadgeColor } from "@/utils/confidenceBadge";
import { EvidenceSummaryStats } from "./EvidenceSummaryStats";
import { CriteriaDisplay } from "./CriteriaDisplay";
import { StoryCard } from "./StoryCard";
import { DisputeFeedbackDialog } from "./DisputeFeedbackDialog";

interface EvidenceStory {
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
}

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  competency: string;
  evidence: EvidenceStory[];
  matchedTags: string[];
  overallConfidence: 'high' | 'medium' | 'low';
  competencyScore?: number; // 0-3 scale for percentage calculation
  currentLevel?: string; // Current PM level for criteria title
}

const EvidenceModal = ({ 
  isOpen, 
  onClose, 
  competency, 
  evidence,
  matchedTags,
  overallConfidence,
  competencyScore,
  currentLevel
}: EvidenceModalProps) => {
  // Calculate confidence percentage using shared utility
  const getConfidencePercentage = (): number => {
    return calculateEvidenceBasedConfidence({
      competencyScore,
      evidence,
      matchedTags,
      overallConfidence
    });
  };

  // Get confidence color for story relevance (text-based: 'high', 'medium', 'low')
  const getStoryConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-blue-600 text-white';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

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

  // Count stories meeting or exceeding level
  const storiesMeetingLevel = evidence?.filter(story => 
    story.levelAssessment === 'meets' || story.levelAssessment === 'exceeds'
  ).length || 0;

  // Calculate all evidence counts
  const storyCount = evidence?.length || 0;
  const tagCount = matchedTags?.length || 0;
  
  // Count total metrics across all stories
  const metricsCount = evidence?.reduce((total, story) => {
    return total + (story.outcomeMetrics?.length || 0);
  }, 0) || 0;
  
  // Count unique roles
  const uniqueRoles = new Set(evidence?.map(story => story.sourceRole).filter(Boolean) || []);
  const roleCount = uniqueRoles.size;

  // Map competency to criteria with met/unmet status
  const getCompetencyCriteria = (competencyName: string): Array<{ criterion: string; met: boolean }> => {
    const criteriaMap: Record<string, string[]> = {
      'Product Execution': [
        'Delivering products on time and within scope',
        'Managing product development lifecycle',
        'Shipping features with measurable impact',
        'Technical understanding and collaboration with engineering'
      ],
      'Customer Insight': [
        'User research and understanding customer needs',
        'Data analysis and metrics-driven decisions',
        'Market validation and product-market fit',
        'User feedback integration'
      ],
      'Product Strategy': [
        'Product vision and roadmap planning',
        'Market analysis and competitive positioning',
        'Business model understanding',
        'Long-term thinking and planning'
      ],
      'Influencing People': [
        'Cross-functional leadership',
        'Stakeholder management',
        'Executive communication',
        'Team building and mentorship'
      ]
    };
    
    const criteria = criteriaMap[competencyName] || [];
    
    // Determine if criteria are met: requires BOTH score >= 2.5 AND evidence exists
    // If there's no evidence (0 stories, 0 tags), criteria cannot be met regardless of score
    const hasEvidence = (evidence?.length || 0) > 0 || (matchedTags?.length || 0) > 0;
    const hasSufficientScore = competencyScore !== undefined && competencyScore >= 2.5;
    const isMet = hasSufficientScore && hasEvidence;
    
    return criteria.map(criterion => ({
      criterion,
      met: isMet
    }));
  };

  const competencyCriteria = getCompetencyCriteria(competency);

  const locationHref = typeof window !== 'undefined' ? window.location.href : '';
  const disputeMetadata = {
    competency,
    currentLevel,
    overallConfidence,
    storyIds: evidence?.map((story) => story.id),
    storyTitles: evidence?.map((story) => story.title),
    matchedTags,
    location: locationHref,
  };

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
                Evidence for {competency}
              </DialogTitle>
              <DialogDescription className="text-base">
                Supporting examples from your work history and stories
              </DialogDescription>
                </div>
              </div>
              <div className="flex justify-end">
                <DisputeFeedbackDialog
                  subject={`PM Level competency dispute: ${competency}`}
                  metadata={disputeMetadata}
                />
            </div>
          </div>
        </DialogHeader>

        <div>
          {/* Summary Stats */}
            <EvidenceSummaryStats
              stats={[
                { label: "Stories", value: storyCount },
                { label: "Tags", value: tagCount },
                { label: "Metrics", value: metricsCount }
              ]}
              confidence={getConfidencePercentage()}
              confidenceLabel="confidence"
            />

          {/* How This Was Scored */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                How This Was Scored
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Your {competency} score is based on:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-foreground">
                <li>Number of relevant stories</li>
                <li>Tag density and relevance to competency</li>
                <li>Complexity and scale of problems addressed</li>
                <li>Leadership and cross-functional collaboration signals</li>
                <li>Recency and frequency of usage</li>
              </ul>
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Criteria for {competency}{currentLevel ? ` at the ${currentLevel} Level` : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CriteriaDisplay criteria={competencyCriteria} />
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
                {(matchedTags || []).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-sm">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Outcome Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeMetrics
                metrics={(evidence || [])
                  .filter(story => story.outcomeMetrics && story.outcomeMetrics.length > 0)
                  .flatMap(story => story.outcomeMetrics || [])
                }
              />
            </CardContent>
          </Card>

          {/* Stories */}
          <Card className="section-spacing">
                <CardHeader className="pb-3">
              <CardTitle className="text-lg">Stories</CardTitle>
                </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(evidence || []).map((story) => (
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
                </CardContent>
              </Card>


        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default EvidenceModal;
