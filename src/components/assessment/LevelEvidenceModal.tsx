import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  Building, 
  User, 
  FileText,
  Target, 
  TrendingUp,
  BarChart3,
  Edit
} from "lucide-react";
import FeedbackModal from "./FeedbackModal";

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
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Don't close if feedback modal is open
        if (!open && isFeedbackModalOpen) return;
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
                How we determined your current level and path to {evidence.nextLevel}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button 
                variant="secondary" 
                size="sm" 
                className="flex items-center gap-2"
                onClick={() => setIsFeedbackModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
                This looks wrong
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div>
                      {/* Level Summary */}
            <Card className="section-spacing">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Level Assessment Summary</CardTitle>
                <Badge className={getConfidenceColor(evidence.confidence)}>
                  {evidence.confidence} confidence
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.currentLevel}</div>
                  <div className="text-muted-foreground">Current Level</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.nextLevel}</div>
                  <div className="text-muted-foreground">Next Level</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.storyEvidence.totalStories}</div>
                  <div className="text-muted-foreground">Total Stories</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resume Evidence */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Resume & LinkedIn Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Role Titles & Progression</h4>
                <div className="flex flex-wrap gap-2">
                  {evidence.resumeEvidence.roleTitles.map((title, index) => (
                    <Badge key={index} variant="outline">
                      {title}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Experience Duration</h4>
                <p className="text-sm text-muted-foreground">{evidence.resumeEvidence.duration}</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Company Scale</h4>
                <div className="flex flex-wrap gap-2">
                  {evidence.resumeEvidence.companyScale.map((scale, index) => (
                    <Badge key={index} variant="secondary">
                      {scale}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Blurb Evidence */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Content & Story Evidence
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.storyEvidence.relevantStories}</div>
                  <div className="text-sm text-muted-foreground">Relevant to {evidence.currentLevel}</div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.storyEvidence.totalStories}</div>
                  <div className="text-sm text-muted-foreground">Total Approved Stories</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tag Density Analysis</h4>
                <div className="flex flex-wrap gap-2">
                  {evidence.storyEvidence.tagDensity.map((tag) => (
                    <Badge key={tag.tag} variant="outline">
                      {tag.tag} ({tag.count})
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leveling Framework */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Leveling Framework Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{evidence.levelingFramework.framework}</h4>
                  <p className="text-sm text-muted-foreground">Framework used for assessment</p>
                </div>
                <Badge variant="secondary">{evidence.levelingFramework.match}</Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Key Criteria Met</h4>
                <ul className="space-y-1">
                  {evidence.levelingFramework.criteria.map((criterion, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-success mt-2 flex-shrink-0" />
                      {criterion}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Gaps to Next Level */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Gaps to {evidence.nextLevel}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidence.gaps.map((gap, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">{gap.area}</h4>
                  <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                  <div className="text-xs text-muted-foreground">
                    <strong>Examples:</strong> {gap.examples.join(', ')}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Outcome Metrics */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Outcome Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <OutcomeMetrics 
                metrics={[
                  ...evidence.outcomeMetrics.roleLevel,
                  ...evidence.outcomeMetrics.storyLevel
                ]} 
              />
            </CardContent>
          </Card>


        </div>
      </DialogContent>
      </Dialog>
      
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        title="Level Assessment Feedback"
      />
    </>
  );
};

export default LevelEvidenceModal;
