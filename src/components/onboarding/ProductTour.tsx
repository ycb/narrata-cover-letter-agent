import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  BookOpen, 
  Mail, 
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Play,
  Sparkles,
  TrendingUp,
  Lightbulb
} from "lucide-react";

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

  interface TourStep {
    id: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    content: React.ReactNode;
    action?: {
      label: string;
      onClick: () => void;
      variant?: 'default' | 'secondary' | 'ghost';
    };
  }

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const tourSteps: TourStep[] = [
    {
      id: 'work-history',
      title: 'Work History & Stories',
      description: 'Your professional experience organized into reusable stories',
      icon: Users,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-dashed border-blue-200 bg-blue-50/50">
              <CardHeader className="text-center pb-3">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <CardTitle className="text-blue-900 text-base">Stories</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <p className="text-blue-800 text-sm">
                  Impactful achievements and project outcomes
                </p>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  3 Stories from Resume
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-green-200 bg-green-50/50">
              <CardHeader className="text-center pb-3">
                <Target className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-green-900 text-base">External Links</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <p className="text-green-800 text-sm">
                  Case studies, portfolios, and references
                </p>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  1 Link Added
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">How to Use Stories</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Add new stories from your work experience</li>
                  <li>• Tag stories with relevant skills and competencies</li>
                  <li>• Use stories in cover letters and interviews</li>
                  <li>• Track your professional growth over time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'View Work History',
        onClick: () => console.log('Navigate to Work History'),
        variant: 'default'
      }
    },
    {
      id: 'templates',
      title: 'Templates & Saved Sections',
      description: 'Reusable cover letter sections and templates',
      icon: BookOpen,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2 border-dashed border-purple-200 bg-purple-50/50">
              <CardHeader className="text-center pb-3">
                <BookOpen className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <CardTitle className="text-purple-900 text-base">Saved Sections</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <p className="text-purple-800 text-sm">
                  Reusable cover letter components
                </p>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  2 Sections Saved
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed border-orange-200 bg-orange-50/50">
              <CardHeader className="text-center pb-3">
                <Mail className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <CardTitle className="text-orange-900 text-base">Cover Letters</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <p className="text-orange-800 text-sm">
                  Generated and saved letters
                </p>
                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                  0 Letters Created
                </Badge>
              </CardContent>
            </Card>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-purple-900 mb-1">Template Benefits</h4>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• Save time with reusable sections</li>
                  <li>• Maintain consistency across applications</li>
                  <li>• Customize for specific roles and companies</li>
                  <li>• Build a library of proven content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'View Templates',
        onClick: () => console.log('Navigate to Templates'),
        variant: 'default'
      }
    },
    {
      id: 'cover-letters',
      title: 'Cover Letter Generation',
      description: 'Create targeted cover letters using your stories and templates',
      icon: Mail,
      content: (
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">
              Generate Your First Cover Letter
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Use your uploaded content and saved sections to create targeted cover letters in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="text-center p-4 border-2 border-dashed border-blue-200 bg-blue-50/50">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-blue-900 mb-1">1. Job Description</h4>
              <p className="text-xs text-blue-700">Paste the job posting</p>
            </Card>

            <Card className="text-center p-4 border-2 border-dashed border-purple-200 bg-purple-50/50">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-purple-900 mb-1">2. AI Analysis</h4>
              <p className="text-xs text-purple-700">We analyze requirements</p>
            </Card>

            <Card className="text-center p-4 border-2 border-dashed border-green-200 bg-green-50/50">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h4 className="font-medium text-green-900 mb-1">3. Generate</h4>
              <p className="text-xs text-green-700">Get your cover letter</p>
            </Card>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-900 mb-1">Why This Works</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Uses your real stories and achievements</li>
                  <li>• Tailored to specific job requirements</li>
                  <li>• Professional tone and structure</li>
                  <li>• Ready to customize and send</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ),
      action: {
        label: 'Create Cover Letter',
        onClick: () => console.log('Navigate to Cover Letter Creation'),
        variant: 'default'
      }
    }
  ];

  const currentStep = tourSteps[currentStepIndex];
  const progress = ((currentStepIndex + 1) / tourSteps.length) * 100;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStepIndex(prev => prev - 1);
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Let's Take a Quick Tour
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Learn how to use your new profile and generate your first cover letter
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-md mx-auto">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Step {currentStepIndex + 1} of {tourSteps.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Current Step Content */}
      <Card className="shadow-soft max-w-4xl mx-auto">
        <CardHeader className="text-center pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <currentStep.icon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">
                {currentStep.title}
              </CardTitle>
              <p className="text-gray-600">{currentStep.description}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep.content}

          {/* Action Button */}
          {currentStep.action && (
            <div className="text-center pt-4">
              <Button 
                onClick={currentStep.action.onClick}
                variant={currentStep.action.variant}
                size="lg"
                className="px-8 py-3"
              >
                {currentStep.action.label}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-md mx-auto">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={isFirstStep}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="px-6"
          >
            Skip Tour
          </Button>

          <Button
            onClick={handleNext}
            className="px-6"
          >
            {isLastStep ? 'Complete Tour' : 'Next'}
            {!isLastStep && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          💡 <strong>Tip:</strong> You can always access this tour from the Help menu later
        </p>
      </div>
    </div>
  );
}
