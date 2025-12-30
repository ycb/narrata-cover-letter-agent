import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Users, 
  LayoutTemplate, 
  Mail,
  CheckCircle,
  FileText,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { ContentItemWithGaps, GapSummary } from '@/services/gapDetectionService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { StreamingProgress } from '@/components/shared/StreamingProgress';
import { useStreamingProgress } from '@/hooks/useStreamingProgress';
import type { StreamingLifecycleStatus } from '@/hooks/useStreamingProgress';

interface ContentQualityWidgetProps {
  gapSummary: GapSummary | null;
  contentItems: ContentItemWithGaps[];
  isLoading?: boolean;
  initialContentTypeFilter?: ContentTypeFilter;
  initialSeverityFilter?: SeverityFilter;
  onFilterChange?: (contentType: ContentTypeFilter, severity: SeverityFilter) => void;
}

export type ContentTypeFilter = 'all' | 'workHistory' | 'savedSections' | 'coverLetters';
export type SeverityFilter = 'all' | 'high' | 'medium' | 'low';

export interface ContentQualityWidgetRef {
  scrollIntoView: (offsetPx?: number) => void;
}

type ContentQualityProgressEvent = {
  stage: string;
  message?: string;
  progress?: number;
  tone?: 'info' | 'success' | 'warning' | 'error';
};

const SEVERITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive',
    triangleColor: 'fill-destructive',
  },
  medium: {
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning',
    triangleColor: 'fill-warning',
  },
  low: {
    icon: AlertTriangle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    triangleColor: 'fill-muted-foreground',
  },
};

const CONTENT_TYPE_CONFIG = {
  role_summary: {
    label: 'Role Summary',
    icon: Users,
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  },
  role_metrics: {
    label: 'Metrics',
    icon: BarChart3,
    color: 'bg-green-500/20 text-green-500 border-green-500/30',
  },
  story: {
    label: 'Story',
    icon: FileText,
    color: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  },
  cover_letter_section: {
    label: 'Section',
    icon: BookOpen,
    color: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  },
};

export const ContentQualityWidget = React.forwardRef<ContentQualityWidgetRef, ContentQualityWidgetProps>(({ 
  gapSummary, 
  contentItems, 
  isLoading,
  initialContentTypeFilter = 'all',
  initialSeverityFilter = 'all',
  onFilterChange
}, ref) => {
  const navigate = useNavigate();
  const widgetRef = useRef<HTMLDivElement>(null);
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>(initialContentTypeFilter);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>(initialSeverityFilter);
  const [sortField, setSortField] = useState<'company' | 'role' | 'title' | 'type' | 'severity'>('company');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const streamingStepDefinitions = React.useMemo(() => ([
    { id: 'context', label: 'Resolve persona context' },
    { id: 'collect', label: 'Collect content gaps' },
    { id: 'hydrate', label: 'Enrich content details' },
    { id: 'summarize', label: 'Summarize insights' },
  ]), []);
  const {
    steps: streamingSteps,
    reset: resetStreaming,
    setStepStatus: setStreamingStepStatus,
    setStepProgress: setStreamingStepProgress,
    setStepDetail: setStreamingStepDetail,
  } = useStreamingProgress({ steps: streamingStepDefinitions, autoResolveSteps: false });
  const [streamLifecycle, setStreamLifecycle] = React.useState<StreamingLifecycleStatus>('idle');
  
  // Update internal state when external props change
  React.useEffect(() => {
    setContentTypeFilter(initialContentTypeFilter);
  }, [initialContentTypeFilter]);
  
  React.useEffect(() => {
    setSeverityFilter(initialSeverityFilter);
  }, [initialSeverityFilter]);
  
  // Helper to scroll element into view accounting for sticky header
  const scrollToWithOffset = (el: HTMLElement, offset: number = 96) => {
    const rect = el.getBoundingClientRect();
    const y = rect.top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  // Expose scroll function via ref (uses offset so tabs stay visible)
  React.useImperativeHandle(ref, () => ({
    scrollIntoView: (offsetPx?: number) => {
      if (widgetRef.current) {
        scrollToWithOffset(widgetRef.current, offsetPx ?? 96);
      }
    }
  }), []);

  React.useEffect(() => {
    const handleProgress = (event: Event) => {
      const detail = (event as CustomEvent<ContentQualityProgressEvent>).detail;
      if (!detail) return;

      const updateStep = (id: string) => {
        if (typeof detail.progress === 'number') {
          setStreamingStepProgress(id, detail.progress);
        }
        if (detail.message) {
          setStreamingStepDetail(id, detail.message);
        }
      };

      switch (detail.stage) {
        case 'initialize': {
          resetStreaming();
          setStreamLifecycle('streaming');
          setStreamingStepStatus('context', 'running', detail.message);
          updateStep('context');
          break;
        }
        case 'collect-gaps': {
          setStreamingStepStatus('context', 'success');
          setStreamingStepProgress('context', 1);
          setStreamingStepStatus('collect', 'running', detail.message);
          updateStep('collect');
          break;
        }
        case 'hydrate-content': {
          setStreamingStepStatus('collect', 'success');
          setStreamingStepProgress('collect', 1);
          setStreamingStepStatus('hydrate', 'running', detail.message);
          updateStep('hydrate');
          break;
        }
        case 'summarize': {
          setStreamingStepStatus('hydrate', 'success');
          setStreamingStepProgress('hydrate', 1);
          setStreamingStepStatus('summarize', 'running', detail.message);
          updateStep('summarize');
          break;
        }
        case 'complete': {
          setStreamingStepStatus('summarize', 'success', detail.message);
          setStreamingStepProgress('summarize', 1);
          if (detail.message) {
            setStreamingStepDetail('summarize', detail.message);
          }
          setStreamLifecycle('complete');
          break;
        }
        case 'error': {
          setStreamLifecycle('error');
          setStreamingStepStatus('summarize', 'error', detail.message || 'Failed to load content quality');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('content-quality:progress', handleProgress as EventListener);

    return () => {
      window.removeEventListener('content-quality:progress', handleProgress as EventListener);
    };
  }, [resetStreaming, setStreamingStepDetail, setStreamingStepProgress, setStreamingStepStatus]);
  
  // Notify parent of filter changes
  const handleContentTypeChange = (value: ContentTypeFilter) => {
    setContentTypeFilter(value);
    onFilterChange?.(value, severityFilter);
  };
  
  const handleSeverityChange = (value: SeverityFilter) => {
    setSeverityFilter(value);
    onFilterChange?.(contentTypeFilter, value);
  };

  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>Content Quality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <StreamingProgress
            steps={streamingSteps}
            status={streamLifecycle}
            showTimeline={false}
          />
          {streamLifecycle === 'idle' && (
            <div className="text-sm text-muted-foreground">
              Preparing content quality insights...
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!gapSummary || gapSummary.total === 0) {
    return (
      <Card className="shadow-soft border-success/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Content Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/30">
            <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-success">All content looks great!</div>
              <div className="text-sm text-muted-foreground mt-1">
                You've addressed all identified gaps in your content.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter items by content type
  const filteredByType = contentTypeFilter === 'all'
    ? contentItems
    : contentTypeFilter === 'workHistory'
    ? contentItems.filter(item => item.content_type_label === 'Work History')
    : contentTypeFilter === 'savedSections'
    ? contentItems.filter(item => item.content_type_label === 'Cover Letter Saved Sections')
    : contentItems; // coverLetters would be filtered here when implemented

  // Filter by severity
  const filteredItems = severityFilter === 'all'
    ? filteredByType
    : filteredByType.filter(item => item.max_severity === severityFilter);

  // Count items by content type
  const workHistoryCount = contentItems.filter(item => item.content_type_label === 'Work History').length;
  const savedSectionsCount = contentItems.filter(item => item.content_type_label === 'Cover Letter Saved Sections').length;
  const coverLettersCount = 0; // Future: cover letters count

  // Count items by severity
  const severityCounts = {
    high: contentItems.filter(item => item.max_severity === 'high').length,
    medium: contentItems.filter(item => item.max_severity === 'medium').length,
    low: contentItems.filter(item => item.max_severity === 'low').length,
  };

  const handleReview = (item: ContentItemWithGaps) => {
    // Derive route deterministically to avoid stale/mismatched params
    let path = '/';
    const params = new URLSearchParams();
    if (item.entity_type === 'work_item') {
      path = '/work-history';
      params.set('roleId', item.entity_id);
      // If the row is metrics-specific, pass section for scroll
      if ((item as any).item_type === 'role_metrics') {
        params.set('section', 'metrics');
      }
    } else if (item.entity_type === 'approved_content') {
      // Stories should link to the correct role in Work History, Stories tab, and target story
      path = '/work-history';
      // When building ContentItemWithGaps for stories, we set navigation_params with roleId and storyId
      const roleId = (item as any).navigation_params?.roleId || (item as any).role_id;
      if (roleId) params.set('roleId', roleId);
      params.set('tab', 'stories');
      params.set('storyId', item.entity_id);
    } else {
      // saved_section
      path = '/saved-sections';
      params.set('sectionId', item.entity_id);
    }
    navigate(`${path}?${params.toString()}`);
  };

  const getContentTypeConfig = (item: ContentItemWithGaps) => {
    return CONTENT_TYPE_CONFIG[item.item_type || 'story'];
  };

  // Sorting
  const sortedItems = [...filteredItems].sort((a, b) => {
    const aCompany = (a.company_name || '').toLowerCase();
    const bCompany = (b.company_name || '').toLowerCase();
    const aRole = (a.role_title || '').toLowerCase();
    const bRole = (b.role_title || '').toLowerCase();
    const aTitle = (a.story_title || a.section_title || a.display_title || '').toLowerCase();
    const bTitle = (b.story_title || b.section_title || b.display_title || '').toLowerCase();
    const aType = (CONTENT_TYPE_CONFIG[a.item_type || 'story']?.label || '').toLowerCase();
    const bType = (CONTENT_TYPE_CONFIG[b.item_type || 'story']?.label || '').toLowerCase();
    const rank = (s: 'high'|'medium'|'low') => (s==='high'?3:s==='medium'?2:1);
    let cmp = 0;
    if (sortField === 'company') cmp = aCompany.localeCompare(bCompany);
    else if (sortField === 'role') cmp = aRole.localeCompare(bRole);
    else if (sortField === 'title') cmp = aTitle.localeCompare(bTitle);
    else if (sortField === 'type') cmp = aType.localeCompare(bType);
    else cmp = rank(a.max_severity) - rank(b.max_severity);
    return sortDirection === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (field: 'company' | 'role' | 'title' | 'type' | 'severity') => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  return (
    <Card ref={widgetRef} className="shadow-soft overflow-visible border-0 bg-gradient-to-br from-slate-50 to-blue-50" style={{ scrollMarginTop: 140 }}>
      <style>{`
        .solid-color-tabs {
          position: relative;
        }
        
        /* Remove all default borders from TabsList */
        .solid-color-tabs [role="tablist"] {
          border: none;
          background: transparent;
          display: flex;
          gap: 0.5rem;
          padding: 0;
          margin: 0;
        }
        
        /* Override default TabsTrigger styles */
        .solid-color-tabs button[role="tab"] {
          border: none;
          border-bottom: none;
          font-size: 1.25rem;
        }
        
        /* Inactive tabs - transparent background to show page gradient */
        .solid-color-tabs button[role="tab"][data-state="inactive"] {
          background: transparent;
          color: hsl(var(--muted-foreground));
          border-radius: calc(var(--radius) * 0.75) calc(var(--radius) * 0.75) 0 0;
          padding: 0.75em 1.5em;
          font-weight: 500;
          font-family: inherit;
          transition: all 0.2s;
          border: none;
        }
        
        /* Pink for hover on inactive tabs */
        .solid-color-tabs button[role="tab"][data-state="inactive"]:hover {
          color: hsl(330 85% 60%);
          background: transparent;
        }
        
        /* Active tab - Selection State: Bold + Highlight + Lines */
        .solid-color-tabs button[role="tab"][data-state="active"] {
          background: hsl(var(--card));
          color: hsl(var(--accent));
          border-radius: calc(var(--radius) * 0.75) calc(var(--radius) * 0.75) 0 0;
          padding: 0.75em 1.5em;
          font-weight: 700;
          font-family: inherit;
          position: relative;
          z-index: 10;
          border: none;
        }
        
        /* Remove underline from the button itself and all children */
        .solid-color-tabs button[role="tab"][data-state="active"] {
          text-decoration: none;
        }
        
        .solid-color-tabs button[role="tab"][data-state="active"] *,
        .solid-color-tabs button[role="tab"][data-state="active"] [class*="badge"] {
          text-decoration: none !important;
        }
        
        /* Underline only the tab text span */
        .solid-color-tabs button[role="tab"][data-state="active"] .tab-text {
          text-decoration: underline;
          text-decoration-color: hsl(var(--accent));
          text-decoration-thickness: 3px;
          text-underline-offset: 0.5em;
          display: inline;
        }
        
        /* Ensure badges are not underlined and have proper font size */
        .solid-color-tabs button[role="tab"] [class*="badge"],
        .solid-color-tabs button[role="tab"] span[class*="badge"] {
          text-decoration: none !important;
          font-size: 1rem;
          display: inline-block;
          /* Force white badge backgrounds in tabs for contrast */
          background: white !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
        
        /* Content area - white/card background matching active tab */
        .solid-color-tabs-content {
          background: hsl(var(--card));
          border: none;
          border-radius: 0 0 var(--radius) var(--radius);
          margin-top: 0;
        }
        
        /* Focus ring styling for accessibility */
        .solid-color-tabs [role="tab"]:focus-visible {
          outline: 2px solid hsl(var(--accent));
          outline-offset: 2px;
        }
      `}</style>
      
      <div className="relative mt-4 solid-color-tabs">
        <Tabs value={contentTypeFilter} onValueChange={(v) => handleContentTypeChange(v as ContentTypeFilter)}>
          <TabsList className="w-full p-0 h-auto -mt-4 border-0 bg-transparent">
            <TabsTrigger value="all" className="rounded-t-lg rounded-b-none border-0">
              <span className="tab-text">All Gaps</span> {contentItems.length > 0 && <Badge variant="outline" className="ml-1.5 no-underline">{contentItems.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="workHistory" className="rounded-t-lg rounded-b-none border-0">
              <span className="tab-text">Work History</span> {workHistoryCount > 0 && <Badge variant="outline" className="ml-1.5 no-underline">{workHistoryCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="savedSections" className="rounded-t-lg rounded-b-none border-0">
              <span className="tab-text">Saved Sections</span> {savedSectionsCount > 0 && <Badge variant="outline" className="ml-1.5 no-underline">{savedSectionsCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger 
              value="coverLetters" 
              disabled={coverLettersCount === 0}
              className="rounded-t-lg rounded-b-none border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="tab-text">Cover Letters</span> {coverLettersCount > 0 && <Badge variant="outline" className="ml-1.5 no-underline">{coverLettersCount}</Badge>}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <CardContent className="space-y-4 pt-6 solid-color-tabs-content">
        {/* Bottom Tier: Severity Buttons */}
        <div className="flex items-center justify-center gap-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Severity:</span>
          <div className="flex gap-2">
              <Button
                variant={severityFilter === 'all' ? 'default' : 'secondary'}
                size="sm"
                onClick={() => handleSeverityChange('all')}
                className={cn(
                  severityFilter === 'all' && "bg-primary text-primary-foreground"
                )}
              >
                All
                {filteredByType.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {filteredByType.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSeverityChange('high')}
                className={cn(
                  "flex items-center gap-2",
                  severityFilter === 'high' 
                    ? "bg-destructive text-destructive-foreground border-destructive" 
                    : "border-destructive/30 text-destructive hover:bg-destructive/10"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                High
                {severityCounts.high > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-destructive/20 text-destructive border-destructive/30">
                    {severityCounts.high}
                  </Badge>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSeverityChange('medium')}
                className={cn(
                  "flex items-center gap-2",
                  severityFilter === 'medium' 
                    ? "bg-warning text-warning-foreground border-warning" 
                    : "border-warning/30 text-warning hover:bg-warning/10"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                Medium
                {severityCounts.medium > 0 && (
                  <Badge variant="secondary" className="ml-1 bg-warning/20 text-warning border-warning/30">
                    {severityCounts.medium}
                  </Badge>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSeverityChange('low')}
                className={cn(
                  "flex items-center gap-2",
                  severityFilter === 'low' 
                    ? "bg-muted text-muted-foreground border-muted" 
                    : "border-muted text-muted-foreground hover:bg-muted/50"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                Low
                {severityCounts.low > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {severityCounts.low}
                  </Badge>
                )}
              </Button>
          </div>
        </div>

        {/* Items Table */}
        {sortedItems.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No items found with the selected filters.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left p-3 w-6">#</th>
                    <th className="text-left p-3 w-6 cursor-pointer select-none" onClick={() => toggleSort('severity')}>
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                        {sortField==='severity' ? (sortDirection==='asc'?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>) : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}
                      </span>
                    </th>
                    <th className="text-left p-3 cursor-pointer select-none" onClick={() => toggleSort('company')}>
                      <span className="inline-flex items-center gap-2">Company {sortField==='company' ? (sortDirection==='asc'?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>) : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}</span>
                    </th>
                    <th className="text-left p-3 cursor-pointer select-none" onClick={() => toggleSort('role')}>
                      <span className="inline-flex items-center gap-2">Role {sortField==='role' ? (sortDirection==='asc'?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>) : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}</span>
                    </th>
                    <th className="text-left p-3 cursor-pointer select-none" onClick={() => toggleSort('title')}>
                      <span className="inline-flex items-center gap-2">Title {sortField==='title' ? (sortDirection==='asc'?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>) : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}</span>
                    </th>
                    <th className="text-left p-3 w-48 cursor-pointer select-none" onClick={() => toggleSort('type')}>
                      <span className="inline-flex items-center gap-2">Type {sortField==='type' ? (sortDirection==='asc'?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>) : <ChevronDown className="w-4 h-4 text-muted-foreground"/>}</span>
                    </th>
                  </tr>
                </thead>
              </table>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] md:max-h-[500px]">
              <table className="w-full">
                <tbody>
            {sortedItems.map((item, index) => {
              const severityConfig = SEVERITY_CONFIG[item.max_severity];
              // Company / Role / Title fields
              const company = (item.company_name || '').trim();
              const role = (item.role_title || '').trim();
              const baseTitle = (item.story_title || item.section_title || item.display_title || '').trim();
              const contentTypeConfig = getContentTypeConfig(item);
              const ContentTypeIcon = contentTypeConfig.icon;
              const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              let compactTitle = baseTitle.replace(/\s*@\s*/g, ' at ');
              if (company) {
                const atEndAt = new RegExp(`\\s+at\\s+${escapeRegExp(company)}\\s*$`, 'i');
                const atEndAtSymbol = new RegExp(`\\s*@\\s*${escapeRegExp(company)}\\s*$`, 'i');
                compactTitle = compactTitle.replace(atEndAt, '').replace(atEndAtSymbol, '').trim();
                // do not append company; show in its own column
              }

              // Final title text per item type
              let titleCellText = compactTitle;
              if (item.item_type === 'role_summary' || item.item_type === 'role_metrics') {
                const preview = (item.preview_text || '').trim();
                titleCellText = preview || compactTitle;
              }

              return (
                <tr 
                  key={`${item.entity_id}-${item.item_type}`}
                  className="border-b hover:bg-primary/10 transition-colors cursor-pointer"
                  onClick={() => handleReview(item)}
                >
                  <td className="p-3 text-sm text-muted-foreground w-6">{index + 1}</td>
                  <td className="p-3 w-6"><AlertTriangle className={cn("w-4 h-4", severityConfig.color)} /></td>
                  <td className="p-3 text-sm text-muted-foreground">{company || '-'}</td>
                  <td className="p-3 text-sm text-muted-foreground">{role || '-'}</td>
                  <td className="p-3 text-sm font-medium">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="truncate">{titleCellText}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={cn("text-xs inline-flex items-center gap-1", contentTypeConfig.color)}>
                      <ContentTypeIcon className="w-3 h-3" />
                      {contentTypeConfig.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ContentQualityWidget.displayName = 'ContentQualityWidget';
