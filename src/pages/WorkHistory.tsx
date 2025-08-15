import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { WorkHistoryMaster } from "@/components/work-history/WorkHistoryMaster";
import { WorkHistoryDetail } from "@/components/work-history/WorkHistoryDetail";
import { DataSourcesStatus } from "@/components/work-history/DataSourcesStatus";
import { WorkHistoryOnboarding } from "@/components/work-history/WorkHistoryOnboarding";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { WorkHistoryCompany, WorkHistoryRole } from "@/types/workHistory";

// Sample data - this would come from your backend
const sampleWorkHistory: WorkHistoryCompany[] = [
  {
    id: "1",
    name: "TechCorp Inc.",
    description: "Leading technology company",
    tags: ["Technology", "Enterprise", "B2B"],
    roles: [
      {
        id: "1-1",
        companyId: "1",
        title: "Senior Product Manager",
        startDate: "2022-01",
        endDate: "2024-12",
        description: "Led product strategy for core platform",
        tags: ["Product Management", "Strategy", "Leadership"],
        achievements: [
          "Increased user engagement by 40% through feature optimization",
          "Led cross-functional team of 12 engineers and designers",
          "Launched 3 major product releases ahead of schedule"
        ],
        blurbs: [
          {
            id: "blurb-1",
            roleId: "1-1",
            title: "Product Strategy Leadership",
            content: "Led comprehensive product strategy for enterprise platform, resulting in 40% increase in user engagement and successful launch of 3 major releases ahead of schedule.",
            status: "approved",
            confidence: "high",
            tags: ["Product Management", "Strategy", "Results"],
            timesUsed: 8,
            lastUsed: "2024-01-15"
          }
        ]
      },
      {
        id: "1-2",
        companyId: "1",
        title: "Product Manager",
        startDate: "2020-06",
        endDate: "2022-01",
        description: "Managed product development lifecycle",
        tags: ["Product Management", "Development", "Analytics"],
        achievements: [
          "Implemented data-driven decision making process",
          "Reduced time-to-market by 25%"
        ],
        blurbs: []
      }
    ]
  },
  {
    id: "2",
    name: "StartupXYZ",
    description: "Fast-growing fintech startup",
    tags: ["Fintech", "Startup", "Growth"],
    roles: [
      {
        id: "2-1",
        companyId: "2",
        title: "Product Lead",
        startDate: "2018-03",
        endDate: "2020-05",
        description: "Built product team from ground up",
        tags: ["Leadership", "Team Building", "Fintech"],
        achievements: [
          "Hired and managed team of 8 product professionals",
          "Launched MVP in 6 months"
        ],
        blurbs: [
          {
            id: "blurb-2",
            roleId: "2-1",
            title: "Team Building Excellence",
            content: "Built high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.",
            status: "approved",
            confidence: "high",
            tags: ["Leadership", "Team Building", "MVP"],
            timesUsed: 12,
            lastUsed: "2024-01-10"
          }
        ]
      }
    ]
  }
];

export default function WorkHistory() {
  // Data sources state
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [resumeUploaded, setResumeUploaded] = useState(false);
  
  // For demo purposes, let's simulate empty state when no data sources are connected
  const workHistory = (linkedInConnected || resumeUploaded) ? sampleWorkHistory : [];
  
  // Auto-select first company and its first role on page load
  const firstCompany = workHistory.length > 0 ? workHistory[0] : null;
  const firstRole = firstCompany?.roles.length > 0 ? firstCompany.roles[0] : null;
  
  const [selectedCompany, setSelectedCompany] = useState<WorkHistoryCompany | null>(firstCompany);
  const [selectedRole, setSelectedRole] = useState<WorkHistoryRole | null>(firstRole);

  // Update selected items when work history changes (due to data source connections)
  useEffect(() => {
    const newFirstCompany = workHistory.length > 0 ? workHistory[0] : null;
    const newFirstRole = newFirstCompany?.roles.length > 0 ? newFirstCompany.roles[0] : null;
    
    setSelectedCompany(newFirstCompany);
    setSelectedRole(newFirstRole);
  }, [workHistory.length, linkedInConnected, resumeUploaded]);

  const handleCompanySelect = (company: WorkHistoryCompany) => {
    setSelectedCompany(company);
    // If company has only one role, automatically select it
    if (company.roles.length === 1) {
      setSelectedRole(company.roles[0]);
    } else {
      setSelectedRole(null);
    }
  };

  const handleRoleSelect = (role: WorkHistoryRole) => {
    setSelectedRole(role);
  };

  // Data source handlers
  const handleConnectLinkedIn = () => {
    // TODO: Implement LinkedIn OAuth flow
    setLinkedInConnected(true);
    console.log("Connect LinkedIn");
  };

  const handleUploadResume = () => {
    // TODO: Implement resume upload
    setResumeUploaded(true);
    console.log("Upload resume");
  };

  const handleViewLinkedInProfile = () => {
    // TODO: Open LinkedIn profile view
    console.log("View LinkedIn profile");
  };

  const handleRemoveLinkedInConnection = () => {
    setLinkedInConnected(false);
    console.log("Remove LinkedIn connection");
  };

  const handleViewResume = () => {
    // TODO: Open resume viewer
    console.log("View resume");
  };

  const handleReplaceResume = () => {
    // TODO: Implement resume replacement
    console.log("Replace resume");
  };

  const hasWorkHistory = workHistory.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Work History</h1>
            <p className="text-muted-foreground mt-2">
              Manage your professional experience and associated blurbs
            </p>
          </div>
          
          {hasWorkHistory && (
            <div className="flex gap-3">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </div>
          )}
        </div>

        {/* Data Sources Status - only show when there's work history */}
        {hasWorkHistory && (
          <DataSourcesStatus
            linkedInConnected={linkedInConnected}
            resumeUploaded={resumeUploaded}
            onConnectLinkedIn={handleConnectLinkedIn}
            onUploadResume={handleUploadResume}
            onViewLinkedInProfile={handleViewLinkedInProfile}
            onRemoveLinkedInConnection={handleRemoveLinkedInConnection}
            onViewResume={handleViewResume}
            onReplaceResume={handleReplaceResume}
          />
        )}

        {hasWorkHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Master Panel */}
            <div className="lg:col-span-1">
              <WorkHistoryMaster
                companies={workHistory}
                selectedCompany={selectedCompany}
                selectedRole={selectedRole}
                onCompanySelect={handleCompanySelect}
                onRoleSelect={handleRoleSelect}
              />
            </div>
            
            {/* Detail Panel */}
            <div className="lg:col-span-2">
              <WorkHistoryDetail
                selectedCompany={selectedCompany}
                selectedRole={selectedRole}
                onRoleSelect={handleRoleSelect}
              />
            </div>
          </div>
        ) : (
          <WorkHistoryOnboarding
            onConnectLinkedIn={handleConnectLinkedIn}
            onUploadResume={handleUploadResume}
          />
        )}
      </main>
    </div>
  );
}