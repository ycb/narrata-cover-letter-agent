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
}

/**
 * Section Inspector - Expandable drawer showing section-level attribution
 * Shows which requirements and standards this section satisfies
 *
 * Used in cover letter content cards to give user visibility into
 * what's working without opening HIL modal
 */
export function SectionInspector({ data, className, defaultOpen = false }: SectionInspectorProps) {
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
  const totalCoreReqs = data.coreReqs.met.length + data.coreReqs.unmet.length;
  const totalPrefReqs = data.prefReqs.met.length + data.prefReqs.unmet.length;
  const totalStandards = data.standards.met.length + data.standards.unmet.length;

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
            {coreMetCount} core
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {prefMetCount} pref
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {standardsMetCount} standards
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
          <div className="overflow-x-auto -mx-3 px-3">
            <TabsList className="w-full min-w-max">
              <TabsTrigger value="core" className="flex-1 min-w-fit whitespace-nowrap px-2 sm:px-4">
                <span className="hidden md:inline">Core Requirements</span>
                <span className="md:hidden">Core</span>
                <Badge variant="outline" className="ml-1 sm:ml-2 text-xs">
                  {coreMetCount}/{totalCoreReqs}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pref" className="flex-1 min-w-fit whitespace-nowrap px-2 sm:px-4">
                <span className="hidden md:inline">Preferred Requirements</span>
                <span className="md:hidden">Preferred</span>
                <Badge variant="outline" className="ml-1 sm:ml-2 text-xs">
                  {prefMetCount}/{totalPrefReqs}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="standards" className="flex-1 min-w-fit whitespace-nowrap px-2 sm:px-4">
                <span className="hidden md:inline">Content Standards</span>
                <span className="md:hidden">Standards</span>
                <Badge variant="outline" className="ml-1 sm:ml-2 text-xs">
                  {standardsMetCount}/{totalStandards}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="core" className="space-y-1">
            {data.coreReqs.met.map((req) => (
              <RequirementItem key={req.id} label={req.label} type="met" evidence={req.evidence} />
            ))}
            {data.coreReqs.unmet.map((req) => (
              <RequirementItem key={req.id} label={req.label} type="unmet" />
            ))}
          </TabsContent>

          <TabsContent value="pref" className="space-y-1">
            {data.prefReqs.met.map((req) => (
              <RequirementItem key={req.id} label={req.label} type="met" evidence={req.evidence} />
            ))}
            {data.prefReqs.unmet.map((req) => (
              <RequirementItem key={req.id} label={req.label} type="unmet" />
            ))}
          </TabsContent>

          <TabsContent value="standards" className="space-y-1">
            {data.standards.met.map((standard) => (
              <RequirementItem key={standard.id} label={standard.label} type="met" evidence={standard.evidence} />
            ))}
            {data.standards.unmet.map((standard) => (
              <RequirementItem key={standard.id} label={standard.label} type="unmet" suggestion={standard.suggestion || 'Not mentioned in draft.'} />
            ))}
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
