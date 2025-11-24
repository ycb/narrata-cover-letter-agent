import { Check, X } from 'lucide-react';

interface StatusIconProps {
  met: boolean;
  className?: string;
}

/**
 * Standardized status icon component for requirements/standards
 * DRY: Used consistently across MatchMetricsToolbar, CoverLetterRatingTooltip, SectionInspector
 */
export function StatusIcon({ met, className = "h-4 w-4" }: StatusIconProps) {
  return met ? (
    <Check className={`${className} text-success`} />
  ) : (
    <X className={`${className} text-destructive`} />
  );
}
