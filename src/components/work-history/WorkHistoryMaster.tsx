import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Calendar, ChevronRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryMasterProps {
  companies: WorkHistoryCompany[];
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  onCompanySelect: (company: WorkHistoryCompany) => void;
  onRoleSelect: (role: WorkHistoryRole) => void;
}

export const WorkHistoryMaster = ({
  companies,
  selectedCompany,
  selectedRole,
  onCompanySelect,
  onRoleSelect
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
        <h2 className="text-xl font-semibold">Companies & Roles</h2>
        <p className="text-sm text-muted-foreground">
          Select a company or role to view details
        </p>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto px-0">
        <Accordion type="multiple" className="w-full">
          {companies.map((company) => (
            <AccordionItem key={company.id} value={company.id} className="border-x-0">
              <AccordionTrigger 
                className={cn(
                  "px-6 py-4 hover:no-underline hover:bg-muted/50 transition-colors",
                  selectedCompany?.id === company.id && "bg-accent/20"
                )}
                onClick={() => onCompanySelect(company)}
              >
                <div className="flex items-center gap-3 text-left">
                  <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{company.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {company.roles.length} role{company.roles.length !== 1 ? 's' : ''}
                    </p>
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
                        "w-full px-6 py-4 h-auto justify-start text-left rounded-none hover:bg-muted/50",
                        selectedRole?.id === role.id && "bg-primary/10 border-r-2 border-primary"
                      )}
                      onClick={() => onRoleSelect(role)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-medium text-sm truncate">{role.title}</h4>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {role.blurbs.length}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDateRange(role.startDate, role.endDate)}
                            </span>
                          </div>
                          {role.blurbs.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <FileText className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {role.blurbs.length} blurb{role.blurbs.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
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