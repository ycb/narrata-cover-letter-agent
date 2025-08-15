import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Linkedin, FileText, CheckCircle, AlertCircle, Upload, ExternalLink } from "lucide-react";

interface DataSourcesStatusProps {
  linkedInConnected: boolean;
  resumeUploaded: boolean;
  onConnectLinkedIn: () => void;
  onUploadResume: () => void;
  onViewLinkedInProfile?: () => void;
  onViewResume?: () => void;
}

export function DataSourcesStatus({
  linkedInConnected,
  resumeUploaded,
  onConnectLinkedIn,
  onUploadResume,
  onViewLinkedInProfile,
  onViewResume
}: DataSourcesStatusProps) {
  // Note: Remove/Replace functionality moved to Settings and View modals respectively
  // for better UX and less destructive actions in main interface
  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Data Sources</h3>
        <div className="flex items-center gap-4">
          {/* LinkedIn Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">LinkedIn</span>
            {linkedInConnected ? (
              <button
                onClick={onViewLinkedInProfile}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Connected
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onConnectLinkedIn}
                className="h-7 px-3 text-xs"
              >
                Connect
              </Button>
            )}
          </div>

          {/* Resume Status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-16">Resume</span>
            {resumeUploaded ? (
              <button
                onClick={onViewResume}
                className="text-sm font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Uploaded
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={onUploadResume}
                className="h-7 px-3 text-xs"
              >
                Upload
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}