import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { XCircle, RefreshCw } from "lucide-react";
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { FileUploadProgress } from "@/types/fileUpload";

interface UploadProgressBarProps {
  isUploading: boolean;
  isConnecting?: boolean;
  progress: FileUploadProgress[];
  onRetry?: (fileId: string) => void;
  uploadingText?: string;
  connectingText?: string;
}

export function UploadProgressBar({
  isUploading,
  isConnecting = false,
  progress,
  onRetry,
  uploadingText = 'Uploading...',
  connectingText = 'Connecting...'
}: UploadProgressBarProps) {
  if (!isUploading && !isConnecting) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-blue-600 text-sm">
        <LoadingSpinner size="sm" className="text-blue-600" />
        {isUploading ? uploadingText : connectingText}
      </div>
      {progress.length > 0 && (
        <div className="space-y-1">
          {progress.map((progressItem) => (
            <div key={progressItem.fileId} className="space-y-1">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{progressItem.fileName}</span>
                <span>{progressItem.progress}%</span>
              </div>
              <Progress value={progressItem.progress} className="h-2" />
              {progressItem.status === 'failed' && progressItem.error && (
                <div className="flex items-center gap-2 text-red-600 text-xs">
                  <XCircle className="w-3 h-3" />
                  {progressItem.error}
                  {progressItem.retryable && onRetry && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRetry(progressItem.fileId)}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
