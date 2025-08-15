import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlurbCard } from "@/components/blurbs/BlurbCard";
import { Plus, ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { WorkHistoryRole, WorkHistoryBlurb, ExternalLink } from "@/types/workHistory";

interface WorkHistoryDetailTabsProps {
  selectedRole: WorkHistoryRole;
}

export function WorkHistoryDetailTabs({ selectedRole }: WorkHistoryDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'blurbs' | 'links'>('blurbs');
  const blurbs = selectedRole.blurbs;
  const externalLinks = selectedRole.externalLinks;

  const handleAddBlurb = () => {
    console.log("Add blurb for role:", selectedRole.id);
  };

  const handleAddExternalLink = () => {
    console.log("Add external link for role:", selectedRole.id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="bg-background">
        <div className="flex items-center justify-center gap-8 py-2 mb-6">
          <button
            onClick={() => setActiveTab('blurbs')}
            className={`text-sm transition-colors px-3 pb-2 ${
              activeTab === 'blurbs' 
                ? 'font-bold text-foreground border-b-4 border-cta-primary' 
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            Associated Blurbs ({blurbs.length})
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`text-sm transition-colors px-3 pb-2 ${
              activeTab === 'links' 
                ? 'font-bold text-foreground border-b-4 border-cta-primary' 
                : 'font-medium text-muted-foreground hover:text-foreground'
            }`}
          >
            External Links ({externalLinks.length})
          </button>
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'blurbs' ? (
          <div className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Associated Blurbs</h3>
              <Button onClick={handleAddBlurb} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Blurb
              </Button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-400px)]">
              {blurbs.length > 0 ? (
                blurbs.map((blurb) => (
                    <BlurbCard
                      key={blurb.id}
                      id={blurb.id}
                      title={blurb.title}
                      content={blurb.content}
                      tags={blurb.tags}
                      confidence={blurb.confidence}
                      timesUsed={blurb.timesUsed}
                      lastUsed={blurb.lastUsed}
                      status={blurb.status}
                      linkedExternalLinks={blurb.linkedExternalLinks}
                      externalLinks={externalLinks.map(link => ({
                        id: link.id,
                        label: link.label,
                        url: link.url
                      }))}
                    />
                ))
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <div className="text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No blurbs yet</p>
                    <p className="text-sm mb-4">
                      Create blurbs from your achievements and experiences in this role.
                    </p>
                    <Button onClick={handleAddBlurb}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Blurb
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">External Links</h3>
              <Button onClick={handleAddExternalLink} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </div>
            
            <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-400px)]">
              {externalLinks.length > 0 ? (
                externalLinks.map((link) => (
                  <Card key={link.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {link.label}
                          </h4>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-1"
                          >
                            {link.url}
                            <ExternalLinkIcon className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                      
                      {link.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {link.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-8 text-center border-dashed">
                  <div className="text-muted-foreground">
                    <p className="text-lg font-medium mb-2">No external links yet</p>
                    <p className="text-sm mb-4">
                      Add links to case studies, portfolio pieces, articles, or other relevant work.
                    </p>
                    <Button onClick={handleAddExternalLink}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Link
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}