import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
        <Button onClick={handleExport} size="sm">
          Export to CSV
        </Button>
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

      {/* Logs List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evaluation Logs ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={log.sessionId}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedLog?.sessionId === log.sessionId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">#{logs.length - index} - {log.type}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    {log.evaluation && (
                      <Badge className={getEvaluationBadgeColor(log.evaluation.go_nogo)}>
                        {log.evaluation.go_nogo}
                      </Badge>
                    )}
                  </div>
                  {log.evaluation && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {log.evaluation.accuracy}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.evaluation.relevance}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Log Details */}
        <Card>
          <CardHeader>
            <CardTitle>Log Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedLog ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Basic Info</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Type: {selectedLog.type}</div>
                    <div>Model: {selectedLog.model}</div>
                    <div>Latency: {selectedLog.performance?.processingSpeed?.toFixed(2)}s</div>
                    <div>Timestamp: {new Date(selectedLog.timestamp).toLocaleString()}</div>
                  </div>
                </div>

                {selectedLog.evaluation && (
                  <div>
                    <h4 className="font-medium">LLM Judge Evaluation</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Accuracy:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.accuracy)}>
                          {selectedLog.evaluation.accuracy}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Relevance:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.relevance)}>
                          {selectedLog.evaluation.relevance}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Personalization:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.personalization)}>
                          {selectedLog.evaluation.personalization}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Clarity & Tone:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.clarity_tone)}>
                          {selectedLog.evaluation.clarity_tone}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Framework:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.framework)}>
                          {selectedLog.evaluation.framework}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Go/No-Go:</span>
                        <Badge className={getEvaluationBadgeColor(selectedLog.evaluation.go_nogo)}>
                          {selectedLog.evaluation.go_nogo}
                        </Badge>
                      </div>
                      {selectedLog.evaluation.rationale && (
                        <div>
                          <span className="font-medium">Rationale:</span>
                          <p className="text-sm text-gray-600 mt-1">{selectedLog.evaluation.rationale}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedLog.heuristics && (
                  <div>
                    <h4 className="font-medium">Heuristics</h4>
                    <div className="text-sm text-gray-600">
                      <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
                        {JSON.stringify(selectedLog.heuristics, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Select a log to view details</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};