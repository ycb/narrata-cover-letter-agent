import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileText, Edit, Trash2, Check } from "lucide-react";

export interface TemplateBlurb {
  id: string;
  type: 'intro' | 'closer' | 'signature';
  title: string;
  content: string;
  tags: string[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateBlurbMasterProps {
  blurbs: TemplateBlurb[];
  selectedBlurbId?: string;
  onSelectBlurb: (blurb: TemplateBlurb) => void;
  onCreateBlurb: (type: 'intro' | 'closer' | 'signature') => void;
  onEditBlurb: (blurb: TemplateBlurb) => void;
  onDeleteBlurb: (blurbId: string) => void;
  filterType?: 'intro' | 'closer' | 'signature';
}

export const TemplateBlurbMaster = ({
  blurbs,
  selectedBlurbId,
  onSelectBlurb,
  onCreateBlurb,
  onEditBlurb,
  onDeleteBlurb,
  filterType
}: TemplateBlurbMasterProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>(filterType || "all");

  const getSectionTypeLabel = (type: string) => {
    switch (type) {
      case 'intro': return 'Introduction';
      case 'closer': return 'Closing';
      case 'signature': return 'Signature';
      default: return type;
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'intro': return 'default';
      case 'closer': return 'secondary';
      case 'signature': return 'outline';
      default: return 'default';
    }
  };

  const filteredBlurbs = blurbs.filter(blurb => {
    const matchesSearch = blurb.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         blurb.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (blurb.tags && blurb.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    const matchesType = typeFilter === "all" || blurb.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const groupedBlurbs = filteredBlurbs.reduce((acc, blurb) => {
    if (!acc[blurb.type]) {
      acc[blurb.type] = [];
    }
    acc[blurb.type].push(blurb);
    return acc;
  }, {} as Record<string, TemplateBlurb[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Template Blurb Library</h3>
          <p className="text-sm text-muted-foreground">
            Manage your reusable cover letter content
          </p>
        </div>
        
        {!filterType && (
          <div className="flex gap-2">
            {(['intro', 'closer', 'signature'] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => onCreateBlurb(type)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New {getSectionTypeLabel(type)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search blurbs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {!filterType && (
          <div className="flex gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All
            </Button>
            {(['intro', 'closer', 'signature'] as const).map((type) => (
              <Button
                key={type}
                variant={typeFilter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(type)}
              >
                {getSectionTypeLabel(type)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Blurb List */}
      <div className="space-y-4">
        {Object.entries(groupedBlurbs).map(([type, typeBlurbs]) => (
          <div key={type}>
            <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {getSectionTypeLabel(type)} ({typeBlurbs.length})
            </h4>
            
            <div className="space-y-3">
              {typeBlurbs.map((blurb) => (
                <Card 
                  key={blurb.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedBlurbId === blurb.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onSelectBlurb(blurb)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-medium text-foreground truncate">
                            {blurb.title}
                          </h5>
                          <Badge variant={getTypeVariant(blurb.type) as any} className="text-xs">
                            {getSectionTypeLabel(blurb.type)}
                          </Badge>
                          {blurb.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              Default
                            </Badge>
                          )}
                          {selectedBlurbId === blurb.id && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {blurb.content}
                        </p>
                        
                        {blurb.tags && blurb.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {blurb.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(blurb.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBlurb(blurb);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {!blurb.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteBlurb(blurb.id);
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        
        {filteredBlurbs.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="font-medium text-foreground mb-2">No blurbs found</h4>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No blurbs match your search criteria." : "Start by creating your first template blurb."}
              </p>
              {!filterType && (
                <div className="flex gap-2 justify-center">
                  {(['intro', 'closer', 'signature'] as const).map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => onCreateBlurb(type)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      New {getSectionTypeLabel(type)}
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};