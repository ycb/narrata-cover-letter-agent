import { CheckCircle2, HelpCircle } from "lucide-react";

interface Criterion {
  criterion: string;
  met: boolean;
}

interface CriteriaDisplayProps {
  criteria: Criterion[];
  className?: string;
}

export function CriteriaDisplay({ criteria, className }: CriteriaDisplayProps) {
  const metCount = criteria.filter(c => c.met).length;
  const unmetCount = criteria.filter(c => !c.met).length;
  const allMet = unmetCount === 0 && metCount > 0;
  const noneMet = metCount === 0 && unmetCount > 0;

  // Single column layout when all met or none met
  if (allMet || noneMet) {
    return (
      <div className={className}>
        {allMet && (
          <div className="text-sm text-muted-foreground mb-2 font-semibold">All criteria met 😊</div>
        )}
        {noneMet && (
          <div className="text-sm text-muted-foreground mb-2 font-semibold">No criteria met 😢</div>
        )}
        <ul className="space-y-2">
          {criteria.map((item, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              {item.met ? (
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              ) : (
                <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <span>{item.criterion}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Two column layout when mixed (met and unmet)
  return (
    <div className={className}>
      <div className="text-sm text-muted-foreground mb-4 font-semibold">
        Found evidence for {metCount} out of {criteria.length} criteria
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Met Criteria - Left Column */}
        <div>
          <ul className="space-y-2">
            {criteria.filter(c => c.met).map((item, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>{item.criterion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Unmet/TBD Criteria - Right Column */}
        <div>
          <ul className="space-y-2">
            {criteria.filter(c => !c.met).map((item, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span>{item.criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

