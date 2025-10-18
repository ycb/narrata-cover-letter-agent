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
  RefreshCw
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface LinkedInProfile {
  id: string;
  user_id: string;
  linkedin_id: string;
  profile_url: string;
  about: string;
  experience: any[];
  education: any[];
  skills: string[];
  certifications: any[];
  projects: any[];
  raw_data: any;
  created_at: string;
  updated_at: string;
}

interface LinkedInDataSourceProps {
  onConnectLinkedIn?: () => void;
  onRefresh?: () => void;
}

export function LinkedInDataSource({ onConnectLinkedIn, onRefresh }: LinkedInDataSourceProps) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkedInProfile = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile found
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
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
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Profile
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Profile
          </CardTitle>
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

  if (!profile) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Linkedin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Connect Your LinkedIn</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Import your professional experience and network data to build a comprehensive work history.
            </p>
            <Button onClick={handleConnect} className="w-full">
              <Linkedin className="h-4 w-4 mr-2" />
              Connect LinkedIn Profile
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
            <Linkedin className="h-5 w-5 text-blue-600" />
            LinkedIn Profile
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
              onClick={() => window.open(profile.profile_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Header */}
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">{profile.linkedin_id}</h3>
            <p className="text-muted-foreground">LinkedIn Profile</p>
          </div>
          
          {profile.about && (
            <div>
              <h4 className="font-medium mb-2">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.about}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>Updated {new Date(profile.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Experience */}
        {profile.experience && profile.experience.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Experience ({profile.experience.length})
            </h4>
            <div className="space-y-3">
              {profile.experience.slice(0, 3).map((exp, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium">{exp.title}</h5>
                      <p className="text-sm text-muted-foreground">{exp.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {exp.startDate} - {exp.endDate || 'Present'}
                      </p>
                      {exp.location && (
                        <p className="text-xs text-muted-foreground">{exp.location}</p>
                      )}
                    </div>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
              {profile.experience.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{profile.experience.length - 3} more positions
                </p>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education ({profile.education.length})
            </h4>
            <div className="space-y-2">
              {profile.education.slice(0, 2).map((edu, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <h5 className="font-medium">{edu.degree}</h5>
                  <p className="text-sm text-muted-foreground">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {edu.startDate} - {edu.endDate || 'Present'}
                  </p>
                </div>
              ))}
              {profile.education.length > 2 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{profile.education.length - 2} more schools
                </p>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skills ({profile.skills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills.slice(0, 10).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
              {profile.skills.length > 10 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.skills.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
