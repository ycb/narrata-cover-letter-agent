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

  useEffect(() => {
    // Load voice from database, fallback to localStorage
    const loadVoice = async () => {
      if (!user?.id) {
        // Fallback to localStorage if no user
        try {
          const savedVoice = localStorage.getItem('userVoice');
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
          // Sync to localStorage for offline support
          try {
            localStorage.setItem('userVoice', JSON.stringify(dbVoice));
          } catch (e) {
            // Ignore localStorage errors
          }
        } else {
          // Fallback to localStorage if nothing in database
          const savedVoice = localStorage.getItem('userVoice');
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
      } catch (error) {
        console.error('Error loading user voice:', error);
        // Fallback to localStorage on error
        try {
          const savedVoice = localStorage.getItem('userVoice');
          if (savedVoice) {
            setVoiceState(JSON.parse(savedVoice));
          } else {
            setVoiceState(defaultVoice);
          }
        } catch (e) {
          console.error('Error loading from localStorage fallback:', e);
          setVoiceState(defaultVoice);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadVoice();
  }, [user?.id]);

  const setVoice = async (newVoice: UserVoice) => {
    const voiceWithTimestamp = {
      ...newVoice,
      lastUpdated: new Date().toISOString()
    };
    setVoiceState(voiceWithTimestamp);
    
    // Save to localStorage immediately for offline support
    try {
      localStorage.setItem('userVoice', JSON.stringify(voiceWithTimestamp));
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

  const hasVoice = voice !== null && voice.prompt.trim().length > 0;

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
