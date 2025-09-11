import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Linkedin, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Link as LinkIcon,
  RefreshCw
} from "lucide-react";
import { useFileUpload, useLinkedInUpload } from "@/hooks/useFileUpload";
import type { FileType } from "@/types/fileUpload";

interface FileUploadCardProps {
  type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onFileUpload?: (type: 'resume' | 'coverLetter', file: File) => void;
  onLinkedInUrl?: (url: string) => void;
  onTextInput?: (text: string) => void;
  required?: boolean;
  optional?: boolean;
  currentValue?: string | File;
  onUploadComplete?: (fileId: string, type: FileType) => void;
  onUploadError?: (error: string) => void;
}

export function FileUploadCard({
  type,
  title,
  description,
  icon: Icon,
  onFileUpload,
  onLinkedInUrl,
  onTextInput,
  required = false,
  optional = false,
  currentValue,
  onUploadComplete,
  onUploadError
}: FileUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [coverLetterText, setCoverLetterText] = useState('');
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);

  // Use file upload hooks
  const fileUpload = useFileUpload({
    onComplete: (result) => {
      if (result.success && result.fileId) {
        setUploadedFileId(result.fileId);
        onUploadComplete?.(result.fileId, type as FileType);
      } else {
        onUploadError?.(result.error || 'Upload failed');
      }
    },
    onError: (error) => {
      onUploadError?.(error);
    }
  });

  const linkedInUpload = useLinkedInUpload();

  const isCompleted = (currentValue && (
    type === 'resume' || type === 'coverLetter' || type === 'caseStudies' 
      ? currentValue instanceof File 
      : type === 'linkedin' 
        ? typeof currentValue === 'string' && currentValue.length > 0
        : false
  )) || uploadedFileId !== null;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    handleFileUpload(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!onFileUpload) return;

    // Use real file upload service
    const result = await fileUpload.uploadFile(file, type as FileType);
    
    // Also call the parent callback for compatibility
    if (result.success) {
      onFileUpload(type as 'resume' | 'coverLetter', file);
    }
  }, [fileUpload, type, onFileUpload]);

  const handleLinkedInSubmit = useCallback(async () => {
    if (!onLinkedInUrl) return;

    // Trim whitespace from URL before processing
    const trimmedUrl = linkedInUrl.trim();
    
    // Use real LinkedIn upload service
    const result = await linkedInUpload.connectLinkedIn(trimmedUrl);
    
    if (result.success && result.fileId) {
      setUploadedFileId(result.fileId);
      onLinkedInUrl(trimmedUrl);
      onUploadComplete?.(result.fileId, 'linkedin');
    } else {
      onUploadError?.(result.error || 'LinkedIn connection failed');
    }
  }, [linkedInUrl, onLinkedInUrl, linkedInUpload, onUploadComplete, onUploadError]);

  const handleCoverLetterSubmit = useCallback(() => {
    if (!onTextInput) return;
    
    if (coverLetterText.trim().length < 50) {
      onUploadError?.('Please enter at least 50 characters');
      return;
    }

    onTextInput(coverLetterText);
  }, [coverLetterText, onTextInput, onUploadError]);

  const renderFileUpload = () => (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">
          Drag and drop your file here, or{' '}
          <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
            browse
            <input
              type="file"
              className="hidden"
              accept={
                type === 'resume' 
                  ? '.pdf,.docx' 
                  : type === 'coverLetter' || type === 'caseStudies'
                    ? '.txt,.pdf,.md'
                    : '*'
              }
              onChange={handleFileSelect}
            />
          </label>
        </p>
        <p className="text-sm text-gray-500">
          {type === 'resume' && 'PDF or DOCX files only'}
          {type === 'coverLetter' && 'Text, PDF, or Markdown files'}
          {type === 'caseStudies' && 'Text, PDF, or Markdown files'}
        </p>
      </div>

      {(fileUpload.error || linkedInUpload.error) && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {fileUpload.error || linkedInUpload.error}
        </div>
      )}

      {(fileUpload.isUploading || linkedInUpload.isConnecting) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-blue-600 text-sm">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            {fileUpload.isUploading ? 'Uploading...' : 'Connecting to LinkedIn...'}
          </div>
          {fileUpload.progress.length > 0 && (
            <div className="space-y-1">
              {fileUpload.progress.map((progress) => (
                <div key={progress.fileId} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{progress.fileName}</span>
                    <span>{progress.progress}%</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                  {progress.status === 'failed' && progress.error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                      <XCircle className="w-3 h-3" />
                      {progress.error}
                      {progress.retryable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileUpload.retryUpload(progress.fileId)}
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
      )}
    </div>
  );

  const renderLinkedInInput = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          LinkedIn Profile URL
        </label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://linkedin.com/in/yourprofile"
            value={linkedInUrl}
            onChange={(e) => setLinkedInUrl(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleLinkedInSubmit}
            disabled={!linkedInUrl.trim()}
            size="sm"
          >
            Connect
          </Button>
        </div>
      </div>

      {linkedInUpload.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {linkedInUpload.error}
        </div>
      )}
    </div>
  );

  const renderCoverLetterInput = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Cover Letter Content
        </label>
        <Textarea
          placeholder="Paste your best cover letter content here..."
          value={coverLetterText}
          onChange={(e) => setCoverLetterText(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Minimum 50 characters. We'll extract stories and sections automatically.
        </p>
      </div>

      {fileUpload.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {fileUpload.error}
        </div>
      )}

      <Button 
        onClick={handleCoverLetterSubmit}
        disabled={coverLetterText.trim().length < 50}
        className="w-full"
      >
        Add Cover Letter
      </Button>
    </div>
  );

  const renderContent = () => {
    if (type === 'linkedin') {
      return renderLinkedInInput();
    }
    if (type === 'coverLetter') {
      return renderCoverLetterInput();
    }
    return renderFileUpload();
  };

  return (
    <Card className={`transition-all duration-200 ${
      isCompleted ? 'ring-2 ring-green-200 bg-green-50' : ''
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isCompleted ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              <Icon className={`w-6 h-6 ${
                isCompleted ? 'text-green-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                {title}
                {required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                {optional && <Badge variant="secondary" className="text-xs">Optional</Badge>}
              </CardTitle>
              <p className="text-gray-600">{description}</p>
            </div>
          </div>
          
          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Complete</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isCompleted ? (
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Successfully uploaded!</span>
            </div>
            <p className="text-sm text-gray-600">
              {type === 'resume' && 'Your resume has been processed and analyzed'}
              {type === 'linkedin' && 'Your LinkedIn profile has been connected'}
              {type === 'coverLetter' && 'Your cover letter has been processed'}
              {type === 'caseStudies' && 'Your case study has been uploaded'}
            </p>
          </div>
        ) : (
          renderContent()
        )}
      </CardContent>
    </Card>
  );
}
