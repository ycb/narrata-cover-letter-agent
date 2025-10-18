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
        <CardTitle className="flex items-center gap-2">
          <Linkedin className="h-5 w-5 text-blue-600" />
          LinkedIn Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{profile.linkedin_id}</h3>
            <p className="text-sm text-muted-foreground">LinkedIn Profile</p>
          </div>
          
          {profile.about && (
            <div>
              <h4 className="font-medium mb-2">About</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{profile.about}</p>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Updated {new Date(profile.updated_at).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
