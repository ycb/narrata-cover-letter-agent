import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Calendar, ChevronRight, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

interface WorkHistoryDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  companies: WorkHistoryCompany[];
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  onCompanySelect: (company: WorkHistoryCompany) => void;
  onRoleSelect: (role: WorkHistoryRole) => void;
  onAddCompany?: () => void;
  onAddRole?: () => void;
  trigger?: React.ReactNode;
}

export const WorkHistoryDrawer = ({
  isOpen,
  onOpenChange,
  companies,
  selectedCompany,
  selectedRole,
  onCompanySelect,
  onRoleSelect,
  onAddCompany,
  onAddRole,
  trigger
}: WorkHistoryDrawerProps) => {
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

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="lg:hidden">
      <Menu className="h-4 w-4" />
      <span className="sr-only">Open navigation</span>
    </Button>
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {trigger || defaultTrigger}
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Companies & Roles</h2>
              <p className="text-sm text-muted-foreground">
                Select a company or role to view details
              </p>
            </div>
            {selectedCompany && onAddRole && (
              <Button variant="secondary" size="sm" onClick={onAddRole}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-auto">
          {companies.length === 0 ? (
            <div className="p-6 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Companies Yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first company to get started
              </p>
              {onAddCompany && (
                <Button onClick={onAddCompany} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              )}
            </div>
          ) : (
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
                            "w-full px-6 py-4 h-auto justify-start text-left rounded-none hover:bg-muted/30 hover:text-foreground transition-colors",
                            selectedRole?.id === role.id && "bg-primary/10 border-r-2 border-primary"
                          )}
                          onClick={() => onRoleSelect(role)}
                        >
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{role.title}</h4>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {role.type || 'full-time'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span className="truncate">
                                  {formatDateRange(role.startDate, role.endDate)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>{role.blurbs.length} stories</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <span>{role.externalLinks.length} links</span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </Button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
