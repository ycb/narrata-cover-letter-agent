import React from 'react';
import { Button } from '@/components/ui/button';
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
    <Button
      onClick={onClick}
      className={cn(
        'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'flex items-center justify-center p-0',
        isOpen && 'scale-95 opacity-50',
        className
      )}
      aria-label="Provide feedback"
      title="Provide feedback (Ctrl+Shift+F)"
    >
      {isOpen ? (
        <MessageCirclePlus className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
};
