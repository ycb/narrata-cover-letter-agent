import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfidenceBar } from "@/components/ui/confidence-bar";
import { 
  TrendingUp,
  Target,
  Loader2,
  AlertCircle
} from "lucide-react";
import type { PMLevelInference } from "@/types/content";
import { Link } from "react-router-dom";

interface LevelCardProps {
  levelData: PMLevelInference | null;
  isLoading?: boolean;
  onRecalculate?: () => void;
}

export function LevelCard({ levelData, isLoading, onRecalculate }: LevelCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">PM Level Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground">Analyzing your experience...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!levelData) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">PM Level Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Level Data</h3>
            <p className="text-muted-foreground mb-4">
              Upload your resume or work history to get your PM level assessment.
            </p>
            {onRecalculate && (
              <Button onClick={onRecalculate} variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Run Assessment
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidencePercentage = Math.round(levelData.confidence * 100);

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Current PM Level</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level Display */}
          <div className="text-center py-4">
            <div className="text-3xl font-bold text-foreground">
              {levelData.displayLevel}
            </div>
          </div>

          {/* Confidence Bar */}
          <ConfidenceBar percentage={confidencePercentage} showLabel={false} />

          {/* Delta Summary (internal notes only; not user-facing) */}

          {/* Action Button */}
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/assessment/overall-level?section=overall-level&evidence=overall">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Evidence
            </Link>
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
