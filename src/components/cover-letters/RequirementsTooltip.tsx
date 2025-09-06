import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface Requirement {
  id: string;
  text: string;
  demonstrated: boolean;
  evidence?: string;
}

interface RequirementsTooltipProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  requirements: Requirement[];
  description?: string;
}

export function RequirementsTooltip({ 
  children, 
  className,
  title,
  requirements,
  description
}: RequirementsTooltipProps) {
  const content = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left side - Requirements */}
        <div className="space-y-2">
          {requirements.map((req) => (
            <div key={req.id} className={`flex items-center gap-2 p-2 rounded ${req.demonstrated ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex-shrink-0">
                {req.demonstrated ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <X className="h-3 w-3 text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-900">
                  {req.text}
                </span>
              </div>
            </div>
          ))}
        </div>

                  {/* Right side - Evidence/Status */}
          <div className="space-y-2">
            {requirements.map((req) => (
              <div key={req.id} className={`flex items-center gap-2 p-2 rounded ${req.demonstrated ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex-shrink-0">
                  {req.demonstrated ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {req.evidence ? (
                    <span className={`text-sm ${req.demonstrated ? 'text-gray-700' : 'text-gray-500'}`}>
                      {req.evidence}
                    </span>
                  ) : (
                    <span className={`text-sm ${req.demonstrated ? 'text-gray-700' : 'text-gray-500'}`}>
                      {req.demonstrated ? 'Demonstrated' : 'Not demonstrated'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
      </div>
    </div>
  );

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}

// Helper function to create mock requirements data
export function createMockRequirements(type: 'core' | 'preferred'): Requirement[] {
  if (type === 'core') {
    return [
      {
        id: 'core-1',
        text: 'JavaScript proficiency',
        demonstrated: true,
        evidence: 'Mentioned 5+ years of JavaScript experience'
      },
      {
        id: 'core-2',
        text: 'React development experience',
        demonstrated: true,
        evidence: 'Highlighted React projects and component development'
      },
      {
        id: 'core-3',
        text: 'Node.js backend development',
        demonstrated: false,
        evidence: 'Limited Node.js experience mentioned'
      },
      {
        id: 'core-4',
        text: 'API design and integration',
        demonstrated: false,
        evidence: 'API experience not clearly demonstrated'
      }
    ];
  } else {
    return [
      {
        id: 'pref-1',
        text: 'Python programming experience',
        demonstrated: false,
        evidence: 'Python experience not mentioned in current draft'
      },
      {
        id: 'pref-2',
        text: 'Leadership and team management',
        demonstrated: false,
        evidence: 'No team leadership experience highlighted'
      },
      {
        id: 'pref-3',
        text: 'Metrics and KPI tracking',
        demonstrated: false,
        evidence: 'Quantifiable achievements need more emphasis'
      },
      {
        id: 'pref-4',
        text: 'Agile methodology experience',
        demonstrated: true,
        evidence: 'Mentioned working in agile development teams'
      }
    ];
  }
}
