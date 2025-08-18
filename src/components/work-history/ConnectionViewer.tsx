import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { ExternalLink, FileText, RefreshCw, Upload } from "lucide-react";

interface ConnectionViewerProps {
  type: 'linkedin' | 'resume';
  status: 'connected' | 'disconnected' | 'uploaded' | 'not-uploaded';
  url?: string;
  fileName?: string;
  lastSync?: string;
  onConnect?: () => void;
  onUpload?: () => void;
  onRefresh?: () => void;
  className?: string;
}

export const ConnectionViewer = ({
  type,
  status,
  url,
  fileName,
  lastSync,
  onConnect,
  onUpload,
  onRefresh,
  className
}: ConnectionViewerProps) => {
  const isConnected = status === 'connected' || status === 'uploaded';
  const isLinkedIn = type === 'linkedin';

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLinkedIn ? (
              <ExternalLink className="h-5 w-5 text-blue-600" />
            ) : (
              <FileText className="h-5 w-5 text-green-600" />
            )}
            <div>
              <CardTitle className="text-lg">
                {isLinkedIn ? 'LinkedIn Profile' : 'Resume'}
              </CardTitle>
              <StatusBadge
                type={type}
                status={status}
                lastSync={lastSync}
                fileName={fileName}
                className="mt-1"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isConnected && onRefresh && (
              <Button variant="ghost" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            {!isConnected && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={isLinkedIn ? onConnect : onUpload}
              >
                {isLinkedIn ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect LinkedIn
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Resume
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isConnected && url ? (
          <div className="space-y-4">
            {isLinkedIn ? (
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={url}
                  className="w-full h-96"
                  title="LinkedIn Profile"
                  sandbox="allow-same-origin allow-scripts"
                />
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/20">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <h4 className="font-medium">{fileName || 'Resume'}</h4>
                    <p className="text-sm text-muted-foreground">
                      PDF Document • Ready for AI analysis
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.open(url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Resume
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="mb-4">
              {isLinkedIn ? (
                <ExternalLink className="h-12 w-12 text-muted-foreground mx-auto" />
              ) : (
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              )}
            </div>
            <h3 className="text-lg font-medium mb-2">
              {isLinkedIn ? 'Connect Your LinkedIn Profile' : 'Upload Your Resume'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {isLinkedIn 
                ? 'Import your professional experience and achievements automatically'
                : 'Upload your resume to extract key information and achievements'
              }
            </p>
            <Button 
              variant="secondary" 
              onClick={isLinkedIn ? onConnect : onUpload}
            >
              {isLinkedIn ? (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect LinkedIn
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
