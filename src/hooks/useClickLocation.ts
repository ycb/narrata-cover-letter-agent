import { useState, useCallback, useEffect } from 'react';

export interface ClickLocation {
  x: number;
  y: number;
}

export const useClickLocation = () => {
  const [clickLocation, setClickLocation] = useState<ClickLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const startTracking = useCallback(() => {
    setIsTracking(true);
    setClickLocation(null);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!isTracking) return;

    // Don't capture clicks on modal elements
    const target = event.target as Element;
    if (target.closest('[data-feedback-modal]')) {
      return;
    }

    const location: ClickLocation = {
      x: event.clientX,
      y: event.clientY,
    };

    setClickLocation(location);
    setIsTracking(false);
  }, [isTracking]);

  useEffect(() => {
    if (isTracking) {
      document.addEventListener('click', handleClick, { once: true });
    }

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [isTracking, handleClick]);

  return {
    clickLocation,
    isTracking,
    startTracking,
    stopTracking,
  };
};
