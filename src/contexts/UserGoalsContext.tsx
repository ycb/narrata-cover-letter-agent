import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserGoals } from '@/types/userGoals';

interface UserGoalsContextType {
  goals: UserGoals | null;
  setGoals: (goals: UserGoals) => void;
  hasGoals: boolean;
  isLoading: boolean;
}

const UserGoalsContext = createContext<UserGoalsContextType | undefined>(undefined);

const defaultGoals: UserGoals = {
  targetTitles: [],
  minimumSalary: 0,
  companyMaturity: 'either',
  workType: 'remote',
  industries: [],
  businessModels: [],
  dealBreakers: {
    mustBeRemote: false,
    mustBeEarlyStage: false,
    mustBeLateStage: false,
    mustBePublicCompany: false,
    salaryMinimum: null
  },
  preferredCities: [],
  openToRelocation: true
};

interface UserGoalsProviderProps {
  children: ReactNode;
}

export function UserGoalsProvider({ children }: UserGoalsProviderProps) {
  const [goals, setGoalsState] = useState<UserGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load goals from localStorage on mount
    try {
      const savedGoals = localStorage.getItem('userGoals');
      if (savedGoals) {
        setGoalsState(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Error loading user goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setGoals = (newGoals: UserGoals) => {
    setGoalsState(newGoals);
    try {
      localStorage.setItem('userGoals', JSON.stringify(newGoals));
    } catch (error) {
      console.error('Error saving user goals:', error);
    }
  };

  const hasGoals = goals !== null && (
    goals.targetTitles.length > 0 ||
    goals.minimumSalary > 0 ||
    goals.industries.length > 0 ||
    goals.businessModels.length > 0 ||
    goals.preferredCities.length > 0
  );

  return (
    <UserGoalsContext.Provider value={{
      goals,
      setGoals,
      hasGoals,
      isLoading
    }}>
      {children}
    </UserGoalsContext.Provider>
  );
}

export function useUserGoals() {
  const context = useContext(UserGoalsContext);
  if (context === undefined) {
    throw new Error('useUserGoals must be used within a UserGoalsProvider');
  }
  return context;
}
