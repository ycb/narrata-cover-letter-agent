import { useState, useCallback, useEffect } from "react";
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
import { TextExtractionService } from "@/services/textExtractionService";
import { UploadProgressBar } from "./UploadProgressBar";

interface FileUploadCardProps {
  type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onFileUpload?: (type: 'resume' | 'coverLetter' | 'caseStudies', file: File) => void;
  onLinkedInUrl?: (url: string) => void;
  onTextInput?: (text: string) => void;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
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
  disabled = false,
  currentValue,
  onUploadComplete,
  onUploadError
}: FileUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [coverLetterText, setCoverLetterText] = useState(currentValue || '');
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Update local state when currentValue prop changes
  useEffect(() => {
    if (type === 'coverLetter' && currentValue) {
      setCoverLetterText(currentValue);
    }
  }, [currentValue, type]);

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

  // Smart combination logic
  const hasUploadedFile = uploadedFileId !== null;
  const hasTextInput = typeof coverLetterText === 'string' && coverLetterText.trim().length >= 10;
  const hasBoth = hasUploadedFile && hasTextInput;

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileUpload = useCallback(async (file: File) => {
    if (!onFileUpload) return;

    if (type === 'coverLetter') {
      // For cover letters, extract content and store it for combination
      try {
        const textExtractionService = new TextExtractionService();
        const extractionResult = await textExtractionService.extractText(file);
        
        if (extractionResult.success) {
          setUploadedFileContent(extractionResult.text!);
          setUploadedFileName(file.name);
          console.log('File content extracted for combination:', extractionResult.text!.length, 'characters');
        }
      } catch (error) {
        console.warn('Could not extract file content for combination:', error);
      }
    }

    // Use real file upload service
    const result = await fileUpload.uploadFile(file, type as FileType);
    
    // Also call the parent callback for compatibility
    if (result.success) {
      onFileUpload(type as 'resume' | 'coverLetter' | 'caseStudies', file);
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

  // Smart submission handler
  const handleSmartSubmit = useCallback(async () => {
    if (!hasUploadedFile && !hasTextInput) {
      onUploadError?.('Please upload a file or enter text');
      return;
    }

    try {
      let contentToProcess: string;
      let submissionType: string;

      if (hasBoth) {
        // Combine file content with additional text
        contentToProcess = `${uploadedFileContent}\n\n--- Additional Context ---\n${coverLetterText}`;
        submissionType = 'Combined file and text';
      } else if (hasUploadedFile) {
        // Use file content only
        contentToProcess = uploadedFileContent!;
        submissionType = 'Uploaded file';
      } else {
        // Use text only
        contentToProcess = typeof coverLetterText === 'string' ? coverLetterText : '';
        submissionType = 'Manual text';
      }

      console.log(`Processing ${submissionType}:`, { length: contentToProcess.length });
      
      const result = await fileUpload.saveManualText(contentToProcess, 'coverLetter');
      
      if (result.success) {
        console.log(`${submissionType} saved successfully`);
        onTextInput(contentToProcess);
        onUploadComplete?.(result.fileId!, 'coverLetter');
      } else {
        onUploadError?.(result.error || 'Failed to save content');
      }
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : 'Failed to save content');
    }
  }, [hasUploadedFile, hasTextInput, hasBoth, uploadedFileContent, coverLetterText, fileUpload, onTextInput, onUploadComplete, onUploadError]);

  // Helper functions for UI
  const getButtonText = () => {
    if (hasBoth) return 'Combine File & Text';
    if (hasUploadedFile) return 'Process Uploaded File';
    if (hasTextInput) return 'Add Cover Letter Text';
    return 'Add Cover Letter Text';
  };

  const getButtonDisabled = () => {
    return !hasUploadedFile && !hasTextInput;
  };

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

      <UploadProgressBar
        isUploading={fileUpload.isUploading}
        isConnecting={linkedInUpload.isConnecting}
        progress={fileUpload.progress}
        onRetry={fileUpload.retryUpload}
        uploadingText="Uploading..."
        connectingText="Connecting to LinkedIn..."
      />
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
      {/* File Upload Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Upload Cover Letter File
        </label>
        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop your cover letter file here, or
          </p>
          <input
            type="file"
            accept=".pdf,.txt,.md,.docx"
            onChange={handleFileSelect}
            className="hidden"
            id="cover-letter-file"
          />
          <label
            htmlFor="cover-letter-file"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Choose File
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Supported formats: PDF, TXT, MD, DOCX (max 5MB)
          </p>
        </div>
      </div>

      {/* Show progress bar for file uploads (when uploading or when file is uploaded) */}
      {(fileUpload.isUploading || hasUploadedFile) && (
        <UploadProgressBar
          isUploading={fileUpload.isUploading}
          progress={fileUpload.progress}
          onRetry={fileUpload.retryUpload}
          uploadingText="Uploading..."
        />
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">OR</span>
        </div>
      </div>

      {/* Text Input Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Paste Cover Letter Content
        </label>
        <Textarea
          placeholder="Paste your best cover letter content here..."
          value={typeof coverLetterText === 'string' ? coverLetterText : ''}
          onChange={(e) => setCoverLetterText(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <p className="text-xs text-gray-500">
          Minimum 10 characters. We'll extract stories and sections automatically.
        </p>
      </div>

      {hasBoth && (
        <div className="flex items-center gap-2 text-blue-600 text-sm bg-blue-50 p-3 rounded-lg">
          <div className="w-2 h-2 bg-blue-600 rounded-full" />
          <span>You have both a file and text. We'll combine them into one submission.</span>
        </div>
      )}

      {fileUpload.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {fileUpload.error}
        </div>
      )}

      {/* Only show button when user has typed text or uploaded a file */}
      {(hasTextInput || hasUploadedFile) && (
        <Button 
          onClick={handleSmartSubmit}
          disabled={getButtonDisabled() || fileUpload.isUploading}
          className="w-full"
        >
          {fileUpload.isUploading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Uploading...
            </>
          ) : (
            getButtonText()
          )}
        </Button>
      )}
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
    } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
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
