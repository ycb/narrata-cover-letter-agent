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
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface FileUploadCardProps {
  type: 'resume' | 'linkedin' | 'coverLetter' | 'caseStudies';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onFileUpload?: (type: 'resume' | 'coverLetter' | 'caseStudies', file: File | null) => void;
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
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Update local state when currentValue prop changes
  useEffect(() => {
    if (type === 'coverLetter' && typeof currentValue === 'string') {
      setCoverLetterText(currentValue);
    } else if (type === 'linkedin' && typeof currentValue === 'string') {
      // Sync LinkedIn URL from parent
      console.log('Syncing LinkedIn URL from currentValue:', currentValue);
      setLinkedInUrl(currentValue);
    }
  }, [currentValue, type]);

  // Listen for file upload progress events
  useEffect(() => {
    const handleProgress = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message } = customEvent.detail;
      setProcessingStatus(message);
    };

    window.addEventListener('file-upload-progress', handleProgress);
    return () => window.removeEventListener('file-upload-progress', handleProgress);
  }, []);

  // Use file upload hooks
  const fileUpload = useFileUpload({
    onComplete: (result) => {
      if (result.success && result.fileId) {
        setUploadedFileId(result.fileId);
        setProcessingStatus('');
        onUploadComplete?.(result.fileId, type as FileType);
      } else {
        setProcessingStatus('');
        onUploadError?.(result.error || 'Upload failed');
      }
    },
    onError: (error) => {
      setProcessingStatus('');
      onUploadError?.(error);
    },
    onProgress: (progress) => {
      // Update processing status based on progress
      if (progress.status === 'pending') {
        setProcessingStatus('Preparing upload...');
      } else if (progress.status === 'processing') {
        if (progress.progress < 30) {
          setProcessingStatus('Uploading file...');
        } else if (progress.progress < 60) {
          setProcessingStatus('Extracting text...');
        } else if (progress.progress < 90) {
          setProcessingStatus('Analyzing with AI...');
        } else {
          setProcessingStatus('Finalizing...');
        }
      } else if (progress.status === 'completed') {
        setProcessingStatus('Complete!');
      } else if (progress.status === 'failed') {
        setProcessingStatus('Failed');
      }
    }
  });

  const linkedInUpload = useLinkedInUpload();

  // Unified error message component
  const ErrorMessage = ({ message }: { message: string }) => (
    <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
      <AlertTriangle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );

  // Smart combination logic
  const hasUploadedFile = uploadedFileId !== null;
  const hasTextInput = typeof coverLetterText === 'string' && coverLetterText.trim().length >= 10;
  const hasBoth = hasUploadedFile && hasTextInput;

  const isCompleted = (currentValue && (
    (typeof currentValue === 'string' && currentValue.trim().length > 0) || 
    currentValue instanceof File
  )) || 
    (type === 'linkedin' && linkedInUrl.trim().length > 0);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear errors when user starts typing or interacting
  const handleLinkedInUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkedInUrl(e.target.value);
    if (error) setError(null);
  }, [error]);

  const handleCoverLetterTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCoverLetterText(e.target.value);
    if (error) setError(null);
  }, [error]);

  /**
   * Handle file upload - ACTUALLY uploads and processes the file
   */
  const handleFileUpload = useCallback(async (file: File) => {
    // Clear any previous errors
    setError(null);
    setProcessingStatus('Validating file...');

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setError('File size must be less than 5MB');
      setProcessingStatus('');
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.txt', '.md'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      setError('File type must be PDF, DOCX, TXT, or MD');
      setProcessingStatus('');
      return;
    }

    // Store the file in parent state for UI updates
    if (onFileUpload) {
      onFileUpload(type as 'resume' | 'coverLetter' | 'caseStudies', file);
    }
    
    // Update local state
    setUploadedFileName(file.name);
    setProcessingStatus('Starting upload...');
    
    // ACTUALLY UPLOAD AND PROCESS THE FILE
    console.log('📤 Triggering actual file upload and processing for:', file.name);
    try {
      const result = await fileUpload.uploadFile(file, type as FileType);
      
      if (result.success && result.fileId) {
        console.log('✅ File upload and processing successful, ID:', result.fileId);
        setUploadedFileId(result.fileId);
        setProcessingStatus('Complete!');
        // onUploadComplete will be called by the fileUpload hook's onComplete callback
      } else {
        console.error('❌ File upload failed:', result.error);
        setError(result.error || 'Upload failed');
        setProcessingStatus('');
        if (onUploadError) {
          onUploadError(result.error || 'Upload failed');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      console.error('❌ File upload exception:', errorMsg);
      setError(errorMsg);
      setProcessingStatus('');
      if (onUploadError) {
        onUploadError(errorMsg);
      }
    }
  }, [fileUpload, onFileUpload, type, onUploadError]);

  const handleLinkedInSubmit = useCallback(() => {
    if (!onLinkedInUrl) return;

    // Clear any previous errors
    setError(null);

    // Trim whitespace
    const trimmedUrl = linkedInUrl.trim();

    // Basic validation
    if (!trimmedUrl) {
      setError('Please enter a LinkedIn URL');
      return;
    }

    // Validate URL format
    if (!trimmedUrl.includes('linkedin.com')) {
      setError('Please enter a valid LinkedIn URL');
      return;
    }

    // Call the parent handler
    onLinkedInUrl(trimmedUrl);
    
    // Update local state to show success immediately
    setUploadedFileId(`linkedin_${Date.now()}`);
    
    // Call upload complete callback to update parent
    onUploadComplete?.(`linkedin_${Date.now()}`, 'linkedin');
  }, [linkedInUrl, onLinkedInUrl, onUploadComplete]);

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
        if (onTextInput) {
          onTextInput(contentToProcess);
        }
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
        <div className="flex justify-center mb-6">
          <Upload className="w-12 h-12 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-6">
          Drag and drop your file here, or
        </p>
        <div className="mb-6">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            id={`${type}-file`}
          />
          <label
            htmlFor={`${type}-file`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Choose File
          </label>
        </div>
        <p className="text-sm text-gray-500">
          PDF, DOCX, TXT, MD (max 5MB)
        </p>
        {error && <ErrorMessage message={error} />}
      </div>

      {/* Add paste option for resume */}
      {type === 'resume' && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Paste resume text directly for fast and reliable processing
            </label>
            <Textarea
              placeholder="Paste your resume content here..."
              value={typeof coverLetterText === 'string' ? coverLetterText : ''}
              onChange={handleCoverLetterTextChange}
              rows={3}
            />
          </div>
        </>
      )}

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
        uploadingText={processingStatus || "Processing..."}
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
            onChange={handleLinkedInUrlChange}
            className="flex-1"
          />
          <Button 
            onClick={handleLinkedInSubmit}
            disabled={!linkedInUrl.trim()}
            size="sm"
            variant="secondary"
          >
            Connect
          </Button>
        </div>
        {isCompleted && (
          <p className="text-sm text-green-600">Valid LinkedIn URL</p>
        )}
        {error && <ErrorMessage message={error} />}
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
      {/* File Upload Section - Use unified component */}
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
        <div className="flex justify-center mb-6">
          <Upload className="w-12 h-12 text-gray-400" />
        </div>
        <p className="text-gray-600 mb-6">
          Drag and drop your file here, or
        </p>
        <div className="mb-6">
          <input
            type="file"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            id="cover-letter-file"
          />
          <label
            htmlFor="cover-letter-file"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
          >
            Choose File
          </label>
        </div>
        <p className="text-sm text-gray-500">
          PDF, DOCX, TXT, MD (max 5MB)
        </p>
        {error && <ErrorMessage message={error} />}
      </div>

      {/* Show progress bar for file uploads (when uploading or when file is uploaded) */}
      {(fileUpload.isUploading || hasUploadedFile) && (
        <UploadProgressBar
          isUploading={fileUpload.isUploading}
          progress={fileUpload.progress}
          onRetry={fileUpload.retryUpload}
          uploadingText={processingStatus || "Processing..."}
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
          Paste cover letter text directly for fast and reliable processing
        </label>
        <Textarea
          placeholder="Paste your cover letter content here..."
          value={typeof coverLetterText === 'string' ? coverLetterText : ''}
          onChange={handleCoverLetterTextChange}
          rows={3}
        />
        <p className="text-xs text-gray-500">
          {typeof coverLetterText === 'string' ? coverLetterText.length : 0} characters
        </p>
      </div>

      {/* Smart Submit Button - Only show if there's content to process */}
      {(hasUploadedFile || hasTextInput) && (
        <div className="pt-4">
          <Button
            onClick={handleSmartSubmit}
            disabled={getButtonDisabled() || fileUpload.isUploading}
            className="w-full"
          >
            {fileUpload.isUploading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {processingStatus || 'Processing...'}
              </>
            ) : (
              getButtonText()
            )}
          </Button>
          {hasBoth && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              This will combine your uploaded file with the additional text you provided
            </p>
          )}
        </div>
      )}

      {fileUpload.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {fileUpload.error}
        </div>
      )}
    </div>
  );

  return (
    <Card className={`${disabled ? 'opacity-60' : ''}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Icon className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {optional && (
            <Badge variant="outline" className="text-xs">
              Optional
            </Badge>
          )}
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {type === 'linkedin' ? renderLinkedInInput() : 
         type === 'coverLetter' ? renderCoverLetterInput() : 
         renderFileUpload()}
      </CardContent>
    </Card>
  );
}
