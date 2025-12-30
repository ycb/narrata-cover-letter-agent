import { useEffect, useMemo, useState } from "react";

type UiZoomOptions = {
  storageKey: string;
  minZoom?: number;
  maxZoom?: number;
  step?: number;
  defaultZoom?: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function useUiZoom({
  storageKey,
  minZoom = 30,
  maxZoom = 100,
  step = 10,
  defaultZoom = 100
}: UiZoomOptions) {
  const [zoomLevel, setZoomLevel] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored ? Number(stored) : NaN;
      if (Number.isFinite(parsed)) return clamp(parsed, minZoom, maxZoom);
    } catch {
      // ignore
    }
    return clamp(defaultZoom, minZoom, maxZoom);
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(zoomLevel));
    } catch {
      // ignore
    }
  }, [storageKey, zoomLevel]);

  const api = useMemo(() => {
    const zoomIn = () => setZoomLevel((prev) => clamp(prev + step, minZoom, maxZoom));
    const zoomOut = () => setZoomLevel((prev) => clamp(prev - step, minZoom, maxZoom));
    const reset = () => setZoomLevel(clamp(defaultZoom, minZoom, maxZoom));

    return { zoomLevel, minZoom, maxZoom, step, zoomIn, zoomOut, reset };
  }, [defaultZoom, maxZoom, minZoom, step, zoomLevel]);

  return api;
}

