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
