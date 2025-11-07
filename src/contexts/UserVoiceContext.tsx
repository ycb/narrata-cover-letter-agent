import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserVoice, DEFAULT_VOICE_PROMPT } from '@/types/userVoice';
import { UserPreferencesService } from '@/services/userPreferencesService';
import { useAuth } from './AuthContext';

interface UserVoiceContextType {
  voice: UserVoice | null;
  setVoice: (voice: UserVoice) => void;
  hasVoice: boolean;
  isLoading: boolean;
}

const UserVoiceContext = createContext<UserVoiceContextType | undefined>(undefined);

const defaultVoice: UserVoice = {
  prompt: DEFAULT_VOICE_PROMPT,
  lastUpdated: new Date().toISOString()
};

interface UserVoiceProviderProps {
  children: ReactNode;
}

export function UserVoiceProvider({ children }: UserVoiceProviderProps) {
  const { user } = useAuth();
  const [voice, setVoiceState] = useState<UserVoice | null>(null);
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
        console.error('[UserVoiceContext] Error checking synthetic mode:', e);
        // Don't clear on error - keep localStorage value as fallback
      }
    };
    
    checkSyntheticProfile();
  }, [user?.id]);

  useEffect(() => {
    // Load voice from database, fallback to localStorage
    const loadVoice = async () => {
      // Use profile-specific localStorage keys in synthetic mode
      const localStorageKey = syntheticProfileId ? `userVoice_${syntheticProfileId}` : 'userVoice';
      
      if (!user?.id) {
        // Fallback to localStorage if no user
        try {
          const savedVoice = localStorage.getItem(localStorageKey);
          if (savedVoice) {
            setVoiceState(JSON.parse(savedVoice));
          } else {
            setVoiceState(defaultVoice);
          }
        } catch (error) {
          console.error('Error loading user voice from localStorage:', error);
          setVoiceState(defaultVoice);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        // Load from database first
        const dbVoice = await UserPreferencesService.loadVoice(user.id);
        if (dbVoice) {
          setVoiceState(dbVoice);
          // Sync to localStorage for offline support (use profile-specific key in synthetic mode)
          try {
            localStorage.setItem(localStorageKey, JSON.stringify(dbVoice));
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          // In synthetic mode, don't fall back to localStorage - each profile should start fresh
          if (syntheticProfileId) {
            setVoiceState(defaultVoice);
          } else {
            // Normal mode: Fallback to localStorage if nothing in database
            const savedVoice = localStorage.getItem(localStorageKey);
            if (savedVoice) {
              const parsedVoice = JSON.parse(savedVoice);
              setVoiceState(parsedVoice);
              // Save to database for future use
              await UserPreferencesService.saveVoice(user.id, parsedVoice);
            } else {
              setVoiceState(defaultVoice);
              // Save default to database
              await UserPreferencesService.saveVoice(user.id, defaultVoice);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user voice:', error);
        // In synthetic mode, don't fall back to localStorage on error - use defaults
        if (syntheticProfileId) {
          setVoiceState(defaultVoice);
        } else {
          // Normal mode: Fallback to localStorage on error
          try {
            const savedVoice = localStorage.getItem(localStorageKey);
            if (savedVoice) {
              setVoiceState(JSON.parse(savedVoice));
            } else {
              setVoiceState(defaultVoice);
            }
          } catch (e) {
            console.error('Error loading from localStorage fallback:', e);
            setVoiceState(defaultVoice);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadVoice();
  }, [user?.id, syntheticProfileId]);

  const setVoice = async (newVoice: UserVoice) => {
    const voiceWithTimestamp = {
      ...newVoice,
      lastUpdated: new Date().toISOString()
    };
    setVoiceState(voiceWithTimestamp);
    
    // Determine localStorage key (profile-specific in synthetic mode)
    let localStorageKey = 'userVoice';
    try {
      const { SyntheticUserService } = await import('@/services/syntheticUserService');
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser) {
        localStorageKey = `userVoice_${syntheticContext.currentUser.profileId}`;
      }
    } catch (e) {
      // Ignore errors checking synthetic mode
    }
    
    // Save to localStorage immediately for offline support
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(voiceWithTimestamp));
    } catch (error) {
      console.error('Error saving user voice to localStorage:', error);
    }

    // Save to database if user is logged in
    if (user?.id) {
      try {
        await UserPreferencesService.saveVoice(user.id, voiceWithTimestamp);
      } catch (error) {
        console.error('Error saving user voice to database:', error);
        // Non-blocking: localStorage already saved
      }
    }
  };

  const hasVoice = voice !== null && voice.prompt && voice.prompt.trim().length > 0;

  return (
    <UserVoiceContext.Provider value={{
      voice,
      setVoice,
      hasVoice,
      isLoading
    }}>
      {children}
    </UserVoiceContext.Provider>
  );
}

export function useUserVoice() {
  const context = useContext(UserVoiceContext);
  if (context === undefined) {
    throw new Error('useUserVoice must be used within a UserVoiceProvider');
  }
  return context;
}
