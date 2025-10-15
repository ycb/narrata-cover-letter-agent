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


  const isCompleted = (currentValue && (
    (typeof currentValue === 'string' && currentValue.trim().length > 0) || 
    currentValue instanceof File
  )) || 
    (type === 'linkedin' && uploadedFileId !== null) ||
    (type !== 'linkedin' && uploadedFileId !== null);

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

  const handleLinkedInSubmit = useCallback(async () => {
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

    // Call the parent handler to update state
    onLinkedInUrl(trimmedUrl);
    
    // Actually call the LinkedIn API for enrichment
    const manualLinkedInStartTime = performance.now();
    console.log('🚀 Manual LinkedIn enrichment starting...');
    try {
      const result = await linkedInUpload.connectLinkedIn(trimmedUrl);
      const manualLinkedInEndTime = performance.now();
      console.warn(`⏱️ Manual LinkedIn PDL API call took: ${(manualLinkedInEndTime - manualLinkedInStartTime).toFixed(2)}ms`);
      
      if (result.success && result.fileId) {
        console.log('✅ Manual LinkedIn enrichment successful, ID:', result.fileId);
        setUploadedFileId(result.fileId);
        onUploadComplete?.(result.fileId, 'linkedin');
      } else {
        console.error('❌ Manual LinkedIn enrichment failed:', result.error);
        setError(result.error || 'LinkedIn connection failed');
        if (onUploadError) {
          onUploadError(result.error || 'LinkedIn connection failed');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'LinkedIn connection failed';
      console.error('❌ Manual LinkedIn enrichment exception:', errorMsg);
      setError(errorMsg);
      if (onUploadError) {
        onUploadError(errorMsg);
      }
    }
  }, [linkedInUrl, onLinkedInUrl, onUploadComplete, onUploadError, linkedInUpload]);


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
            disabled={!linkedInUrl.trim() || linkedInUpload.isConnecting}
            size="sm"
            variant="secondary"
          >
            {linkedInUpload.isConnecting ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Connecting...
              </>
            ) : uploadedFileId ? (
              'Connected'
            ) : (
              'Connect'
            )}
          </Button>
        </div>
        {isCompleted && (
          <p className="text-sm text-green-600">Valid LinkedIn URL</p>
        )}
        {error && <ErrorMessage message={error} />}
      </div>

      {/* Show progress bar for LinkedIn connections */}
      {(linkedInUpload.isConnecting || uploadedFileId) && (
        <UploadProgressBar
          isConnecting={linkedInUpload.isConnecting}
          isUploading={false}
          progress={[]}
          connectingText="Connecting to LinkedIn and enriching data..."
        />
      )}

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
      {(fileUpload.isUploading || uploadedFileId) && (
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


      {fileUpload.error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {fileUpload.error}
        </div>
      )}
    </div>
  );

  return (
    <Card className={`transition-all duration-200 ${
      isCompleted ? 'ring-2 ring-green-200 bg-green-50' : ''
    } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {isCompleted && (
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          )}
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
        </div>
      </CardHeader>
      <CardContent>
        {isCompleted && (type === 'resume' || type === 'coverLetter') && uploadedFileId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{uploadedFileName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Clear all file-related state
                    setUploadedFileId(null);
                    setUploadedFileName(null);
                    setUploadedFileContent(null);
                    setError(null);
                    // Clear parent state
                    onFileUpload?.(type as 'resume' | 'coverLetter' | 'caseStudies', null as any);
                  }}
                  className="text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400 hover:underline"
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          type === 'linkedin' ? renderLinkedInInput() : 
          type === 'coverLetter' ? renderCoverLetterInput() : 
          renderFileUpload()
        )}
      </CardContent>
    </Card>
  );
}
