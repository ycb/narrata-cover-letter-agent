import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, CheckCircle, Clock, AlertCircle, Edit, Copy, ExternalLink } from "lucide-react";

interface BlurbCardProps {
  id: string;
  title: string;
  content: string;
  status: 'approved' | 'draft' | 'needs-review';
  confidence: 'high' | 'medium' | 'low';
  tags: string[];
  lastUsed?: string;
  timesUsed: number;
  linkedExternalLinks?: string[];
  externalLinks?: Array<{id: string; label: string; url: string}>;
}

export const BlurbCard = ({ 
  title, 
  content, 
  status, 
  confidence, 
  tags, 
  lastUsed, 
  timesUsed,
  linkedExternalLinks = [],
  externalLinks = []
}: BlurbCardProps) => {
  const statusConfig = {
    approved: { icon: CheckCircle, color: 'bg-success-light text-success', label: 'Approved' },
    draft: { icon: Clock, color: 'bg-warning-light text-warning', label: 'Draft' },
    'needs-review': { icon: AlertCircle, color: 'bg-destructive/10 text-destructive', label: 'Needs Review' }
  };

  const confidenceColors = {
    high: 'bg-confidence-high',
    medium: 'bg-confidence-medium', 
    low: 'bg-confidence-low'
  };

  const StatusIcon = statusConfig[status].icon;

  const renderContentWithLinks = (content: string, linkIds: string[], availableLinks: Array<{id: string; label: string; url: string}>) => {
    if (linkIds.length === 0) return content;
    
    // Find the primary linked external link for company/role reference
    const primaryLink = linkIds.length > 0 ? availableLinks.find(l => l.id === linkIds[0]) : null;
    
    if (!primaryLink) return content;
    
    // Replace [CompanyName] or [RoleName] patterns with clickable links
    const linkPattern = /\[([^\]]+)\]/g;
    const parts = content.split(linkPattern);
    
    return parts.map((part, index) => {
      // If this is an odd index, it's the content inside brackets
      if (index % 2 === 1) {
        return (
          <a
            key={index}
            href={primaryLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
          >
            {part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <Card className="shadow-soft hover:shadow-medium transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig[status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[status].label}
            </Badge>
            <div className={`h-2 w-2 rounded-full ${confidenceColors[confidence]}`} title={`${confidence} confidence`} />
          </div>
          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="text-muted-foreground mb-4 line-clamp-3">
          {renderContentWithLinks(content, linkedExternalLinks, externalLinks)}
        </div>
        
        {linkedExternalLinks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <span>Case Study: {externalLinks.find(link => link.id === linkedExternalLinks[0])?.label}</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1 mb-4">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Used {timesUsed} times</span>
          {lastUsed && <span>Last used {lastUsed}</span>}
        </div>
        
        <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="outline">
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button size="sm" variant="outline">
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};