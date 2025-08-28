import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Lock,
  Sparkles,
  Users,
  Lightbulb
} from "lucide-react";

interface PMLevelPreviewProps {
  storiesCount: number;
  storiesNeeded: number;
  onAddStory?: () => void;
}

export function PMLevelPreview({ storiesCount, storiesNeeded, onAddStory }: PMLevelPreviewProps) {
  const progress = Math.min((storiesCount / storiesNeeded) * 100, 100);
  const isUnlocked = storiesCount >= storiesNeeded;
  
  const getProgressColor = () => {
    if (progress >= 100) return 'bg-green-600';
    if (progress >= 66) return 'bg-blue-600';
    if (progress >= 33) return 'bg-yellow-600';
    return 'bg-gray-400';
  };

  const getProgressLabel = () => {
    if (progress >= 100) return 'Ready to unlock!';
    if (progress >= 66) return 'Almost there!';
    if (progress >= 33) return 'Getting closer!';
    return 'Getting started';
  };

  const getMotivationalMessage = () => {
    if (isUnlocked) {
      return "You've collected enough stories to unlock your PM Level assessment!";
    }
    
    const remaining = storiesNeeded - storiesCount;
    if (remaining === 1) {
      return "Just 1 more story needed to unlock your PM Level!";
    }
    
    return `${remaining} more stories needed to unlock your PM Level assessment.`;
  };

  return (
    <Card className="shadow-soft border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center gap-3 mb-3">
          {isUnlocked ? (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
          )}
        </div>
        <CardTitle className="text-xl text-blue-900">
          {isUnlocked ? 'Your PM Level is Ready!' : 'Unlock Your PM Level'}
        </CardTitle>
        <p className="text-sm text-blue-700">
          {getMotivationalMessage()}
        </p>
      </CardHeader>
      
      <CardContent className="text-center space-y-6">
        {/* Progress Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700">Progress</span>
            <span className="text-blue-700 font-medium">
              {storiesCount} of {storiesNeeded} stories
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-blue-600">{getProgressLabel()}</p>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{storiesCount}</div>
            <div className="text-sm text-blue-700">Stories Collected</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">{storiesNeeded}</div>
            <div className="text-sm text-blue-700">Stories Needed</div>
          </div>
          
          <div className="text-center p-3 bg-white/50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-900">
              {isUnlocked ? '✅' : '🔒'}
            </div>
            <div className="text-sm text-blue-700">
              {isUnlocked ? 'Unlocked' : 'Locked'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {onAddStory && (
          <div className="pt-4">
            <Button
              onClick={onAddStory}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              <Users className="w-5 h-5 mr-2" />
              {isUnlocked ? 'View Your PM Level' : 'Add a Story'}
            </Button>
          </div>
        )}

        {/* Growth Hook */}
        <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="font-medium">Your PM Level will update as you add more stories</span>
          </div>
          <p className="text-sm text-blue-600">
            Each new story improves the accuracy of your assessment and helps you track your 
            professional growth over time.
          </p>
        </div>

        {/* What You'll Get */}
        {!isUnlocked && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">What you'll unlock:</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-purple-700">
                <Target className="w-4 h-4" />
                <span>PM Level Assessment</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <Lightbulb className="w-4 h-4" />
                <span>Growth Recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <TrendingUp className="w-4 h-4" />
                <span>Progress Tracking</span>
              </div>
              <div className="flex items-center gap-2 text-purple-700">
                <Users className="w-4 h-4" />
                <span>Peer Comparisons</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
