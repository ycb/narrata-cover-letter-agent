import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LastLetterSent as LastLetterSentType } from "@/types/dashboard";
import { 
  FileText, 
  Calendar,
  Building,
  User,
  Copy,
  Eye,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";

interface LastLetterSentProps {
  lastLetter: LastLetterSentType | null;
}

export function LastLetterSent({ lastLetter }: LastLetterSentProps) {
  if (!lastLetter) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Last Letter Sent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Letters Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first cover letter to get started.
            </p>
            <Button asChild>
              <Link to="/cover-letter-template">
                <Plus className="h-4 w-4 mr-2" />
                Create Letter
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: 'draft' | 'sent' | 'approved') => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />;
      case 'sent':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: 'draft' | 'sent' | 'approved') => {
    switch (status) {
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'default';
      case 'approved':
        return 'default';
    }
  };

  const getStatusText = (status: 'draft' | 'sent' | 'approved') => {
    switch (status) {
      case 'draft':
        return 'Draft';
      case 'sent':
        return 'Sent';
      case 'approved':
        return 'Approved';
    }
  };

  const getCompetencyColor = (competency: string) => {
    const colors = {
      'execution': 'bg-blue-100 text-blue-800',
      'insight': 'bg-green-100 text-green-800',
      'strategy': 'bg-purple-100 text-purple-800',
      'influence': 'bg-orange-100 text-orange-800'
    };
    return colors[competency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Last Letter Sent
          </CardTitle>
          <Badge variant={getStatusVariant(lastLetter.status)}>
            {getStatusIcon(lastLetter.status)}
            <span className="ml-1">{getStatusText(lastLetter.status)}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Letter Header */}
          <div className="space-y-2">
            <h3 className="font-medium text-lg">{lastLetter.title}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {lastLetter.company}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {lastLetter.role}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(lastLetter.sentDate).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Sections Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Letter Sections
            </h4>
            <div className="space-y-2">
              {lastLetter.sections.map((section) => (
                <div key={section.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {section.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {section.content.substring(0, 60)}...
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getCompetencyColor(section.competency)}`}
                  >
                    {section.competency}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/cover-letter-template?id=${lastLetter.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                View Letter
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cover-letter-template">
                <Copy className="h-4 w-4 mr-2" />
                Use as Template
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/cover-letters">
                <FileText className="h-4 w-4 mr-2" />
                View All Letters
              </Link>
            </Button>
          </div>

          {/* Competency Summary */}
          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Competencies Used
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(lastLetter.sections.map(s => s.competency))).map((competency) => (
                <Badge 
                  key={competency}
                  variant="outline" 
                  className={`text-xs ${getCompetencyColor(competency)}`}
                >
                  {competency}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
