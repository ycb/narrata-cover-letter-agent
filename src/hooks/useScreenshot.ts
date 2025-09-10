import { useState, useCallback } from 'react';
import html2canvas from 'html2canvas';

export const useScreenshot = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureScreenshot = useCallback(async (): Promise<string | null> => {
    setIsCapturing(true);
    setError(null);

    try {
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const dataUrl = canvas.toDataURL('image/png', 0.8);
      return dataUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture screenshot';
      setError(errorMessage);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  return {
    captureScreenshot,
    isCapturing,
    error,
  };
};
