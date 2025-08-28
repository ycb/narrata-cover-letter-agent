import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Eye, 
  CheckCircle, 
  Users,
  Target
} from "lucide-react";

interface OnboardingStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface OnboardingHeaderProps {
  currentStep: string;
  totalSteps?: number;
}

const steps: OnboardingStep[] = [
  {
    id: 'upload',
    label: 'Upload Content',
    icon: Upload,
    description: 'Upload your resume, LinkedIn, and cover letter'
  },
  {
    id: 'review',
    label: 'Review Content',
    icon: Eye,
    description: 'Review and organize your imported content'
  },
  {
    id: 'integrate',
    label: 'Integrate & Preview',
    icon: CheckCircle,
    description: 'See your structured content and templates'
  },
  {
    id: 'tour',
    label: 'Product Tour',
    icon: Users,
    description: 'Learn how to use your new profile'
  }
];

export function OnboardingHeader({ currentStep, totalSteps = steps.length }: OnboardingHeaderProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;
  
  const currentStepData = steps.find(step => step.id === currentStep);
  const CurrentIcon = currentStepData?.icon || Upload;

  return (
    <div className="w-full bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Progress Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <CurrentIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentStepData?.label || 'Onboarding'}
                </h2>
                <p className="text-sm text-gray-600">
                  {currentStepData?.description || 'Complete your profile setup'}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Progress Tracker */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                Step {currentStepIndex + 1} of {totalSteps}
              </div>
              <div className="text-xs text-gray-500">
                {currentStepData?.label || 'Current Step'}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="mt-4 flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isUpcoming = index > currentStepIndex;
            
            return (
              <div key={step.id} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-green-100 text-green-600' 
                    : isCurrent
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-xs font-medium ${
                    isCompleted 
                      ? 'text-green-700' 
                      : isCurrent
                      ? 'text-blue-700'
                      : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                  {isCurrent && (
                    <div className="text-xs text-blue-600 mt-1">
                      Current
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
