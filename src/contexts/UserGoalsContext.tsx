import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserGoals } from '@/types/userGoals';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { useAuth } from './AuthContext';

interface UserGoalsContextType {
  goals: UserGoals | null;
  setGoals: (goals: UserGoals) => Promise<void>;
  hasGoals: boolean;
  isLoading: boolean;
}

const UserGoalsContext = createContext<UserGoalsContextType | undefined>(undefined);

const defaultGoals: UserGoals = {
  targetTitles: [],
  minimumSalary: 180000,
  companyMaturity: [],
  workType: [],
  industries: [],
  businessModels: [],
  dealBreakers: {
    workType: [],
    companyMaturity: [],
    salaryMinimum: null
  },
  preferredCities: [],
  openToRelocation: true
};

interface UserGoalsProviderProps {
  children: ReactNode;
}

// Helper function to validate goals structure
function validateGoalsStructure(goals: any): goals is UserGoals {
  return (
    goals !== null &&
    typeof goals === 'object' &&
    Array.isArray(goals.targetTitles) &&
    Array.isArray(goals.industries) &&
    Array.isArray(goals.businessModels) &&
    Array.isArray(goals.preferredCities) &&
    typeof goals.minimumSalary === 'number' &&
    typeof goals.openToRelocation === 'boolean' &&
    goals.dealBreakers &&
    typeof goals.dealBreakers === 'object' &&
    Array.isArray(goals.dealBreakers.workType) &&
    Array.isArray(goals.dealBreakers.companyMaturity)
  );
}

export function UserGoalsProvider({ children }: UserGoalsProviderProps) {
  const { user } = useAuth();
  const [goals, setGoalsState] = useState<UserGoals | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load goals from database, fallback to localStorage
    const loadGoals = async () => {
      if (!user?.id) {
        // Fallback to localStorage if no user
        try {
          const savedGoals = localStorage.getItem('userGoals');
          if (savedGoals) {
            try {
              const parsedGoals = JSON.parse(savedGoals);
              if (validateGoalsStructure(parsedGoals)) {
                setGoalsState(parsedGoals);
              } else {
                console.warn('Invalid goals structure in localStorage, using defaults');
                setGoalsState(defaultGoals);
              }
            } catch (parseError) {
              console.error('Error parsing goals from localStorage:', parseError);
              setGoalsState(defaultGoals);
            }
          } else {
            setGoalsState(defaultGoals);
          }
        } catch (error) {
          console.error('Error loading user goals from localStorage:', error);
          setGoalsState(defaultGoals);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        // Load from database first
        const dbGoals = await UserPreferencesService.loadGoals(user.id);
        if (dbGoals && validateGoalsStructure(dbGoals)) {
          setGoalsState(dbGoals);
          // Sync to localStorage for offline support
          try {
            localStorage.setItem('userGoals', JSON.stringify(dbGoals));
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          // Fallback to localStorage if nothing in database
          const savedGoals = localStorage.getItem('userGoals');
          if (savedGoals) {
            try {
              const parsedGoals = JSON.parse(savedGoals);
              if (validateGoalsStructure(parsedGoals)) {
                setGoalsState(parsedGoals);
                // Save to database for future use
                await UserPreferencesService.saveGoals(user.id, parsedGoals);
              } else {
                // Invalid structure, use defaults
                setGoalsState(defaultGoals);
              }
            } catch (parseError) {
              console.error('Error parsing goals from localStorage:', parseError);
              setGoalsState(defaultGoals);
            }
          } else {
            // No data anywhere, use defaults
            setGoalsState(defaultGoals);
          }
        }
      } catch (error) {
        console.error('Error loading user goals:', error);
        // Fallback to localStorage on error
        try {
          const savedGoals = localStorage.getItem('userGoals');
          if (savedGoals) {
            try {
              const parsedGoals = JSON.parse(savedGoals);
              if (validateGoalsStructure(parsedGoals)) {
                setGoalsState(parsedGoals);
              } else {
                setGoalsState(defaultGoals);
              }
            } catch (parseError) {
              console.error('Error parsing goals from localStorage fallback:', parseError);
              setGoalsState(defaultGoals);
            }
          } else {
            setGoalsState(defaultGoals);
          }
        } catch (e) {
          console.error('Error loading from localStorage fallback:', e);
          setGoalsState(defaultGoals);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [user?.id]);

  const setGoals = async (newGoals: UserGoals) => {
    setGoalsState(newGoals);
    
    // Save to localStorage immediately for offline support
    try {
      localStorage.setItem('userGoals', JSON.stringify(newGoals));
    } catch (error) {
      console.error('Error saving user goals to localStorage:', error);
    }

    // Save to database if user is logged in
    if (user?.id) {
      try {
        await UserPreferencesService.saveGoals(user.id, newGoals);
      } catch (error) {
        console.error('Error saving user goals to database:', error);
        // Non-blocking: localStorage already saved
      }
    }
  };

  // Ensure goals is valid before checking hasGoals
  const hasGoals = goals !== null && validateGoalsStructure(goals) && (
    (goals.targetTitles?.length ?? 0) > 0 ||
    (goals.minimumSalary ?? 0) > 0 ||
    (goals.industries?.length ?? 0) > 0 ||
    (goals.businessModels?.length ?? 0) > 0 ||
    (goals.preferredCities?.length ?? 0) > 0
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
