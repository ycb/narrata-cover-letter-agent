import { useState, useCallback, useEffect, useRef } from 'react';

export interface InspectModeState {
  isActive: boolean;
  hoveredElement: Element | null;
  pinnedElement: Element | null;
  pinnedLocation: { x: number; y: number } | null;
}

export const useInspectMode = () => {
  const [state, setState] = useState<InspectModeState>({
    isActive: false,
    hoveredElement: null,
    pinnedElement: null,
    pinnedLocation: null,
  });

  const highlightRef = useRef<HTMLDivElement | null>(null);
  const originalStylesRef = useRef<Map<Element, string>>(new Map());

  const startInspectMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      hoveredElement: null,
      pinnedElement: null,
      pinnedLocation: null,
    }));
  }, []);

  const stopInspectMode = useCallback(() => {
    // Restore original styles
    originalStylesRef.current.forEach((originalStyle, element) => {
      if (element instanceof HTMLElement) {
        element.style.outline = originalStyle;
      }
    });
    originalStylesRef.current.clear();

    setState(prev => ({
      ...prev,
      isActive: false,
      hoveredElement: null,
      pinnedElement: null,
      pinnedLocation: null,
    }));
  }, []);

  const highlightElement = useCallback((element: Element | null) => {
    // Restore previous element
    if (state.hoveredElement && originalStylesRef.current.has(state.hoveredElement)) {
      const originalStyle = originalStylesRef.current.get(state.hoveredElement);
      if (state.hoveredElement instanceof HTMLElement && originalStyle !== undefined) {
        state.hoveredElement.style.outline = originalStyle;
      }
    }

    if (!element) {
      setState(prev => ({ ...prev, hoveredElement: null }));
      return;
    }

    // Store original style
    if (element instanceof HTMLElement && !originalStylesRef.current.has(element)) {
      originalStylesRef.current.set(element, element.style.outline);
    }

    // Apply highlight
    if (element instanceof HTMLElement) {
      element.style.outline = '2px solid #3b82f6';
      element.style.outlineOffset = '2px';
    }

    setState(prev => ({ ...prev, hoveredElement: element }));
  }, [state.hoveredElement]);

  const pinElement = useCallback((element: Element, location: { x: number; y: number }) => {
    setState(prev => ({
      ...prev,
      pinnedElement: element,
      pinnedLocation: location,
    }));
  }, []);

  // Handle mouse movement
  useEffect(() => {
    if (!state.isActive) return;

    const handleMouseMove = (event: MouseEvent) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      
      // Don't highlight modal elements
      if (element?.closest('[data-feedback-modal]')) {
        highlightElement(null);
        return;
      }

      highlightElement(element);
    };

    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const element = document.elementFromPoint(event.clientX, event.clientY);
      
      // Don't pin modal elements
      if (element?.closest('[data-feedback-modal]')) {
        return;
      }

      if (element) {
        pinElement(element, { x: event.clientX, y: event.clientY });
        stopInspectMode();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick, true);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick, true);
    };
  }, [state.isActive, highlightElement, pinElement, stopInspectMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      originalStylesRef.current.forEach((originalStyle, element) => {
        if (element instanceof HTMLElement) {
          element.style.outline = originalStyle;
        }
      });
    };
  }, []);

  return {
    ...state,
    startInspectMode,
    stopInspectMode,
    highlightElement,
    pinElement,
  };
};
