import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserVoice, DEFAULT_VOICE_PROMPT } from '@/types/userVoice';

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
  const [voice, setVoiceState] = useState<UserVoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load voice from localStorage on mount
    try {
      const savedVoice = localStorage.getItem('userVoice');
      if (savedVoice) {
        setVoiceState(JSON.parse(savedVoice));
      } else {
        // Set default voice if none exists
        setVoiceState(defaultVoice);
      }
    } catch (error) {
      console.error('Error loading user voice:', error);
      setVoiceState(defaultVoice);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setVoice = (newVoice: UserVoice) => {
    const voiceWithTimestamp = {
      ...newVoice,
      lastUpdated: new Date().toISOString()
    };
    setVoiceState(voiceWithTimestamp);
    try {
      localStorage.setItem('userVoice', JSON.stringify(voiceWithTimestamp));
    } catch (error) {
      console.error('Error saving user voice:', error);
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
