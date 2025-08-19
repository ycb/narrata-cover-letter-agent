import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
      case "Strong": return "text-success border-success/20";
      case "Solid": return "text-blue-600 border-blue-200";
      case "Emerging": return "text-warning border-warning/20";
      case "Needs More Evidence": return "text-muted-foreground border-muted";
      default: return "text-foreground border-muted";
    }
  };

  const getProgressColor = (level: string) => {
    switch (level) {
      case "Strong": return "[&>div]:bg-success";
      case "Solid": return "[&>div]:bg-blue-500";
      case "Emerging": return "[&>div]:bg-warning";
      default: return "[&>div]:bg-muted-foreground";
    }
  };

  return (
    <Card className={cn(
      "shadow-soft hover:shadow-medium transition-all duration-200 group",
      className
    )}>
      <CardContent className="p-6">
        {/* Header: Domain and Level Badge */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground pr-4">
            {domain}
          </h3>
          <Badge variant="outline" className={cn("text-sm", getLevelColor(level))}>
            {level}
          </Badge>
        </div>

        {/* Progress Bar */}
        <Progress 
          value={score} 
          className={cn("h-2 mb-4", getProgressColor(level))}
        />

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
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
