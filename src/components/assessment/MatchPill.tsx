import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchPillProps {
  match: number;
  showLabel?: boolean;
  className?: string;
}

export const MatchPill = ({ match, showLabel = true, className }: MatchPillProps) => {
  const getMatchColor = (match: number) => {
    if (match >= 80) return "bg-success text-success-foreground";
    if (match >= 60) return "bg-blue-600 text-white";
    if (match >= 40) return "bg-warning text-warning-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getMatchLabel = (match: number) => {
    if (match >= 80) return "Strong Match";
    if (match >= 60) return "Moderate Match";
    if (match >= 40) return "Weak Match";
    return "Poor Match";
  };

  return (
    <Badge 
      variant="default" 
      className={cn(
        getMatchColor(match),
        "font-semibold text-sm",
        className
      )}
    >
      {match}% match{showLabel && ` • ${getMatchLabel(match)}`}
    </Badge>
  );
};
