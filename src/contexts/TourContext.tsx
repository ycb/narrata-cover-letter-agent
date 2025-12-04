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
  currentTourStep: TourStep | null;
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
    title: 'Work History',
    description: 'Your work history is organized by roles and stories. Confirm correct and resolve gaps here first',
    highlights: ['Roles', 'Stories', 'Gaps', 'Metrics']
  },
  {
    id: 'saved-sections',
    path: '/saved-sections',
    title: 'Saved Sections',
    description: 'Saved Sections is your library of cover letter content.',
    highlights: ['Saved Sections']
  },
  {
    id: 'cover-letter-template',
    path: '/cover-letter-template',
    title: 'Cover Letter Template',
    description: 'Your template is used to create a first draft. Choose between static or dynamic content.',
    highlights: ['Template']
  }
];

export function TourProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const tourSteps = DEFAULT_TOUR_STEPS;

  const startTour = useCallback(() => {
    try {
      console.log('Starting tour, navigating to:', tourSteps[0].path);
      setIsActive(true);
      setCurrentStep(0);
      // Navigate to first tour step
      navigate(tourSteps[0].path);
    } catch (error) {
      console.error('Error starting tour:', error);
      setIsActive(false);
      setCurrentStep(0);
    }
  }, [navigate, tourSteps]);

  const nextStep = useCallback(() => {
    try {
      if (currentStep < tourSteps.length - 1) {
        const nextStepIndex = currentStep + 1;
        console.log('Moving to next step:', nextStepIndex, 'path:', tourSteps[nextStepIndex].path);
        setCurrentStep(nextStepIndex);
        navigate(tourSteps[nextStepIndex].path);
      } else {
        completeTour();
      }
    } catch (error) {
      console.error('Error moving to next step:', error);
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
    navigate('/dashboard/onboarding');
  }, [navigate]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    // Navigate to onboarding dashboard (user will review/complete tasks)
    navigate('/dashboard/onboarding');
  }, [navigate]);

  const value: TourContextType = {
    isActive,
    currentStep,
    tourSteps,
    currentTourStep: isActive ? tourSteps[currentStep] : null,
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
