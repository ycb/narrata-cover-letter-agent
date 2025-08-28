import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  CheckCircle,
  Info,
  Star
} from "lucide-react";

interface ScoreRevealProps {
  pmLevel: string;
  confidence: number;
  progress: number;
}

export function ScoreReveal({ pmLevel, confidence, progress }: ScoreRevealProps) {
  const getLevelColor = (level: string) => {
    if (level.includes('Senior') || level.includes('GPM')) return 'bg-green-100 text-green-800 border-green-200';
    if (level.includes('Mid-Level') || level.includes('PM')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (level.includes('Junior') || level.includes('APM')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-muted text-muted-foreground border-muted-foreground/25';
  };

  const getLevelIcon = (level: string) => {
    if (level.includes('Senior') || level.includes('GPM')) return '🟢';
    if (level.includes('Mid-Level') || level.includes('PM')) return '🟡';
    if (level.includes('Junior') || level.includes('APM')) return '🔴';
    return '⚪';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High Confidence';
    if (confidence >= 60) return 'Good Confidence';
    if (confidence >= 40) return 'Moderate Confidence';
    return 'Low Confidence';
  };

  const getProgressLabel = (progress: number) => {
    if (progress >= 80) return 'Profile Complete';
    if (progress >= 60) return 'Well Developed';
    if (progress >= 40) return 'Developing';
    return 'Getting Started';
  };

  return (
    <div className="space-y-6">
      {/* Main Score Display */}
      <Card className="shadow-soft border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-8 text-center">
          <div className="space-y-6">
            {/* Level Badge */}
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">{getLevelIcon(pmLevel)}</span>
                <Badge className={`text-xl px-6 py-3 border-2 ${getLevelColor(pmLevel)}`}>
                  {pmLevel}
                </Badge>
              </div>
              <p className="text-lg text-muted-foreground">
                Based on your uploaded content
              </p>
            </div>

            {/* Confidence and Progress */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Confidence */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">Confidence</span>
                  <span className="text-sm font-bold text-blue-700">{confidence}%</span>
                </div>
                <Progress value={confidence} className="h-3" />
                <p className="text-xs text-blue-600">{getConfidenceLabel(confidence)}</p>
              </div>

              {/* Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">Profile Complete</span>
                  <span className="text-sm font-bold text-blue-700">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-xs text-blue-600">{getProgressLabel(progress)}</p>
              </div>
            </div>

            {/* Improvement Message */}
            <div className="bg-white/50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Your score improves as you upload more content</span>
              </div>
              <p className="text-sm text-blue-600">
                Add more work history, case studies, and cover letters to increase accuracy and confidence.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Experience Level</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Years of Experience</span>
                <span className="text-sm font-medium">3-5 years</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Role Complexity</span>
                <span className="text-sm font-medium">Mid-level</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Team Size</span>
                <span className="text-sm font-medium">5-15 people</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-base">Key Strengths</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Product Strategy</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Data Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm">Cross-functional Leadership</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <CardTitle className="text-base">Growth Areas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Enterprise Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">International Markets</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">M&A Experience</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="shadow-soft bg-muted/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-lg">How This Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium text-foreground">1. Content Analysis</div>
              <p className="text-muted-foreground">
                We analyze your resume, LinkedIn, and cover letter to understand your experience level and skills.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">2. PM Framework Mapping</div>
              <p className="text-muted-foreground">
                Your experience is mapped against industry-standard PM competency frameworks and role expectations.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-medium text-foreground">3. Confidence Scoring</div>
              <p className="text-muted-foreground">
                Confidence increases as you provide more detailed information about your work history and achievements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
