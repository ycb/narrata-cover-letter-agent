import { StatusIcon } from './StatusIcon';

interface RequirementItemProps {
  label: string;
  type: 'met' | 'unmet';
  evidence?: string;
  suggestion?: string;
}

/**
 * RequirementItem - Single requirement/standard display component
 *
 * Used within SectionInspector tabs to show individual requirements
 * with met/unmet status and evidence/suggestions.
 *
 * Matches toolbar styling for consistency across the app.
 */
export function RequirementItem({ label, type, evidence, suggestion }: RequirementItemProps) {
  return (
    <div className="p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="mb-1.5">
          <h4 className="text-sm font-medium text-foreground">{label}</h4>
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
