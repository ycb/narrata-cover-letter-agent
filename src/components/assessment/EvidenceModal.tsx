import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { Building, User, CheckCircle2, HelpCircle } from "lucide-react";
import { calculateEvidenceBasedConfidence } from "@/utils/confidenceCalculation";
import { getConfidenceBadgeColor } from "@/utils/confidenceBadge";

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
    // Determine if criteria are met based on competency score (>= 2.5 is met)
    const isMet = (competencyScore !== undefined && competencyScore >= 2.5);
    
    return criteria.map(criterion => ({
      criterion,
      met: isMet
    }));
  };

  const competencyCriteria = getCompetencyCriteria(competency);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Don't close if feedback modal is open
        onClose();
      }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Evidence for {competency}
              </DialogTitle>
              <DialogDescription className="text-base">
                Supporting examples from your work history and stories
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div>
          {/* Summary Stats */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Summary</CardTitle>
                <Badge className={getConfidenceBadgeColor(getConfidencePercentage())}>
                  {getConfidencePercentage()}% confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{evidence?.length || 0}</div>
                  <div className="text-muted-foreground">Supporting Examples</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{matchedTags?.length || 0}</div>
                  <div className="text-muted-foreground">Matched Tags</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{storiesMeetingLevel}</div>
                  <div className="text-muted-foreground">Stories Meeting Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

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
              {(() => {
                const metCount = competencyCriteria.filter(c => c.met).length;
                const unmetCount = competencyCriteria.filter(c => !c.met).length;
                const allMet = unmetCount === 0;
                const noneMet = metCount === 0;
                const hasBoth = metCount > 0 && unmetCount > 0;

                // Single column layout when all met or none met
                if (allMet || noneMet) {
                  return (
                    <div>
                      {allMet && (
                        <div className="text-sm text-muted-foreground mb-2 font-semibold">All criteria met 😊</div>
                      )}
                      {noneMet && (
                        <div className="text-sm text-muted-foreground mb-2 font-semibold">No criteria met 😢</div>
                      )}
                      <ul className="space-y-2">
                        {competencyCriteria.map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            {item.met ? (
                              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            ) : (
                              <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <span>{item.criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                }

                // Two column layout when mixed (met and unmet)
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Met Criteria - Left Column */}
                    <div>
                      <ul className="space-y-2">
                        {competencyCriteria.filter(c => c.met).map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span>{item.criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Unmet/TBD Criteria - Right Column */}
                    <div>
                      <ul className="space-y-2">
                        {competencyCriteria.filter(c => !c.met).map((item, index) => (
                          <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <span>{item.criterion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Matched Tags */}
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

          {/* Outcome Metrics */}
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

          {/* Evidence Stories */}
          <div className="section-spacing">
            <h3 className="text-lg font-semibold mb-4">Supporting Examples</h3>
            <div className="space-y-4">
              {(evidence || []).map((story) => (
                <Card key={story.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">{story.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {story.sourceCompany}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {story.sourceRole}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {story.levelAssessment && (
                        <Badge className={getLevelAssessmentColor(story.levelAssessment)}>
                          {getLevelAssessmentText(story.levelAssessment)}
                        </Badge>
                      )}
                      <Badge className={getStoryConfidenceColor(story.confidence)}>
                        {story.confidence} relevance
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {story.content}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {story.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          </div>


        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default EvidenceModal;
