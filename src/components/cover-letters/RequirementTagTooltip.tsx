import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { RequirementTag } from '@/types/coverLetters';

interface RequirementTagTooltipProps {
  tag: RequirementTag;
  children: React.ReactNode;
}

/**
 * Tooltip wrapper for requirement tags
 * Shows detailed information about how the requirement is addressed
 */
export function RequirementTagTooltip({ tag, children }: RequirementTagTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm" side="top">
        <div className="space-y-2">
          {/* Type and Severity Header */}
          <div className="flex items-center gap-2">
            <Badge 
              variant={tag.type === 'core' ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                tag.type === 'core' 
                  ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300'
              )}
            >
              {tag.type === 'core' ? 'Core' : 'Preferred'}
            </Badge>
            <span className="text-xs text-muted-foreground capitalize">
              {tag.severity}
            </span>
          </div>
          
          {/* Requirement Label */}
          <p className="text-sm font-medium">{tag.label}</p>
          
          {/* Evidence */}
          {tag.evidence && (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">How you address this:</p>
              <p className="italic">"{tag.evidence}"</p>
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

interface RequirementTagBadgeProps {
  tag: RequirementTag;
  className?: string;
}

/**
 * Standalone badge with tooltip for requirement tags
 * Combines badge display with tooltip functionality
 */
export function RequirementTagBadge({ tag, className }: RequirementTagBadgeProps) {
  const badgeClassName = cn(
    'text-xs cursor-help',
    tag.type === 'core' 
      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
      : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    className
  );

  return (
    <RequirementTagTooltip tag={tag}>
      <Badge 
        variant={tag.type === 'core' ? 'default' : 'secondary'}
        className={badgeClassName}
        data-severity={tag.severity}
      >
        {tag.label}
      </Badge>
    </RequirementTagTooltip>
  );
}

