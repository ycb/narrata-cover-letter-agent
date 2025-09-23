import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { StoryCard } from "@/components/work-history/StoryCard";
import { LinkCard } from "@/components/work-history/LinkCard";
import { Plus } from "lucide-react";
import { AddStoryModal } from "./AddStoryModal";
import { AddExternalLinkModal } from "./AddExternalLinkModal";
import type { WorkHistoryRole, WorkHistoryBlurb } from "@/types/workHistory";

interface WorkHistoryDetailTabsProps {
  selectedRole: WorkHistoryRole;
}

export function WorkHistoryDetailTabs({ selectedRole }: WorkHistoryDetailTabsProps) {
  const [addStoryModalOpen, setAddStoryModalOpen] = useState(false);
  const [addLinkModalOpen, setAddLinkModalOpen] = useState(false);

  const blurbs = selectedRole?.blurbs || [];
  const externalLinks = selectedRole?.externalLinks || [];

  const handleAddStory = () => {
    setAddStoryModalOpen(true);
  };

  const handleAddExternalLink = () => {
    setAddLinkModalOpen(true);
  };

  // Action handlers for blurbs
  const handleEditBlurb = (id: string) => {
    console.log("Edit blurb:", id);
    // TODO: Implement edit functionality
  };

  const handleCopyBlurb = (id: string) => {
    console.log("Copy blurb:", id);
    // TODO: Implement copy functionality
  };

  const handleDuplicateBlurb = (id: string) => {
    console.log("Duplicate blurb:", id);
    // TODO: Implement duplicate functionality
  };

  const handleDeleteBlurb = (id: string) => {
    console.log("Delete blurb:", id);
    // TODO: Implement duplicate functionality
  };

  // Action handlers for external links
  const handleEditLink = (id: string) => {
    console.log("Edit link:", id);
    // TODO: Implement edit functionality
  };

  const handleCopyLink = (id: string) => {
    console.log("Copy link:", id);
    // TODO: Implement copy functionality
  };

  const handleDuplicateLink = (id: string) => {
    console.log("Duplicate link:", id);
    // TODO: Implement duplicate functionality
  };

  const handleDeleteLink = (id: string) => {
    console.log("Delete link:", id);
    // TODO: Implement duplicate functionality
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Content */}
      <TabsContent value="blurbs" className="flex-1 min-h-0">
        <div className="space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Associated Blurbs</h3>
            <Button variant="primary" onClick={handleAddStory} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Story
            </Button>
          </div>
          
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-400px)]">
            {blurbs.length > 0 ? (
              blurbs.map((blurb) => (
                  <StoryCard
                    key={blurb.id}
                    story={blurb}
                    onEdit={() => handleEditBlurb(blurb.id)}
                    onDuplicate={() => handleDuplicateBlurb(blurb.id)}
                    onDelete={() => handleDeleteBlurb(blurb.id)}
                  />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No blurbs yet</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="links" className="flex-1 min-h-0">
        <div className="space-y-4 h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">External Links</h3>
            <Button variant="primary" onClick={handleAddExternalLink} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add External Link
            </Button>
          </div>
          
          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-400px)]">
            {externalLinks.length > 0 ? (
              externalLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  id={link.id}
                  label={link.label}
                  url={link.url}
                  tags={link.tags}
                  timesUsed={link.timesUsed}
                  lastUsed={link.lastUsed}
                  onEdit={handleEditLink}
                  onCopy={handleCopyLink}
                  onDuplicate={handleDuplicateLink}
                  onDelete={handleDeleteLink}
                />
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No external links yet</p>
              </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* Modals */}
      <AddStoryModal
        open={addStoryModalOpen}
        onOpenChange={setAddStoryModalOpen}
        roleId={selectedRole.id}
        onSave={(story) => {
          setAddStoryModalOpen(false);
          // TODO: Refresh data
        }}
      />
      
      <AddExternalLinkModal
        open={addLinkModalOpen}
        onOpenChange={setAddLinkModalOpen}
        roleId={selectedRole.id}
        onLinkAdded={() => {
          setAddLinkModalOpen(false);
          // TODO: Refresh data
        }}
      />
    </div>
  );
}