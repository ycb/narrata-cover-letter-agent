import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  FileText, 
  Linkedin, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Link as LinkIcon
} from "lucide-react";

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
  currentValue
}: FileUploadCardProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [coverLetterText, setCoverLetterText] = useState('');

  const isCompleted = currentValue && (
    type === 'resume' || type === 'coverLetter' || type === 'caseStudies' 
      ? currentValue instanceof File 
      : type === 'linkedin' 
        ? typeof currentValue === 'string' && currentValue.length > 0
        : false
  );

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
    setError(null);

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

  const handleFileUpload = useCallback((file: File) => {
    if (!onFileUpload) return;

    setError(null);
    setIsUploading(true);

    // Validate file type
    if (type === 'resume') {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a PDF or DOCX file');
        setIsUploading(false);
        return;
      }
    }

    if (type === 'coverLetter' || type === 'caseStudies') {
      const validTypes = ['text/plain', 'application/pdf', 'text/markdown'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a text, PDF, or Markdown file');
        setIsUploading(false);
        return;
      }
    }

    // Simulate upload delay
    setTimeout(() => {
      onFileUpload(type as 'resume' | 'coverLetter', file);
      setIsUploading(false);
    }, 1000);
  }, [type, onFileUpload]);

  const handleLinkedInSubmit = useCallback(() => {
    if (!onLinkedInUrl) return;

    setError(null);
    
    // Basic LinkedIn URL validation
    if (!linkedInUrl.includes('linkedin.com/in/')) {
      setError('Please enter a valid LinkedIn profile URL');
      return;
    }

    onLinkedInUrl(linkedInUrl);
  }, [linkedInUrl, onLinkedInUrl]);

  const handleCoverLetterSubmit = useCallback(() => {
    if (!onTextInput) return;

    setError(null);
    
    if (coverLetterText.trim().length < 50) {
      setError('Please enter at least 50 characters');
      return;
    }

    onTextInput(coverLetterText);
  }, [coverLetterText, onTextInput]);

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

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isUploading && (
        <div className="flex items-center gap-2 text-blue-600 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          Uploading...
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

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
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

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4" />
          {error}
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
