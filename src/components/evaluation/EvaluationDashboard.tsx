import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { exportLogsToCsv } from '@/utils/evaluationExport';

interface EvaluationLog {
  timestamp: string;
  sessionId: string;
  sourceId: string;
  type: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  model: string;
  inputText: string;
  outputText: string;
  heuristics?: any;
  evaluation?: {
    accuracy: string;
    relevance: string;
    personalization: string;
    clarity_tone: string;
    framework: string;
    go_nogo: string;
    rationale: string;
  };
  performance?: {
    inputLength: number;
    outputLength: number;
    tokenEfficiency: number;
    processingSpeed: number;
    model: string;
  };
}

export const EvaluationDashboard: React.FC = () => {
  const [logs, setLogs] = useState<EvaluationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EvaluationLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchLogs = () => {
      try {
        const storedLogs = localStorage.getItem('narrata-eval-logs');
        if (storedLogs) {
          const parsedLogs = JSON.parse(storedLogs);
          setLogs(parsedLogs);
          console.log('📊 Loaded evaluation logs:', parsedLogs.length);
        }
      } catch (error) {
        console.error('Failed to load evaluation logs:', error);
      }
    };

    fetchLogs();

    // Listen for new logs
    const handleStorageChange = () => {
      fetchLogs();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('narrata-eval-log-updated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('narrata-eval-log-updated', handleStorageChange);
    };
  }, []);

  const handleExport = () => {
    exportLogsToCsv(logs);
  };

  const handleRowClick = (log: EvaluationLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const getEvaluationBadgeColor = (value: string) => {
    if (value.includes('✅')) return 'bg-green-100 text-green-800';
    if (value.includes('⚠')) return 'bg-yellow-100 text-yellow-800';
    if (value.includes('❌')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  const calculateMetrics = () => {
    const totalLogs = logs.length;
    const avgLatency = logs.reduce((sum, log) => sum + (log.performance?.processingSpeed || 0), 0) / totalLogs || 0;
    const goRate = logs.filter(log => log.evaluation?.go_nogo === '✅ Go').length / totalLogs || 0;
    const accuracyRate = logs.filter(log => log.evaluation?.accuracy === '✅ Accurate').length / totalLogs || 0;
    
    return {
      totalLogs,
      avgLatency: avgLatency.toFixed(2),
      goRate: (goRate * 100).toFixed(1),
      accuracyRate: (accuracyRate * 100).toFixed(1)
    };
  };

  const metrics = calculateMetrics();

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

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalLogs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Latency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgLatency}s</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Go Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.goRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accuracyRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Table View */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
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
              {logs.map((log, index) => (
                <TableRow 
                  key={log.sessionId}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleRowClick(log)}
                >
                  <TableCell className="font-medium">#{logs.length - index}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{log.model}</TableCell>
                  <TableCell className="text-sm">
                    {log.performance?.processingSpeed?.toFixed(2)}s
                  </TableCell>
                  <TableCell>
                    {log.evaluation && (
                      <Badge className={getEvaluationBadgeColor(log.evaluation.go_nogo)}>
                        {log.evaluation.go_nogo}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.evaluation && (
                      <Badge variant="outline" className={getEvaluationBadgeColor(log.evaluation.accuracy)}>
                        {log.evaluation.accuracy}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.evaluation && (
                      <Badge variant="outline" className={getEvaluationBadgeColor(log.evaluation.relevance)}>
                        {log.evaluation.relevance}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRowClick(log);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal for Detailed View */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Evaluation Details - #{logs.length - logs.findIndex(log => log.sessionId === selectedLog?.sessionId)} - {selectedLog?.type}
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Type</h4>
                  <p className="text-lg">{selectedLog.type}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Model</h4>
                  <p className="text-lg">{selectedLog.model}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Latency</h4>
                  <p className="text-lg">{selectedLog.performance?.processingSpeed?.toFixed(2)}s</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-gray-500">Timestamp</h4>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
              </div>

              {/* Evaluation Scores */}
              {selectedLog.evaluation && (
                <div>
                  <h4 className="font-medium mb-3">LLM Judge Evaluation</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Accuracy:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.accuracy)}>
                        {selectedLog.evaluation.accuracy}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Relevance:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.relevance)}>
                        {selectedLog.evaluation.relevance}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Personalization:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.personalization)}>
                        {selectedLog.evaluation.personalization}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Clarity & Tone:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.clarity_tone)}>
                        {selectedLog.evaluation.clarity_tone}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Framework:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.framework)}>
                        {selectedLog.evaluation.framework}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Go/No-Go:</span>
                      <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.go_nogo)}>
                        {selectedLog.evaluation.go_nogo}
                      </Badge>
                    </div>
                  </div>
                  {selectedLog.evaluation.rationale && (
                    <div className="mt-4">
                      <h5 className="font-medium text-sm text-gray-500">Rationale:</h5>
                      <p className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded">
                        {selectedLog.evaluation.rationale}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Side-by-side Comparison */}
              <div>
                <h4 className="font-medium mb-3">Input vs Output Comparison</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-sm text-gray-500 mb-2">Input Text (Full)</h5>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">{selectedLog.inputText}</pre>
                    </div>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm text-gray-500 mb-2">LLM Output (Full)</h5>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">{selectedLog.outputText}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{selectedLog.inputTokens}</div>
                    <div className="text-sm text-gray-500">Input Tokens</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{selectedLog.outputTokens}</div>
                    <div className="text-sm text-gray-500">Output Tokens</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{selectedLog.performance?.tokenEfficiency?.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Token Efficiency</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{selectedLog.performance?.processingSpeed?.toFixed(2)}s</div>
                    <div className="text-sm text-gray-500">Processing Speed</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="text-sm font-bold">{selectedLog.model}</div>
                    <div className="text-sm text-gray-500">Model</div>
                  </div>
                </div>
              </div>

              {/* Heuristics */}
              {selectedLog.heuristics && (
                <div>
                  <h4 className="font-medium mb-3">Heuristics</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(selectedLog.heuristics, null, 2)}
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