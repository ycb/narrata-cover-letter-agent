import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OutcomeMetrics } from "@/components/work-history/OutcomeMetrics";
import { 
  Building,
  CheckCircle2,
  HelpCircle
} from "lucide-react";
import { getConfidenceBadgeColor } from "@/utils/confidenceBadge";
import { EvidenceSummaryStats } from "./EvidenceSummaryStats";
import { CriteriaDisplay } from "./CriteriaDisplay";

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
  // Provide default values if evidence is undefined
  if (!evidence) {
    return null;
  }

  const getRelevanceColor = (relevance: string) => {
    if (relevance.includes("High")) return "bg-success text-success-foreground";
    if (relevance.includes("Medium")) return "bg-blue-600 text-white";
    if (relevance.includes("Low")) return "bg-muted text-muted-foreground";
    return "bg-muted text-muted-foreground";
  };

  // Get specialization criteria with met/unmet status
  const getSpecializationCriteria = (roleType: string): Array<{ criterion: string; met: boolean }> => {
    const criteriaMap: Record<string, string[]> = {
      'Growth PM': [
        'User acquisition and growth strategies',
        'Product-led growth (PLG) systems',
        'Metrics-driven decision making',
        'A/B testing and experimentation'
      ],
      'Platform PM': [
        'Developer-facing products',
        'API and infrastructure design',
        'Technical depth and system architecture',
        'Developer experience focus'
      ],
      'AI/ML PM': [
        'Machine learning product experience',
        'Data-driven insights and algorithms',
        'Model evaluation and performance',
        'AI/ML feature development'
      ],
      'Founding PM': [
        '0-1 product building',
        'Startup environment experience',
        'Early customer discovery',
        'Resource-constrained execution'
      ],
      'Technical PM': [
        'Deep technical products',
        'Engineering collaboration',
        'System design and architecture',
        'Technical problem-solving'
      ],
      'General PM': [
        'Broad product management skills',
        'Cross-functional leadership',
        'Feature development and delivery',
        'Stakeholder management'
      ]
    };
    
    const criteria = criteriaMap[roleType] || [];
    // Determine if criteria are met based on match score (>= 70% is met)
    const isMet = (evidence.matchScore || 0) >= 70;
    
    return criteria.map(criterion => ({
      criterion,
      met: isMet
    }));
  };

  const specializationCriteria = getSpecializationCriteria(evidence.roleType);
  
  // Get matched tags from tagAnalysis (top tags by relevance)
  const matchedTags = (evidence.tagAnalysis || [])
    .filter(tag => tag.relevance >= 50)
    .map(tag => tag.tag)
    .slice(0, 10);

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

        <div>
          {/* Summary Stats */}
          <EvidenceSummaryStats
            stats={[
              { label: "Stories", value: evidence.workHistory?.length || 0 },
              { label: "Matched Tags", value: matchedTags.length },
              { label: "Patterns Matched", value: (evidence.industryPatterns || []).filter(p => p.match).length }
            ]}
            confidence={evidence.matchScore || 0}
            confidenceLabel="Match"
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
                Your {evidence.roleType} match is based on:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-foreground">
                <li>Industry patterns and domain experience</li>
                <li>Problem complexity and scale addressed</li>
                <li>Relevance of work history to specialization</li>
                <li>Tag density and keyword alignment</li>
                <li>Outcome metrics and quantifiable impact</li>
              </ul>
              {(evidence.industryPatterns || []).length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium mb-2 text-foreground">Industry Patterns:</p>
                  <div className="space-y-2">
                    {(evidence.industryPatterns || []).map((pattern, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {pattern.match ? (
                          <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        ) : (
                          <HelpCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span>{pattern.pattern}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {evidence.problemComplexity && (
                <div className="mt-4 pt-4 border-t">
                  <p className="font-medium mb-2 text-foreground">Problem Complexity: {evidence.problemComplexity.level}</p>
                  <div className="flex flex-wrap gap-2">
                    {(evidence.problemComplexity.examples || []).map((example, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Criteria */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Criteria for {evidence.roleType}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CriteriaDisplay criteria={specializationCriteria} />
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
                {matchedTags.map((tag) => (
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
                metrics={[
                  ...(evidence.outcomeMetrics?.roleLevel || []),
                  ...(evidence.outcomeMetrics?.storyLevel || [])
                ]}
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
                {(evidence.workHistory || []).map((work, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base mb-2">{work.role}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              {work.company}
                            </div>
                          </div>
                        </div>
                        <Badge className={getRelevanceColor(work.relevance)}>
                          {work.relevance}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {(work.tags || []).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          {(evidence.gaps?.length || 0) > 0 && (
            <Card className="section-spacing">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Areas for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(evidence.gaps || []).map((gap, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <h4 className="font-medium mb-2">{gap.area}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{gap.description}</p>
                    <div className="text-xs text-muted-foreground">
                      <strong>Suggestions:</strong> {gap.suggestions?.join(', ') || 'N/A'}
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
