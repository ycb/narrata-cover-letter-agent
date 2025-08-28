import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  BookOpen, 
  Mail, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle,
  Play
} from "lucide-react";

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const tourSteps = [
    {
      id: 'work-history',
      title: 'Work History',
      description: 'Here are your imported roles and companies',
      icon: Users,
      content: 'Your professional experience has been organized into structured roles and companies.'
    },
    {
      id: 'templates',
      title: 'Templates & Saved Sections',
      description: 'Here are your reusable cover letter sections',
      icon: BookOpen,
      content: 'We\'ve created reusable sections from your cover letter that you can customize.'
    },
    {
      id: 'cover-letter',
      title: 'Generate Your First Cover Letter',
      description: 'Let\'s create your first personalized cover letter',
      icon: Mail,
      content: 'You now have everything you need to create personalized cover letters.'
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

  const CurrentIcon = currentStep.icon;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Product Tour: {currentStep.title}
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {currentStep.description}
        </p>
        
        {/* Progress Bar */}
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStepIndex + 1} of {tourSteps.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Step Content */}
      <Card className="shadow-soft max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <CurrentIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">
            {currentStep.title}
          </h3>
          <p className="text-gray-600 mb-6">
            {currentStep.content}
          </p>
          
          {isLastStep && (
            <Button
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-white px-8"
            >
              <Play className="w-5 h-5 mr-2" />
              Generate Your First Cover Letter
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          {!isFirstStep && (
                      <Button
            variant="secondary"
            onClick={handlePrevious}
            className="flex items-center gap-2"
          >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
          )}
          
          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-gray-600 hover:text-gray-900"
          >
            Skip Tour
          </Button>
        </div>

        <Button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
        >
          {isLastStep ? (
            <>
              Complete Tour
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Next: {tourSteps[currentStepIndex + 1]?.title}
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
