import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchPill } from "./MatchPill";
import { TrendingUp, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

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
  return (
    <Card className={cn(
      "assessment-card group",
      className
    )}>
      <CardContent className="p-6">
        {/* Header: Title and Match Pill */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-semibold text-lg text-foreground pr-4">
            {type}
          </h3>
          <MatchPill match={match} />
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Experience Level */}
        {experienceLevel && (
          <div className="text-xs text-muted-foreground mb-4">
            Experience: {experienceLevel}
          </div>
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
