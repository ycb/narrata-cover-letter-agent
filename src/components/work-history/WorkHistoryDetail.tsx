import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { WorkHistoryDetailTabs } from "@/components/work-history/WorkHistoryDetailTabs";
import { 
  Building2, 
  Calendar, 
  FileText, 
  Plus, 
  Target,
  Tags,
  User,
  MoreHorizontal,
  Edit,
  Copy,
  Files,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface WorkHistoryDetailProps {
  selectedCompany: WorkHistoryCompany | null;
  selectedRole: WorkHistoryRole | null;
  onRoleSelect?: (role: WorkHistoryRole) => void;
  onAddRole?: () => void;
}

export const WorkHistoryDetail = ({ 
  selectedCompany, 
  selectedRole,
  onRoleSelect,
  onAddRole,
}: WorkHistoryDetailProps) => {
  const formatDateRange = (startDate: string, endDate?: string) => {
    const start = new Date(startDate).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
    const end = endDate 
      ? new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      : 'Present';
    return `${start} - ${end}`;
  };

  if (!selectedCompany && !selectedRole) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Select a Company or Role
          </h3>
          <p className="text-muted-foreground">
            Choose from the list to view details and manage blurbs
          </p>
        </div>
      </Card>
    );
  }

  // Show role details if a role is selected
  if (selectedRole) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Role Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-2xl">{selectedRole.title}</CardTitle>
                  <p className="text-lg text-muted-foreground mt-1">
                    at {selectedCompany?.name}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDateRange(selectedRole.startDate, selectedRole.endDate)}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {selectedRole.blurbs.length} blurb{selectedRole.blurbs.length !== 1 ? 's' : ''} • {selectedRole.externalLinks.length} link{selectedRole.externalLinks.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {selectedRole.description && (
                  <p className="text-foreground">{selectedRole.description}</p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onAddRole}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                    Delete Role
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Role Tags */}
            {selectedRole.tags.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Role Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Key Achievements */}
            {selectedRole.achievements.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Key Achievements</span>
                </div>
                <ul className="space-y-2">
                  {selectedRole.achievements.map((achievement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                      <span className="text-sm text-foreground">{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Associated Blurbs and External Links */}
        <div className="bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              <Tabs defaultValue="blurbs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="blurbs">Associated Blurbs ({selectedRole?.blurbs.length || 0})</TabsTrigger>
                  <TabsTrigger value="links">External Links ({selectedRole?.externalLinks.length || 0})</TabsTrigger>
                </TabsList>
                
                {/* Tab Content - No outer card wrapper */}
                <div className="mt-6">
                  <WorkHistoryDetailTabs selectedRole={selectedRole} />
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show company details if only company is selected
  if (selectedCompany) {
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Company Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <div>
                  <CardTitle className="text-2xl">{selectedCompany.name}</CardTitle>
                  {selectedCompany.description && (
                    <p className="text-muted-foreground mt-2">{selectedCompany.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {selectedCompany.roles.length} role{selectedCompany.roles.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {(() => {
                      const totalBlurbs = selectedCompany.roles.reduce((total, role) => total + role.blurbs.length, 0);
                      return `${totalBlurbs} total blurb${totalBlurbs !== 1 ? 's' : ''}`;
                    })()}
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onAddRole}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Role
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Company
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Trash2 className="mr-2 h-4 w-4 text-red-500" />
                    Delete Company
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Company Tags */}
            {selectedCompany.tags.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Company Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedCompany.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Roles Overview Card */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Roles at {selectedCompany.name}</CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-4">
              {selectedCompany.roles.map((role, index) => (
                <div key={role.id}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div 
                    className="space-y-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                    onClick={() => onRoleSelect?.(role)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-lg">{role.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          {formatDateRange(role.startDate, role.endDate)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {role.blurbs.length} blurb{role.blurbs.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    
                    {role.description && (
                      <p className="text-muted-foreground">{role.description}</p>
                    )}
                    
                    {role.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};