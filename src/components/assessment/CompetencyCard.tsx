import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceProgressColor, getConfidenceBadgeColor } from "@/utils/confidenceBadge";

interface CompetencyCardProps {
  domain: string;
  level: string;
  score: number;
  description: string;
  onViewEvidence: () => void;
  className?: string;
}

export const CompetencyCard = ({
  domain,
  level,
  score,
  description,
  onViewEvidence,
  className
}: CompetencyCardProps) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "Advanced":
        return "bg-green-100 text-green-800 border-green-200";
      case "Proficient":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Needs Work":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Developing":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-muted text-foreground border-muted";
    }
  };

  // Progress color now based on score percentage, not level label
  // This ensures consistency with confidence badge colors

  return (
    <Card className={cn(
      "assessment-card group",
      className
    )}>
      <CardContent className="assessment-card-content">
        {/* Header: Domain and Level Badge */}
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg text-foreground pr-4">
            {domain}
          </h3>
          <Badge className={cn("text-sm", getConfidenceBadgeColor(score))}>
            {level}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={score} 
          className={cn("h-2", getConfidenceProgressColor(score))}
        />

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {/* CTA Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={onViewEvidence}
        >
          View Evidence
          <TrendingUp className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};
