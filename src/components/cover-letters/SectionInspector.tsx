import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RequirementItem } from './RequirementItem';

export interface SectionAttributionData {
  coreReqs: {
    met: Array<{ id: string; label: string; evidence?: string }>;
    unmet: Array<{ id: string; label: string }>;
  };
  prefReqs: {
    met: Array<{ id: string; label: string; evidence?: string }>;
    unmet: Array<{ id: string; label: string }>;
  };
  standards: {
    met: Array<{ id: string; label: string; evidence?: string }>;
    unmet: Array<{ id: string; label: string; suggestion?: string }>;
  };
}

interface SectionInspectorProps {
  data?: SectionAttributionData; // Optional: undefined during streaming (shows skeleton)
  className?: string;
  defaultOpen?: boolean; // Whether to start expanded (default: false)
  // Job-level totals for denominators (fixes "2/0" display bug)
  // These represent the total count of requirements/standards for the entire job
  totalCoreReqs?: number;
  totalPrefReqs?: number;
  totalStandards?: number;
  // Optional deltas for "draft vs existing" comparisons (shown inline in badges)
  deltaCoreReqs?: number;
  deltaPrefReqs?: number;
  deltaStandards?: number;
  changedToMetLabels?: string[];
  changedToUnmetLabels?: string[];
  changedStandardsToMetLabels?: string[];
  changedStandardsToUnmetLabels?: string[];
}

/**
 * Section Inspector - Expandable drawer showing section-level attribution
 * Shows which requirements and standards this section satisfies
 *
 * Used in cover letter content cards to give user visibility into
 * what's working without opening HIL modal
 */
export function SectionInspector({
  data,
  className,
  defaultOpen = false,
  totalCoreReqs: jobTotalCoreReqs,
  totalPrefReqs: jobTotalPrefReqs,
  totalStandards: jobTotalStandards,
  deltaCoreReqs = 0,
  deltaPrefReqs = 0,
  deltaStandards = 0,
  changedToMetLabels = [],
  changedToUnmetLabels = [],
  changedStandardsToMetLabels = [],
  changedStandardsToUnmetLabels = [],
}: SectionInspectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Show skeleton when no data provided (undefined during streaming)
  if (!data) {
    return (
      <div className={cn('w-full p-3 rounded-md bg-muted/20', className)}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Requirements Met:</span>
          <div className="h-7 w-20 bg-muted animate-pulse rounded" />
          <div className="h-7 w-20 bg-muted animate-pulse rounded" />
          <div className="h-7 w-24 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  // Data is guaranteed to exist at this point
  const coreMetCount = data.coreReqs.met.length;
  const prefMetCount = data.prefReqs.met.length;
  const standardsMetCount = data.standards.met.length;

  // CRITICAL FIX: Use job-level totals as denominators (not section-level met + unmet)
  // Fallback to section data if job totals not provided (backward compatibility)
  const totalCoreReqs = jobTotalCoreReqs ?? (data.coreReqs.met.length + data.coreReqs.unmet.length);
  const totalPrefReqs = jobTotalPrefReqs ?? (data.prefReqs.met.length + data.prefReqs.unmet.length);
  const totalStandards = jobTotalStandards ?? (data.standards.met.length + data.standards.unmet.length);

  const deltaLabel = (delta: number) => {
    if (!delta) return '';
    return ` (${delta > 0 ? `+${delta}` : String(delta)})`;
  };

  const changedToMetSet = new Set(changedToMetLabels);
  const changedToUnmetSet = new Set(changedToUnmetLabels);
  const changedStandardsToMetSet = new Set(changedStandardsToMetLabels);
  const changedStandardsToUnmetSet = new Set(changedStandardsToUnmetLabels);

  // Build summary badges - count only with regular tag style
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn('w-full', className)}
    >
      <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-muted/50 transition-colors p-3 rounded-md">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">Requirements Met:</span>
          <Badge variant="secondary" className="text-xs">
            {coreMetCount} core{deltaLabel(deltaCoreReqs)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {prefMetCount} pref{deltaLabel(deltaPrefReqs)}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {standardsMetCount} standards{deltaLabel(deltaStandards)}
          </Badge>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4">
        <Tabs defaultValue="core" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="core" className="flex-shrink-0 whitespace-nowrap px-3">
                <span className="hidden sm:inline">Core Requirements</span>
                <span className="sm:hidden">Core</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {coreMetCount}/{totalCoreReqs}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pref" className="flex-shrink-0 whitespace-nowrap px-3">
                <span className="hidden sm:inline">Preferred</span>
                <span className="sm:hidden">Pref</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {prefMetCount}/{totalPrefReqs}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="standards" className="flex-shrink-0 whitespace-nowrap px-3">
                <span className="hidden sm:inline">Content Standards</span>
                <span className="sm:hidden">Standards</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {standardsMetCount}/{totalStandards}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="core" className="space-y-1">
            {data.coreReqs.met.map((req) => (
              <RequirementItem
                key={req.id}
                label={req.label}
                type="met"
                evidence={req.evidence}
                badgeText={changedToMetSet.has(req.label) ? 'New' : undefined}
              />
            ))}
            {data.coreReqs.unmet.map((req) => (
              <RequirementItem
                key={req.id}
                label={req.label}
                type="unmet"
                badgeText={changedToUnmetSet.has(req.label) ? 'Regressed' : undefined}
                badgeTone={changedToUnmetSet.has(req.label) ? 'regressed' : undefined}
              />
            ))}
          </TabsContent>

          <TabsContent value="pref" className="space-y-1">
            {data.prefReqs.met.map((req) => (
              <RequirementItem
                key={req.id}
                label={req.label}
                type="met"
                evidence={req.evidence}
                badgeText={changedToMetSet.has(req.label) ? 'New' : undefined}
              />
            ))}
            {data.prefReqs.unmet.map((req) => (
              <RequirementItem
                key={req.id}
                label={req.label}
                type="unmet"
                badgeText={changedToUnmetSet.has(req.label) ? 'Regressed' : undefined}
                badgeTone={changedToUnmetSet.has(req.label) ? 'regressed' : undefined}
              />
            ))}
          </TabsContent>

          <TabsContent value="standards" className="space-y-1">
            {data.standards.met.map((standard) => (
              <RequirementItem
                key={standard.id}
                label={standard.label}
                type="met"
                evidence={standard.evidence}
                badgeText={changedStandardsToMetSet.has(standard.label) ? 'New' : undefined}
              />
            ))}
            {data.standards.unmet.map((standard) => (
              <RequirementItem
                key={standard.id}
                label={standard.label}
                type="unmet"
                suggestion={standard.suggestion || 'Not mentioned in draft.'}
                badgeText={changedStandardsToUnmetSet.has(standard.label) ? 'Regressed' : undefined}
                badgeTone={changedStandardsToUnmetSet.has(standard.label) ? 'regressed' : undefined}
              />
            ))}
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
