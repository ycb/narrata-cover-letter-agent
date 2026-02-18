import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceProgressColor, getConfidenceBadgeColor } from "@/utils/confidenceBadge";

interface CompetencyCardProps {
  domain: string;
  level: string;
  score: number;
  insufficientEvidence?: boolean;
  description: string;
  onViewEvidence: () => void;
  className?: string;
}

export const CompetencyCard = ({
  domain,
  level,
  score,
  insufficientEvidence = false,
  description,
  onViewEvidence,
  className
}: CompetencyCardProps) => {
  return (
    <Card
      className={cn(
      "assessment-card group",
      className
      )}
    >
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
        <div className="mt-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Confidence</span>
            <span>{score}%</span>
          </div>
        <Progress 
          value={score} 
            className={cn("h-2", getConfidenceProgressColor(score))}
        />
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
        {insufficientEvidence && (
          <p className="text-xs text-amber-700">
            Limited grounded evidence in your current stories. Add targeted examples.
          </p>
        )}

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
