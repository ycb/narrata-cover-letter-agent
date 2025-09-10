import { useState } from "react";
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
  Sparkles,
  Lock,
  Unlock
} from "lucide-react";

interface PMLevelPreviewProps {
  currentLevel?: string;
  confidence?: number;
  progress?: number;
  onAddStory: () => void;
  onUnlock: () => void;
}

export function PMLevelPreview({ 
  currentLevel, 
  confidence = 0, 
  progress = 0,
  onAddStory,
  onUnlock
}: PMLevelPreviewProps) {
  const [isUnlocked, setIsUnlocked] = useState(!!currentLevel);

  const getLevelColor = (level: string) => {
    if (level.includes('Senior') || level.includes('Lead')) return 'text-purple-600';
    if (level.includes('Mid') || level.includes('Product Manager')) return 'text-blue-600';
    if (level.includes('Associate') || level.includes('Junior')) return 'text-green-600';
    return 'text-gray-600';
  };

  const getLevelIcon = (level: string) => {
    if (level.includes('Senior') || level.includes('Lead')) return '🟢';
    if (level.includes('Mid') || level.includes('Product Manager')) return '🟡';
    if (level.includes('Associate') || level.includes('Junior')) return '🔴';
    return '⚪';
  };

  const getNextMilestone = (level: string) => {
    if (level.includes('Junior') || level.includes('Associate')) return 'Mid-Level PM';
    if (level.includes('Mid') || level.includes('Product Manager')) return 'Senior PM';
    if (level.includes('Senior')) return 'Lead PM / Group PM';
    return 'Product Manager';
  };

  const getMotivationalMessage = (level: string) => {
    if (level.includes('Junior') || level.includes('Associate')) {
      return "You're building a strong foundation. Each story you add shows your growth potential.";
    }
    if (level.includes('Mid') || level.includes('Product Manager')) {
      return "You're demonstrating solid PM skills. Focus on leadership and strategic thinking to advance.";
    }
    if (level.includes('Senior')) {
      return "You're showing senior-level capabilities. Highlight your team leadership and strategic impact.";
    }
    return "Start building your PM profile. Every experience counts toward your assessment.";
  };

  const handleUnlock = () => {
    setIsUnlocked(true);
    onUnlock();
  };

  if (isUnlocked && currentLevel) {
    return (
      <Card className="shadow-soft border-0 bg-gradient-to-br from-green-50 to-blue-50">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Current Level Display */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Your PM Level</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getLevelIcon(currentLevel)}</span>
                    <span className={`text-lg font-bold ${getLevelColor(currentLevel)}`}>
                      {currentLevel}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="success" className="bg-green-100 text-green-800">
                <Unlock className="w-3 h-3 mr-1" />
                Unlocked
              </Badge>
            </div>

            {/* Progress and Confidence */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Confidence</span>
                  <span className="font-medium">{confidence}%</span>
                </div>
                <Progress value={confidence} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>

            {/* Motivational Message */}
            <div className="bg-white/60 rounded-lg p-3 border border-green-200">
              <p className="text-sm text-gray-700">
                {getMotivationalMessage(currentLevel)}
              </p>
            </div>

            {/* Next Milestone */}
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Next Milestone:</span>
              </div>
              <span className="text-sm text-blue-700">{getNextMilestone(currentLevel)}</span>
            </div>

            {/* Action Button */}
            <Button 
              onClick={onAddStory}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Add Story to Improve Score
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Locked State - Motivational Preview
  return (
    <Card className="shadow-soft border-0 bg-gradient-to-br from-gray-50 to-blue-50">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Locked Icon */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              PM Level Assessment
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your PM Level will update as you add more stories
            </p>
          </div>

          {/* What You'll Unlock */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-center">What You'll Unlock:</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Personalized PM Level assessment</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Confidence scoring and progress tracking</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Growth recommendations and next steps</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Benchmark against industry standards</span>
              </div>
            </div>
          </div>

          {/* Progress to Unlock */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-blue-700 font-medium">Progress to Unlock:</span>
              <span className="text-blue-700">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-blue-600 mt-1">
              Add 1 story to unlock your level
            </p>
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleUnlock}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Add Your First Story
          </Button>

          {/* Growth Hook */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              💡 <strong>Pro tip:</strong> Start with your most impactful project or achievement
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
