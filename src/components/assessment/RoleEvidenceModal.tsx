import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  Building, 
  Target, 
  FileText,
  TrendingUp,
  MessageSquare,
  Edit,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Tag,
  Puzzle,
  Settings,
  BarChart3,
  TrendingDown
} from "lucide-react";
import { useState } from "react";
import { MatchPill } from "./MatchPill";

interface RoleEvidence {
  roleType: string;
  matchScore: number;
  description: string;
  industryPatterns: {
    pattern: string;
    match: boolean;
    examples: string[];
  }[];
  problemComplexity: {
    level: string;
    examples: string[];
    evidence: string[];
  };
  workHistory: {
    company: string;
    role: string;
    relevance: string;
    tags: string[];
  }[];
  tagAnalysis: {
    tag: string;
    count: number;
    relevance: number;
    examples: string[];
  }[];
  gaps: {
    area: string;
    description: string;
    suggestions: string[];
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

interface RoleEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: RoleEvidence;
}

const RoleEvidenceModal = ({ isOpen, onClose, evidence }: RoleEvidenceModalProps) => {
  const [isTagAnalysisOpen, setIsTagAnalysisOpen] = useState(false);

  const getRelevanceColor = (relevance: string) => {
    if (relevance.includes("High")) return "bg-success text-success-foreground";
    if (relevance.includes("Medium")) return "bg-blue-600 text-white";
    if (relevance.includes("Low")) return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Don't close if feedback modal is open
        onClose();
      }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Sticky Header */}
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Evidence for {evidence.roleType} Match
              </DialogTitle>
              <DialogDescription className="text-base">
                How we determined your fit for this specialization
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Summary Tiles */}
          <div className="summary-grid">
            <div className="summary-tile">
              <div className="summary-tile-value">
                {evidence.matchScore}%
              </div>
              <div className="summary-tile-label">Match</div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-value">
                {evidence.workHistory.length}
              </div>
              <div className="summary-tile-label">Relevant Roles</div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-value">
                {evidence.tagAnalysis.length}
              </div>
              <div className="summary-tile-label">Key Tags</div>
            </div>
            <div className="summary-tile">
              <div className="summary-tile-value">
                {evidence.industryPatterns.filter(p => p.match).length}
              </div>
              <div className="summary-tile-label">Patterns Matched</div>
            </div>
          </div>

          {/* Section 1: Industry Pattern Analysis */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Puzzle className="h-5 w-5" />
                Industry Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidence.industryPatterns.map((pattern, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{pattern.pattern}</h4>
                    {pattern.match ? (
                      <CheckCircle className="h-5 w-5 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Examples:</strong> {pattern.examples.join(', ')}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 2: Problem Complexity */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Problem Complexity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Complexity Level</h4>
                <Badge variant="outline">{evidence.problemComplexity.level}</Badge>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Problem Types Addressed</h4>
                <div className="flex flex-wrap gap-2">
                  {evidence.problemComplexity.examples.map((example, index) => (
                    <Badge key={index} variant="secondary">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Relevant Work History */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relevant Work History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {evidence.workHistory.map((work, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{work.role}</h4>
                      <p className="text-sm text-muted-foreground">{work.company}</p>
                    </div>
                    <Badge className={getRelevanceColor(work.relevance)}>
                      {work.relevance}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {work.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Section 4: Tag Relevance (Collapsible) */}
          <Collapsible open={isTagAnalysisOpen} onOpenChange={setIsTagAnalysisOpen}>
            <Card className="section-spacing">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-5 w-5" />
                      Tag Relevance Analysis
                    </div>
                    {isTagAnalysisOpen ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-3">
                  {evidence.tagAnalysis.map((tag) => (
                    <div key={tag.tag} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{tag.tag}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{tag.count} uses</Badge>
                          <Badge variant="secondary">{tag.relevance}% relevant</Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Examples:</strong> {tag.examples.join(', ')}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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

          {/* Section 5: Areas for Improvement */}
          {evidence.gaps.length > 0 && (
            <Card className="section-spacing">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {evidence.gaps.map((gap, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">{gap.area}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Suggestions:</strong> {gap.suggestions.join(', ')}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
      </Dialog>
    </>
  );
};

export default RoleEvidenceModal;
