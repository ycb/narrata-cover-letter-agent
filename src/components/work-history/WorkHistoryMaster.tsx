import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Calendar, ChevronRight, FileText, Link, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";
import { CompletionProgress } from "./CompletionProgress";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryMasterProps {
  companies: WorkHistoryCompany[];
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  onCompanySelect: (company: WorkHistoryCompany) => void;
  onRoleSelect: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
}

export const WorkHistoryMaster = ({
  companies,
  selectedCompany,
  selectedRole,
  onCompanySelect,
  onRoleSelect,
  onAddRole
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

  // Auto-expand accordion if a role is selected but its company isn't expanded
  const getExpandedCompanies = () => {
    const expanded = [];
    if (selectedCompany) {
      expanded.push(selectedCompany.id);
    }
    // If a role is selected but from a different company than selectedCompany, expand that too
    if (selectedRole && selectedRole.companyId !== selectedCompany?.id) {
      expanded.push(selectedRole.companyId);
    }
    return expanded;
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Companies & Roles</h2>
            <p className="text-sm text-muted-foreground">
              Select a company or role to view details
            </p>
          </div>
          {selectedCompany && onAddRole && (
            <Button variant="secondary" size="sm" onClick={onAddRole}>
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </Button>
          )}

        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto px-0">
        <Accordion type="multiple" value={getExpandedCompanies()} className="w-full">
          {companies.map((company) => (
            <AccordionItem key={company.id} value={company.id} className="border-x-0">
              <AccordionTrigger 
                className={cn(
                  "px-6 py-4 hover:no-underline hover:bg-muted/30 hover:text-foreground transition-colors",
                  selectedCompany?.id === company.id && "bg-accent/20"
                )}
                onClick={() => onCompanySelect(company)}
              >
                <div className="flex items-start gap-3 text-left w-full">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium truncate">{company.name}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusBadge 
                          type="linkedin" 
                          status="connected" 
                          lastSync="2024-01-15"
                          className="text-xs"
                        />
                        <StatusBadge 
                          type="resume" 
                          status="uploaded" 
                          fileName="resume.pdf"
                          className="text-xs"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {company.roles.length} role{company.roles.length !== 1 ? 's' : ''}
                    </p>
                    <CompletionProgress
                      completed={company.roles.length > 0 ? 2 : 0}
                      total={4}
                      steps={[
                        { name: "Company", completed: true, required: true },
                        { name: "Roles", completed: company.roles.length > 0, required: true },
                        { name: "Stories", completed: company.roles.some(r => r.blurbs.length > 0) },
                        { name: "Links", completed: company.roles.some(r => r.externalLinks.length > 0) }
                      ]}
                      className="text-xs"
                    />
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="px-0 pb-0">
                <div className="space-y-0">
                  {company.roles.map((role) => (
                    <Button
                      key={role.id}
                      variant="ghost"
                      className={cn(
                        "w-full px-6 py-4 h-auto justify-start text-left rounded-none hover:bg-muted/30 hover:text-foreground transition-colors",
                        selectedRole?.id === role.id && "bg-primary/10 border-r-2 border-primary"
                      )}
                      onClick={() => onRoleSelect(role)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between gap-4">
                          <h4 className="font-medium text-sm truncate">{role.title}</h4>
                          <div className="flex items-center gap-2 shrink-0">
                            {role.blurbs.length > 0 && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {role.blurbs.length}
                              </Badge>
                            )}
                            {role.externalLinks.length > 0 && (
                              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                <Link className="h-3 w-3" />
                                {role.externalLinks.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDateRange(role.startDate, role.endDate)}
                            </span>
                          </div>

                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};