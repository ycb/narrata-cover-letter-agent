import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Linkedin, FileText, CheckCircle, AlertCircle, Eye, X } from "lucide-react";

interface DataSourcesStatusProps {
  linkedInConnected: boolean;
  resumeUploaded: boolean;
  onConnectLinkedIn: () => void;
  onUploadResume: () => void;
  onViewLinkedInProfile?: () => void;
  onRemoveLinkedInConnection?: () => void;
  onViewResume?: () => void;
  onReplaceResume?: () => void;
}

export function DataSourcesStatus({
  linkedInConnected,
  resumeUploaded,
  onConnectLinkedIn,
  onUploadResume,
  onViewLinkedInProfile,
  onRemoveLinkedInConnection,
  onViewResume,
  onReplaceResume
}: DataSourcesStatusProps) {
  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Data Sources</h3>
        <div className="flex items-center gap-4">
          {/* LinkedIn Status */}
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4 text-blue-600" />
            {linkedInConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <div className="flex gap-1">
                  {onViewLinkedInProfile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewLinkedInProfile}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  {onRemoveLinkedInConnection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onRemoveLinkedInConnection}
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not connected
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onConnectLinkedIn}
                  className="h-6 px-2 text-xs"
                >
                  Connect
                </Button>
              </div>
            )}
          </div>

          {/* Resume Status */}
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-600" />
            {resumeUploaded ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Uploaded
                </Badge>
                <div className="flex gap-1">
                  {onViewResume && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onViewResume}
                      className="h-6 px-2 text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  )}
                  {onReplaceResume && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onReplaceResume}
                      className="h-6 px-2 text-xs"
                    >
                      Replace
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Not uploaded
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUploadResume}
                  className="h-6 px-2 text-xs"
                >
                  Upload
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}