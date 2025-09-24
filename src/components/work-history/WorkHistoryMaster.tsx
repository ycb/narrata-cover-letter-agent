import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Building2, Calendar, FileText, Link, Plus, Linkedin, FileText as FileTextIcon } from "lucide-react";
import { IntelligentAlertBadge } from "@/components/ui/IntelligentAlertBadge";
import { cn } from "@/lib/utils";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryMasterProps {
  companies: WorkHistoryCompany[];
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  expandedCompanyId: string | null;
  onCompanySelect: (company: WorkHistoryCompany) => void;
  onRoleSelect: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
  onAddCompany?: () => void;
  onConnectLinkedIn?: () => void;
  onUploadResume?: () => void;
}

export const WorkHistoryMaster = ({
  companies,
  selectedCompany,
  selectedRole,
  expandedCompanyId,
  onCompanySelect,
  onRoleSelect,
  onAddRole,
  onAddCompany,
  onConnectLinkedIn,
  onUploadResume
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

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Work History</h2>
          <Button variant="secondary" size="sm" className="h-8 w-8 p-0" onClick={onAddCompany}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto px-0">
        {/* Main Content Container with Consistent Spacing */}
        <div className="space-y-4 px-6">
          {/* Companies & Roles Section */}
          <div>
            <Accordion type="single" value={expandedCompanyId || undefined} className="w-full">
            {companies.map((company) => (
              <AccordionItem key={company.id} value={company.id} className="mb-6"> {/* 1.5rem (24px) between company cards */}
                <AccordionTrigger 
                  className={cn(
                    "w-full px-4 py-3 transition-colors relative no-underline cursor-pointer group hover:no-underline [&>svg]:hidden",
                    selectedCompany?.id === company.id 
                      ? "bg-muted/30 text-foreground font-semibold" 
                      : "hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => onCompanySelect(company)}
                >
                  <div className="flex items-center gap-3 text-left w-full">
                    <Building2 className={cn(
                      "h-5 w-5 shrink-0",
                      selectedCompany?.id === company.id 
                        ? "text-primary" 
                        : "text-muted-foreground group-hover:text-primary-foreground"
                    )} />
                    <div className="flex-1 min-w-0">
                      <h3 className={cn(
                        "truncate",
                        selectedCompany?.id === company.id 
                          ? "text-foreground font-semibold" 
                          : "font-medium group-hover:text-primary-foreground"
                      )}>{company.name}</h3>
                      <p className={cn(
                        "text-sm truncate",
                        selectedCompany?.id === company.id 
                          ? "text-muted-foreground font-semibold" 
                          : "text-muted-foreground group-hover:text-primary-foreground"
                      )}>
                        {company.roles.length} role{company.roles.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-0 pb-0">
                  <div className="space-y-6"> {/* 1.5rem (24px) between role cards */}
                    {company.roles.map((role) => (
                      <Button
                        key={role.id}
                        variant="ghost"
                        className={cn(
                          "w-full px-4 py-3 h-auto justify-start text-left transition-colors relative !rounded-none",
                          selectedRole?.id === role.id 
                            ? "text-foreground font-semibold hover:bg-transparent hover:text-current" 
                            : "hover:bg-primary hover:text-primary-foreground group"
                        )}
                        onClick={() => onRoleSelect(role)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                              <h4 className={cn(
                                "text-sm truncate",
                                selectedRole?.id === role.id 
                                  ? "text-foreground font-semibold" 
                                  : "font-medium group-hover:text-primary-foreground"
                              )}>{role.title}</h4>
                              <div className="flex items-center gap-2 shrink-0">
                                {/* Mock gap detection - replace with real data later */}
                                {(role as any).hasGaps && (
                                  <IntelligentAlertBadge
                                    gapCount={(role as any).gapCount || 2}
                                    severity={(role as any).gapSeverity || 'medium'}
                                    onAnalyze={() => {
                                      console.log('Analyze gaps for role:', role.title);
                                      // TODO: Implement gap analysis
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className={cn(
                                "h-3 w-3",
                                selectedRole?.id === role.id 
                                  ? "text-foreground" 
                                  : "text-muted-foreground group-hover:text-primary-foreground"
                              )} />
                              <span className={cn(
                                "text-xs",
                                selectedRole?.id === role.id 
                                  ? "text-foreground font-semibold" 
                                  : "text-muted-foreground group-hover:text-primary-foreground"
                              )}>
                                {formatDateRange(role.startDate, role.endDate)}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Selection Indicator - Left Side */}
                        {selectedRole?.id === role.id && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                        )}
                      </Button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        
        {/* Data Sources Section - Bottom */}
        <div className="border-t border-muted mt-auto">
          <h2 className="text-lg font-semibold text-foreground mb-3">Data Sources</h2>
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary hover:text-primary-foreground transition-colors group !rounded-none"
              onClick={onConnectLinkedIn}
            >
              <Linkedin className="h-4 w-4 mr-2 text-blue-600 group-hover:text-primary-foreground" />
              <div className="flex-1 text-left">
                <div className="font-medium group-hover:text-primary-foreground">LinkedIn</div>
                <div className="text-xs text-muted-foreground group-hover:text-primary-foreground">Connect profile</div>
              </div>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-left h-auto py-3 px-4 hover:bg-primary hover:text-primary-foreground transition-colors group !rounded-none"
              onClick={onUploadResume}
            >
              <FileTextIcon className="h-4 w-4 mr-2 text-slate-600 group-hover:text-primary-foreground" />
              <div className="flex-1 text-left">
                <div className="font-medium group-hover:text-primary-foreground">Resume</div>
                <div className="text-xs text-muted-foreground group-hover:text-primary-foreground">Upload document</div>
              </div>
            </Button>
          </div>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};