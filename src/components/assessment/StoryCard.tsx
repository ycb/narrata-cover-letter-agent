import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, User } from "lucide-react";

interface StoryCardProps {
  id: string;
  title: string;
  content: string;
  sourceCompany: string;
  sourceRole: string;
  tags: string[];
  levelAssessment?: 'exceeds' | 'meets' | 'below';
  confidence?: 'high' | 'medium' | 'low';
  getLevelAssessmentColor?: (assessment?: string) => string;
  getLevelAssessmentText?: (assessment?: string) => string;
  getStoryConfidenceColor?: (confidence: string) => string;
}

export function StoryCard({
  id,
  title,
  content,
  sourceCompany,
  sourceRole,
  tags,
  levelAssessment,
  confidence,
  getLevelAssessmentColor,
  getLevelAssessmentText,
  getStoryConfidenceColor
}: StoryCardProps) {
  return (
    <Card key={id}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base mb-2">{title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {sourceCompany}
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {sourceRole}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {levelAssessment && getLevelAssessmentColor && getLevelAssessmentText && (
              <Badge className={getLevelAssessmentColor(levelAssessment)}>
                {getLevelAssessmentText(levelAssessment)}
              </Badge>
            )}
            {confidence && getStoryConfidenceColor && (
              <Badge className={getStoryConfidenceColor(confidence)}>
                {confidence} relevance
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
          {content}
        </p>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

