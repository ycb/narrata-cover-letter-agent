import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
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
  
  // Initialize syntheticProfileId from localStorage synchronously (set by SyntheticUserSelector)
  const [syntheticProfileId, setSyntheticProfileId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('synthetic_active_profile_id');
      return stored || null;
    } catch (e) {
      // Ignore localStorage errors
      return null;
    }
  });

  // Track synthetic profile ID changes - verify against service and update if needed
  useEffect(() => {
    const checkSyntheticProfile = async () => {
      if (!user) {
        setSyntheticProfileId(null);
        return;
      }
      
      try {
        const { SyntheticUserService } = await import('@/services/syntheticUserService');
        const syntheticService = new SyntheticUserService();
        const syntheticContext = await syntheticService.getSyntheticUserContext();
        if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
          const profileId = syntheticContext.currentUser.profileId;
          setSyntheticProfileId(profileId);
        } else {
          setSyntheticProfileId(null);
        }
      } catch (e) {
        console.error('[UserGoalsContext] Error checking synthetic mode:', e);
        // Don't clear on error - keep localStorage value as fallback
      }
    };
    
    checkSyntheticProfile();
  }, [user?.id]);

  useEffect(() => {
    // Load goals from database, fallback to localStorage
    const loadGoals = async () => {
      // CRITICAL FIX: In synthetic mode, wait for profile to be determined
      // Check localStorage again in case it was set after component mount
      let activeProfileId = syntheticProfileId;
      if (!activeProfileId && user?.id) {
        try {
          const stored = localStorage.getItem('synthetic_active_profile_id');
          if (stored) {
            console.log(`[UserGoalsContext] 🔄 Profile ID updated from localStorage during load: ${stored}`);
            activeProfileId = stored;
            setSyntheticProfileId(stored);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Use profile-specific localStorage keys in synthetic mode
      // CRITICAL: Never use generic 'userGoals' key in synthetic mode
      const localStorageKey = activeProfileId ? `userGoals_${activeProfileId}` : 'userGoals';
      
      if (!user?.id) {
        // Fallback to localStorage if no user
        try {
          const savedGoals = localStorage.getItem(localStorageKey);
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
          // Sync to localStorage for offline support (use profile-specific key in synthetic mode)
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(dbGoals));
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          // In synthetic mode, don't fall back to localStorage - each profile should start fresh
          if (activeProfileId) {
            setGoalsState(defaultGoals);
          } else {
            // Normal mode: Fallback to localStorage if nothing in database
            const savedGoals = localStorage.getItem(localStorageKey);
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
        }
      } catch (error) {
        console.error('Error loading user goals:', error);
        // In synthetic mode, don't fall back to localStorage on error - use defaults
        if (activeProfileId) {
          console.log(`[UserGoalsContext] Error loading goals for synthetic profile ${activeProfileId}, using defaults`);
          setGoalsState(defaultGoals);
        } else {
          // Normal mode: Fallback to localStorage on error
          try {
            const savedGoals = localStorage.getItem(localStorageKey);
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
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, [user?.id, syntheticProfileId]);

  const setGoals = async (newGoals: UserGoals) => {
    // Check if target titles changed (this triggers gap re-analysis)
    const targetTitlesChanged = goals?.targetTitles?.join(',') !== newGoals.targetTitles?.join(',');
    
    setGoalsState(newGoals);
    
    // Determine localStorage key (profile-specific in synthetic mode)
    let localStorageKey = 'userGoals';
    try {
      const { SyntheticUserService } = await import('@/services/syntheticUserService');
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        localStorageKey = `userGoals_${syntheticContext.currentUser.profileId}`;
      }
    } catch (e) {
      // Ignore errors checking synthetic mode
    }
    
    // Save to localStorage immediately for offline support
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(newGoals));
    } catch (error) {
      console.error('Error saving user goals to localStorage:', error);
    }

    // Save to database if user is logged in
    if (user?.id) {
      try {
        await UserPreferencesService.saveGoals(user.id, newGoals);
        
        // Trigger gap re-analysis if target titles changed
        // TODO: Implement full gap re-analysis when PM Levels feature is integrated
        // This depends on PM Levels Service to:
        // 1. Map target job titles to PM level codes (L3-L6, M1-M2)
        // 2. Use target level to assess role expectations in gap detection
        // 3. Update gap detection prompts to consider target level requirements
        if (targetTitlesChanged && newGoals.targetTitles && newGoals.targetTitles.length > 0) {
          // Stub: Will be implemented in PM Levels integration
          // The gap re-analysis needs:
          // - PMLevelsService to map job titles to levels
          // - Updated gap detection prompts that consider target level
          // - Role expectation gaps based on level requirements
        }
        
        // TODO: When building auto-suggest tags feature, invalidate tag suggestion cache
        // when industries or businessModels change, so new suggestions reflect updated preferences
        // This will ensure tag suggestions align with user's stated interests in career goals
      } catch (error) {
        console.error('Error saving user goals to database:', error);
        // Non-blocking: localStorage already saved
      }
    }
  };

  // Ensure goals is valid before checking hasGoals
  // Use useMemo to prevent re-computation and ensure validation runs first
  const hasGoals = useMemo(() => {
    if (goals === null) return false;
    if (!validateGoalsStructure(goals)) return false;
    return (
      (goals.targetTitles?.length ?? 0) > 0 ||
      (goals.minimumSalary ?? 0) > 0 ||
      (goals.industries?.length ?? 0) > 0 ||
      (goals.businessModels?.length ?? 0) > 0 ||
      (goals.preferredCities?.length ?? 0) > 0
    );
  }, [goals]);

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
