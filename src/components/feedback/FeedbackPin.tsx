import React from 'react';
import { cn } from '@/lib/utils';
import { CategoryType } from '@/types/feedback';

interface FeedbackPinProps {
  x: number;
  y: number;
  category: CategoryType;
  className?: string;
}

export const FeedbackPin: React.FC<FeedbackPinProps> = ({
  x,
  y,
  category,
  className,
}) => {
  const getCategoryColors = (cat: CategoryType) => {
    switch (cat) {
      case 'bug':
        return {
          bg: 'bg-red-500',
          tail: 'border-t-red-500',
        };
      case 'suggestion':
        return {
          bg: 'bg-blue-500',
          tail: 'border-t-blue-500',
        };
      case 'praise':
        return {
          bg: 'bg-green-500',
          tail: 'border-t-green-500',
        };
      default:
        return {
          bg: 'bg-gray-500',
          tail: 'border-t-gray-500',
        };
    }
  };

  const colors = getCategoryColors(category);

  return (
    <div
      className={cn(
        'fixed z-[40] pointer-events-none',
        'w-6 h-6 rounded-full border-2 border-white shadow-lg',
        colors.bg,
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
        className={cn(
          'absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent',
          colors.tail
        )}
        style={{
          left: '50%',
          top: '100%',
          transform: 'translateX(-50%)',
        }}
      />
    </div>
  );
};
