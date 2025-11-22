import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Building, User, FileText, Check } from "lucide-react";
import { ConfidenceIndicator } from "@/components/confidence/ConfidenceIndicator";
import type { WorkHistoryCompany, WorkHistoryBlurb } from "@/types/workHistory";

interface WorkHistoryBlurbSelectorProps {
  companies: WorkHistoryCompany[];
  isLoading?: boolean;
  error?: string | null;
  onSelectBlurb: (blurb: WorkHistoryBlurb) => void;
  onCancel: () => void;
  selectedBlurbId?: string;
}

export const WorkHistoryBlurbSelector = ({ 
  companies,
  isLoading = false,
  error = null,
  onSelectBlurb, 
  onCancel, 
  selectedBlurbId 
}: WorkHistoryBlurbSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const selectedRole = useMemo(
    () => selectedCompany?.roles.find((role) => role.id === selectedRoleId) || null,
    [selectedCompany, selectedRoleId]
  );

  useEffect(() => {
    if (companies.length === 0) {
      setSelectedCompanyId("");
      setSelectedRoleId("");
    }
  }, [companies.length]);

  useEffect(() => {
    if (!selectedCompany) {
      setSelectedRoleId("");
    } else if (selectedRoleId) {
      const roleExists = selectedCompany.roles.some(
        (role) => role.id === selectedRoleId && role.blurbs.length > 0
      );
      if (!roleExists) {
        setSelectedRoleId("");
      }
    }
  }, [selectedCompany, selectedRoleId]);

  const filteredCompanies = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return companies.filter((company) => {
      const rolesWithStories = company.roles.filter((role) => role.blurbs.length > 0);
      if (rolesWithStories.length === 0) return false;

      if (!normalizedSearch) return true;

      if (
        company.name.toLowerCase().includes(normalizedSearch) ||
        (company.description ?? "").toLowerCase().includes(normalizedSearch)
      ) {
        return true;
      }

      return rolesWithStories.some((role) =>
        role.title.toLowerCase().includes(normalizedSearch) ||
        (role.description ?? "").toLowerCase().includes(normalizedSearch) ||
        role.blurbs.some(
          (blurb) =>
            blurb.title.toLowerCase().includes(normalizedSearch) ||
            (blurb.content ?? "").toLowerCase().includes(normalizedSearch)
        )
      );
    });
  }, [companies, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'needs-review': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const breadcrumbPath = () => {
    const parts = ['Work History'];
    if (selectedCompany) parts.push(selectedCompany.name);
    if (selectedRole) parts.push(selectedRole.title);
    return parts.join(' > ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Work History Story</CardTitle>
              <CardDescription>
                Choose a story from your work history to use as static content
              </CardDescription>
              <div className="text-sm text-muted-foreground">
                {breadcrumbPath()}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies, roles, or stories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Loading work history...
              </div>
            ) : error ? (
              <div className="p-4 border border-destructive/30 bg-destructive/10 rounded-lg text-sm text-destructive">
                {error}
              </div>
            ) : !selectedCompany && filteredCompanies.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-sm text-muted-foreground text-center">
                No stories found. Try adjusting your search or upload work history content first.
              </div>
            ) : !selectedCompany ? (
              /* Company List */
              <div className="space-y-3">
                {filteredCompanies.map((company) => (
                  <Card 
                    key={company.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedCompanyId(company.id);
                      setSelectedRoleId("");
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{company.name}</h4>
                            <p className="text-sm text-muted-foreground">{company.description}</p>
                            <div className="flex gap-1 mt-1">
                              {company.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {company.roles.filter(role => role.blurbs.length > 0).length} role{company.roles.filter(role => role.blurbs.length > 0).length !== 1 ? 's' : ''}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !selectedRole ? (
              /* Role List */
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedCompanyId("");
                    setSelectedRoleId("");
                  }}
                  className="mb-4"
                >
                  ← Back to Companies
                </Button>
                
                {selectedCompany.roles
                  .filter((role) => role.blurbs.length > 0)
                  .map((role) => (
                  <Card 
                    key={role.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{role.title}</h4>
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                            <div className="flex gap-1 mt-1">
                              {role.tags.slice(0, 3).map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {role.startDate ? new Date(role.startDate).toLocaleDateString() : 'Start date unavailable'}
                              {' '}–{' '}
                              {role.endDate ? new Date(role.endDate).toLocaleDateString() : 'Present'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {role.blurbs.length === 0 ? '0 stories' : `${role.blurbs.length} story${role.blurbs.length === 1 ? '' : 's'}`}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Blurb List */
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedRoleId("")}
                  className="mb-4"
                >
                  ← Back to Roles
                </Button>
                
                {selectedRole.blurbs.map((blurb) => (
                  <Card 
                    key={blurb.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary/20 ${
                      selectedBlurbId === blurb.id ? 'ring-2 ring-primary border-primary' : ''
                    }`}
                    onClick={() => onSelectBlurb(blurb)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <h5 className="font-medium">{blurb.title}</h5>
                            <Badge className={`text-xs ${getStatusColor(blurb.status)}`}>
                              {blurb.status}
                            </Badge>
                            <ConfidenceIndicator level={blurb.confidence} score={85} />
                            {selectedBlurbId === blurb.id && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                            {blurb.content?.length ? blurb.content : 'No story content captured yet.'}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Used {blurb.timesUsed ?? 0} times</span>
                            {blurb.lastUsed && (
                              <span>Last used {new Date(blurb.lastUsed).toLocaleDateString()}</span>
                            )}
                          </div>
                          
                          <div className="flex gap-1 mt-2">
                            {blurb.tags.slice(0, 4).map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="ml-4 text-xs text-muted-foreground">
                          Click to select
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};