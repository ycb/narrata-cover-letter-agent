import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Upload, 
  Download,
  Eye,
  RefreshCw,
  Calendar,
  FileType,
  Trash2,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ResumeData {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  extracted_text: string;
  structured_data: any;
  created_at: string;
  updated_at: string;
}

interface ResumeDataSourceProps {
  onUploadResume?: () => void;
  onRefresh?: () => void;
}

export function ResumeDataSource({ onUploadResume, onRefresh }: ResumeDataSourceProps) {
  const { user } = useAuth();
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullText, setShowFullText] = useState(false);

  const fetchResumeData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'resume')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No resume found
          setResumeData(null);
        } else {
          throw fetchError;
        }
      } else {
        setResumeData(data);
      }
    } catch (err) {
      console.error('Error fetching resume data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resume data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResumeData();
  }, [user]);

  const handleRefresh = async () => {
    await fetchResumeData();
    onRefresh?.();
  };

  const handleUpload = () => {
    onUploadResume?.();
  };

  const handleDownload = async () => {
    if (!resumeData?.file_url) return;
    
    try {
      const response = await fetch(resumeData.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resumeData.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading file:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('txt')) return '📄';
    return '📄';
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading resume...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">Error loading resume</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!resumeData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload your resume to extract work experience, skills, and achievements automatically.
            </p>
            <Button onClick={handleUpload} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Resume
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{getFileTypeIcon(resumeData.file_type)}</div>
            <div className="flex-1">
              <h3 className="font-semibold">{resumeData.file_name}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span>{formatFileSize(resumeData.file_size)}</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(resumeData.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <FileType className="h-3 w-3" />
                  {resumeData.file_type.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Extracted Text */}
        {resumeData.extracted_text && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Extracted Text</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFullText(!showFullText)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showFullText ? 'Show Less' : 'Show Full Text'}
              </Button>
            </div>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className={`text-sm text-muted-foreground leading-relaxed ${
                showFullText ? '' : 'line-clamp-6'
              }`}>
                {resumeData.extracted_text}
              </div>
              {!showFullText && resumeData.extracted_text.length > 500 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {Math.ceil(resumeData.extracted_text.length / 1000)}k characters
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Structured Data Preview */}
        {resumeData.structured_data && (
          <div>
            <h4 className="font-medium mb-3">Structured Data</h4>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="text-sm text-muted-foreground">
                <div className="grid grid-cols-2 gap-4">
                  {resumeData.structured_data.workHistory && (
                    <div>
                      <span className="font-medium">Work History:</span>
                      <span className="ml-2">
                        {Array.isArray(resumeData.structured_data.workHistory) 
                          ? resumeData.structured_data.workHistory.length 
                          : 0} positions
                      </span>
                    </div>
                  )}
                  {resumeData.structured_data.skills && (
                    <div>
                      <span className="font-medium">Skills:</span>
                      <span className="ml-2">
                        {Array.isArray(resumeData.structured_data.skills) 
                          ? resumeData.structured_data.skills.length 
                          : 0} skills
                      </span>
                    </div>
                  )}
                  {resumeData.structured_data.education && (
                    <div>
                      <span className="font-medium">Education:</span>
                      <span className="ml-2">
                        {Array.isArray(resumeData.structured_data.education) 
                          ? resumeData.structured_data.education.length 
                          : 0} entries
                      </span>
                    </div>
                  )}
                  {resumeData.structured_data.certifications && (
                    <div>
                      <span className="font-medium">Certifications:</span>
                      <span className="ml-2">
                        {Array.isArray(resumeData.structured_data.certifications) 
                          ? resumeData.structured_data.certifications.length 
                          : 0} certifications
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleUpload} variant="outline" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Replace Resume
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Upload a new resume to replace the current one
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
