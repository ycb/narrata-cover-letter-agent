import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Plus } from "lucide-react";
import { IntelligentAlertBadge } from "@/components/ui/IntelligentAlertBadge";
import { cn } from "@/lib/utils";
import { isLinkedInScrapingEnabled } from "@/lib/flags";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryMasterProps {
  companies: WorkHistoryCompany[];
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  expandedCompanyId: string | null;
  resolvedGaps: Set<string>;
  selectedDataSource?: 'work-history' | 'linkedin' | 'resume';
  onCompanySelect: (company: WorkHistoryCompany) => void;
  onRoleSelect: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
  onAddCompany?: () => void;
  onConnectLinkedIn?: () => void;
  onUploadResume?: () => void;
  onLinkedInClick?: () => void;
  onResumeClick?: () => void;
}

export const WorkHistoryMaster = ({
  companies,
  selectedCompany,
  selectedRole,
  expandedCompanyId,
  resolvedGaps,
  selectedDataSource = 'work-history',
  onCompanySelect,
  onRoleSelect,
  onAddRole,
  onAddCompany,
  onConnectLinkedIn,
  onUploadResume,
  onLinkedInClick,
  onResumeClick
}: WorkHistoryMasterProps) => {

  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    const end = endDate 
      ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      : 'Present';
    return `${start} - ${end}`;
  };

  // Calculate updated gap count for a role based on resolved gaps
  const getUpdatedGapCount = (role: WorkHistoryRole) => {
    if (!(role as any).hasGaps) return 0;
    
    const originalCount = (role as any).gapCount || 0;

    // `gapCount` is "content items with gaps" (role description, role metrics, and each story with gaps).
    // Decrement using the same item-level keys we set in WorkHistoryDetail when dismissing/resolving.
    let resolvedItems = 0;

    const roleGaps = (role as any).gaps || [];
    const hasRoleDescriptionItem = roleGaps.some((gap: any) =>
      (gap.gap_category || '').includes('description') ||
      gap.gap_category === 'missing_role_description' ||
      gap.gap_category === 'generic_role_description' ||
      gap.gap_category === 'role_description_needs_specifics'
    );
    const hasRoleMetricsItem = roleGaps.some((gap: any) =>
      gap.gap_category === 'missing_role_metrics' || gap.gap_category === 'insufficient_role_metrics'
    );

    if (hasRoleDescriptionItem && resolvedGaps.has('role-description-gap')) resolvedItems += 1;
    if (hasRoleMetricsItem && resolvedGaps.has('role-metrics-gap')) resolvedItems += 1;

    const stories = (role as any).blurbs || [];
    for (const story of stories) {
      if (story?.hasGaps && resolvedGaps.has(`story-content-gap-${story.id}`)) {
        resolvedItems += 1;
      }
    }

    return Math.max(0, originalCount - resolvedItems);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Work History</h2>
          {onAddCompany && (
            <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={onAddCompany}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto px-0">
        {/* Main Content Container with Consistent Spacing */}
        <div className="space-y-4 px-6">
          {/* Companies & Roles Section - No Expand/Collapse */}
          <div className="space-y-4">
            {companies.map((company) => {
              const isSelected = selectedCompany?.id === company.id;
              const hasSelectedRole = selectedRole && company.roles.some(r => r.id === selectedRole.id);
              const isCompanyBlockSelected = isSelected || hasSelectedRole;
              
              return (
                <div
                  key={company.id}
                  className={cn(
                    "relative transition-colors",
                    isCompanyBlockSelected && "bg-muted/30"
                  )}
                >
                  {/* Selection Indicator - Left Side */}
                  {isCompanyBlockSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" />
                  )}
                  
                  <div className={cn(
                    "w-full px-4 py-3 cursor-pointer transition-colors relative",
                    isCompanyBlockSelected && "bg-muted/30"
                  )}
                  onClick={() => onCompanySelect(company)}
                  >
                    {/* Company Name */}
                    <h3 className={cn(
                      "text-base font-semibold mb-1",
                      isCompanyBlockSelected 
                        ? "text-foreground" 
                        : "text-foreground"
                    )}>
                      {company.name}
                    </h3>
                    
                    {/* All Roles Listed */}
                    <div className="space-y-1">
                      {company.roles.map((role) => {
                        const isRoleSelected = selectedRole?.id === role.id;
                        
                        return (
                          <div
                            key={role.id}
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRoleSelect(role);
                            }}
                          >
                            {/* Title on its own line */}
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className={cn(
                                isRoleSelected ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                              )}>
                                {role.title}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Mock gap detection - replace with real data later */}
                                {(role as any).hasGaps && getUpdatedGapCount(role) > 0 && (
                                  <IntelligentAlertBadge
                                    gapCount={getUpdatedGapCount(role)}
                                    onAnalyze={() => {
                                      console.log('Analyze gaps for role:', role.title);
                                      // TODO: Implement gap analysis
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            {/* Dates on their own line */}
                            <div className="flex items-center gap-1">
                              <Calendar className={cn(
                                "h-3 w-3 shrink-0",
                                isRoleSelected ? "text-foreground" : "text-muted-foreground"
                              )} />
                              <span className={cn(
                                "text-xs",
                                isRoleSelected ? "text-foreground font-semibold" : "text-muted-foreground"
                              )}>
                                {formatDateRange(role.startDate, role.endDate)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        
        {/* Data Sources Section - Bottom */}
        <div className="border-t border-muted mt-auto pt-4">
          <h2 className="text-lg font-semibold text-foreground mb-3">Data Sources</h2>
          <div className="space-y-2">
            {/* LinkedIn data source - HIDDEN when feature flag is OFF */}
            {isLinkedInScrapingEnabled() && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-start text-left h-auto py-3 px-4 transition-colors group !rounded-none relative",
                  selectedDataSource === 'linkedin'
                    ? "bg-muted/30 text-foreground hover:bg-muted/30"
                    : "hover:bg-primary hover:text-primary-foreground"
                )}
                onClick={onLinkedInClick}
              >
                {selectedDataSource === 'linkedin' && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" />
                )}
                <div className="flex-1 text-left">
                  <div className={cn(
                    selectedDataSource === 'linkedin'
                      ? "font-semibold text-foreground"
                      : "font-medium group-hover:text-primary-foreground"
                  )}>LinkedIn</div>
                  <div className={cn(
                    "text-xs",
                    selectedDataSource === 'linkedin'
                      ? "text-muted-foreground font-semibold"
                      : "text-muted-foreground group-hover:text-primary-foreground"
                  )}>Connected</div>
                </div>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-left h-auto py-3 px-4 transition-colors group !rounded-none relative",
                selectedDataSource === 'resume'
                  ? "bg-muted/30 text-foreground hover:bg-muted/30"
                  : "hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={onResumeClick}
            >
              {selectedDataSource === 'resume' && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" />
              )}
              <div className="flex-1 text-left">
                <div className={cn(
                  selectedDataSource === 'resume'
                    ? "font-semibold text-foreground"
                    : "font-medium group-hover:text-primary-foreground"
                )}>Resume</div>
                <div className={cn(
                  "text-xs",
                  selectedDataSource === 'resume'
                    ? "text-muted-foreground font-semibold"
                    : "text-muted-foreground group-hover:text-primary-foreground"
                )}>Uploaded</div>
              </div>
            </Button>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};
