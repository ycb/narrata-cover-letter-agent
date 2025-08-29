import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

interface TourBannerFullProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  onNext: () => void;
  onPrevious: () => void;
  onCancel: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastStep?: boolean;
}

export function TourBannerFull({
  currentStep,
  totalSteps,
  title,
  description,
  onNext,
  onPrevious,
  onCancel,
  canGoNext,
  canGoPrevious,
  isLastStep = false
}: TourBannerFullProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Progress and Step Info */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-medium">
                {currentStep + 1}
              </div>
              <div className="text-sm opacity-90">
                Step {currentStep + 1} of {totalSteps}
              </div>
            </div>
            
            <div className="w-24 h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Center: Tour Content */}
          <div className="flex-1 text-center max-w-2xl mx-8">
            <h3 className="font-semibold text-lg mb-1">{title}</h3>
            <p className="text-sm opacity-90 leading-relaxed">{description}</p>
          </div>

          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoPrevious}
              className="text-white hover:bg-white/20 px-3"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {!isLastStep && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="text-white hover:bg-white/20 px-3"
              >
                <X className="w-4 h-4 mr-1" />
                Exit Tour
              </Button>
            )}

            <Button
              size="sm"
              onClick={onNext}
              disabled={!canGoNext}
              className="bg-white text-blue-600 hover:bg-white/90 px-4"
            >
              {isLastStep ? 'Finish' : 'Next'}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
