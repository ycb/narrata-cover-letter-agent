import { StatusIcon } from './StatusIcon';
import { Badge } from '@/components/ui/badge';

interface RequirementItemProps {
  label: string;
  type: 'met' | 'unmet';
  evidence?: string;
  suggestion?: string;
  badgeText?: string;
  badgeTone?: 'new' | 'regressed';
}

/**
 * RequirementItem - Single requirement/standard display component
 *
 * Used within SectionInspector tabs to show individual requirements
 * with met/unmet status and evidence/suggestions.
 *
 * Matches toolbar styling for consistency across the app.
 */
export function RequirementItem({ label, type, evidence, suggestion, badgeText, badgeTone = 'new' }: RequirementItemProps) {
  const badgeClassName =
    badgeTone === 'regressed'
      ? 'text-[10px] leading-4 h-5 px-2 border-red-200 text-red-700 bg-red-50'
      : 'text-[10px] leading-4 h-5 px-2 border-emerald-200 text-emerald-700 bg-emerald-50';

  return (
    <div className="p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="mb-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-medium text-foreground">{label}</h4>
            {badgeText ? (
              <Badge variant="outline" className={badgeClassName}>
                {badgeText}
              </Badge>
            ) : null}
          </div>
        </div>
        {evidence && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Status:</span>{' '}
              <span className="text-foreground/80">{evidence}</span>
            </div>
          </div>
        )}
        {suggestion && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Suggestion:</span>{' '}
              <span className="text-foreground/80">{suggestion}</span>
            </div>
          </div>
        )}
        {type === 'unmet' && !evidence && !suggestion && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Status:</span>{' '}
              <span className="text-foreground/80">Not mentioned in draft.</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 p-2 flex items-center gap-2">
        <StatusIcon met={type === 'met'} />
      </div>
    </div>
  );
}
