import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceProgressColor, getConfidenceBadgeColor } from "@/utils/confidenceBadge";

interface SpecializationCardProps {
  type: string;
  match: number;
  description: string;
  tags?: string[];
  experienceLevel?: string;
  onViewEvidence: () => void;
  className?: string;
}

export const SpecializationCard = ({
  type,
  match,
  description,
  tags = [],
  experienceLevel,
  onViewEvidence,
  className
}: SpecializationCardProps) => {
  // Get match label based on percentage (similar to competency levels)
  const getMatchLabel = (match: number): string => {
    if (match >= 80) return 'Strong Match';
    if (match >= 60) return 'Good Match';
    if (match >= 40) return 'Moderate Match';
    return 'Weak Match';
  };

  return (
    <Card 
      className={cn(
        "assessment-card group cursor-pointer hover:shadow-md transition-all",
        className
      )}
      onClick={onViewEvidence}
    >
      <CardContent className="assessment-card-content">
        {/* Header: Title and Match Badge */}
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-foreground pr-4">
            {type}
          </h3>
          <Badge className={cn("text-sm", getConfidenceBadgeColor(match))}>
            {getMatchLabel(match)}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Confidence</span>
            <span>{match}%</span>
          </div>
          <Progress 
            value={match} 
            className={cn("h-2", getConfidenceProgressColor(match))} 
          />
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
          {description}
        </p>

        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onViewEvidence();
          }}
        >
          View Evidence
          <TrendingUp className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
