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
}

export const EvaluationDashboard: React.FC = () => {
  const [evaluationRuns, setEvaluationRuns] = useState<EvaluationRun[]>([]);
  const [sources, setSources] = useState<SourceData[]>([]);
  const [selectedRun, setSelectedRun] = useState<EvaluationRun | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceData | null>(null);
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
            .select('id, file_name, file_type, raw_text, structured_data, created_at')
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
          <DialogHeader>
            <DialogTitle>
              Evaluation Details - #{evaluationRuns.findIndex(r => r.id === selectedRun?.id) + 1} - {selectedRun?.file_type}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRun && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Type</h4>
                  <p>{selectedRun.file_type}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Model</h4>
                  <p>{selectedRun.model}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Latency</h4>
                  <p>{(selectedRun.total_latency_ms / 1000).toFixed(2)}s</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-600">Timestamp</h4>
                  <p>{new Date(selectedRun.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Evaluation Results */}
              <div>
                <h4 className="font-medium text-lg mb-3">LLM Judge Evaluation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.accuracy_score)}>
                      {selectedRun.accuracy_score}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Relevance:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.relevance_score)}>
                      {selectedRun.relevance_score}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Personalization:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.personalization_score)}>
                      {selectedRun.personalization_score}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Clarity & Tone:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.clarity_tone_score)}>
                      {selectedRun.clarity_tone_score}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Framework:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.framework_score)}>
                      {selectedRun.framework_score}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Go/No-Go:</span>
                    <Badge className={getEvaluationBadgeColor(selectedRun.go_nogo_decision)}>
                      {selectedRun.go_nogo_decision}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <h5 className="font-medium text-sm text-gray-600">Rationale:</h5>
                  <p className="text-sm text-gray-700">{selectedRun.evaluation_rationale}</p>
                </div>
              </div>

              {/* Input vs Output Comparison */}
              {selectedSource && (
                <div>
                  <h4 className="font-medium text-lg mb-3">Input vs Output Comparison</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-2">Input Text (Full)</h5>
                      <div className="bg-gray-50 p-4 rounded-lg h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap">{selectedSource.raw_text}</pre>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-medium text-sm text-gray-600 mb-2">LLM Output (Full)</h5>
                      <div className="bg-gray-50 p-4 rounded-lg h-96 overflow-y-auto">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(selectedSource.structured_data, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium text-lg mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRun.input_tokens}</div>
                    <div className="text-sm text-gray-600">Input Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRun.output_tokens}</div>
                    <div className="text-sm text-gray-600">Output Tokens</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedRun.input_tokens > 0 ? (selectedRun.output_tokens / selectedRun.input_tokens).toFixed(2) : '0'}
                    </div>
                    <div className="text-sm text-gray-600">Token Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{(selectedRun.total_latency_ms / 1000).toFixed(2)}s</div>
                    <div className="text-sm text-gray-600">Processing Speed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedRun.model}</div>
                    <div className="text-sm text-gray-600">Model</div>
                  </div>
                </div>
              </div>

              {/* Heuristics */}
              {selectedRun.heuristics && (
                <div>
                  <h4 className="font-medium text-lg mb-3">Heuristics</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(selectedRun.heuristics, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};