import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompetencyCoverage } from "@/types/dashboard";
import { 
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";

interface CoverageMapSimplifiedProps {
  coverage: CompetencyCoverage[];
  overallCoverage: number;
  priorityGaps: string[];
}

export function CoverageMapSimplified({ coverage, overallCoverage, priorityGaps }: CoverageMapSimplifiedProps) {
  // Group competencies by gap level
  const strongCompetencies = coverage.filter(c => c.gap === 'low');
  const needsAttention = coverage.filter(c => c.gap === 'medium');
  const criticalGaps = coverage.filter(c => c.gap === 'high');

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">
          PM Skills Coverage
        </CardTitle>
          <div className="text-sm">
            <Badge variant="secondary" className="text-base px-3 py-1">
              {overallCoverage}% Overall Coverage
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Critical Gaps - Most Important (Limit to 2) */}
          {criticalGaps.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold text-destructive uppercase tracking-wide">
                ⛔ Critical Gaps
              </h4>
              {criticalGaps.slice(0, 2).map((item) => (
                <div key={item.competency.id} className="p-4 border-2 border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-base">{item.competency.name}</h5>
                    <Badge variant="destructive">
                      {item.coverage}% coverage
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Strengthen your <strong>Product Strategy</strong> skills
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    for <strong>Senior PM</strong> at <strong>TechCorp</strong>
                  </p>
                  <Button variant="destructive" size="sm" asChild>
                    <Link to={`/work-history?tab=stories&competency=${item.competency.id}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Story
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Show "See more critical gaps" if there are additional ones */}
          {criticalGaps.length > 2 && (
            <div className="text-center pt-4">
              <Button variant="secondary" size="sm" asChild>
                <Link to="/work-history?tab=stories&filter=critical-gaps">
                  See {criticalGaps.length - 2} more critical gaps
                </Link>
              </Button>
            </div>
          )}

          {/* Needs Attention - Only show if we have less than 2 critical gaps */}
          {needsAttention.length > 0 && criticalGaps.length < 2 && (
            <div className="space-y-4 pt-8">
              <h4 className="text-base font-semibold text-warning uppercase tracking-wide">
                ⚠️ Needs Attention
              </h4>
              {needsAttention.slice(0, 2 - criticalGaps.length).map((item) => (
                <div key={item.competency.id} className="p-4 border border-warning/20 bg-warning/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-semibold text-base">{item.competency.name}</h5>
                    <Badge variant="secondary">
                      {item.coverage}% coverage
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Strengthen your <strong>Customer Insight</strong> skills
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    for <strong>PM</strong> at <strong>Startup XYZ</strong>
                  </p>
                  <Button variant="secondary" size="sm" asChild>
                    <Link to={`/work-history?tab=stories&competency=${item.competency.id}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Story
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Strong Areas - Consistent with other sections */}
          {strongCompetencies.length > 0 && (
            <div className="space-y-4 pt-8">
              <h4 className="text-base font-semibold text-success uppercase tracking-wide">
                ✅ Strong Areas
              </h4>
              <div className="space-y-3">
                {strongCompetencies.map((item) => (
                  <div key={item.competency.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-base">{item.competency.name}</span>
                      <Badge variant="secondary">
                        {item.coverage}% coverage
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
