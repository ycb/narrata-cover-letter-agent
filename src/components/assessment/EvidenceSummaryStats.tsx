import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getConfidenceBadgeColor } from "@/utils/confidenceBadge";

interface StatItem {
  label: string;
  value: number;
}

interface EvidenceSummaryStatsProps {
  title?: string;
  stats: StatItem[];
  confidence?: number;
  confidenceLabel?: string;
  className?: string;
}

export function EvidenceSummaryStats({
  title = "Summary",
  stats,
  confidence,
  confidenceLabel,
  className = "section-spacing"
}: EvidenceSummaryStatsProps) {
  // Determine grid columns based on number of stats
  const gridCols = stats.length === 3 
    ? "grid-cols-1 md:grid-cols-3" 
    : stats.length === 4 
    ? "grid-cols-2 md:grid-cols-4"
    : "grid-cols-1 md:grid-cols-3";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {confidence !== undefined && (
            <Badge className={getConfidenceBadgeColor(confidence)}>
              {confidence}% {confidenceLabel || "confidence"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={`grid ${gridCols} gap-4 text-sm`}>
          {stats.map((stat, index) => {
            // Use singular form if value is 1, otherwise use plural
            const displayLabel = stat.value === 1 
              ? stat.label.replace(/s$/, '') // Remove trailing 's' for singular
              : stat.label;
            
            return (
              <div key={index} className="text-center p-3 bg-muted/20 rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-muted-foreground">{displayLabel}</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

