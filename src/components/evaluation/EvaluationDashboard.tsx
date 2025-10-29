import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportLogsToCsv } from '@/utils/evaluationExport';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

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
          const sourceIds = runs.map(run => run.source_id);
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

  const handleRowClick = (run: EvaluationRun) => {
    const source = sources.find(s => s.id === run.source_id);
    setSelectedRun(run);
    setSelectedSource(source || null);
    setIsModalOpen(true);
  };

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

  const getEvaluationBadgeColor = (value: string) => {
    if (value.includes('✅')) return 'bg-green-100 text-green-800';
    if (value.includes('⚠')) return 'bg-yellow-100 text-yellow-800';
    if (value.includes('❌')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
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
            variant="outline"
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
          variant={userTypeFilter === 'all' ? 'default' : 'outline'}
        >
          All Users ({evaluationRuns.length})
        </Button>
        <Button 
          onClick={() => setUserTypeFilter('synthetic')}
          size="sm"
          variant={userTypeFilter === 'synthetic' ? 'default' : 'outline'}
        >
          Synthetic ({evaluationRuns.filter(r => r.user_type === 'synthetic').length})
        </Button>
        <Button 
          onClick={() => setUserTypeFilter('real')}
          size="sm"
          variant={userTypeFilter === 'real' ? 'default' : 'outline'}
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
                          variant="outline"
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
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <div className="grid grid-cols-3 items-center pr-10">
            <h2 className="text-lg font-semibold leading-none tracking-tight truncate">
              {selectedSource?.file_name || `Evaluation Details`}
            </h2>
            <div className="text-lg font-semibold leading-none tracking-tight text-center truncate">{getHeaderUserText()}</div>
            {selectedRun && (
              <div className="text-xs text-gray-500 whitespace-nowrap justify-self-end">
                <span className="mr-1">Timestamp:</span>
                <span className="font-semibold text-gray-700">{new Date(selectedRun.created_at).toLocaleString()}</span>
              </div>
            )}
          </div>
          
          {selectedRun && (
            <div className="space-y-8">
              {/* Meta Data */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Type</div>
                  <div className="text-2xl font-bold">{selectedRun.file_type}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Model</div>
                  <div className="text-2xl font-bold">{selectedRun.model}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Processing Speed</div>
                  <div className="text-2xl font-bold">{(selectedRun.total_latency_ms / 1000).toFixed(2)}s</div>
                </div>
              </div>

              {/* Summary & Heuristics (combined) */}
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Evaluation badges in heuristic-style tiles */}
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

                {/* Heuristic booleans */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Work Experience</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasWorkExperience ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasWorkExperience ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Education</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasEducation ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasEducation ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Skills</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasSkills ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasSkills ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Contact Info</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasContactInfo ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasContactInfo ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Quant Metrics</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasQuantifiableMetrics ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasQuantifiableMetrics ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Company Names</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasCompanyNames ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasCompanyNames ? 'Present' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Job Titles</span>
                  <Badge className={getEvaluationBadgeColor(selectedRun.heuristics?.hasJobTitles ? '✅' : '❌')}>
                    {selectedRun.heuristics?.hasJobTitles ? 'Present' : 'Missing'}
                  </Badge>
                </div>

                {/* Counts and completeness */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Work Items</span>
                  <span className="font-semibold">{selectedRun.heuristics?.workExperienceCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Education Entries</span>
                  <span className="font-semibold">{selectedRun.heuristics?.educationCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>Skills Count</span>
                  <span className="font-semibold">{selectedRun.heuristics?.skillsCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg md:col-span-3">
                  <span>Data Completeness</span>
                  <span className="font-semibold">{selectedRun.heuristics?.dataCompleteness ?? 0}%</span>
                </div>

                {/* Rationale spanning full width */}
                <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                  <span className="block text-gray-600 mb-1">Rationale</span>
                  {selectedRun.evaluation_rationale}
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

              {/* Cover Letter Stories Summary */}
              {selectedRun?.file_type === 'coverLetter' && selectedSource?.structured_data?.stories && Array.isArray((selectedSource as any).structured_data.stories) && (
                <div>
                  <h4 className="font-medium text-lg mb-3">Cover Letter Stories</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Story Count</span>
                      <span className="text-base font-semibold">{(selectedSource as any).structured_data.stories.length}</span>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-2">Top Stories</h5>
                      <ul className="list-disc pl-5 space-y-1">
                        {((selectedSource as any).structured_data.stories as any[])
                          .slice(0, 5)
                          .map((story: any, idx: number) => (
                            <li key={idx} className="text-sm text-gray-800">
                              {story.title || story.summary || story.id}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Metrics removed as redundant */}

              {/* Heuristics removed; combined above */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};