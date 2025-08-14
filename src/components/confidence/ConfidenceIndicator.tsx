import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface ConfidenceIndicatorProps {
  level: 'high' | 'medium' | 'low';
  score: number;
  reasoning?: string;
  matchType?: 'direct' | 'adjacent' | 'inferred';
}

export const ConfidenceIndicator = ({ level, score, reasoning, matchType }: ConfidenceIndicatorProps) => {
  const config = {
    high: { 
      color: 'bg-success text-success-foreground', 
      label: 'High Confidence',
      description: 'Strong match based on direct experience'
    },
    medium: { 
      color: 'bg-warning text-warning-foreground', 
      label: 'Medium Confidence',
      description: 'Good match with some adaptation needed'
    },
    low: { 
      color: 'bg-destructive text-destructive-foreground', 
      label: 'Low Confidence',
      description: 'Requires significant customization'
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Badge className={config[level].color}>
              {config[level].label} ({score}%)
            </Badge>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{config[level].description}</p>
            {matchType && (
              <p className="text-sm">Match Type: <span className="capitalize">{matchType}</span></p>
            )}
            {reasoning && (
              <p className="text-sm text-muted-foreground">{reasoning}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};