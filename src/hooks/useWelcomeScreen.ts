import { useState, useEffect } from 'react';

export const useWelcomeScreen = () => {
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if user has already seen the welcome screen
    const hasSeenWelcome = localStorage.getItem('narrata-welcome-seen');
    
    if (!hasSeenWelcome) {
      // Show welcome screen after a short delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowWelcome(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  const closeWelcome = () => {
    setShowWelcome(false);
    // Mark that user has seen the welcome screen
    localStorage.setItem('narrata-welcome-seen', 'true');
  };

  return {
    showWelcome,
    closeWelcome
  };
};
