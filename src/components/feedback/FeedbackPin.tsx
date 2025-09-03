import React from 'react';
import { cn } from '@/lib/utils';

interface FeedbackPinProps {
  x: number;
  y: number;
  className?: string;
}

export const FeedbackPin: React.FC<FeedbackPinProps> = ({
  x,
  y,
  className,
}) => {
  return (
    <div
      className={cn(
        'fixed z-[9999] pointer-events-none',
        'w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg',
        'animate-pulse',
        className
      )}
      style={{
        left: x - 12, // Center the pin
        top: y - 12,
      }}
    >
      {/* Pin tail */}
      <div
        className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500"
        style={{
          left: '50%',
          top: '100%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
};
