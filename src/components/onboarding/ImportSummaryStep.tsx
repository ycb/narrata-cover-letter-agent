import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Building2, Briefcase, FileText, Linkedin, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ImportSummaryStepProps {
  onNext: () => void;
}

interface ImportStats {
  companies: number;
  roles: number;
  stories: number;
  linkedinConnected: boolean;
  loading: boolean;
}

export function ImportSummaryStep({ onNext }: ImportSummaryStepProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<ImportStats>({
    companies: 0,
    roles: 0,
    stories: 0,
    linkedinConnected: false,
    loading: true
  });

  useEffect(() => {
    async function fetchImportStats() {
      if (!user) return;

      try {
        console.log('[ImportSummary] Fetching import stats for user:', user.id);
        
        // Get companies count
        const { count: companiesCount, error: companiesError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (companiesError) {
          console.error('[ImportSummary] Error fetching companies:', companiesError);
        } else {
          console.log('[ImportSummary] Companies count:', companiesCount);
        }

        // Get work items count
        const { count: rolesCount, error: rolesError } = await supabase
          .from('work_items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (rolesError) {
          console.error('[ImportSummary] Error fetching work_items:', rolesError);
        } else {
          console.log('[ImportSummary] Work items count:', rolesCount);
        }

        // Get stories count
        const { count: storiesCount, error: storiesError } = await supabase
          .from('approved_content')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (storiesError) {
          console.error('[ImportSummary] Error fetching approved_content:', storiesError);
        } else {
          console.log('[ImportSummary] Stories count:', storiesCount);
        }

        // Check LinkedIn connection
        const { data: linkedinData, error: linkedinError } = await supabase
          .from('linkedin_profiles')
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        if (linkedinError && linkedinError.code !== 'PGRST116') { // Ignore "no rows" error
          console.error('[ImportSummary] Error fetching linkedin_profiles:', linkedinError);
        } else {
          console.log('[ImportSummary] LinkedIn connected:', !!linkedinData);
        }

        // Check if we have uploaded files but no extracted data
        const { count: sourcesCount } = await supabase
          .from('sources')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        console.log('[ImportSummary] Sources (uploaded files) count:', sourcesCount);

        if (sourcesCount && sourcesCount > 0 && companiesCount === 0 && rolesCount === 0) {
          console.warn('[ImportSummary] ⚠️ FILES UPLOADED BUT NO DATA EXTRACTED!');
          console.warn('[ImportSummary] This indicates a data extraction failure.');
          console.warn('[ImportSummary] Check sources table for structured_data field.');
        }

        setStats({
          companies: companiesCount || 0,
          roles: rolesCount || 0,
          stories: storiesCount || 0,
          linkedinConnected: !!linkedinData,
          loading: false
        });
      } catch (error) {
        console.error('[ImportSummary] Error fetching import stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    }

    fetchImportStats();
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 p-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Import Successful!</h2>
          <p className="text-muted-foreground mt-2">
            Your career data has been extracted and organized
          </p>
        </div>
      </div>

      {/* Import Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loading ? '...' : stats.companies}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From your work history
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loading ? '...' : stats.roles}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Positions extracted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stories</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.loading ? '...' : stats.stories}</div>
            <p className="text-xs text-muted-foreground mt-1">
              With metrics & impact
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">LinkedIn</CardTitle>
            <Linkedin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.loading ? '...' : stats.linkedinConnected ? '✓' : '—'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.linkedinConnected ? 'Profile enriched' : 'Not connected'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Warning if no data was extracted */}
      {!stats.loading && stats.companies === 0 && stats.roles === 0 && stats.stories === 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-xl">⚠️ No Data Extracted</CardTitle>
            <CardDescription className="text-base">
              Your files were uploaded but data extraction may have failed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              We detected that your resume and cover letter were uploaded, but no companies, roles, or stories were extracted.
            </p>
            <p className="text-sm font-medium">
              Possible causes:
            </p>
            <ul className="space-y-1 text-sm list-disc list-inside">
              <li>Resume format wasn't recognized (PDF image-only, heavy formatting)</li>
              <li>Backend processing timed out or failed</li>
              <li>AI model couldn't extract structured data</li>
            </ul>
            <p className="text-sm">
              <strong>What to do:</strong> Go to Work History and manually add your companies and roles. You can also try re-uploading your resume.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sharpen the Axe Message - only show if we have data */}
      {!stats.loading && (stats.companies > 0 || stats.roles > 0 || stats.stories > 0) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">🪓 Sharpen the Axe</CardTitle>
            <CardDescription className="text-base">
              "Give me six hours to chop down a tree and I will spend the first four sharpening the axe." — Abraham Lincoln
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Before diving into cover letter generation, take a moment to:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>Review your stories</strong> — Add missing context, refine metrics, and clarify impact</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>Tag for discoverability</strong> — Add thematic tags to help match stories to job requirements</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span><strong>Fill in gaps</strong> — The AI is smart, but you know your career best</span>
              </li>
            </ul>
            <p className="text-sm font-medium text-primary">
              A few minutes now = much better cover letters later! 🎯
            </p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <Button
          variant="outline"
          onClick={() => window.location.href = '/work-history'}
        >
          Go to Work History
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="gap-2"
        >
          Start Product Tour
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

