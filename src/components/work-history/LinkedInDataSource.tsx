import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Linkedin, 
  ExternalLink, 
  Building2, 
  MapPin, 
  Calendar,
  Users,
  Briefcase,
  GraduationCap,
  Award,
  RefreshCw,
  Copy,
  Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface LinkedInSource {
  id: string;
  user_id: string;
  file_name: string;
  file_type: string;
  structured_data: any;
  raw_text?: string;
  created_at: string;
  updated_at: string;
}

interface LinkedInDataSourceProps {
  onConnectLinkedIn?: () => void;
  onRefresh?: () => void;
}

export function LinkedInDataSource({ onConnectLinkedIn, onRefresh }: LinkedInDataSourceProps) {
  const { user } = useAuth();
  const [source, setSource] = useState<LinkedInSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedInProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Find LinkedIn sources by file_name pattern
      const { data, error: fetchError } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', user.id)
        .ilike('file_name', '%linkedin%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      } else if (!data) {
        // No LinkedIn source found
        setSource(null);
      } else {
        setSource(data);
      }
    } catch (err) {
      console.error('Error fetching LinkedIn profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load LinkedIn profile');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedInProfile();
  }, [user]);

  const handleRefresh = async () => {
    await fetchLinkedInProfile();
    onRefresh?.();
  };

  const handleConnect = () => {
    onConnectLinkedIn?.();
  };

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>LinkedIn Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading profile...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>LinkedIn Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-destructive mb-4">Error loading LinkedIn profile</p>
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

  // Format LinkedIn structured data for display
  const formatLinkedInData = (sd: any) => {
    if (!sd) return null;
    
    const workHistory = sd.workHistory || [];
    const education = sd.education || [];
    const skills = sd.skills || [];
    const about = sd.about || sd.summary || '';
    const fullName = sd.fullName || sd.name || 'LinkedIn Profile';
    
    return { workHistory, education, skills, about, fullName };
  };

  if (!source) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>LinkedIn Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold mb-2">Import LinkedIn Data</h3>
            <p className="text-sm text-muted-foreground mb-6">
              LinkedIn profile data will appear here once imported.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const linkedInData = formatLinkedInData(source.structured_data);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>LinkedIn Profile</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{new Date(source.created_at).toLocaleDateString()}</span>
        </div>

        {/* Profile Summary */}
        {linkedInData?.about && (
          <>
            <div>
              <h4 className="font-medium mb-2">About</h4>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {linkedInData.about}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Work History */}
        {linkedInData?.workHistory && linkedInData.workHistory.length > 0 && (
          <>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Experience ({linkedInData.workHistory.length})
              </h4>
              <div className="space-y-3">
                {linkedInData.workHistory.map((exp: any, index: number) => {
                  const title = exp.position || exp.title || 'Position';
                  const company = exp.company || 'Company';
                  const location = exp.location || '';
                  const startDate = exp.startDate || '';
                  const endDate = exp.endDate || exp.current ? 'Present' : '';
                  const description = exp.description || exp.roleSummary || '';
                  
                  return (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex-1">
                        <h5 className="font-medium">{title}</h5>
                        <p className="text-sm text-muted-foreground">{company}</p>
                        {(startDate || endDate) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {startDate} {endDate ? `- ${endDate}` : ''}
                          </p>
                        )}
                        {location && (
                          <p className="text-xs text-muted-foreground">{location}</p>
                        )}
                      </div>
                      {description && (
                        <p className="text-sm text-foreground mt-2 whitespace-pre-wrap">
                          {description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Education */}
        {linkedInData?.education && linkedInData.education.length > 0 && (
          <>
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Education ({linkedInData.education.length})
              </h4>
              <div className="space-y-2">
                {linkedInData.education.map((edu: any, index: number) => {
                  const degree = edu.degree || edu.fieldOfStudy || 'Degree';
                  const school = edu.school || edu.institution || 'School';
                  const startDate = edu.startDate || '';
                  const endDate = edu.endDate || edu.current ? 'Present' : '';
                  
                  return (
                    <div key={index} className="border rounded-lg p-3">
                      <h5 className="font-medium">{degree}</h5>
                      <p className="text-sm text-muted-foreground">{school}</p>
                      {(startDate || endDate) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {startDate} {endDate ? `- ${endDate}` : ''}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Skills */}
        {linkedInData?.skills && linkedInData.skills.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills ({linkedInData.skills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {linkedInData.skills.slice(0, 20).map((skill: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {linkedInData.skills.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{linkedInData.skills.length - 20} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {!linkedInData?.workHistory?.length && !linkedInData?.education?.length && !linkedInData?.skills?.length && !linkedInData?.about && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No structured data available from LinkedIn import.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
