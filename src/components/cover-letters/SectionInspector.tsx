import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

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
  isLoading?: boolean; // Explicit loading state
  defaultOpen?: boolean; // Whether to start expanded (default: false)
}

/**
 * Section Inspector - Expandable drawer showing section-level attribution
 * Shows which requirements and standards this section satisfies
 *
 * Used in cover letter content cards to give user visibility into
 * what's working without opening HIL modal
 */
export function SectionInspector({ data, className, isLoading = false, defaultOpen = false }: SectionInspectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Determine if we're in skeleton state (no data OR explicitly loading)
  const showSkeleton = !data || isLoading;

  const coreMetCount = data?.coreReqs.met.length ?? 0;
  const prefMetCount = data?.prefReqs.met.length ?? 0;
  const standardsMetCount = data?.standards.met.length ?? 0;
  const totalCoreReqs = (data?.coreReqs.met.length ?? 0) + (data?.coreReqs.unmet.length ?? 0);
  const totalPrefReqs = (data?.prefReqs.met.length ?? 0) + (data?.prefReqs.unmet.length ?? 0);
  const totalStandards = (data?.standards.met.length ?? 0) + (data?.standards.unmet.length ?? 0);

  // Show skeleton state during loading
  if (showSkeleton) {
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
          <TabsList className="w-full">
            <TabsTrigger value="core" className="flex-1">
              Core Requirements
              <Badge variant="outline" className="ml-2 text-xs">
                {coreMetCount}/{totalCoreReqs}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pref" className="flex-1">
              Preferred Requirements
              <Badge variant="outline" className="ml-2 text-xs">
                {prefMetCount}/{totalPrefReqs}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="standards" className="flex-1">
              Content Standards
              <Badge variant="outline" className="ml-2 text-xs">
                {standardsMetCount}/{totalStandards}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="space-y-1">
            {data.coreReqs.met.map((req) => (
              <div key={req.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{req.label}</h4>
                  </div>
                  {req.evidence && (
                    <div className="text-xs">
                      <div>
                        <span className="font-medium text-foreground/90">Status:</span>{' '}
                        <span className="text-foreground/80">{req.evidence}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                </div>
              </div>
            ))}
            {data.coreReqs.unmet.map((req) => (
              <div key={req.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{req.label}</h4>
                  </div>
                  <div className="text-xs">
                    <div>
                      <span className="font-medium text-foreground/90">Status:</span>{' '}
                      <span className="text-foreground/80">Not mentioned in draft.</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="pref" className="space-y-1">
            {data.prefReqs.met.map((req) => (
              <div key={req.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{req.label}</h4>
                  </div>
                  {req.evidence && (
                    <div className="text-xs">
                      <div>
                        <span className="font-medium text-foreground/90">Status:</span>{' '}
                        <span className="text-foreground/80">{req.evidence}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                </div>
              </div>
            ))}
            {data.prefReqs.unmet.map((req) => (
              <div key={req.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{req.label}</h4>
                  </div>
                  <div className="text-xs">
                    <div>
                      <span className="font-medium text-foreground/90">Status:</span>{' '}
                      <span className="text-foreground/80">Not mentioned in draft.</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="standards" className="space-y-1">
            {data.standards.met.map((standard) => (
              <div key={standard.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{standard.label}</h4>
                  </div>
                  {standard.evidence && (
                    <div className="text-xs">
                      <div>
                        <span className="font-medium text-foreground/90">Status:</span>{' '}
                        <span className="text-foreground/80">{standard.evidence}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" />
                </div>
              </div>
            ))}
            {data.standards.unmet.map((standard) => (
              <div key={standard.id} className="p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="mb-1.5">
                    <h4 className="text-sm font-medium text-foreground">{standard.label}</h4>
                  </div>
                  <div className="text-xs">
                    <div>
                      <span className="font-medium text-foreground/90">Suggestion:</span>{' '}
                      <span className="text-foreground/80">{standard.suggestion || 'Not mentioned in draft.'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 p-2 flex items-center gap-2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CollapsibleContent>
    </Collapsible>
  );
}
