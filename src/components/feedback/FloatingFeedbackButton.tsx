import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, MessageCirclePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingFeedbackButtonProps {
  onClick: () => void;
  isOpen?: boolean;
  className?: string;
}

export const FloatingFeedbackButton: React.FC<FloatingFeedbackButtonProps> = ({
  onClick,
  isOpen = false,
  className,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            className={cn(
              'fixed bottom-6 right-6 z-50 h-12 px-4 rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl',
              'bg-[#E32D9A] text-white hover:bg-[#E32D9A]/90',
              'flex items-center justify-center gap-2',
              'min-w-[160px]',
              isOpen && 'scale-95 opacity-50',
              className
            )}
            aria-label="Provide feedback"
          >
            {isOpen ? (
              <MessageCirclePlus className="h-5 w-5" />
            ) : (
              <MessageCircle className="h-5 w-5" />
            )}
            <span className="text-sm font-medium">Provide Feedback</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="bg-gray-900 text-white">
          <p>Click to start feedback process</p>
          <p className="text-xs text-gray-300">Ctrl+Shift+F</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
