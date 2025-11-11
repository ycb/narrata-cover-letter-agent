import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  ArrowRight
} from "lucide-react";
import { getConfidenceBadgeColor, textConfidenceToPercentage } from "@/utils/confidenceBadge";
import { CriteriaDisplay } from "./CriteriaDisplay";

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

  // Provide default values if evidence is undefined
  if (!evidence) {
    return null;
  }

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
                Evidence for {evidence.currentLevel} Assessment
              </DialogTitle>
              <DialogDescription className="text-base">
                How we determined your current level
              </DialogDescription>
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
                Resume & LinkedIn Evidence
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
                Outcome Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeMetrics
                metrics={[
                  ...(evidence.outcomeMetrics?.roleLevel || []),
                  ...(evidence.outcomeMetrics?.storyLevel || [])
                ].filter((metric, index, arr) => {
                  // Remove duplicates and invalid metrics
                  return metric && 
                         metric.trim().length > 0 && 
                         !/^[%+\-]?$/.test(metric.trim()) &&
                         arr.indexOf(metric) === index; // Remove duplicates
                })}
              />
            </CardContent>
          </Card>

          {/* Stories */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Stories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{evidence.storyEvidence?.relevantStories || 0}</div>
                <div className="text-sm text-muted-foreground">
                  {evidence.storyEvidence?.relevantStories === 1 ? 'Story' : 'Stories'} relevant to {evidence.currentLevel}
                </div>
              </div>
              {/* TODO: Add list of individual stories when story data is available in LevelEvidence */}
            </CardContent>
          </Card>


        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default LevelEvidenceModal;
