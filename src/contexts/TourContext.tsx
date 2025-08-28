import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface TourStep {
  id: string;
  path: string;
  title: string;
  description: string;
  highlights: string[];
}

interface TourContextType {
  isActive: boolean;
  currentStep: number;
  tourSteps: TourStep[];
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  cancelTour: () => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    id: 'work-history',
    path: '/work-history',
    title: 'Work History & Stories',
    description: 'Your uploaded content has been organized into reusable stories and links.',
    highlights: ['Stories', 'Links']
  },
  {
    id: 'templates',
    path: '/templates',
    title: 'Templates & Saved Sections',
    description: 'Your cover letter has been broken down into editable, reusable sections.',
    highlights: ['Templates', 'Saved Sections']
  },
  {
    id: 'cover-letters',
    path: '/cover-letters',
    title: 'Cover Letter Generator',
    description: 'Start creating targeted cover letters using your approved content.',
    highlights: ['Generator', 'Templates']
  }
];

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const tourSteps = DEFAULT_TOUR_STEPS;

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    // Navigate to first tour step
    navigate(tourSteps[0].path);
  }, [navigate, tourSteps]);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      setCurrentStep(nextStepIndex);
      navigate(tourSteps[nextStepIndex].path);
    } else {
      completeTour();
    }
  }, [currentStep, tourSteps, navigate]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      setCurrentStep(prevStepIndex);
      navigate(tourSteps[prevStepIndex].path);
    }
  }, [currentStep, tourSteps, navigate]);

  const cancelTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    // Navigate to onboarding dashboard
    navigate('/onboarding-dashboard');
  }, [navigate]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    // Navigate to main dashboard
    navigate('/dashboard');
  }, [navigate]);

  const value: TourContextType = {
    isActive,
    currentStep,
    tourSteps,
    startTour,
    nextStep,
    previousStep,
    cancelTour,
    completeTour
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
