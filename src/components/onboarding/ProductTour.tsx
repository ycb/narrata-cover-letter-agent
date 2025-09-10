import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowRight, 
  ArrowLeft, 
  Users, 
  BookOpen, 
  Mail, 
  CheckCircle,
  ExternalLink
} from "lucide-react";

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const tourSteps = [
    {
      id: 'work-history',
      title: 'Work History & Stories',
      description: 'Your uploaded content has been organized into reusable stories and links.',
      icon: Users,
      action: {
        label: 'View My Work History',
        onClick: () => {
          // Navigate to actual Work History page
          window.location.href = '/work-history';
        }
      }
    },
    {
      id: 'templates',
      title: 'Templates & Saved Sections',
      description: 'Your cover letter has been broken down into editable, reusable sections.',
      icon: BookOpen,
      action: {
        label: 'View My Templates',
        onClick: () => {
          // Navigate to actual Templates page
          window.location.href = '/templates';
        }
      }
    },
    {
      id: 'cover-letter',
      title: 'Cover Letter Generator',
      description: 'Start creating targeted cover letters using your approved content.',
      icon: Mail,
      action: {
        label: 'Create My First Cover Letter',
        onClick: () => {
          // Navigate to actual Cover Letter creation
          window.location.href = '/cover-letters';
        }
      }
    }
  ];

  const currentTourStep = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <div className="space-y-8">
      {/* Tour Header */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold text-foreground">
          Your Content is Ready!
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Let's take a quick tour to see how your uploaded content has been organized and is ready to use.
        </p>
      </div>

      {/* Progress */}
      <div className="max-w-md mx-auto space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Tour Progress</span>
          <span>{currentStep + 1} of {tourSteps.length}</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Current Tour Step */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <currentTourStep.icon className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">{currentTourStep.title}</CardTitle>
          <p className="text-muted-foreground text-lg">
            {currentTourStep.description}
          </p>
        </CardHeader>
        
        <CardContent className="text-center space-y-6">
          {/* What You'll See Preview */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">What You'll See:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              {currentStep === 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Your approved work history stories</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>LinkedIn connections and external links</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Ready to edit and enhance</span>
                  </div>
                </>
              )}
              {currentStep === 1 && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Saved sections from your cover letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Editable templates ready to customize</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Reusable content for future applications</span>
                  </div>
                </>
              )}
              {currentStep === 2 && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>AI-powered cover letter generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Use your approved stories and templates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>Target specific job descriptions</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              onClick={currentTourStep.action.onClick}
              className="px-8 py-3 text-lg"
            >
              {currentTourStep.action.label}
              <ExternalLink className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              This will take you to the actual page where you can see and use your content
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStep === 0}
          className="px-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <Button
          variant="secondary"
          onClick={handleSkip}
          className="px-6"
        >
          Skip Tour
        </Button>

        {currentStep < tourSteps.length - 1 ? (
          <Button
            onClick={handleNext}
            className="px-6"
          >
            Next
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        ) : (
          <Button
            onClick={onComplete}
            className="px-6"
          >
            Complete Tour
            <CheckCircle className="ml-2 w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Tour Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          <strong>Tip:</strong> You can always return to these pages from the main navigation. 
          This tour just shows you where your content is ready to use!
        </p>
      </div>
    </div>
  );
}
