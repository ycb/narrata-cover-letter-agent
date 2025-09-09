import { useState, useEffect } from 'react';

export const useWelcomeScreen = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Show welcome screen after a short delay to ensure page is loaded
    const timer = setTimeout(() => {
      setShowWelcome(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
  };

  return {
    showWelcome,
    closeWelcome
  };
};
