import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Tag, Building, User, Calendar, Target, Edit, FileText } from "lucide-react";

interface EvidenceBlurb {
  id: string;
  title: string;
  content: string;
  tags: string[];
  sourceRole: string;
  sourceCompany: string;
  lastUsed: string;
  timesUsed: number;
  confidence: 'high' | 'medium' | 'low';
}

interface EvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  competency: string;
  evidence: EvidenceBlurb[];
  matchedTags: string[];
  overallConfidence: 'high' | 'medium' | 'low';
}

const EvidenceModal = ({ 
  isOpen, 
  onClose, 
  competency, 
  evidence, 
  matchedTags, 
  overallConfidence 
}: EvidenceModalProps) => {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-success text-success-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getConfidenceText = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'High confidence';
      case 'medium': return 'Medium confidence';
      case 'low': return 'Low confidence';
      default: return 'Unknown confidence';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                Evidence for {competency}
              </DialogTitle>
              <DialogDescription className="text-base">
                Supporting examples from your work history and blurbs
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 mt-4">
                              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <Edit className="h-4 w-4" />
                This looks wrong
              </Button>
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div>
          {/* Summary Stats */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Summary</CardTitle>
                <Badge className={getConfidenceColor(overallConfidence)}>
                  {getConfidenceText(overallConfidence)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{evidence.length}</div>
                  <div className="text-muted-foreground">Supporting Examples</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{matchedTags.length}</div>
                  <div className="text-muted-foreground">Matched Tags</div>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(evidence.reduce((sum, b) => sum + b.timesUsed, 0) / evidence.length)}
                  </div>
                  <div className="text-muted-foreground">Avg Usage</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How This Was Scored */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                How This Was Scored
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Your {competency} score is based on:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Number of relevant blurbs and stories</li>
                <li>Tag density and relevance to competency</li>
                <li>Complexity and scale of problems addressed</li>
                <li>Leadership and cross-functional collaboration signals</li>
                <li>Recency and frequency of usage</li>
              </ul>
            </CardContent>
          </Card>

          {/* Matched Tags */}
          <Card className="section-spacing">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Tag className="h-5 w-5" />
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

          {/* Evidence Blurbs */}
          <div className="section-spacing">
            <h3 className="text-lg font-semibold">Supporting Examples</h3>
            {evidence.map((blurb) => (
              <Card key={blurb.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">{blurb.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {blurb.sourceCompany}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {blurb.sourceRole}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Used {blurb.timesUsed} times
                        </div>
                      </div>
                    </div>
                    <Badge className={getConfidenceColor(blurb.confidence)}>
                      {blurb.confidence} confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {blurb.content}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {blurb.tags.map((tag) => (
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
      </DialogContent>
    </Dialog>
  );
};

export default EvidenceModal;
