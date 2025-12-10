import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportLogsToCsv } from '@/utils/evaluationExport';
import { supabase } from '@/lib/supabase';
import { GapDetectionService } from '@/services/gapDetectionService';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FlagButton } from './FlagButton';
import { FlagModal } from './FlagModal';
import { DataQualityService, type DataQualityFlag } from '@/services/dataQualityService';
import { FlagsSummaryPanel } from './FlagsSummaryPanel';

interface EvaluationRun {
  id: string;
  user_id: string;
  session_id: string | null;
  source_id: string | null;
  file_type: string;
  user_type: 'synthetic' | 'real';
  
  // Performance Metrics
  text_extraction_latency_ms: number | null;
  llm_analysis_latency_ms: number | null;
  database_save_latency_ms: number | null;
  total_latency_ms: number | null;
  
  // Token Usage
  input_tokens: number | null;
  output_tokens: number | null;
  model: string;
  
  // Evaluation Results
  accuracy_score: string;
  relevance_score: string;
  personalization_score: string;
  clarity_tone_score: string;
  framework_score: string;
  go_nogo_decision: string;
  evaluation_rationale: string;
  
  // Heuristics Data
  heuristics: any;
  
  // PM Level Evaluation
  pm_levels_status?: string | null;
  pm_levels_latency_ms?: number | null;
  pm_levels_inferred_level?: string | null;
  pm_levels_confidence?: number | null;
  pm_levels_previous_level?: string | null;
  pm_levels_previous_confidence?: number | null;
  pm_levels_trigger_reason?: string | null;
  pm_levels_run_type?: 'first-run' | 'rerun' | 'diff' | null;
  pm_levels_session_id?: string | null;
  pm_levels_error?: string | null;
  pm_levels_level_changed?: boolean | null;
  pm_levels_delta?: Record<string, unknown> | null;
  pm_levels_snapshot?: Record<string, unknown> | null;
  pm_levels_prev_snapshot?: Record<string, unknown> | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  synthetic_profile_id?: string | null;
}

interface SourceData {
  id: string;
  file_name: string;
  file_type: string;
  raw_text: string;
  structured_data: any;
  created_at: string;
  storage_path?: string;
}

interface EvaluationDashboardProps {
  isAdminView?: boolean;
  adminUserId?: string;
  adminUserType?: 'all' | 'real' | 'synthetic';
  adminQualityFilter?: 'all' | 'go' | 'nogo' | 'needs-review';
}

export const EvaluationDashboard: React.FC<EvaluationDashboardProps> = ({ 
  isAdminView = false,
  adminUserId,
  adminUserType = 'all',
  adminQualityFilter = 'all'
}) => {
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceData | null>(null);
  const [rawFileUrl, setRawFileUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'synthetic' | 'real'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [flags, setFlags] = useState<DataQualityFlag[]>([]);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flaggingItem, setFlaggingItem] = useState<{
    dataType: DataQualityFlag['data_type'];
    dataPath: string;
    dataSnapshot?: any;
  } | null>(null);

  // Gaps fetched for the selected run (scoped by profile)
  const [gapsBySeverity, setGapsBySeverity] = useState<{ high: any[]; medium: any[]; low: any[] }>({ high: [], medium: [], low: [] });
  const [gapsLoading, setGapsLoading] = useState(false);

  useEffect(() => {
    if (!user?.id && !isAdminView) return;
    
    const fetchEvaluationData = async () => {
      setLoading(true);
      try {
        if (isAdminView) {
          // Admin mode: fetch global data via Edge Function
          const { data: session } = await supabase.auth.getSession();
          if (!session.session) {
            console.error('Not authenticated');
            return;
          }
          
          console.log('🔍 Admin filters:', { adminUserType, adminUserId, adminQualityFilter });
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-evaluation-dashboard-query`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.session.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                userTypeFilter: adminUserType,
                userId: adminUserId 
              }),
            }
          );
          
          console.log('📡 Response status:', response.status, response.ok);
          
          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to fetch admin evaluation data:', error);
            return;
          }
          
          const result = await response.json();
          console.log('📊 Raw result from Edge Function:', { 
            evaluationRunsCount: result.evaluationRuns?.length || 0,
            sourcesCount: result.sources?.length || 0 
          });
          
          let runs = result.evaluationRuns || [];
          console.log('🎯 About to apply quality filter:', { 
            adminQualityFilter, 
            willFilter: !!(adminQualityFilter && adminQualityFilter !== 'all'),
            runsBeforeFilter: runs.length 
          });
          
          // Apply client-side quality filter
          if (adminQualityFilter && adminQualityFilter !== 'all') {
            runs = runs.filter((run: EvaluationRun) => {
              const scores = [
                run.accuracy_score,
                run.relevance_score,
                run.personalization_score,
                run.clarity_tone_score,
                run.framework_score
              ].filter(s => s && s !== 'N/A').map(s => parseFloat(s as string));
              
              const avgScore = scores.length > 0 
                ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
                : 0;
              
              if (adminQualityFilter === 'go') return avgScore >= 0.8;
              if (adminQualityFilter === 'nogo') return avgScore < 0.5;
              if (adminQualityFilter === 'needs-review') return avgScore >= 0.5 && avgScore < 0.8;
              return true;
            });
            console.log('🎯 After quality filter:', { runsAfterFilter: runs.length });
          }
          
          setEvaluationRuns(runs);
          setSources(result.sources || []);
          console.log('📊 Loaded admin evaluation runs:', runs.length);
        } else {
          // User mode: fetch own data with RLS
          let query = supabase
            .from('evaluation_runs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (userTypeFilter !== 'all') {
            query = query.eq('user_type', userTypeFilter);
          }

          const { data: runs, error: runsError } = await query;

          if (runsError) {
            console.error('Failed to fetch evaluation runs:', runsError);
            return;
          }

          // Fetch corresponding sources
          if (runs && runs.length > 0) {
            const sourceIds = (runs as EvaluationRun[])
              .map((run: EvaluationRun) => run.source_id)
              .filter((id): id is string => Boolean(id));

            if (sourceIds.length > 0) {
              const { data: sourcesData, error: sourcesError } = await supabase
                .from('sources')
                .select('id, file_name, file_type, raw_text, structured_data, created_at, storage_path')
                .in('id', sourceIds);

              if (sourcesError) {
                console.error('Failed to fetch sources:', sourcesError);
                return;
              }

              setSources(sourcesData || []);
            } else {
              setSources([]);
            }
          } else {
            setSources([]);
          }

          setEvaluationRuns(runs || []);
          console.log('📊 Loaded evaluation runs:', runs?.length || 0);
        }
      } catch (error) {
        console.error('Failed to fetch evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationData();
  }, [user?.id, userTypeFilter, isAdminView, adminUserId, adminUserType, adminQualityFilter]);

  const handleRowClick = async (run: EvaluationRun) => {
    const source = run.source_id ? sources.find(s => s.id === run.source_id) : undefined;
    setSelectedRun(run);
    setSelectedSource(source || null);
    setExpandedCategories(new Set()); // Reset expanded categories when opening a new run
    setIsModalOpen(true);
    try {
      const fetched = await DataQualityService.getFlagsForEvaluationRun(run.id);
      setFlags(fetched);
      // Load gaps for the active synthetic profile inferred from the source file name prefix (e.g., P00_)
      await loadGapsForSelectedProfile(source || null);
    } catch (e) {
      console.error('Failed to load flags', e);
      setFlags([]);
    }
  };

  const loadGapsForSelectedProfile = async (src: SourceData | null) => {
    if (!user?.id) return;
    setGapsLoading(true);
    try {
      // Infer profile prefix from the source file name if available
      const file = src?.file_name || '';
      const profileMatch = file.match(/^(P\d{2})_/i);
      const profileId = profileMatch ? profileMatch[1].toUpperCase() : undefined;

      // Use the same service as the dashboard to derive item-level gaps
      const itemsByType = await GapDetectionService.getContentItemsWithGaps(user.id, profileId);
      const allItems = [
        ...(itemsByType.byContentType.workHistory || []),
        ...(itemsByType.byContentType.coverLetterSavedSections || []),
      ];
      const high: any[] = [], medium: any[] = [], low: any[] = [];
      for (const it of allItems) {
        const entry: any = { 
          id: it.entity_id,
          entity_type: it.entity_type,
          gap_category: (it.gap_categories && it.gap_categories[0]) || 'gap',
          severity: it.max_severity || it.severity || 'medium',
          context: {
            story: it.story_title || it.display_title,
            role: it.role_title,
            company: (it as any).company_name
          }
        };
        if (entry.severity === 'high') high.push(entry);
        else if (entry.severity === 'medium') medium.push(entry);
        else low.push(entry);
      }
      setGapsBySeverity({ high, medium, low });
    } catch (e) {
      console.error('Failed to load gaps for selected profile', e);
      setGapsBySeverity({ high: [], medium: [], low: [] });
    } finally {
      setGapsLoading(false);
    }
  };

  const handleFlagClick = (dataType: DataQualityFlag['data_type'], dataPath: string, dataSnapshot?: any) => {
    setFlaggingItem({ dataType, dataPath, dataSnapshot });
    setFlagModalOpen(true);
  };

  const handleFlagSubmit = async (
    flag: Omit<DataQualityFlag, 'id' | 'created_at' | 'updated_at' | 'evaluation_run_id' | 'reviewer_id' | 'status'>
  ) => {
    if (!selectedRun?.id || !user?.id) return;
    await DataQualityService.createFlag({
      ...flag,
      evaluation_run_id: selectedRun.id,
      reviewer_id: user.id,
    } as any);
    const refreshed = await DataQualityService.getFlagsForEvaluationRun(selectedRun.id);
    setFlags(refreshed);
    setFlagModalOpen(false);
    setFlaggingItem(null);
  };

  const getFlagsForPath = (dataPath: string): DataQualityFlag[] => flags.filter(f => f.data_path === dataPath && f.status === 'open');

  useEffect(() => {
    if (!isModalOpen) {
      setFlagModalOpen(false);
      setFlaggingItem(null);
      setFlags([]);
    }
  }, [isModalOpen]);

  // Generate signed URL for raw file when source is selected
  useEffect(() => {
    const generateFileUrl = async () => {
      if (selectedSource?.storage_path) {
        try {
          const { data, error } = await supabase.storage
            .from('user-files')
            .createSignedUrl(selectedSource.storage_path, 3600); // 1 hour expiry
          
          if (error) {
            console.error('Failed to generate signed URL:', error);
            setRawFileUrl(null);
          } else {
            setRawFileUrl(data.signedUrl);
          }
        } catch (error) {
          console.error('Error generating file URL:', error);
          setRawFileUrl(null);
        }
      } else {
        setRawFileUrl(null);
      }
    };

    generateFileUrl();
  }, [selectedSource?.storage_path]);

  const getEvaluationBadgeColor = (value: string | undefined): string => {
    if (!value) return 'bg-gray-100 text-gray-800';
    if (value.includes('✅')) return 'bg-green-100 text-green-800';
    if (value.includes('⚠')) return 'bg-amber-100 text-amber-800';
    if (value.includes('❌')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getPmLevelStatusColor = (status?: string | null): string => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'bg-emerald-100 text-emerald-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getRunTypeBadgeColor = (runType?: EvaluationRun['pm_levels_run_type']): string => {
    switch (runType) {
      case 'diff':
        return 'bg-purple-100 text-purple-800';
      case 'first-run':
        return 'bg-blue-100 text-blue-800';
      case 'rerun':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatRunTypeLabel = (runType?: EvaluationRun['pm_levels_run_type']): string => {
    switch (runType) {
      case 'diff':
        return 'Diff';
      case 'first-run':
        return 'First Run';
      case 'rerun':
        return 'Rerun';
      default:
        return '—';
    }
  };

  const formatConfidencePercent = (value?: number | null): string => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${Math.round(value * 100)}%`;
    }
    return '—';
  };

  const getStabilityBadgeColor = (stability?: string | null): string => {
    switch (stability) {
      case 'expected':
        return 'bg-emerald-100 text-emerald-800';
      case 'attention':
        return 'bg-amber-100 text-amber-800';
      case 'initial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const formatStabilityLabel = (stability?: string | null): string => {
    switch (stability) {
      case 'expected':
        return 'Expected change';
      case 'attention':
        return 'Needs review';
      case 'initial':
        return 'Baseline run';
      default:
        return 'Unknown stability';
    }
  };

  const renderDeltaPill = (value: number | null | undefined): React.ReactNode => {
    if (value == null || !Number.isFinite(value) || value === 0) {
      return null;
    }
    const positive = value > 0;
    return (
      <span
        className={cn(
          'ml-2 text-xs font-medium',
          positive ? 'text-emerald-600' : 'text-rose-600'
        )}
      >
        {positive ? '+' : ''}
        {Math.abs(Math.round(value))}
      </span>
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Compute available categories and expand/collapse all
  const getAvailableCategories = (): string[] => {
    if (selectedRun?.file_type === 'pm_level') {
      return [];
    }
    const categories: string[] = [];
    const sd: any = selectedSource?.structured_data || {};
    const workHistory = sd.workHistory || sd.work_history || [];
    const education = sd.education || [];
    const skillsArray = sd.skills || [];
    const skillsMentioned = sd.skillsMentioned || [];
    const contactInfo = sd.contactInfo || sd.contact_info || {};
    const stories = sd.stories || [];
    const hasMetrics = (() => {
      let found = false;
      (workHistory || []).forEach((entry: any) => {
        if (Array.isArray(entry?.outcomeMetrics) && entry.outcomeMetrics.length > 0) found = true;
        (entry?.stories || []).forEach((st: any) => {
          if (Array.isArray(st?.metrics) && st.metrics.length > 0) found = true;
        });
      });
      (stories || []).forEach((st: any) => {
        if (Array.isArray(st?.metrics) && st.metrics.length > 0) found = true;
      });
      return found;
    })();

    if (selectedRun?.file_type !== 'coverLetter' && Array.isArray(workHistory) && workHistory.length > 0) categories.push('workHistory');
    if (Array.isArray(education) && education.length > 0) categories.push('education');
    if ([...(skillsArray || []), ...(skillsMentioned || [])].length > 0) categories.push('skills');
    if (Object.keys(contactInfo || {}).length > 0) categories.push('contactInfo');
    if (selectedRun?.file_type === 'coverLetter' && Array.isArray(stories) && stories.length > 0) categories.push('stories');
    // Removed quantMetrics category (Option B - hide role-level metrics from dedicated section)
    categories.push('companyNames', 'jobTitles');
    // Always show Gaps section (even when zero) for visibility
    categories.push('gaps');
    return categories;
  };

  const toggleExpandAll = () => {
    const available = getAvailableCategories();
    const allOpen = available.every(c => expandedCategories.has(c));
    if (allOpen) {
      setExpandedCategories(new Set());
    } else {
      setExpandedCategories(new Set(available));
    }
  };

  // Helper to render work history entry in friendly format (full-width with 3x2 metadata grid)
  const renderWorkHistoryEntry = (entry: any, idx: number) => {
    const company = entry.company || entry.companyDisplay || 'Unknown Company';
    const position = entry.title || entry.titleDisplay || entry.titleCanonical || entry.role || entry.position || 'Unknown Position';
    const startDate = entry.startDate || entry.dateRange?.start;
    const endDate = entry.endDate || entry.dateRange?.end;
    const isCurrent = entry.current || (endDate === null && entry.dateRange?.current === true);
    const location = entry.location || entry.location_name;
    const companyTags = entry.companyTags || [];
    const roleTags = entry.roleTags || entry.tags || [];
    const stories = entry.stories || [];
    const outcomeMetrics = entry.outcomeMetrics || [];
    const roleSummary = entry.roleSummary || entry.description || entry.descriptionCombined;

    // Format date range
    const formatDateRange = () => {
      if (!startDate) return 'Dates not specified';
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      };
      const start = formatDate(startDate);
      const end = isCurrent ? 'Present' : (endDate ? formatDate(endDate) : '');
      return `${start}${end ? ` - ${end}` : ''}`;
    };

    // Combine all skills/tags for display
    const allSkills = [...companyTags, ...roleTags];

    const workPath = `workHistory[${idx}]`;
    const itemFlags = getFlagsForPath(workPath);
    return (
      <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 relative">
        <div className="absolute top-2 right-2">
          <FlagButton
            dataPath={workPath}
            dataType="work_history"
            hasFlags={itemFlags.length > 0}
            flagCount={itemFlags.length}
            onClick={() => handleFlagClick('work_history', workPath, entry)}
          />
        </div>
        
        {/* 3x2 Metadata Grid */}
        <div className="grid grid-cols-3 gap-4 pr-8">
          {/* Row 1 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Company Name</div>
            <div className="text-sm font-medium text-gray-900">{company}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Job Title</div>
            <div className="text-sm font-medium text-gray-900">{position}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Skills</div>
            <div className="flex flex-wrap gap-1">
              {allSkills.length > 0 ? (
                allSkills.slice(0, 3).map((tag: string, tagIdx: number) => (
                  <Badge key={tagIdx} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-gray-400">None</span>
              )}
              {allSkills.length > 3 && (
                <Badge variant="outline" className="text-xs">+{allSkills.length - 3}</Badge>
              )}
            </div>
          </div>
          {/* Row 2 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Date Range</div>
            <div className="text-sm text-gray-900">{formatDateRange()}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Location</div>
            <div className="text-sm text-gray-900">{location || 'Not specified'}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Metrics</div>
            <div className="text-sm text-gray-900">
              {outcomeMetrics.length > 0 ? `${outcomeMetrics.length} metric${outcomeMetrics.length !== 1 ? 's' : ''}` : 'None'}
            </div>
          </div>
        </div>

        {/* Role Summary */}
        {roleSummary && (
          <div className="text-sm text-gray-700 border-t pt-3">
            <span className="font-medium">Summary: </span>
            {roleSummary}
          </div>
        )}

        {/* Gaps section */}
        {(expandedCategories.has('gaps') || (!expandedCategories.size && (gapsBySeverity.high.length + gapsBySeverity.medium.length + gapsBySeverity.low.length) > 0)) && (
          <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700">Gaps</div>
              <div className="text-xs text-gray-500">{gapsLoading ? 'Loading…' : ''}</div>
            </div>
            {(['high','medium','low'] as const).map(sev => (
              <div key={sev}>
                <div className="text-xs font-semibold capitalize mb-1">{sev} ({(gapsBySeverity as any)[sev].length})</div>
                <div className="space-y-1">
                  {(gapsBySeverity as any)[sev].map((g: any, i: number) => (
                    <div key={g.id || i} className="text-xs bg-gray-50 p-2 rounded border">
                      <div className="font-medium">{g.gap_category}</div>
                      <div className="text-gray-600">
                        {(g.context?.story ? `Story: ${g.context.story} — ` : '')}
                        {(g.context?.role ? `Role: ${g.context.role}` : '')}
                        {(g.context?.company ? ` @ ${g.context.company}` : '')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Role Metrics (inline display) */}
        {outcomeMetrics.length > 0 && (
          <div className="space-y-1 border-t pt-3">
            <div className="text-xs font-medium text-gray-600 mb-2">Role Metrics:</div>
            <div className="flex flex-wrap gap-2">
              {outcomeMetrics.map((metric: any, metricIdx: number) => (
                <div key={metricIdx} className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded">
                  <span className="font-semibold">{metric.value}</span>
                  {metric.context && <span className="text-green-600"> {metric.context}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {stories.length > 0 && (
          <div className="space-y-2 border-t pt-2">
          <div className="text-xs font-medium text-gray-600">
              Stories ({stories.length}):
            </div>
            {stories.map((story: any, storyIdx: number) => {
              const storyPath = `${workPath}.stories[${storyIdx}]`;
              const storyFlags = getFlagsForPath(storyPath);
              return (
              <div key={storyIdx} className="text-xs bg-gray-50 p-2 rounded border-l-2 border-blue-300 relative">
                <div className="absolute top-1 right-1">
                  <FlagButton
                    dataPath={storyPath}
                    dataType="story"
                    hasFlags={storyFlags.length > 0}
                    flagCount={storyFlags.length}
                    onClick={() => handleFlagClick('story', storyPath, story)}
                    size="sm"
                  />
                </div>
                <div className="pr-6">
                {/* Compact header to keep room for flag */}
                <div className="text-xs text-gray-600">
                  {/* work-history context already includes company/role above; keep only title here */}
                </div>
                <div className="font-medium text-gray-800">{story.title || story.id}</div>
                {story.content && (
                  <div className="text-gray-600 mt-1">{story.content}</div>
                )}
                {story.metrics && story.metrics.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-medium text-gray-600 mb-1">Metrics</div>
                    <div className="flex flex-wrap gap-1">
                    {story.metrics.map((m: any, mIdx: number) => {
                      const metricPath = `${storyPath}.metrics[${mIdx}]`;
                      const metricFlags = getFlagsForPath(metricPath);
                      return (
                        <span key={mIdx} className="relative inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {m.value} {m.context}
                          <FlagButton
                            dataPath={metricPath}
                            dataType="metric"
                            hasFlags={metricFlags.length > 0}
                            flagCount={metricFlags.length}
                            onClick={() => handleFlagClick('metric', metricPath, m)}
                            size="sm"
                          />
                        </span>
                      )
                    })}
                    </div>
                  </div>
                )}
                {story.tags && story.tags.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[11px] font-medium text-gray-600 mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1">
                    {story.tags.map((tag: string, tIdx: number) => {
                      const tagPath = `${storyPath}.tags[${tIdx}]`;
                      const tagFlags = getFlagsForPath(tagPath);
                      return (
                        <span key={tIdx} className="relative inline-flex items-center gap-1">
                          <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                            {tag}
                          </Badge>
                          <FlagButton
                            dataPath={tagPath}
                            dataType={'tag'}
                            hasFlags={tagFlags.length > 0}
                            flagCount={tagFlags.length}
                            onClick={() => handleFlagClick('tag', tagPath, tag)}
                            size="sm"
                          />
                        </span>
                      )
                    })}
                    </div>
                  </div>
                )}
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Dates moved to bottom to free space for flag */}
        <div className="text-sm text-gray-600 pt-1">
          {startDate && (
            <span>{new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
          )}
          {endDate ? (
            <span> → {new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
          ) : isCurrent ? (
            <span> → Present</span>
          ) : null}
        </div>
      </div>
    );
  };

  // Helper to render education entry in friendly format
  const renderEducationEntry = (entry: any, idx: number) => {
    const institution = entry.institution || 'Unknown Institution';
    const degree = entry.degree || '';
    const field = entry.field || entry.fieldOfStudy || '';
    const startDate = entry.startDate;
    const endDate = entry.endDate;
    const gpa = entry.gpa;

    const eduPath = `education[${idx}]`;
    const eduFlags = getFlagsForPath(eduPath);
    return (
      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 relative">
        <div className="absolute top-2 right-2">
          <FlagButton
            dataPath={eduPath}
            dataType="education"
            hasFlags={eduFlags.length > 0}
            flagCount={eduFlags.length}
            onClick={() => handleFlagClick('education', eduPath, entry)}
          />
        </div>
        <div className="pr-8">
        <div className="font-semibold text-sm text-gray-900">{institution}</div>
        <div className="text-sm text-gray-700">
          {degree && field ? `${degree} in ${field}` : degree || field}
        </div>
        {(startDate || endDate) && (
          <div className="text-xs text-gray-500 mt-1">
            {startDate && new Date(startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
            {endDate && ` → ${new Date(endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}`}
          </div>
        )}
        {gpa && (
          <div className="text-xs text-gray-500 mt-1">GPA: {gpa}</div>
        )}
        </div>
      </div>
    );
  };

  // Helper to render skills in friendly format
  const renderSkills = (skills: any[]) => {
    if (!Array.isArray(skills) || skills.length === 0) return null;

    // Skills can be array of strings or array of objects with category/items
    const allSkills: string[] = [];
    const skillCategories: { category: string; items: string[] }[] = [];

    skills.forEach((skill: any) => {
      if (typeof skill === 'string') {
        allSkills.push(skill);
      } else if (skill.category && Array.isArray(skill.items)) {
        skillCategories.push({ category: skill.category, items: skill.items });
      } else if (skill.skill) {
        allSkills.push(skill.skill);
      }
    });

    return (
      <div className="space-y-3">
        {skillCategories.map((cat, idx) => (
          <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="font-medium text-sm text-gray-700 mb-2">{cat.category}</div>
            <div className="flex flex-wrap gap-2">
              {cat.items.map((item: string, itemIdx: number) => {
                const path = `skills[${idx}].items[${itemIdx}]`;
                const sFlags = getFlagsForPath(path);
                return (
                  <span key={itemIdx} className="relative inline-flex items-center gap-1">
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                      {item}
                    </Badge>
                    <FlagButton
                      dataPath={path}
                      dataType={'skill'}
                      hasFlags={sFlags.length > 0}
                      flagCount={sFlags.length}
                      onClick={() => handleFlagClick('skill', path, item)}
                      size="sm"
                    />
                  </span>
                )
              })}
            </div>
          </div>
        ))}
        {allSkills.length > 0 && (
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex flex-wrap gap-2">
              {allSkills.map((skill: string, idx: number) => {
                const path = `skills[${idx}]`;
                const sFlags = getFlagsForPath(path);
                return (
                  <span key={idx} className="relative inline-flex items-center gap-1">
                    <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700">
                      {skill}
                    </Badge>
                    <FlagButton
                      dataPath={path}
                      dataType={'skill'}
                      hasFlags={sFlags.length > 0}
                      flagCount={sFlags.length}
                      onClick={() => handleFlagClick('skill', path, skill)}
                      size="sm"
                    />
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Helper to check if story is linked to work history
  const isStoryLinkedToWorkHistory = (story: any, workHistory: any[]): { linked: boolean; roleId?: string } => {
    if (!Array.isArray(workHistory) || workHistory.length === 0) {
      return { linked: false };
    }

    // Check if story has company/titleRole that matches a work history entry
    const storyCompany = story.company;
    const storyTitle = story.titleRole || story.title;

    if (storyCompany || storyTitle) {
      const matchingRole = workHistory.find((role: any) => {
        const roleCompany = role.company || role.companyDisplay || role.companyCanonical;
        // Match the logic from renderWorkHistoryEntry - check title first (not position)
        const roleTitle = role.title || role.titleDisplay || role.titleCanonical || role.role || role.position;
        
        const companyMatch = storyCompany && roleCompany && 
          roleCompany.toLowerCase().includes(storyCompany.toLowerCase()) ||
          storyCompany.toLowerCase().includes(roleCompany.toLowerCase());
        
        const titleMatch = storyTitle && roleTitle &&
          (roleTitle.toLowerCase().includes(storyTitle.toLowerCase()) ||
           storyTitle.toLowerCase().includes(roleTitle.toLowerCase()));

        return companyMatch || titleMatch;
      });

      if (matchingRole) {
        return { linked: true, roleId: matchingRole.id };
      }
    }

    return { linked: false };
  };

  const calculateMetrics = () => {
    // Exclude legacy "final" rows from old snapshots
    const runs = evaluationRuns.filter(r => !r.session_id?.includes('_final'));
    if (runs.length === 0) {
      return {
        totalEvaluations: 0,
        avgLLM: '0.00',
        avgPipeline: '0.00',
        goRate: '0.0',
        accuracyRate: '0.0',
        pmLevelRuns: 0,
        pmLevelSuccessRate: '0.0',
        pmLevelChangeRate: '0.0',
        pmLevelLatestLevel: null as string | null,
        pmLevelLatestConfidence: null as number | null,
        pmLevelLatestStatus: '—',
      } as const;
    }

    const totalEvaluations = runs.length;

    // LLM latency: average of llm_analysis_latency_ms across all runs
    const llmMs = runs.map(r => r.llm_analysis_latency_ms || 0);
    const avgLLM = (llmMs.reduce((s, v) => s + v, 0) / totalEvaluations) / 1000;

    // Pipeline time: average of total_latency_ms on coverLetter runs (end-to-end)
    const pipelineRuns = runs.filter(r => r.file_type === 'coverLetter' && (r.total_latency_ms || 0) > 0);
    const avgPipeline = pipelineRuns.length > 0
      ? (pipelineRuns.reduce((s, r) => s + (r.total_latency_ms || 0), 0) / pipelineRuns.length) / 1000
      : 0;

    const goCount = runs.filter(run => run.go_nogo_decision?.includes('✅')).length;
    const goRate = (goCount / totalEvaluations) * 100;
    const accurateCount = runs.filter(run => run.accuracy_score?.includes('✅')).length;
    const accuracyRate = (accurateCount / totalEvaluations) * 100;

    const pmRuns = runs.filter(run => !!run.pm_levels_status);
    const pmLevelRuns = pmRuns.length;
    const pmSuccessCount = pmRuns.filter(run => run.pm_levels_status === 'success').length;
    const pmChangeCount = pmRuns.filter(run => run.pm_levels_level_changed).length;
    const pmLevelSuccessRate = pmLevelRuns > 0 ? (pmSuccessCount / pmLevelRuns) * 100 : 0;
    const pmLevelChangeRate = pmLevelRuns > 0 ? (pmChangeCount / pmLevelRuns) * 100 : 0;
    const latestPmRun = pmRuns[0];

    return {
      totalEvaluations,
      avgLLM: avgLLM.toFixed(2),
      avgPipeline: avgPipeline.toFixed(2),
      goRate: goRate.toFixed(1),
      accuracyRate: accuracyRate.toFixed(1),
      pmLevelRuns,
      pmLevelSuccessRate: pmLevelSuccessRate.toFixed(1),
      pmLevelChangeRate: pmLevelChangeRate.toFixed(1),
      pmLevelLatestLevel: latestPmRun?.pm_levels_inferred_level ?? null,
      pmLevelLatestConfidence: latestPmRun?.pm_levels_confidence ?? null,
      pmLevelLatestStatus: latestPmRun?.pm_levels_status ?? '—',
    } as const;
  };

  const handleExport = () => {
    // Convert evaluation runs to CSV format
    const csvData = evaluationRuns.map(run => {
      const source = run.source_id ? sources.find(s => s.id === run.source_id) : undefined;
      const displayFileName = source?.file_name || (run.file_type === 'pm_level' ? 'pm-level-run' : 'Unknown');
      return {
        timestamp: run.created_at,
        session_id: run.session_id,
        file_name: displayFileName,
        file_type: run.file_type,
        model: run.model,
        total_latency_ms: run.total_latency_ms,
        input_tokens: run.input_tokens,
        output_tokens: run.output_tokens,
        accuracy_score: run.accuracy_score,
        relevance_score: run.relevance_score,
        go_nogo_decision: run.go_nogo_decision,
        evaluation_rationale: run.evaluation_rationale,
        pm_levels_status: run.pm_levels_status ?? '',
        pm_levels_inferred_level: run.pm_levels_inferred_level ?? '',
        pm_levels_confidence: run.pm_levels_confidence != null ? formatConfidencePercent(run.pm_levels_confidence) : '',
        pm_levels_run_type: run.pm_levels_run_type ?? '',
        pm_levels_trigger_reason: run.pm_levels_trigger_reason ?? '',
        pm_levels_level_changed: run.pm_levels_level_changed ?? '',
      };
    });
    
    exportLogsToCsv(csvData);
  };

  const metrics = calculateMetrics();

  // Build the centered header label: logged-in user or logged-in / synthetic name
  const getLoggedInDisplayName = (): string => {
    const fullName = (user?.user_metadata as any)?.full_name as string | undefined;
    return fullName || user?.email || (user?.id ?? 'User');
  };

  const extractSyntheticName = (): string => {
    const sd: any = selectedSource?.structured_data || {};
    const candidates = [
      sd?.basic_info?.fullname,
      sd?.basic_info?.full_name,
      sd?.contactInfo?.name,
      sd?.contactInfo?.fullName
    ];
    for (const c of candidates) {
      if (c && typeof c === 'string') return c as string;
    }
    const fileCodeMatch = selectedSource?.file_name?.match(/(P\d{2})/i);
    if (fileCodeMatch) {
      const code = fileCodeMatch[1].toUpperCase();
      const nameMap: Record<string, string> = { P01: 'Avery Chen' };
      return nameMap[code] || code;
    }
    return 'Synthetic';
  };

  const getHeaderUserText = (): string => {
    const logged = getLoggedInDisplayName();
    if (selectedRun?.user_type === 'synthetic') {
      const synthetic = extractSyntheticName();
      return `${logged} / ${synthetic}`;
    }
    return logged;
  };

  const renderPmLevelDetail = (run: EvaluationRun) => {
    const snapshot = (run.pm_levels_snapshot ?? null) as any;
    const previousSnapshot = (run.pm_levels_prev_snapshot ?? null) as any;
    const delta = (run.pm_levels_delta ?? null) as any;

    const currentConfidenceValue = typeof snapshot?.confidence === 'number'
      ? snapshot.confidence
      : run.pm_levels_confidence ?? null;
    const previousConfidenceValue = typeof previousSnapshot?.confidence === 'number'
      ? previousSnapshot.confidence
      : run.pm_levels_previous_confidence ?? null;
    const confidenceDeltaValue = typeof delta?.confidenceDelta === 'number'
      ? delta.confidenceDelta
      : null;

    const confidenceDeltaLabel = confidenceDeltaValue != null
      ? `${confidenceDeltaValue > 0 ? '+' : ''}${Math.round(confidenceDeltaValue * 100)}%`
      : '—';

    const storySummary = snapshot?.levelEvidence?.stories ?? {};
    const previousStorySummary = previousSnapshot?.levelEvidence?.stories ?? {};
    const resumeSummary = snapshot?.levelEvidence?.resume ?? {};
    const frameworkSummary = snapshot?.levelEvidence?.levelingFramework ?? {};
    const previousFrameworkSummary = previousSnapshot?.levelEvidence?.levelingFramework ?? {};
    const metricsSummary = snapshot?.levelEvidence?.metrics ?? {};
    const previousMetricsSummary = previousSnapshot?.levelEvidence?.metrics ?? {};
    const storyHighlights: Array<any> = Array.isArray(storySummary?.highlights) ? storySummary.highlights : [];
    const recommendations: Array<any> = Array.isArray(snapshot?.recommendations) ? snapshot.recommendations : [];
    const stabilityStatus = delta?.stability ?? (previousSnapshot ? 'attention' : 'initial');
    const deltaStories = (delta?.stories ?? null) as any;
    const deltaMetrics = (delta?.metrics ?? null) as any;
    const deltaCriteria = (delta?.criteria ?? null) as any;
    const storyAdditions: Array<any> = Array.isArray(deltaStories?.added) ? deltaStories.added : [];
    const storyRemovals: Array<any> = Array.isArray(deltaStories?.removed) ? deltaStories.removed : [];
    const currentRelevantStories =
      typeof deltaStories?.currentRelevant === 'number'
        ? deltaStories.currentRelevant
        : storySummary?.relevant ?? null;
    const previousRelevantStories =
      typeof deltaStories?.previousRelevant === 'number'
        ? deltaStories.previousRelevant
        : previousStorySummary?.relevant ?? null;
    const relevantDelta =
      currentRelevantStories != null && previousRelevantStories != null
        ? currentRelevantStories - previousRelevantStories
        : null;
    const currentMetricsTotal =
      typeof deltaMetrics?.currentTotal === 'number'
        ? deltaMetrics.currentTotal
        : metricsSummary?.totalMetrics ?? null;
    const previousMetricsTotal =
      typeof deltaMetrics?.previousTotal === 'number'
        ? deltaMetrics.previousTotal
        : previousMetricsSummary?.totalMetrics ?? null;
    const metricsDeltaValue =
      typeof deltaMetrics?.delta === 'number'
        ? deltaMetrics.delta
        : currentMetricsTotal != null && previousMetricsTotal != null
          ? currentMetricsTotal - previousMetricsTotal
          : null;
    const currentMetCriteria: string[] = Array.isArray(deltaCriteria?.currentMet) ? deltaCriteria.currentMet : [];
    const previousMetCriteria: string[] = Array.isArray(deltaCriteria?.previousMet) ? deltaCriteria.previousMet : [];
    const criteriaAdded: string[] = Array.isArray(deltaCriteria?.added) ? deltaCriteria.added : [];
    const criteriaRemoved: string[] = Array.isArray(deltaCriteria?.removed) ? deltaCriteria.removed : [];
    const criteriaDeltaValue =
      previousSnapshot || previousMetCriteria.length > 0
        ? currentMetCriteria.length - previousMetCriteria.length
        : currentMetCriteria.length;

    return (
      <div className="space-y-8 pt-6 pb-12">
        <section className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getPmLevelStatusColor(run.pm_levels_status)}>
              {run.pm_levels_status || 'unknown'}
            </Badge>
            {run.pm_levels_run_type && (
              <Badge variant="outline" className={getRunTypeBadgeColor(run.pm_levels_run_type)}>
                {formatRunTypeLabel(run.pm_levels_run_type)}
              </Badge>
            )}
            {run.pm_levels_level_changed && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800">Level change</Badge>
            )}
            {run.pm_levels_trigger_reason && (
              <span className="text-xs text-gray-600">Trigger: {run.pm_levels_trigger_reason}</span>
            )}
            <span className="text-xs text-gray-600">
              Latency: {((run.pm_levels_latency_ms ?? run.llm_analysis_latency_ms ?? 0) / 1000).toFixed(2)}s
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Session: {run.pm_levels_session_id || run.session_id || '—'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg border border-indigo-100 bg-white p-4 space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Current Level</div>
              <div className="text-xl font-semibold">{snapshot?.displayLevel || run.pm_levels_inferred_level || '—'}</div>
              <div className="text-xs text-gray-600">Confidence {formatConfidencePercent(currentConfidenceValue)}</div>
              {typeof snapshot?.scopeScore === 'number' && (
                <div className="text-xs text-gray-500">Scope score {snapshot.scopeScore.toFixed(2)}</div>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Previous Level</div>
              <div className="text-xl font-semibold">{previousSnapshot?.displayLevel || run.pm_levels_previous_level || '—'}</div>
              <div className="text-xs text-gray-600">Confidence {formatConfidencePercent(previousConfidenceValue)}</div>
              <div className="text-xs text-gray-500">Confidence Δ {confidenceDeltaLabel}</div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Since Last Run</h3>
            <Badge className={cn('text-xs', getStabilityBadgeColor(stabilityStatus))}>
              {formatStabilityLabel(stabilityStatus)}
            </Badge>
          </div>

          {previousSnapshot ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-white space-y-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Stories</div>
                  <div className="text-lg font-semibold">
                    {currentRelevantStories ?? '—'}
                    {renderDeltaPill(relevantDelta)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Previously: {previousRelevantStories ?? '—'}
                  </div>
                  {storyAdditions.length > 0 && (
                    <div className="text-xs text-emerald-600">
                      +{storyAdditions.length} new stor{storyAdditions.length === 1 ? 'y' : 'ies'}
                    </div>
                  )}
                  {storyRemovals.length > 0 && (
                    <div className="text-xs text-rose-600">
                      -{storyRemovals.length} stor{storyRemovals.length === 1 ? 'y' : 'ies'} removed
                    </div>
                  )}
                </div>
                <div className="border rounded-lg p-4 bg-white space-y-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Metrics</div>
                  <div className="text-lg font-semibold">
                    {currentMetricsTotal ?? '—'}
                    {renderDeltaPill(metricsDeltaValue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Previously: {previousMetricsTotal ?? '—'}
                  </div>
                </div>
                <div className="border rounded-lg p-4 bg-white space-y-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Criteria Met</div>
                  <div className="text-lg font-semibold">
                    {currentMetCriteria.length}
                    {renderDeltaPill(criteriaDeltaValue)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Total Criteria: {deltaCriteria?.totalCurrent ?? previousFrameworkSummary?.criteria?.length ?? frameworkSummary?.criteria?.length ?? '—'}
                  </div>
                </div>
              </div>

              {(storyAdditions.length > 0 || storyRemovals.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {storyAdditions.length > 0 && (
                    <div className="border rounded-lg bg-emerald-50 border-emerald-100 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-800">
                        New Stories ({storyAdditions.length})
                      </h4>
                      <ul className="space-y-1 text-sm text-emerald-900">
                        {storyAdditions.map((story: any, idx: number) => (
                          <li key={`added-${story?.id ?? idx}`}>
                            <span className="font-medium">{story?.title || 'Untitled story'}</span>
                            {story?.sourceRole && (
                              <span className="ml-1 text-xs text-emerald-700"> - {story.sourceRole}</span>
                            )}
                            {story?.sourceCompany && (
                              <span className="ml-1 text-xs text-emerald-700"> - {story.sourceCompany}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {storyRemovals.length > 0 && (
                    <div className="border rounded-lg bg-rose-50 border-rose-100 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-rose-800">
                        Stories No Longer Highlighted ({storyRemovals.length})
                      </h4>
                      <ul className="space-y-1 text-sm text-rose-900">
                        {storyRemovals.map((story: any, idx: number) => (
                          <li key={`removed-${story?.id ?? idx}`}>
                            <span className="font-medium">{story?.title || 'Untitled story'}</span>
                            {story?.sourceRole && (
                              <span className="ml-1 text-xs text-rose-700"> - {story.sourceRole}</span>
                            )}
                            {story?.sourceCompany && (
                              <span className="ml-1 text-xs text-rose-700"> - {story.sourceCompany}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {(criteriaAdded.length > 0 || criteriaRemoved.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criteriaAdded.length > 0 && (
                    <div className="border rounded-lg bg-emerald-50 border-emerald-100 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-emerald-800">
                        Newly Met Criteria ({criteriaAdded.length})
                      </h4>
                      <ul className="space-y-1 text-sm text-emerald-900">
                        {criteriaAdded.map((criterion, idx) => (
                          <li key={`criterion-added-${idx}`}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {criteriaRemoved.length > 0 && (
                    <div className="border rounded-lg bg-rose-50 border-rose-100 p-4 space-y-2">
                      <h4 className="text-sm font-semibold text-rose-800">
                        Criteria Requiring Attention ({criteriaRemoved.length})
                      </h4>
                      <ul className="space-y-1 text-sm text-rose-900">
                        {criteriaRemoved.map((criterion, idx) => (
                          <li key={`criterion-removed-${idx}`}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600">
              Baseline run captured. Future analyses will highlight evidence changes.
            </p>
          )}
        </section>

        {run.pm_levels_error && (
          <section className="border border-red-200 bg-red-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-800 mb-2">Run Error</h3>
            <p className="text-sm text-red-700">{run.pm_levels_error}</p>
          </section>
        )}

        <section className="space-y-4">
          <h3 className="text-lg font-semibold">Evidence Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Stories</div>
              <div className="text-2xl font-semibold">
                {storySummary?.relevant ?? '—'} <span className="text-sm text-gray-500">relevant</span>
              </div>
              <div className="text-xs text-gray-500">
                Total stories: {storySummary?.total ?? '—'}
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Experience</div>
              <div className="text-sm text-gray-700">
                {Array.isArray(resumeSummary?.roleTitles) && resumeSummary.roleTitles.length > 0
                  ? resumeSummary.roleTitles.join(', ')
                  : '—'}
              </div>
              <div className="text-xs text-gray-500">Duration: {resumeSummary?.duration || '—'}</div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50 space-y-1">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Framework</div>
              <div className="text-sm text-gray-700">
                Confidence %: {frameworkSummary?.confidencePercentage != null
                  ? `${Math.round(frameworkSummary.confidencePercentage)}%`
                  : '—'}
              </div>
              <div className="text-xs text-gray-500">
                Criteria met: {Array.isArray(frameworkSummary?.criteria) ? frameworkSummary.criteria.length : '—'}
              </div>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="text-xs text-gray-500 uppercase tracking-wide">Metrics</div>
              <div className="text-sm text-gray-700">
                Total metrics: {metricsSummary?.totalMetrics ?? '—'}
              </div>
              <div className="text-xs text-gray-500">
                Impact level: {metricsSummary?.impactLevel || '—'}
              </div>
            </div>
          </div>
        </section>

        {storyHighlights.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Story Highlights</h3>
              <span className="text-xs text-gray-500">Showing up to 5 stories</span>
            </div>
            <div className="space-y-2">
              {storyHighlights.map((story, idx) => (
                <div key={`${story.id ?? idx}`} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-800">{story.title || 'Untitled story'}</div>
                    {story.levelAssessment && (
                      <Badge variant="outline">{story.levelAssessment}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {story.sourceRole && <span>{story.sourceRole}</span>}
                    {story.sourceCompany && story.sourceRole && <span className="mx-1">•</span>}
                    {story.sourceCompany && <span>{story.sourceCompany}</span>}
                  </div>
                  {story.confidence && (
                    <div className="text-xs text-gray-500">Confidence: {story.confidence}</div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {Array.isArray(frameworkSummary?.criteria) && frameworkSummary.criteria.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Leveling Framework Criteria</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {frameworkSummary.criteria.map((item: any, idx: number) => (
                <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
              ))}
            </ul>
          </section>
        )}

        {recommendations.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Recommendations</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              {recommendations.slice(0, 5).map((rec: any, idx: number) => (
                <li key={idx}>{typeof rec === 'string' ? rec : rec?.title || JSON.stringify(rec)}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading evaluation data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header - Hide in admin view (admin page has its own header) */}
      {!isAdminView && (
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Evaluation Dashboard</h1>
          <div className="flex gap-2">
            <Button 
              onClick={() => window.open('/new-user', '_blank')} 
              size="sm"
              variant="secondary"
            >
              Test Upload
            </Button>
            <Button onClick={handleExport} size="sm">
              Export to CSV
            </Button>
          </div>
        </div>
      )}

      {/* User Type Filter */}
      <div className="flex gap-2">
        <Button 
          onClick={() => setUserTypeFilter('all')}
          size="sm"
          variant={userTypeFilter === 'all' ? 'default' : 'secondary'}
        >
          All Users ({evaluationRuns.length})
        </Button>
        <Button 
          onClick={() => setUserTypeFilter('synthetic')}
          size="sm"
          variant={userTypeFilter === 'synthetic' ? 'default' : 'secondary'}
        >
          Synthetic ({evaluationRuns.filter(r => r.user_type === 'synthetic').length})
        </Button>
        <Button 
          onClick={() => setUserTypeFilter('real')}
          size="sm"
          variant={userTypeFilter === 'real' ? 'default' : 'secondary'}
        >
          Real Users ({evaluationRuns.filter(r => r.user_type === 'real').length})
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEvaluations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">LLM Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLLM}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgPipeline}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Go Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.goRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Accuracy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracyRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">PM Level Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pmLevelRuns}</div>
            <div className="text-xs text-gray-500 mt-1">Success: {metrics.pmLevelSuccessRate}% · Change: {metrics.pmLevelChangeRate}%</div>
            {metrics.pmLevelLatestLevel && (
              <div className="text-xs text-gray-600 mt-1">
                Last: {metrics.pmLevelLatestLevel}
                {typeof metrics.pmLevelLatestConfidence === 'number' && (
                  <> · {(metrics.pmLevelLatestConfidence * 100).toFixed(0)}% confidence</>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Runs ({evaluationRuns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {evaluationRuns.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No evaluation data found.</p>
              <p className="text-sm mt-2">Upload some files to generate evaluation data.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Latency (LLM / Pipeline)</TableHead>
                  <TableHead>Go/No-Go</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Relevance</TableHead>
                  <TableHead>PM Level</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluationRuns.map((run, index) => {
                  const source = run.source_id ? sources.find(s => s.id === run.source_id) : undefined;
                  const isPmLevel = run.file_type === 'pm_level';
                  const displayFileName = isPmLevel
                    ? `PM Level${run.synthetic_profile_id ? ` (${run.synthetic_profile_id})` : ''}`
                    : source?.file_name || 'Unknown';
                  const modelLabel = isPmLevel ? 'pm-levels' : (run.model || '—');
                  return (
                    <TableRow 
                      key={run.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(run)}
                    >
                      <TableCell className="font-medium">#{evaluationRuns.length - index}</TableCell>
                      <TableCell className="text-sm">{displayFileName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{isPmLevel ? 'pm_level' : run.file_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={run.user_type === 'synthetic' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                        >
                          {run.user_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(run.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">{modelLabel}</TableCell>
                      <TableCell className="text-sm">
                        <div className="text-xs leading-tight">
                          <div>LLM: {((run.llm_analysis_latency_ms || 0) / 1000).toFixed(2)}s</div>
                          <div>Pipeline: {(!isPmLevel && (run.total_latency_ms || 0) > 0) ? ((run.total_latency_ms || 0) / 1000).toFixed(2) + 's' : '—'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEvaluationBadgeColor(run.go_nogo_decision)}>
                          {run.go_nogo_decision}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isPmLevel ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : (
                          <Badge variant="outline" className={getEvaluationBadgeColor(run.accuracy_score)}>
                            {run.accuracy_score}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isPmLevel ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : (
                          <Badge variant="outline" className={getEvaluationBadgeColor(run.relevance_score)}>
                            {run.relevance_score}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {run.pm_levels_status ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getPmLevelStatusColor(run.pm_levels_status)}>
                                {run.pm_levels_inferred_level || '—'}
                              </Badge>
                              <Badge variant="outline">
                                {formatConfidencePercent(run.pm_levels_confidence)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              {run.pm_levels_run_type && (
                                <Badge variant="outline" className={getRunTypeBadgeColor(run.pm_levels_run_type)}>
                                  {formatRunTypeLabel(run.pm_levels_run_type)}
                                </Badge>
                              )}
                              {run.pm_levels_level_changed ? (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800">Level change</Badge>
                              ) : null}
                              {run.pm_levels_trigger_reason && (
                                <span className="text-[11px] text-gray-500">{run.pm_levels_trigger_reason}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(run);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal for Detailed View */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={cn("max-w-7xl h-[90vh] p-0", flagModalOpen ? 'overflow-hidden' : 'overflow-y-auto')}>
          {/* Header section with 1.5rem padding */}
          <section className="p-6 pb-0">
            <div className="grid grid-cols-3 items-center gap-4 pr-10">
              <h2 className="text-lg font-semibold leading-tight tracking-tight truncate">
                {selectedRun?.file_type === 'pm_level'
                  ? `PM Level${selectedRun?.synthetic_profile_id ? ` (${selectedRun.synthetic_profile_id})` : ''}`
                  : selectedSource?.file_name || `Evaluation Details`}
              </h2>
              <div className="text-lg font-semibold leading-tight tracking-tight text-center truncate">{getHeaderUserText()}</div>
          {selectedRun && (
                <div className="text-lg font-semibold leading-tight tracking-tight whitespace-nowrap justify-self-end truncate">
                  {new Date(selectedRun.created_at).toLocaleString()}
                </div>
              )}
                </div>
          </section>
          
          <hr className="mx-6 border-gray-200" />
          
          {selectedRun && (
            <div className={cn('relative', flagModalOpen ? 'flex min-h-0 h-full' : '')}>
              {/* Left content */}
              <div className={cn('px-6 space-y-8', flagModalOpen ? 'flex-1 overflow-y-auto min-w-0' : '')}>
                {selectedRun.file_type === 'pm_level' ? (
                  renderPmLevelDetail(selectedRun)
                ) : (
                  <>

              {/* Meta Data */}
              <div className="grid grid-cols-3 gap-4 pt-6 pb-6">
                <div className="text-center space-y-0.5">
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="text-2xl font-bold">{selectedRun.file_type}</div>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="text-sm text-gray-600">Model</div>
                  <div className="text-2xl font-bold">{selectedRun.model}</div>
                </div>
                <div className="text-center space-y-0.5">
                  <div className="text-sm text-gray-600">Processing Speed</div>
                  <div className="text-2xl font-bold">{(((selectedRun.total_latency_ms ?? 0)) / 1000).toFixed(2)}s</div>
                </div>
              </div>

              <hr className="border-gray-200" />

              {selectedRun.pm_levels_status && (
                <>
                  <div className="bg-white border rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-600">PM Level Status</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={getPmLevelStatusColor(selectedRun.pm_levels_status)}>
                            {selectedRun.pm_levels_status}
                          </Badge>
                          {selectedRun.pm_levels_run_type && (
                            <Badge variant="outline" className={getRunTypeBadgeColor(selectedRun.pm_levels_run_type)}>
                              {formatRunTypeLabel(selectedRun.pm_levels_run_type)}
                            </Badge>
                          )}
                          {selectedRun.pm_levels_level_changed ? (
                            <Badge variant="outline" className="bg-amber-100 text-amber-800">Level change</Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm text-gray-600">Current Level</div>
                        <div className="text-2xl font-semibold">{selectedRun.pm_levels_inferred_level || '—'}</div>
                        <div className="text-xs text-gray-500">Confidence {formatConfidencePercent(selectedRun.pm_levels_confidence)}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium text-gray-700">Previous:</span>{' '}
                        {selectedRun.pm_levels_previous_level || '—'}{' '}
                        {selectedRun.pm_levels_previous_confidence != null && (
                          <span className="text-gray-500">({formatConfidencePercent(selectedRun.pm_levels_previous_confidence)})</span>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Trigger:</span>{' '}
                        {selectedRun.pm_levels_trigger_reason || '—'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Latency:</span>{' '}
                        {selectedRun.pm_levels_latency_ms != null ? `${(selectedRun.pm_levels_latency_ms / 1000).toFixed(2)}s` : '—'}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Session:</span>{' '}
                        {selectedRun.pm_levels_session_id || selectedRun.session_id || '—'}
                      </div>
                    </div>
                    {selectedRun.pm_levels_error && (
                      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                        {selectedRun.pm_levels_error}
                      </div>
                    )}
                    {selectedRun.pm_levels_delta && typeof selectedRun.pm_levels_delta === 'object' && (
                      <div className="text-xs text-gray-500">
                        <div>
                          Confidence Δ: {formatConfidencePercent((selectedRun.pm_levels_delta as any)?.confidenceDelta ?? null)}
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-200" />
                </>
              )}

              {/* LLM Judge Evaluation */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold">
                    LLM Judge Evaluation
                  </h3>
                  {selectedRun.evaluation_rationale && (
                    <Badge className={getEvaluationBadgeColor('✅')}>
                      {selectedRun.evaluation_rationale}
                    </Badge>
                  )}
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Go/No-Go</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.go_nogo_decision)}>
                      {selectedRun.go_nogo_decision}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Accuracy</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.accuracy_score)}>{selectedRun.accuracy_score}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Relevance</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.relevance_score)}>{selectedRun.relevance_score}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Personalization</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.personalization_score)}>{selectedRun.personalization_score}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Clarity & Tone</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.clarity_tone_score)}>{selectedRun.clarity_tone_score}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span>Framework</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.framework_score)}>{selectedRun.framework_score}</Badge>
                  </div>
                </div>
              </div>

              {/* Extracted Data Categories */}
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    Extracted Data Categories
                  </h3>
                  {selectedRun.heuristics?.dataCompleteness !== undefined && (
                    <Badge className={getEvaluationBadgeColor('✅')}>
                      {selectedRun.heuristics.dataCompleteness}% complete
                    </Badge>
                  )}
                  </div>
                  {(() => {
                    const available = getAvailableCategories();
                    const allOpen = available.length > 0 && available.every(c => expandedCategories.has(c));
                    return (
                      <button onClick={toggleExpandAll} className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400" disabled={available.length === 0}>
                        {allOpen ? 'Collapse All' : 'Expand All'}
                      </button>
                    );
                  })()}

                  {/* Contact Info - Cover letter placement (5th for CL order) */}
                  {selectedRun?.file_type === 'coverLetter' && (() => {
                    const contactInfo = selectedSource?.structured_data?.contactInfo || selectedSource?.structured_data?.contact_info || {};
                    // Exclude location and name from contactInfo count (they're separate fields)
                    const contactFields = Object.keys(contactInfo).filter(k => k !== 'location' && k !== 'name');
                    const hasEntries = contactFields.length > 0;
                    const isExpanded = expandedCategories.has('contactInfo');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('contactInfo')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Contact Info</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${contactFields.length} found` : 'None'}
                    </Badge>
                  </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="bg-white p-3 rounded border border-gray-200 space-y-2 relative">
                              <div className="absolute top-2 right-2">
                                <FlagButton
                                  dataPath={'contactInfo'}
                                  dataType={'contact_info'}
                                  hasFlags={getFlagsForPath('contactInfo').length > 0}
                                  flagCount={getFlagsForPath('contactInfo').length}
                                  onClick={() => handleFlagClick('contact_info', 'contactInfo', contactInfo)}
                                  size="sm"
                                />
                              </div>
                              <div className="pr-8">
                              {contactInfo.email && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Email: </span>
                                  <span className="text-gray-900">{contactInfo.email}</span>
                                </div>
                              )}
                              {contactInfo.phone && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Phone: </span>
                                  <span className="text-gray-900">{contactInfo.phone}</span>
                                </div>
                              )}
                              {contactInfo.linkedin && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">LinkedIn: </span>
                                  <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {contactInfo.linkedin}
                                  </a>
                                </div>
                              )}
                              {contactInfo.website && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Website: </span>
                                  <a href={contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {contactInfo.website}
                                  </a>
                                </div>
                              )}
                              {contactInfo.github && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">GitHub: </span>
                                  <a href={contactInfo.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {contactInfo.github}
                                  </a>
                                </div>
                              )}
                              {contactInfo.substack && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Substack: </span>
                                  <a href={contactInfo.substack} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {contactInfo.substack}
                                  </a>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No contact info extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Education - Cover letter placement (8th for CL order) */}
                  {selectedRun?.file_type === 'coverLetter' && (() => {
                    const education = selectedSource?.structured_data?.education || [];
                    const hasEntries = Array.isArray(education) && education.length > 0;
                    const isExpanded = expandedCategories.has('education');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('education')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Education</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${education.length} found` : 'None'}
                    </Badge>
                  </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 space-y-3 max-h-96 overflow-y-auto">
                            {education.map((entry: any, idx: number) => renderEducationEntry(entry, idx))}
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No education extracted</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                
                {/* Work Experience - Full-width (like cover letter stories) */}
                {selectedRun?.file_type !== 'coverLetter' && (() => {
                  const workHistory = selectedSource?.structured_data?.workHistory || selectedSource?.structured_data?.work_history || [];
                  const hasEntries = Array.isArray(workHistory) && workHistory.length > 0;
                  const isExpanded = expandedCategories.has('workHistory');
                  return (
                    <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''} md:col-span-3`}>
                      <div 
                        className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                        onClick={() => hasEntries && toggleCategory('workHistory')}
                      >
                        <div className="flex items-center gap-2">
                          {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                          <span>Work Experience</span>
                        </div>
                        <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                          {hasEntries ? `${workHistory.length} found` : 'None'}
                        </Badge>
                      </div>
                      {hasEntries && isExpanded && (
                        <div className="px-3 pb-3 space-y-4 max-h-96 overflow-y-auto">
                          {workHistory.map((entry: any, idx: number) => renderWorkHistoryEntry(entry, idx))}
                        </div>
                      )}
                      {!hasEntries && (
                        <div className="px-3 pb-3 text-xs text-gray-500">No work experience extracted</div>
                      )}
                    </div>
                  );
                })()}
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Education - Collapsible if has entries (hide for cover letters here; rendered at end for CL order) */}
                  {selectedRun?.file_type !== 'coverLetter' && (() => {
                    const education = selectedSource?.structured_data?.education || [];
                    const hasEntries = Array.isArray(education) && education.length > 0;
                    const isExpanded = expandedCategories.has('education');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('education')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Education</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${education.length} found` : 'None'}
                    </Badge>
                  </div>
                        {/* removed sub-count line to keep consistent labeling */}
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 space-y-3 max-h-96 overflow-y-auto">
                            {education.map((entry: any, idx: number) => renderEducationEntry(entry, idx))}
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No education extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Skills - Collapsible if has entries */}
                  {(() => {
                    // Check both skills array and skillsMentioned (for cover letters)
                    const skillsArray = selectedSource?.structured_data?.skills || [];
                    const skillsMentioned = selectedSource?.structured_data?.skillsMentioned || [];
                    
                    // Combine both sources - convert skillsMentioned strings to skill objects if needed
                    let allSkills: any[] = [];
                    
                    if (Array.isArray(skillsArray) && skillsArray.length > 0) {
                      allSkills = [...skillsArray];
                    }
                    
                    // Add skillsMentioned as simple strings if not already in skillsArray
                    if (Array.isArray(skillsMentioned) && skillsMentioned.length > 0) {
                      skillsMentioned.forEach((skill: string) => {
                        // Check if it's already in allSkills (avoid duplicates)
                        const exists = allSkills.some((s: any) => {
                          if (typeof s === 'string') return s === skill;
                          if (s.skill) return s.skill === skill;
                          if (s.items && Array.isArray(s.items)) return s.items.includes(skill);
                          return false;
                        });
                        if (!exists) {
                          allSkills.push(skill); // Add as simple string
                        }
                      });
                    }
                    
                    // Count individual skills, not category objects
                    let individualSkillCount = 0;
                    allSkills.forEach((skill: any) => {
                      if (typeof skill === 'string') {
                        individualSkillCount++;
                      } else if (skill.category && Array.isArray(skill.items)) {
                        individualSkillCount += skill.items.length;
                      } else if (skill.skill) {
                        individualSkillCount++;
                      }
                    });
                    
                    const hasEntries = individualSkillCount > 0;
                    const isExpanded = expandedCategories.has('skills');
                    
                    // Debug: log if heuristics say skills exist but we can't find them
                    if (selectedRun.heuristics?.hasSkills && !hasEntries) {
                      console.warn('Heuristics indicate skills present but none found in structured_data', {
                        skillsArrayLength: skillsArray.length,
                        skillsMentionedLength: skillsMentioned.length,
                        skillsArraySample: skillsArray[0],
                        skillsMentionedSample: skillsMentioned[0]
                      });
                    }
                    
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('skills')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Skills</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${individualSkillCount} found` : 'None'}
                    </Badge>
                  </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 max-h-96 overflow-y-auto">
                            {renderSkills(allSkills)}
                </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">
                            {selectedRun.heuristics?.hasSkills 
                              ? 'Heuristics indicate skills present but none found in structured data'
                              : 'No skills extracted'}
                </div>
                        )}
              </div>

                    );
                  })()}

                  {/* Contact Info - Collapsible if present (resume/LI early; CL rendered later to match order) */}
                  {selectedRun?.file_type !== 'coverLetter' && (() => {
                    const contactInfo = selectedSource?.structured_data?.contactInfo || selectedSource?.structured_data?.contact_info || {};
                    const hasEntries = Object.keys(contactInfo).length > 0;
                    const isExpanded = expandedCategories.has('contactInfo');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('contactInfo')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Contact Info</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${Object.keys(contactInfo).length} found` : 'None'}
                          </Badge>
                  </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="bg-white p-3 rounded border border-gray-200 space-y-2 relative">
                              <div className="absolute top-2 right-2">
                                <FlagButton
                                  dataPath={'contactInfo'}
                                  dataType={'contact_info'}
                                  hasFlags={getFlagsForPath('contactInfo').length > 0}
                                  flagCount={getFlagsForPath('contactInfo').length}
                                  onClick={() => handleFlagClick('contact_info', 'contactInfo', contactInfo)}
                                  size="sm"
                                />
                              </div>
                              <div className="pr-8">
                              {contactInfo.name && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Name: </span>
                                  <span className="text-gray-900">{contactInfo.name}</span>
                </div>
                              )}
                              {contactInfo.email && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Email: </span>
                                  <span className="text-gray-900">{contactInfo.email}</span>
                </div>
                              )}
                              {contactInfo.phone && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Phone: </span>
                                  <span className="text-gray-900">{contactInfo.phone}</span>
              </div>
                              )}
                              {contactInfo.location && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">Location: </span>
                                  <span className="text-gray-900">{contactInfo.location}</span>
                                </div>
                              )}
                              {contactInfo.linkedin && (
                                <div className="text-sm">
                                  <span className="font-medium text-gray-600">LinkedIn: </span>
                                  <a href={contactInfo.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {contactInfo.linkedin}
                                  </a>
                                </div>
                              )}
                              </div>
                            </div>
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No contact info extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Cover Letter Stories - Collapsible if has entries (1st for CL order) */}
                  {selectedRun?.file_type === 'coverLetter' && (() => {
                    const stories = selectedSource?.structured_data?.stories || [];
                    const hasEntries = Array.isArray(stories) && stories.length > 0;
                    const isExpanded = expandedCategories.has('stories');
                    
                    // For cover letters, stories are always "orphan" (not linked to work history)
                    // But we can categorize by whether they have company/role context
                    const storiesWithContext: any[] = [];
                    const storiesWithoutContext: any[] = [];
                    
                    stories.forEach((story: any) => {
                      // Story has context if it mentions company or titleRole
                      const hasContext = !!(story.company || story.titleRole);
                      if (hasContext) {
                        storiesWithContext.push(story);
                      } else {
                        storiesWithoutContext.push(story);
                      }
                    });
                    
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''} md:col-span-3`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('stories')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Stories</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${stories.length} found` : 'None'}
                          </Badge>
                        </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 space-y-4 max-h-96 overflow-y-auto">
                            {storiesWithContext.length > 0 && (
                <div>
                                <div className="text-xs font-medium text-gray-600 mb-2">Stories with Company/Role Context ({storiesWithContext.length})</div>
                                {storiesWithContext.map((story: any, idx: number) => {
                                  const storyIndex = stories.findIndex((s: any) => s === story);
                                  const storyPath = storyIndex >= 0 ? `stories[${storyIndex}]` : `storiesWithContext[${idx}]`;
                                  const storyFlags = getFlagsForPath(storyPath);
                                  return (
                                  <div key={idx} className="bg-white p-3 rounded border border-blue-200 border-l-4 mb-2 relative">
                                    <div className="absolute top-2 right-2">
                                      <FlagButton
                                        dataPath={storyPath}
                                        dataType="story"
                                        hasFlags={storyFlags.length > 0}
                                        flagCount={storyFlags.length}
                                        onClick={() => handleFlagClick('story', storyPath, story)}
                                        size="sm"
                                      />
                      </div>
                                    <div className="pr-8">
                                      {(story.company || story.titleRole) && (
                                        <div className="text-xs text-gray-600 mb-0.5">
                                          {story.company && story.titleRole ? `${story.company}: ${story.titleRole}` : (story.company || story.titleRole)}
                    </div>
                                      )}
                                      <div className="font-medium text-sm text-gray-900">{story.title || story.id}</div>
                                      {story.summary && (
                                        <div className="text-sm text-gray-700 mt-1">{story.summary}</div>
                                      )}
                                      {story.content && (
                                        <div className="text-xs text-gray-600 mt-1">{story.content}</div>
                                      )}
                                      {story.star && (
                                        <div className="mt-2 space-y-1 text-xs">
                                          {story.star.situation && (
                                            <div><span className="font-medium">Situation: </span>{story.star.situation}</div>
                                          )}
                                          {story.star.task && (
                                            <div><span className="font-medium">Task: </span>{story.star.task}</div>
                                          )}
                                          {story.star.action && (
                                            <div><span className="font-medium">Action: </span>{story.star.action}</div>
                                          )}
                                          {story.star.result && (
                                            <div><span className="font-medium">Result: </span>{story.star.result}</div>
                                          )}
                                        </div>
                                      )}
                                      {story.metrics && story.metrics.length > 0 && (
                                        <div className="mt-2">
                                          <div className="text-[11px] font-medium text-gray-600 mb-1">Metrics</div>
                                          <div className="flex flex-wrap gap-1">
                                            {story.metrics.map((m: any, mIdx: number) => {
                                              const metricPath = `${storyPath}.metrics[${mIdx}]`;
                                              const metricFlags = getFlagsForPath(metricPath);
                                              return (
                                                <span key={mIdx} className="relative inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                  {m.value}{m.unit} {m.name}
                                                  <FlagButton
                                                    dataPath={metricPath}
                                                    dataType="metric"
                                                    hasFlags={metricFlags.length > 0}
                                                    flagCount={metricFlags.length}
                                                    onClick={() => handleFlagClick('metric', metricPath, m)}
                                                    size="sm"
                                                  />
                                                </span>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                      {story.tags && (story.tags.skills || story.tags.functions || story.tags.domains) && (
                                        <div className="mt-2">
                                          <div className="text-[11px] font-medium text-gray-600 mb-1">Tags</div>
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {[...(story.tags.skills || []), ...(story.tags.functions || []), ...(story.tags.domains || [])].map((tag: string, tIdx: number) => {
                                              const tagPath = `${storyPath}.tags[${tIdx}]`;
                                              const tagFlags = getFlagsForPath(tagPath);
                                              return (
                                                <span key={tIdx} className="relative inline-flex items-center gap-1">
                                                  <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                                                    {tag}
                                                  </Badge>
                                                  <FlagButton
                                                    dataPath={tagPath}
                                                    dataType={'tag'}
                                                    hasFlags={tagFlags.length > 0}
                                                    flagCount={tagFlags.length}
                                                    onClick={() => handleFlagClick('tag', tagPath, tag)}
                                                    size="sm"
                                                  />
                                                </span>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )})}
                              </div>
                            )}
                            {storiesWithoutContext.length > 0 && (
                    <div>
                                <div className="text-xs font-medium text-gray-600 mb-2">Stories without Company/Role Context ({storiesWithoutContext.length})</div>
                                {storiesWithoutContext.map((story: any, idx: number) => {
                                  const storyIndex = stories.findIndex((s: any) => s === story);
                                  const storyPath = storyIndex >= 0 ? `stories[${storyIndex}]` : `storiesWithoutContext[${idx}]`;
                                  const storyFlags = getFlagsForPath(storyPath);
                                  return (
                                  <div key={idx} className="bg-white p-3 rounded border border-gray-200 border-l-4 mb-2 relative">
                                    <div className="absolute top-2 right-2">
                                      <FlagButton
                                        dataPath={storyPath}
                                        dataType="story"
                                        hasFlags={storyFlags.length > 0}
                                        flagCount={storyFlags.length}
                                        onClick={() => handleFlagClick('story', storyPath, story)}
                                        size="sm"
                                      />
                      </div>
                                    <div className="pr-8">
                                      <div className="font-medium text-sm text-gray-900">{story.title || story.id}</div>
                                      {story.summary && (
                                        <div className="text-sm text-gray-700 mt-1">{story.summary}</div>
                                      )}
                                      {story.content && (
                                        <div className="text-xs text-gray-600 mt-1">{story.content}</div>
                                      )}
                                      {story.star && (
                                        <div className="mt-2 space-y-1 text-xs">
                                          {story.star.situation && (
                                            <div><span className="font-medium">Situation: </span>{story.star.situation}</div>
                                          )}
                                          {story.star.task && (
                                            <div><span className="font-medium">Task: </span>{story.star.task}</div>
                                          )}
                                          {story.star.action && (
                                            <div><span className="font-medium">Action: </span>{story.star.action}</div>
                                          )}
                                          {story.star.result && (
                                            <div><span className="font-medium">Result: </span>{story.star.result}</div>
                                          )}
                    </div>
                                      )}
                                      {story.metrics && story.metrics.length > 0 && (
                                        <div className="mt-2">
                                          <div className="text-[11px] font-medium text-gray-600 mb-1">Metrics</div>
                                          <div className="flex flex-wrap gap-1">
                                            {story.metrics.map((m: any, mIdx: number) => {
                                              const metricPath = `${storyPath}.metrics[${mIdx}]`;
                                              const metricFlags = getFlagsForPath(metricPath);
                                              return (
                                                <span key={mIdx} className="relative inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                                  {m.value}{m.unit} {m.name}
                                                  <FlagButton
                                                    dataPath={metricPath}
                                                    dataType="metric"
                                                    hasFlags={metricFlags.length > 0}
                                                    flagCount={metricFlags.length}
                                                    onClick={() => handleFlagClick('metric', metricPath, m)}
                                                    size="sm"
                                                  />
                                                </span>
                                              )
                                            })}
                  </div>
                </div>
              )}
                                      {story.tags && (story.tags.skills || story.tags.functions || story.tags.domains) && (
                                        <div className="mt-2">
                                          <div className="text-[11px] font-medium text-gray-600 mb-1">Tags</div>
                                          <div className="mt-1 flex flex-wrap gap-1">
                                            {[...(story.tags.skills || []), ...(story.tags.functions || []), ...(story.tags.domains || [])].map((tag: string, tIdx: number) => (
                                              <Badge key={tIdx} variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                                                {tag}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )})}
                              </div>
                            )}
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No stories extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Location - Show for all file types (4th for CL order) */}
                  {(() => {
                    const sd = selectedSource?.structured_data || {};
                    const location = sd.location || (sd.contactInfo?.location || sd.contact_info?.location); // Support both top-level and legacy location
                    const hasLocation = !!location;
                    const locationPath = sd.location ? 'location' : 'contactInfo.location'; // Use correct path
                    const locationFlags = getFlagsForPath(locationPath);
                    return (
                      <div className="bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between p-3">
                          <span>Location</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getEvaluationBadgeColor(hasLocation ? '✅' : '❌')}>
                              {hasLocation ? '1 found' : 'None'}
                            </Badge>
                            <FlagButton
                              dataPath={locationPath}
                              dataType="location"
                              hasFlags={locationFlags.length > 0}
                              flagCount={locationFlags.length}
                              onClick={() => handleFlagClick('location', locationPath, location)}
                              size="sm"
                            />
                          </div>
                        </div>
                        {hasLocation && (
                          <div className="px-3 pb-3">
                            <div className="text-sm text-gray-900">{location}</div>
                          </div>
                        )}
                        {!hasLocation && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No location extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Company Names - Collapsible if has entries (7th for CL order) */}
                  {(() => {
                    const workHistory = selectedSource?.structured_data?.workHistory || selectedSource?.structured_data?.work_history || [];
                    const stories = selectedSource?.structured_data?.stories || [];
                    
                    // Extract companies from work history entries (resume/LinkedIn only)
                    const companiesFromWorkHistory = workHistory
                      .map((entry: any) => {
                        // Try multiple field name variations
                        return entry.company || 
                               entry.companyDisplay || 
                               entry.companyCanonical || 
                               entry.company_name ||
                               entry.organization ||
                               entry.employer ||
                               null;
                      })
                      .filter((name: any) => name && String(name).trim().length > 0);
                    
                    // Extract companies from cover letter stories
                    const companiesFromStories = stories
                      .map((story: any) => story.company || null)
                      .filter((name: any) => name && String(name).trim().length > 0);
                    
                    // Combine all companies
                    const allCompanies = [...companiesFromWorkHistory, ...companiesFromStories];
                    const uniqueCompanies = [...new Set(allCompanies)];
                    const hasEntries = uniqueCompanies.length > 0;
                    const isExpanded = expandedCategories.has('companyNames');
                    
                    // Debug: log if data exists but no companies found
                    if ((workHistory.length > 0 || stories.length > 0) && !hasEntries) {
                      console.warn('Data exists but no company names found.', {
                        workHistoryLength: workHistory.length,
                        storiesLength: stories.length,
                        sampleWorkHistory: workHistory[0],
                        sampleStory: stories[0]
                      });
                    }
                    
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('companyNames')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Company Names</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${uniqueCompanies.length} found` : 'None'}
                          </Badge>
                        </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="flex flex-wrap gap-2">
                              {uniqueCompanies.map((company: string, idx: number) => {
                                const path = `companyNames[${idx}]`;
                                const cFlags = getFlagsForPath(path);
                                return (
                                  <span key={idx} className="relative inline-flex items-center gap-1">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {company}
                                    </Badge>
                                    <FlagButton
                                      dataPath={path}
                                      dataType={'company'}
                                      hasFlags={cFlags.length > 0}
                                      flagCount={cFlags.length}
                                      onClick={() => handleFlagClick('company', path, company)}
                                      size="sm"
                                    />
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">
                            {workHistory.length > 0 
                              ? `Work history exists (${workHistory.length} entries) but no company names found`
                              : 'No company names extracted'}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Job Titles - Collapsible if has entries (6th for CL order) */}
                  {(() => {
                    const workHistory = selectedSource?.structured_data?.workHistory || selectedSource?.structured_data?.work_history || [];
                    const stories = selectedSource?.structured_data?.stories || [];
                    
                    // Extract job titles from work history entries (resume/LinkedIn format)
                    const titlesFromWorkHistory = workHistory
                      .map((entry: any) => entry.title || entry.titleDisplay || entry.titleCanonical || entry.role || entry.position)
                      .filter(Boolean);
                    
                    // Extract job titles from cover letter stories
                    const titlesFromStories = stories
                      .map((story: any) => story.titleRole || story.position)
                      .filter(Boolean);
                    
                    // Combine all titles
                    const allTitles = [...titlesFromWorkHistory, ...titlesFromStories];
                    const uniqueTitles = [...new Set(allTitles)];
                    const hasEntries = uniqueTitles.length > 0;
                    const isExpanded = expandedCategories.has('jobTitles');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('jobTitles')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Job Titles</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${uniqueTitles.length} found` : 'None'}
                          </Badge>
                        </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3">
                            <div className="flex flex-wrap gap-2">
                              {uniqueTitles.map((title: string, idx: number) => {
                                const path = `jobTitles[${idx}]`;
                                const tFlags = getFlagsForPath(path);
                                return (
                                  <span key={idx} className="relative inline-flex items-center gap-1">
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      {title}
                                    </Badge>
                                    <FlagButton
                                      dataPath={path}
                                      dataType={'title'}
                                      hasFlags={tFlags.length > 0}
                                      flagCount={tFlags.length}
                                      onClick={() => handleFlagClick('title', path, title)}
                                      size="sm"
                                    />
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No job titles extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Work Items summary removed as redundant */}

                </div>
              </div>

              {/* Details */}
              <h3 className="text-lg font-semibold">Details</h3>
              {/* Input vs Output Comparison */}
              {selectedSource && (
                <div>
                  <h4 className="font-medium text-lg mb-3">Input vs Output Comparison</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-sm text-gray-600">Input Text (Full)</h5>
                        {rawFileUrl && (
                          <a
                            href={rawFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            View Raw File
                          </a>
                        )}
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap">{selectedSource.raw_text}</pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-2">LLM Output (Full)</h5>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(selectedSource.structured_data, null, 2)}
                    </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Performance Metrics removed as redundant */}

              {/* Heuristics removed; combined above */}
                  </>
                )}
              </div>

              {/* Right drawer */}
              {flagModalOpen && flaggingItem && (
                <FlagModal
                  isOpen={flagModalOpen}
                  onClose={() => { setFlagModalOpen(false); setFlaggingItem(null) }}
                  onSubmit={handleFlagSubmit}
                  dataType={flaggingItem.dataType}
                  dataPath={flaggingItem.dataPath}
                  dataSnapshot={flaggingItem.dataSnapshot}
                  existingFlags={getFlagsForPath(flaggingItem.dataPath)}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};