import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import type { LevelRecommendation, PMDimension } from "@/types/content";

interface LevelRecommendationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendations: LevelRecommendation[];
  currentLevel: string;
}

const dimensionColors: Record<PMDimension, string> = {
  execution: 'bg-blue-100 text-blue-800 border-blue-200',
  customer_insight: 'bg-purple-100 text-purple-800 border-purple-200',
  strategy: 'bg-green-100 text-green-800 border-green-200',
  influence: 'bg-orange-100 text-orange-800 border-orange-200'
};

const dimensionLabels: Record<PMDimension, string> = {
  execution: 'Execution',
  customer_insight: 'Customer Insight',
  strategy: 'Strategy',
  influence: 'Influence'
};

const priorityIcons = {
  high: AlertCircle,
  medium: Target,
  low: CheckCircle
};

export function LevelRecommendationsModal({
  isOpen,
  onClose,
  recommendations,
  currentLevel
}: LevelRecommendationsModalProps) {
  if (recommendations.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Recommendations for {currentLevel}</DialogTitle>
            <DialogDescription>
              You're on track! Keep building on your strengths.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No specific recommendations at this time. Continue adding strong stories and metrics.
            </p>
          </div>
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Sort by priority
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Recommendations for {currentLevel}</DialogTitle>
          <DialogDescription>
            Actionable steps to strengthen your PM level assessment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {sortedRecommendations.map((rec) => {
            const PriorityIcon = priorityIcons[rec.priority];
            const competencyColor = rec.competency 
              ? dimensionColors[rec.competency] 
              : 'bg-gray-100 text-gray-800 border-gray-200';
            const competencyLabel = rec.competency 
              ? dimensionLabels[rec.competency] 
              : 'General';

            return (
              <div
                key={rec.id}
                className="p-4 border rounded-lg space-y-3"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <PriorityIcon 
                        className={`h-4 w-4 ${
                          rec.priority === 'high' ? 'text-red-500' :
                          rec.priority === 'medium' ? 'text-yellow-500' :
                          'text-green-500'
                        }`}
                      />
                      <h4 className="font-semibold text-base">{rec.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${competencyColor}`}
                      >
                        {competencyLabel}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${
                          rec.priority === 'high' ? 'border-red-200 text-red-700' :
                          rec.priority === 'medium' ? 'border-yellow-200 text-yellow-700' :
                          'border-green-200 text-green-700'
                        }`}
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {rec.description}
                    </p>
                  </div>
                </div>

                {/* Suggested Action */}
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium mb-1">Suggested Action</p>
                      <p className="text-sm text-muted-foreground">
                        {rec.suggestedAction}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Related Stories */}
                {rec.relatedStories && rec.relatedStories.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Related to {rec.relatedStories.length} story{rec.relatedStories.length > 1 ? 'ies' : 'y'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t">
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

