import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Building, User, FileText, Check } from "lucide-react";
import { ConfidenceIndicator } from "@/components/confidence/ConfidenceIndicator";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from "@/types/workHistory";

// Mock work history data
const mockWorkHistory: WorkHistoryCompany[] = [
  {
    id: "company-1",
    name: "TechCorp Solutions",
    logo: "https://placeholder.com/40x40",
    description: "Enterprise software solutions",
    tags: ["enterprise", "saas", "b2b"],
    roles: [
      {
        id: "role-1",
        companyId: "company-1",
        title: "Senior Software Engineer",
        startDate: "2021-03-01",
        endDate: "2023-12-31",
        description: "Led development of core platform features",
        tags: ["react", "typescript", "node.js"],
        achievements: ["Improved performance by 40%", "Led team of 5 developers"],
        blurbs: [
          {
            id: "blurb-1",
            roleId: "role-1",
            title: "React Performance Optimization",
            content: "Spearheaded the optimization of our React-based dashboard, implementing code splitting and lazy loading that reduced initial load times by 40% and improved user engagement metrics across 50,000+ daily active users.",
            status: "approved",
            confidence: "high",
            tags: ["react", "performance", "optimization"],
            timesUsed: 12,
            lastUsed: "2024-01-15"
          },
          {
            id: "blurb-2",
            roleId: "role-1", 
            title: "Team Leadership",
            content: "Led a cross-functional team of 5 developers to deliver a critical enterprise feature 2 weeks ahead of schedule, mentoring junior developers and implementing agile best practices that increased team velocity by 25%.",
            status: "approved",
            confidence: "high",
            tags: ["leadership", "agile", "mentoring"],
            timesUsed: 8,
            lastUsed: "2024-01-10"
          }
        ],
        externalLinks: []
      },
      {
        id: "role-2",
        companyId: "company-1",
        title: "Full Stack Developer",
        startDate: "2019-06-01",
        endDate: "2021-02-28",
        description: "Developed and maintained web applications",
        tags: ["full stack", "javascript", "python"],
        achievements: ["Built 3 major features", "Reduced bugs by 30%"],
        blurbs: [
          {
            id: "blurb-3",
            roleId: "role-2",
            title: "Full Stack Feature Development",
            content: "Designed and implemented 3 major user-facing features using React and Node.js, serving over 10,000 users and contributing to a 15% increase in user retention through improved user experience.",
            status: "approved",
            confidence: "medium",
            tags: ["full stack", "react", "node.js"],
            timesUsed: 6,
            lastUsed: "2024-01-05"
          }
        ],
        externalLinks: []
      }
    ]
  },
  {
    id: "company-2",
    name: "StartupXYZ",
    logo: "https://placeholder.com/40x40",
    description: "Fast-growing fintech startup",
    tags: ["fintech", "startup", "payments"],
    roles: [
      {
        id: "role-3",
        companyId: "company-2",
        title: "Frontend Developer",
        startDate: "2018-01-01",
        endDate: "2019-05-31",
        description: "Built user interfaces for financial products",
        tags: ["frontend", "vue.js", "fintech"],
        achievements: ["Launched mobile app", "Improved UX metrics"],
        blurbs: [
          {
            id: "blurb-4",
            roleId: "role-3",
            title: "Mobile App Launch",
            content: "Led the frontend development of a Vue.js-based mobile web app for financial transactions, achieving 99.9% uptime and processing over $2M in transactions within the first 6 months of launch.",
            status: "approved",
            confidence: "high",
            tags: ["vue.js", "mobile", "fintech"],
            timesUsed: 4,
            lastUsed: "2023-12-20"
          }
        ],
        externalLinks: []
      }
    ]
  }
];

interface WorkHistoryBlurbSelectorProps {
  onSelectBlurb: (blurb: WorkHistoryBlurb) => void;
  onCancel: () => void;
  selectedBlurbId?: string;
}

export const WorkHistoryBlurbSelector = ({ 
  onSelectBlurb, 
  onCancel, 
  selectedBlurbId 
}: WorkHistoryBlurbSelectorProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<WorkHistoryCompany | null>(null);
  const [selectedRole, setSelectedRole] = useState<WorkHistoryRole | null>(null);

  const filteredCompanies = mockWorkHistory.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.roles.some(role => 
      role.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.blurbs.some(blurb =>
        blurb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        blurb.content.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  );

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
              <CardTitle>Select Work History Blurb</CardTitle>
              <CardDescription>
                Choose a blurb from your work history to use as static content
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
              placeholder="Search companies, roles, or blurbs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedCompany ? (
              /* Company List */
              <div className="space-y-3">
                {filteredCompanies.map((company) => (
                  <Card 
                    key={company.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedCompany(company)}
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
                            {company.roles.length} role{company.roles.length !== 1 ? 's' : ''}
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
                  onClick={() => setSelectedCompany(null)}
                  className="mb-4"
                >
                  ← Back to Companies
                </Button>
                
                {selectedCompany.roles.map((role) => (
                  <Card 
                    key={role.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedRole(role)}
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
                              {new Date(role.startDate).toLocaleDateString()} - {role.endDate ? new Date(role.endDate).toLocaleDateString() : 'Present'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {role.blurbs.length} blurb{role.blurbs.length !== 1 ? 's' : ''}
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
                  onClick={() => setSelectedRole(null)}
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
                            {blurb.content}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Used {blurb.timesUsed} times</span>
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