import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building, 
  Target, 
  FileText, 
  TrendingUp,
  MessageSquare,
  Edit,
  CheckCircle,
  AlertCircle
} from "lucide-react";

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
}

interface RoleEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidence: RoleEvidence;
}

const RoleEvidenceModal = ({ isOpen, onClose, evidence }: RoleEvidenceModalProps) => {
  const getMatchColor = (score: number) => {
    if (score >= 80) return 'bg-success text-success-foreground';
    if (score >= 60) return 'bg-primary text-primary-foreground';
    if (score >= 40) return 'bg-warning text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getMatchText = (score: number) => {
    if (score >= 80) return 'Strong Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Partial Match';
    return 'Limited Match';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">
            Evidence for {evidence.roleType} Match
          </DialogTitle>
          <DialogDescription className="text-base">
            How we determined your fit for this role specialization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Match Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Role Match Summary</CardTitle>
                <div className="flex items-center gap-3">
                  <Badge className={getMatchColor(evidence.matchScore)}>
                    {evidence.matchScore}% match
                  </Badge>
                  <Badge variant="outline">
                    {getMatchText(evidence.matchScore)}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {evidence.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {evidence.workHistory.length}
                  </div>
                  <div className="text-muted-foreground">Relevant Roles</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {evidence.tagAnalysis.length}
                  </div>
                  <div className="text-muted-foreground">Key Tags</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {evidence.industryPatterns.filter(p => p.match).length}
                  </div>
                  <div className="text-muted-foreground">Patterns Matched</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry Patterns */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                Industry Pattern Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Problem Complexity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Problem Complexity Analysis
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
              
              <div>
                <h4 className="font-medium mb-2">Supporting Evidence</h4>
                <ul className="space-y-1">
                  {evidence.problemComplexity.evidence.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Work History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relevant Work History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {evidence.workHistory.map((work, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{work.role}</h4>
                      <p className="text-sm text-muted-foreground">{work.company}</p>
                    </div>
                    <Badge variant="outline">{work.relevance}</Badge>
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

          {/* Tag Analysis */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tag Relevance Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
          </Card>

          {/* Gaps & Improvements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Feedback Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Help Improve This Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full">
                <Edit className="h-4 w-4 mr-2" />
                This Role Assessment Looks Wrong
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Your feedback helps us improve accuracy for you and other users
              </p>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleEvidenceModal;
