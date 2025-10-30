import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportLogsToCsv } from '@/utils/evaluationExport';
import { supabase } from '@/lib/supabase';
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
  session_id: string;
  source_id: string;
  file_type: string;
  user_type: 'synthetic' | 'real';
  
  // Performance Metrics
  text_extraction_latency_ms: number;
  llm_analysis_latency_ms: number;
  database_save_latency_ms: number;
  total_latency_ms: number;
  
  // Token Usage
  input_tokens: number;
  output_tokens: number;
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
  
  // Metadata
  created_at: string;
  updated_at: string;
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

export const EvaluationDashboard: React.FC = () => {
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

  useEffect(() => {
    if (!user?.id) return;
    
    const fetchEvaluationData = async () => {
      setLoading(true);
      try {
        // Fetch evaluation runs with user type filtering
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
          const sourceIds = (runs as EvaluationRun[]).map((run: EvaluationRun) => run.source_id);
          const { data: sourcesData, error: sourcesError } = await supabase
            .from('sources')
            .select('id, file_name, file_type, raw_text, structured_data, created_at, storage_path')
            .in('id', sourceIds);

          if (sourcesError) {
            console.error('Failed to fetch sources:', sourcesError);
            return;
          }

          setSources(sourcesData || []);
        }

        setEvaluationRuns(runs || []);
        console.log('📊 Loaded evaluation runs:', runs?.length || 0);
      } catch (error) {
        console.error('Failed to fetch evaluation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationData();
  }, [user?.id, userTypeFilter]);

  const handleRowClick = async (run: EvaluationRun) => {
    const source = sources.find(s => s.id === run.source_id);
    setSelectedRun(run);
    setSelectedSource(source || null);
    setExpandedCategories(new Set()); // Reset expanded categories when opening a new run
    setIsModalOpen(true);
    try {
      const fetched = await DataQualityService.getFlagsForEvaluationRun(run.id);
      setFlags(fetched);
    } catch (e) {
      console.error('Failed to load flags', e);
      setFlags([]);
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
    if (value.includes('⚠')) return 'bg-yellow-100 text-yellow-800';
    if (value.includes('❌')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
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
        if (Array.isArray(entry?.roleMetrics) && entry.roleMetrics.length > 0) found = true;
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
    if (hasMetrics) categories.push('quantMetrics');
    categories.push('companyNames', 'jobTitles');
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

  // Helper to render work history entry in friendly format
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
    const roleMetrics = entry.roleMetrics || [];
    const roleSummary = entry.roleSummary || entry.description || entry.descriptionCombined;

    const workPath = `workHistory[${idx}]`;
    const itemFlags = getFlagsForPath(workPath);
    return (
      <div key={idx} className="bg-white p-4 rounded-lg border border-gray-200 space-y-3 relative">
        <div className="absolute top-2 right-2">
          <FlagButton
            dataPath={workPath}
            dataType="work_history"
            hasFlags={itemFlags.length > 0}
            flagCount={itemFlags.length}
            onClick={() => handleFlagClick('work_history', workPath, entry)}
          />
        </div>
        <div className="pr-8">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="font-semibold text-base text-gray-900">{position}</div>
              <div className="text-sm text-gray-700">{company}</div>
            </div>
          </div>
          {location && (
            <div className="text-xs text-gray-500 mt-1">{location}</div>
          )}
        </div>

        {roleSummary && (
          <div className="text-sm text-gray-700">
            <span className="font-medium">Summary: </span>
            {roleSummary}
          </div>
        )}

        {(companyTags.length > 0 || roleTags.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {companyTags.map((tag: string, tagIdx: number) => (
              <Badge key={`company-${tagIdx}`} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                {tag}
              </Badge>
            ))}
            {roleTags.map((tag: string, tagIdx: number) => (
              <Badge key={`role-${tagIdx}`} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {roleMetrics.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-600">Role Metrics:</div>
            <div className="flex flex-wrap gap-2">
              {roleMetrics.map((metric: any, metricIdx: number) => (
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
        const roleTitle = role.position || role.titleDisplay || role.titleCanonical || role.role;
        
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
    if (evaluationRuns.length === 0) {
      return {
        totalEvaluations: 0,
        avgLatency: 0,
        goRate: 0,
        accuracyRate: 0
      };
    }

    const totalEvaluations = evaluationRuns.length;
    const avgLatency = evaluationRuns.reduce((sum, run) => sum + (run.total_latency_ms || 0), 0) / totalEvaluations / 1000; // Convert to seconds
    const goCount = evaluationRuns.filter(run => run.go_nogo_decision?.includes('✅')).length;
    const goRate = (goCount / totalEvaluations) * 100;
    const accurateCount = evaluationRuns.filter(run => run.accuracy_score?.includes('✅')).length;
    const accuracyRate = (accurateCount / totalEvaluations) * 100;

    return {
      totalEvaluations,
      avgLatency: avgLatency.toFixed(2),
      goRate: goRate.toFixed(1),
      accuracyRate: accuracyRate.toFixed(1)
    };
  };

  const handleExport = () => {
    // Convert evaluation runs to CSV format
    const csvData = evaluationRuns.map(run => {
      const source = sources.find(s => s.id === run.source_id);
      return {
        timestamp: run.created_at,
        session_id: run.session_id,
        file_name: source?.file_name || 'Unknown',
        file_type: run.file_type,
        model: run.model,
        total_latency_ms: run.total_latency_ms,
        input_tokens: run.input_tokens,
        output_tokens: run.output_tokens,
        accuracy_score: run.accuracy_score,
        relevance_score: run.relevance_score,
        go_nogo_decision: run.go_nogo_decision,
        evaluation_rationale: run.evaluation_rationale
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <CardTitle className="text-sm font-medium text-gray-600">Avg. Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLatency}s</div>
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
                  <TableHead>Latency</TableHead>
                  <TableHead>Go/No-Go</TableHead>
                  <TableHead>Accuracy</TableHead>
                  <TableHead>Relevance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluationRuns.map((run, index) => {
                  const source = sources.find(s => s.id === run.source_id);
                  return (
                    <TableRow 
                      key={run.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleRowClick(run)}
                    >
                      <TableCell className="font-medium">#{evaluationRuns.length - index}</TableCell>
                      <TableCell className="text-sm">{source?.file_name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{run.file_type}</Badge>
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
                      <TableCell className="text-sm">{run.model}</TableCell>
                      <TableCell className="text-sm">
                        {(run.total_latency_ms / 1000).toFixed(2)}s
                      </TableCell>
                      <TableCell>
                        <Badge className={getEvaluationBadgeColor(run.go_nogo_decision)}>
                          {run.go_nogo_decision}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getEvaluationBadgeColor(run.accuracy_score)}>
                          {run.accuracy_score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getEvaluationBadgeColor(run.relevance_score)}>
                          {run.relevance_score}
                        </Badge>
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
                {selectedSource?.file_name || `Evaluation Details`}
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
                  <div className="text-2xl font-bold">{(selectedRun.total_latency_ms / 1000).toFixed(2)}s</div>
                </div>
              </div>

              <hr className="border-gray-200" />

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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Work Experience - Only show for resume/LinkedIn, not cover letters */}
                  {selectedRun?.file_type !== 'coverLetter' && (() => {
                    const workHistory = selectedSource?.structured_data?.workHistory || selectedSource?.structured_data?.work_history || [];
                    const hasEntries = Array.isArray(workHistory) && workHistory.length > 0;
                    const isExpanded = expandedCategories.has('workHistory');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
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
                        {/* removed sub-count line to keep consistent labeling */}
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 space-y-3 max-h-96 overflow-y-auto">
                            {workHistory.map((entry: any, idx: number) => renderWorkHistoryEntry(entry, idx))}
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No work experience extracted</div>
                        )}
                      </div>
                    );
                  })()}

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
                    
                    const hasEntries = allSkills.length > 0;
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
                            {hasEntries ? `${allSkills.length} found` : 'None'}
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

                  {/* Metrics - Collapsible if has entries (2nd for CL order) */}
                  {(() => {
                    const workHistory = selectedSource?.structured_data?.workHistory || selectedSource?.structured_data?.work_history || [];
                    const allMetrics: Array<{ metric: any; parent: { type: 'role' | 'story'; company?: string; position?: string; storyTitle?: string }; path: string }> = [];
                    
                    // Collect role/story metrics from work history (exclude for cover letters)
                    if (selectedRun?.file_type !== 'coverLetter') {
                      workHistory.forEach((entry: any, entryIdx: number) => {
                        const company = entry.company || entry.companyDisplay || entry.companyCanonical || 'Unknown Company';
                        const position = entry.position || entry.titleDisplay || entry.titleCanonical || entry.role || 'Unknown Position';
                        
                        if (entry.roleMetrics && Array.isArray(entry.roleMetrics)) {
                          entry.roleMetrics.forEach((metric: any, metricIdx: number) => {
                            const parentType = metric.parentType || 'role';
                            allMetrics.push({
                              metric,
                              parent: { type: parentType, company, position },
                              path: `workHistory[${entryIdx}].roleMetrics[${metricIdx}]`
                            });
                          });
                        }
                        
                        if (entry.stories && Array.isArray(entry.stories)) {
                          entry.stories.forEach((story: any, storyIdx: number) => {
                            if (story.metrics && Array.isArray(story.metrics)) {
                              story.metrics.forEach((metric: any, metricIdx: number) => {
                                const parentType = metric.parentType || 'story';
                                allMetrics.push({
                                  metric,
                                  parent: { 
                                    type: parentType, 
                                    company, 
                                    position,
                                    storyTitle: story.title || story.id || 'Untitled Story'
                                  },
                                  path: `workHistory[${entryIdx}].stories[${storyIdx}].metrics[${metricIdx}]`
                                });
                              });
                            }
                          });
                        }
                      });
                    }
                    
                    // Collect story-level metrics from cover letter stories
                    const stories = selectedSource?.structured_data?.stories || [];
                    stories.forEach((story: any, storyIdx: number) => {
                      if (story.metrics && Array.isArray(story.metrics)) {
                        const company = story.company || 'Unknown Company';
                        const titleRole = story.titleRole || 'Unknown Role';
                        story.metrics.forEach((metric: any, metricIdx: number) => {
                          // Use parentType from metric if available, otherwise infer from location
                          const parentType = metric.parentType || 'story';
                          allMetrics.push({
                            metric,
                            parent: { 
                              type: parentType, 
                              company,
                              position: titleRole,
                              storyTitle: story.title || story.id || 'Untitled Story'
                            },
                            path: `stories[${storyIdx}].metrics[${metricIdx}]`
                          });
                        });
                      }
                    });
                    
                    const hasEntries = allMetrics.length > 0;
                    const isExpanded = expandedCategories.has('quantMetrics');
                    return (
                      <div className={`bg-gray-50 rounded-lg ${hasEntries ? 'cursor-pointer hover:bg-gray-100' : ''}`}>
                        <div 
                          className={`flex items-center justify-between p-3 ${hasEntries ? '' : 'pointer-events-none'}`}
                          onClick={() => hasEntries && toggleCategory('quantMetrics')}
                        >
                          <div className="flex items-center gap-2">
                            {hasEntries && (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
                            <span>Metrics</span>
                          </div>
                          <Badge className={getEvaluationBadgeColor(hasEntries ? '✅' : '❌')}>
                            {hasEntries ? `${allMetrics.length} found` : 'None'}
                          </Badge>
                  </div>
                        {hasEntries && isExpanded && (
                          <div className="px-3 pb-3 space-y-3 max-h-96 overflow-y-auto">
                            {allMetrics.map((item: any, idx: number) => {
                              const { metric, parent, path } = item;
                              
                              // Format metric as readable string: "number unit label/scope"
                              // Examples: "11% trial-to-paid conversion rates", "30 tests run per year"
                              const formatMetric = (m: any): string => {
                                let value = String(m.value || '').trim();
                                const unit = String(m.unit || '').trim();
                                const context = String(m.context || '').trim();
                                const name = String(m.name || '').trim();
                                const period = String(m.period || '').trim();
                                
                                // Determine label/scope - prefer context, then name, fallback to period
                                const label = context || name || period || '';
                                
                                // Handle value formatting
                                // If value already contains unit (like "+22%" or "30+"), use as-is
                                // Otherwise, append unit if provided
                                let formatted = value;
                                
                                // Check if value already has unit embedded (contains %, $, +, etc.)
                                const hasEmbeddedUnit = /[%$+\-]/.test(value);
                                
                                if (!hasEmbeddedUnit && unit) {
                                  // Add unit if not already present
                                  // Handle spacing (e.g., "30" + "tests" = "30 tests")
                                  if (unit.match(/^[a-zA-Z]/)) {
                                    formatted += ` ${unit}`;
                                  } else {
                                    formatted += unit;
                                  }
                                }
                                
                                // Add label/scope if available
                                if (label) {
                                  formatted += ` ${label}`;
                                }
                                
                                return formatted.trim();
                              };
                              
                              const metricText = formatMetric(metric);
                              
                              return (
                                <div key={idx} className="bg-white p-3 rounded border border-gray-200 relative">
                                  <div className="absolute top-2 right-2">
                                    <FlagButton
                                      dataPath={path}
                                      dataType="metric"
                                      hasFlags={getFlagsForPath(path).length > 0}
                                      flagCount={getFlagsForPath(path).length}
                                      onClick={() => handleFlagClick('metric', path, metric)}
                                      size="sm"
                                    />
                                  </div>
                                  <div className="mb-2 pb-2 border-b border-gray-100 pr-8">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={`text-xs ${parent.type === 'role' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                                        {parent.type === 'role' ? 'Role-Level' : 'Story-Level'}
                                      </Badge>
                                      <span className="text-xs font-medium text-gray-700">
                                        {parent.company} {parent.position && `• ${parent.position}`}
                                      </span>
                    </div>
                                    {parent.type === 'story' && parent.storyTitle && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        Story: {parent.storyTitle}
                  </div>
                                    )}
                  </div>
                                  <div className="text-sm text-gray-900 font-medium pr-8">
                                    {metricText}
                  </div>
                                  {metric.type && (
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs text-gray-500">{metric.type}</Badge>
                </div>
                                  )}
              </div>
                              );
                            })}
                          </div>
                        )}
                        {!hasEntries && (
                          <div className="px-3 pb-3 text-xs text-gray-500">No quantifiable metrics extracted</div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Location - Show for all file types (4th for CL order) */}
                  {(() => {
                    const contactInfo = selectedSource?.structured_data?.contactInfo || selectedSource?.structured_data?.contact_info || {};
                    const location = contactInfo.location;
                    const hasLocation = !!location;
                    const locationPath = 'contactInfo.location';
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
                      .map((entry: any) => entry.position || entry.titleDisplay || entry.titleCanonical || entry.role || entry.title)
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