import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  CheckCircle,
  ArrowRight,
  Sparkles
} from "lucide-react";

interface ScoreRevealProps {
  pmLevel: string;
  confidence: number;
  progress: number;
  onContinue: () => void;
}

export function ScoreReveal({ 
  pmLevel, 
  confidence, 
  progress, 
  onContinue 
}: ScoreRevealProps) {
  const getLevelColor = (level: string) => {
    if (level.includes('Senior') || level.includes('Lead')) return 'text-purple-600';
    if (level.includes('Mid') || level.includes('Product Manager')) return 'text-blue-600';
    if (level.includes('Associate') || level.includes('Junior')) return 'text-green-600';
    return 'text-gray-600';
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-600';
    if (conf >= 60) return 'text-blue-600';
    if (conf >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (conf: number) => {
    if (conf >= 80) return { variant: 'success' as const, text: 'High Confidence' };
    if (conf >= 60) return { variant: 'default' as const, text: 'Good Confidence' };
    if (conf >= 40) return { variant: 'secondary' as const, text: 'Moderate Confidence' };
    return { variant: 'destructive' as const, text: 'Low Confidence' };
  };

  const getProgressMessage = (prog: number) => {
    if (prog >= 80) return "Excellent! Your profile is very complete.";
    if (prog >= 60) return "Good progress! A few more details will improve accuracy.";
    if (prog >= 40) return "Getting there! More content will significantly improve your score.";
    return "Getting started! Each piece of content improves your assessment.";
  };

  const confidenceBadge = getConfidenceBadge(confidence);

  return (
    <div className="space-y-8">
      {/* Main Score Card */}
      <Card className="shadow-soft border-0 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Trophy Icon */}
            <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Trophy className="w-12 h-12 text-white" />
            </div>

            {/* PM Level */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900">
                Your PM Level Assessment
              </h2>
              <div className="flex items-center justify-center gap-3">
                <h3 className={`text-2xl font-bold ${getLevelColor(pmLevel)}`}>
                  {pmLevel}
                </h3>
                <Badge variant={confidenceBadge.variant} className="text-sm">
                  {confidenceBadge.text}
                </Badge>
              </div>
            </div>

            {/* Confidence Score */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-medium text-gray-700">Confidence:</span>
                <span className={`text-2xl font-bold ${getConfidenceColor(confidence)}`}>
                  {confidence}%
                </span>
              </div>
              <div className="w-full max-w-md mx-auto">
                <Progress value={confidence} className="h-3" />
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg font-medium text-gray-700">Profile Completeness:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {progress}%
                </span>
              </div>
              <div className="w-full max-w-md mx-auto">
                <Progress value={progress} className="h-3" />
              </div>
              <p className="text-gray-600 max-w-md mx-auto">
                {getProgressMessage(progress)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvement Tips */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            How to Improve Your Score
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Add More Stories</h4>
                <p className="text-sm text-gray-600">
                  Include specific examples of your achievements and impact
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Quantify Results</h4>
                <p className="text-sm text-gray-600">
                  Add metrics and numbers to demonstrate your impact
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
              <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Expand Skills</h4>
                <p className="text-sm text-gray-600">
                  Add more technical and soft skills to your profile
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
              <ArrowRight className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Career Growth</h4>
                <p className="text-sm text-gray-600">
                  Show progression and advancement in your roles
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="text-center">
        <Button 
          size="lg" 
          onClick={onContinue}
          className="px-8 py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          Continue Setup
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        <p className="text-sm text-gray-600 mt-3">
          Your score will update automatically as you add more content
        </p>
      </div>
    </div>
  );
}
