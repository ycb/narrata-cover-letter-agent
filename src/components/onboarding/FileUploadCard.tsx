import { useState, useRef } from "react";
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
  X,
  CheckCircle,
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
  optional = false
}: FileUploadCardProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [coverLetterText, setCoverLetterText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      setUploadedFile(file);
      onFileUpload(type as 'resume' | 'coverLetter', file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const file = event.dataTransfer.files?.[0];
    if (file && onFileUpload) {
      setUploadedFile(file);
      onFileUpload(type as 'resume' | 'coverLetter', file);
    }
  };

  const handleLinkedInSubmit = () => {
    if (linkedinUrl.trim() && onLinkedInUrl) {
      onLinkedInUrl(linkedinUrl.trim());
    }
  };

  const handleCoverLetterSubmit = () => {
    if (coverLetterText.trim() && onTextInput) {
      onTextInput(coverLetterText.trim());
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderResumeUpload = () => (
    <div className="space-y-4">
      {!uploadedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop your resume here, or
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-2"
          >
            Choose File
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PDF, DOCX up to 10MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-green-900">{uploadedFile.name}</p>
              <p className="text-sm text-green-700">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="text-green-600 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  const renderLinkedInUpload = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Input
          placeholder="https://linkedin.com/in/yourprofile"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          className="pr-20"
        />
        <Button
          onClick={handleLinkedInSubmit}
          disabled={!linkedinUrl.trim()}
          className="w-full"
        >
          <LinkIcon className="h-4 w-4 mr-2" />
          Connect Profile
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        We'll analyze your LinkedIn profile to understand your experience and skills.
      </p>
    </div>
  );

  const renderCoverLetterUpload = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          placeholder="Paste your best cover letter here, or upload a file below..."
          value={coverLetterText}
          onChange={(e) => setCoverLetterText(e.target.value)}
          rows={4}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleCoverLetterSubmit}
            disabled={!coverLetterText.trim()}
            className="flex-1"
          >
            <Mail className="h-4 w-4 mr-2" />
            Save Text
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>
      
      {uploadedFile && (
        <div className="border rounded-lg p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700">{uploadedFile.name}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="ml-auto text-green-600 hover:text-green-700"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  const renderCaseStudiesUpload = () => (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-2">
          Upload case studies or project documents
        </p>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          size="sm"
        >
          Choose Files
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          PDF, DOCX, or Markdown files
        </p>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.md,.txt"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0 && onFileUpload) {
            onFileUpload('coverLetter', files[0]); // Using coverLetter as fallback
          }
        }}
        className="hidden"
      />
    </div>
  );

  const renderUploadContent = () => {
    switch (type) {
      case 'resume':
        return renderResumeUpload();
      case 'linkedin':
        return renderLinkedInUpload();
      case 'coverLetter':
        return renderCoverLetterUpload();
      case 'caseStudies':
        return renderCaseStudiesUpload();
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex gap-1">
            {required && (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            )}
            {optional && (
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderUploadContent()}
      </CardContent>
    </Card>
  );
}
