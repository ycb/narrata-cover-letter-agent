import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FullWidthTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  className?: string;
}

export const FullWidthTooltip: React.FC<FullWidthTooltipProps> = ({
  children,
  content,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, triangleLeft: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const tooltipWidth = Math.min(viewportWidth * 0.9, 1200); // 90% viewport, max 1200px
    const left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    
    // Ensure tooltip stays within viewport bounds with consistent margins
    const margin = (viewportWidth - tooltipWidth) / 2;
    const clampedLeft = Math.max(margin, Math.min(left, viewportWidth - tooltipWidth - margin));
    
    setPosition({
      top: rect.bottom + 12, // 12px gap below the metric
      left: clampedLeft,
      width: tooltipWidth,
      // Calculate triangle position relative to the metric center
      triangleLeft: rect.left + (rect.width / 2) - clampedLeft, // Position relative to tooltip left
    });
  };

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    updatePosition();
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150); // Small delay to allow mousing into tooltip
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    hideTooltip();
  };

  useEffect(() => {
    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={showTooltip}
      >
        {children}
      </div>

      {isVisible && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Up triangle tail */}
          <div 
            className="absolute w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent"
            style={{
              left: position.triangleLeft,
              top: '-8px', // Back to previous working position
              borderBottomColor: '#e5e7eb', // gray-200
            }}
          />
          
          {/* Tooltip content */}
          <div className="p-4 text-left">
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
