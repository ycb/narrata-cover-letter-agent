import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Settings, Users, Briefcase, Linkedin, FileText } from "lucide-react";

interface PrototypeStateBannerProps {
  linkedInConnected: boolean;
  resumeUploaded: boolean;
  onToggleLinkedIn: () => void;
  onToggleResume: () => void;
  onResetAll: () => void;
}

export function PrototypeStateBanner({
  linkedInConnected,
  resumeUploaded,
  onToggleLinkedIn,
  onToggleResume,
  onResetAll
}: PrototypeStateBannerProps) {
  const hasAnyData = linkedInConnected || resumeUploaded;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg">
      <div className="container mx-auto px-4 py-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Prototype State:</span>
              </div>
              
              <Badge variant={hasAnyData ? "default" : "outline"} className="gap-1">
                {hasAnyData ? (
                  <>
                    <Users className="h-3 w-3" />
                    Existing User
                  </>
                ) : (
                  <>
                    <Briefcase className="h-3 w-3" />
                    Onboarding
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Data Sources:</span>
              </div>
              
              <Button
                variant={linkedInConnected ? "default" : "outline"}
                size="sm"
                onClick={onToggleLinkedIn}
                className="h-8"
              >
                <Linkedin className="h-3 w-3 mr-1" />
                LinkedIn {linkedInConnected ? "ON" : "OFF"}
              </Button>
              
              <Button
                variant={resumeUploaded ? "default" : "outline"}
                size="sm"
                onClick={onToggleResume}
                className="h-8"
              >
                <FileText className="h-3 w-3 mr-1" />
                Resume {resumeUploaded ? "ON" : "OFF"}
              </Button>
              
              <div className="w-px h-6 bg-border" />
              
              <Button
                variant="ghost" 
                size="sm"
                onClick={onResetAll}
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                Reset All
              </Button>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>
                Current View: {hasAnyData ? "Work History Dashboard with data management" : "Onboarding flow to connect data sources"}
              </span>
              <span className="text-primary font-medium">
                🚀 Prototype Mode
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}