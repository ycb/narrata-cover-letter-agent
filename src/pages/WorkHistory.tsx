import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { WorkHistoryMaster } from "@/components/work-history/WorkHistoryMaster";
import { WorkHistoryDetail } from "@/components/work-history/WorkHistoryDetail";
import { WorkHistoryDrawer } from "@/components/work-history/WorkHistoryDrawer";
import { WorkHistoryFAB } from "@/components/work-history/WorkHistoryFAB";
import { AddStoryModal } from "@/components/work-history/AddStoryModal";
import { AddLinkModal } from "@/components/work-history/AddLinkModal";
import { DataSourcesStatus } from "@/components/work-history/DataSourcesStatus";
import { WorkHistoryOnboarding } from "@/components/work-history/WorkHistoryOnboarding";
import { AddCompanyModal } from "@/components/work-history/AddCompanyModal";
import { AddRoleModal } from "@/components/work-history/AddRoleModal";
import { usePrototype } from "@/contexts/PrototypeContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { WorkHistoryCompany, WorkHistoryRole, WorkHistoryBlurb } from "@/types/workHistory";

// Sample data - this would come from your backend
const sampleWorkHistory: WorkHistoryCompany[] = [
  {
    id: "1",
    name: "TechCorp Inc.",
    description: "Leading technology company",
    tags: ["Technology", "Enterprise", "B2B"],
    source: "manual",
    createdAt: "2020-06-01T00:00:00Z",
    updatedAt: "2024-12-01T00:00:00Z",
    roles: [
      {
        id: "1-1",
        companyId: "1",
        title: "Senior Product Manager",
        type: "full-time",
        startDate: "2022-01",
        endDate: "2024-12",
        description: "Led product strategy for core platform",
        inferredLevel: "Senior",
        tags: ["Product Management", "Strategy", "Leadership"],
        outcomeMetrics: [
          "Increased user engagement by 40% through feature optimization",
          "Led cross-functional team of 12 engineers and designers",
          "Launched 3 major product releases ahead of schedule"
        ],
        blurbs: [
          {
            id: "blurb-1",
            roleId: "1-1",
            title: "Product Strategy Leadership",
            content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.",
            outcomeMetrics: [
              "Launched MVP in 6 months",
              "Hired 8 product professionals"
            ],
            tags: ["Product Management", "Strategy", "Results"],
            source: "manual",
            status: "draft",
            confidence: "medium",
            timesUsed: 8,
            lastUsed: "2024-01-15",
            linkedExternalLinks: ["link-1"],
                          variations: [
                {
                  id: "var-1",
                  content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor. I implemented annual reviews and PM levelling.",
                  filledGap: "People management",
                  tags: ["philosophy", "team management"],
                  createdAt: "2024-01-20T00:00:00Z",
                  createdBy: "AI"
                },
                {
                  id: "var-2",
                  content: "As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. I developed annual and quarterly roadmaps for 3 product lines and two pods.",
                  filledGap: "Roadmap",
                  tags: ["roadmap", "dependencies"],
                  createdAt: "2024-01-22T00:00:00Z",
                  createdBy: "user"
                }
              ],
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-15T00:00:00Z"
          }
        ],
        createdAt: "2022-01-01T00:00:00Z",
        updatedAt: "2024-12-01T00:00:00Z",
        externalLinks: [
          {
            id: "link-1",
            roleId: "1-1",
            url: "https://medium.com/@example/product-strategy-guide",
            label: "Product Strategy Framework - Medium Article",
            type: "blog",
            tags: ["Product Management", "Strategy", "Thought Leadership"],
            timesUsed: 5,
            lastUsed: "2024-01-20",
            createdAt: "2024-01-01T00:00:00Z"
          },
          {
            id: "link-2",
            roleId: "1-1",
            url: "https://github.com/example/product-dashboard",
            label: "Analytics Dashboard - Open Source Project",
            type: "portfolio",
            tags: ["Analytics", "Open Source", "Dashboard"],
            timesUsed: 3,
            lastUsed: "2024-01-15",
            createdAt: "2024-01-01T00:00:00Z"
          }
        ]
      },
      {
        id: "1-2",
        companyId: "1",
        title: "Product Manager",
        type: "full-time",
        startDate: "2020-06",
        endDate: "2022-01",
        description: "Managed product development lifecycle",
        inferredLevel: "Mid",
        tags: ["Product Management", "Development", "Analytics"],
        outcomeMetrics: [
          "Implemented data-driven decision making process",
          "Reduced time-to-market by 25%"
        ],
        blurbs: [],
        externalLinks: [],
        createdAt: "2020-06-01T00:00:00Z",
        updatedAt: "2022-01-01T00:00:00Z"
      }
    ]
  },
  {
    id: "2",
    name: "StartupXYZ",
    description: "Fast-growing fintech startup",
    tags: ["Fintech", "Startup", "Growth"],
    source: "manual",
    createdAt: "2018-03-01T00:00:00Z",
    updatedAt: "2020-05-01T00:00:00Z",
    roles: [
              {
          id: "2-1",
          companyId: "2",
          title: "Product Lead",
          type: "full-time",
          startDate: "2018-03",
          endDate: "2020-05",
          description: "Built product team from ground up",
          inferredLevel: "Senior",
          tags: ["Leadership", "Team Building", "Fintech"],
          outcomeMetrics: [
            "Hired and managed team of 8 product professionals",
            "Launched MVP in 6 months"
          ],
          blurbs: [
            {
              id: "blurb-2",
              roleId: "2-1",
              title: "Team Building Excellence",
              content: "Built high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.",
              outcomeMetrics: [
                "Launched MVP in 6 months",
                "Hired 8 product professionals"
              ],
              tags: ["Leadership", "Team Building", "MVP"],
              source: "manual",
                          status: "draft",
            confidence: "medium",
              timesUsed: 12,
              lastUsed: "2024-01-10",
              linkedExternalLinks: [],
              createdAt: "2018-03-01T00:00:00Z",
              updatedAt: "2024-01-10T00:00:00Z"
            }
          ],
          externalLinks: [
            {
              id: "link-3",
              roleId: "2-1",
              url: "https://techcrunch.com/2020/05/15/startup-xyz-raises-series-a",
              label: "Series A Funding Announcement - TechCrunch",
              type: "blog",
              tags: ["Press", "Funding", "Startup"],
              timesUsed: 2,
              lastUsed: "2024-01-10",
              createdAt: "2018-03-01T00:00:00Z"
            }
          ],
          createdAt: "2018-03-01T00:00:00Z",
          updatedAt: "2020-05-01T00:00:00Z"
        }
    ]
  }
];

export default function WorkHistory() {
  // Use global prototype state
  const { prototypeState } = usePrototype();
  
  // For existing user state, simulate having data
  const workHistory = prototypeState === 'existing-user' ? sampleWorkHistory : [];
  
  // Auto-select first company on page load (no role selected initially)
  const firstCompany = workHistory.length > 0 ? workHistory[0] : null;
  
  const [selectedCompany, setSelectedCompany] = useState<WorkHistoryCompany | null>(firstCompany);
  const [selectedRole, setSelectedRole] = useState<WorkHistoryRole | null>(null);
  
  // Track which company should be expanded in the accordion
  const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(firstCompany?.id || null);

  // Modal state
  const [isAddCompanyModalOpen, setIsAddCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<WorkHistoryCompany | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isAddStoryModalOpen, setIsAddStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<WorkHistoryBlurb | null>(null);
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update selected items when prototype state changes
  useEffect(() => {
    const newFirstCompany = workHistory.length > 0 ? workHistory[0] : null;
    
    setSelectedCompany(newFirstCompany);
    setSelectedRole(null); // Only company selected initially
    setExpandedCompanyId(newFirstCompany?.id || null);
  }, [prototypeState, workHistory.length]);

  // Handle URL parameters for initial navigation
  const [initialTab, setInitialTab] = useState<'role' | 'stories' | 'links'>('role');
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    
    if (tabParam === 'stories' && workHistory.length > 0) {
      const firstCompany = workHistory[0];
      const firstRole = firstCompany.roles[0];
      
      if (firstRole) {
        setSelectedCompany(firstCompany);
        setSelectedRole(firstRole);
        setExpandedCompanyId(firstCompany.id);
        setInitialTab('stories');
      }
    }
  }, [workHistory]);

  const handleCompanySelect = (company: WorkHistoryCompany) => {
    setSelectedCompany(company);
    setSelectedRole(null);
    setExpandedCompanyId(company.id);
  };

  const handleRoleSelect = (role: WorkHistoryRole) => {
    // Find the parent company for this role
    const parentCompany = workHistory.find(company => 
      company.roles.some(r => r.id === role.id)
    );
    
    if (parentCompany) {
      setSelectedCompany(parentCompany);
      setSelectedRole(role);
      setExpandedCompanyId(parentCompany.id);
    }
  };

  // Modal handlers
  const handleAddCompany = () => {
    // TODO: Implement actual company creation logic
    console.log("Company added successfully");
    setIsAddCompanyModalOpen(false);
    setEditingCompany(null);
  };

  const handleEditCompany = (company: WorkHistoryCompany) => {
    setEditingCompany(company);
    setIsAddCompanyModalOpen(true);
  };

  const handleAddRole = () => {
    // TODO: Implement actual role creation logic
    console.log("Role added successfully");
    setIsAddRoleModalOpen(false);
  };

  const handleAddStory = () => {
    setIsAddStoryModalOpen(true);
  };

  const handleEditStory = (story: WorkHistoryBlurb) => {
    setEditingStory(story);
    setIsAddStoryModalOpen(true);
  };

  const handleAddLink = () => {
    setIsAddLinkModalOpen(true);
  };

  const handleSaveContent = (content: any) => {
    if (content.type === 'story') {
      // TODO: Implement story saving logic
      console.log("Story saved:", content);
    } else if (content.type === 'link') {
      // TODO: Implement link saving logic
      console.log("Link saved:", content);
    }
    setIsAddStoryModalOpen(false);
  };

  // Data source handlers (for existing user state)
  const handleConnectLinkedIn = () => {
    // TODO: Implement LinkedIn OAuth flow
    console.log("Connect LinkedIn");
  };

  const handleUploadResume = () => {
    // TODO: Implement resume upload
    console.log("Upload resume");
  };

  const handleViewLinkedInProfile = () => {
    // TODO: Open LinkedIn profile view
    console.log("View LinkedIn profile");
  };

  const handleViewResume = () => {
    // TODO: Open resume viewer with replace option
    console.log("View resume");
  };

  const hasWorkHistory = workHistory.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 pb-8">
        <div>
          <p className="text-muted-foreground description-spacing">Summarize impact with metrics, stories and links</p>
        </div>



        {hasWorkHistory ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-280px)]">
            {/* Mobile Drawer */}
            <WorkHistoryDrawer
              isOpen={isDrawerOpen}
              onOpenChange={setIsDrawerOpen}
              companies={workHistory}
              selectedCompany={selectedCompany}
              selectedRole={selectedRole}
              expandedCompanyId={expandedCompanyId}
              onCompanySelect={handleCompanySelect}
              onRoleSelect={handleRoleSelect}
              onAddCompany={() => setIsAddCompanyModalOpen(true)}
              onAddRole={() => setIsAddRoleModalOpen(true)}
            />
            
            {/* Master Panel - Desktop */}
            <div className="hidden lg:block lg:col-span-1">
              <WorkHistoryMaster
                companies={workHistory}
                selectedCompany={selectedCompany}
                selectedRole={selectedRole}
                expandedCompanyId={expandedCompanyId}
                onCompanySelect={handleCompanySelect}
                onRoleSelect={handleRoleSelect}
                onAddRole={() => setIsAddRoleModalOpen(true)}
                onAddCompany={() => setIsAddCompanyModalOpen(true)}
                onConnectLinkedIn={handleConnectLinkedIn}
                onUploadResume={handleUploadResume}
              />
            </div>
            
            {/* Detail Panel */}
            <div className="lg:col-span-2">
                          <WorkHistoryDetail
              selectedCompany={selectedCompany}
              selectedRole={selectedRole}
              companies={workHistory}
              initialTab={initialTab}
              onRoleSelect={handleRoleSelect}
              onAddRole={() => setIsAddRoleModalOpen(true)}
              onAddStory={handleAddStory}
              onEditStory={handleEditStory}
              onAddLink={handleAddLink}
              onEditCompany={handleEditCompany}
            />
            </div>
          </div>
        ) : (
          <WorkHistoryOnboarding
            onConnectLinkedIn={handleConnectLinkedIn}
            onUploadResume={handleUploadResume}
          />
        )}

        {/* Mobile FAB */}
        <WorkHistoryFAB
          selectedCompany={selectedCompany}
          selectedRole={selectedRole}
          onAddCompany={() => setIsAddCompanyModalOpen(true)}
          onAddRole={() => setIsAddRoleModalOpen(true)}
          onAddStory={handleAddStory}
          onAddLink={handleAddLink}
        />

        {/* Modals */}
        <AddCompanyModal
          open={isAddCompanyModalOpen}
          onOpenChange={(open) => {
            setIsAddCompanyModalOpen(open);
            if (!open) setEditingCompany(null);
          }}
          onCompanyAdded={handleAddCompany}
          editingCompany={editingCompany}
        />
        
        <AddRoleModal
          open={isAddRoleModalOpen}
          onOpenChange={setIsAddRoleModalOpen}
          company={selectedCompany}
          onRoleAdded={handleAddRole}
        />

        <AddStoryModal
          open={isAddStoryModalOpen}
          onOpenChange={(open) => {
            setIsAddStoryModalOpen(open);
            if (!open) setEditingStory(null);
          }}
          roleId={selectedRole?.id || ''}
          onSave={handleSaveContent}
          existingLinks={selectedRole?.externalLinks || []}
          editingStory={editingStory}
        />

        <AddLinkModal
          open={isAddLinkModalOpen}
          onOpenChange={setIsAddLinkModalOpen}
          roleId={selectedRole?.id || ''}
          onSave={handleSaveContent}
        />
      </main>
    </div>
  );
}