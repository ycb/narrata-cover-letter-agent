import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EvaluationExporter, EvaluationLog } from '@/utils/evaluationExport';

export function EvaluationDashboard() {
  const [logs, setLogs] = useState<EvaluationLog[]>([]);
  const [summary, setSummary] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const evaluationLogs = EvaluationExporter.getLogs();
    setLogs(evaluationLogs);
    setSummary(EvaluationExporter.generateSummary());
  };

  const clearData = () => {
    EvaluationExporter.clearLogs();
    loadData();
  };

  const downloadCSV = () => {
    EvaluationExporter.downloadCSV();
  };

  const getStatusColor = (status: string) => {
    if (status.startsWith('✅')) return 'bg-green-100 text-green-800';
    if (status.startsWith('⚠')) return 'bg-yellow-100 text-yellow-800';
    if (status.startsWith('❌')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Evaluation Dashboard</h1>
        <div className="space-x-2">
          <Button onClick={loadData} variant="outline">
            Refresh
          </Button>
          <Button onClick={downloadCSV} variant="outline">
            Download CSV
          </Button>
          <Button onClick={clearData} variant="destructive">
            Clear Data
          </Button>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm">{summary}</pre>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Evaluations ({logs.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.slice(-10).reverse().map((log, index) => (
              <div key={log.sessionId} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{log.type} - {new Date(log.timestamp).toLocaleString()}</h3>
                    <p className="text-sm text-gray-600">Session: {log.sessionId}</p>
                  </div>
                  <Badge className={getStatusColor(log.evaluation.go_nogo)}>
                    {log.evaluation.go_nogo}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Processing Speed</p>
                    <p className="font-medium">{log.performance.processingSpeed.toFixed(2)}s</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Data Completeness</p>
                    <p className="font-medium">{log.heuristics.dataCompleteness}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Work Experience</p>
                    <p className="font-medium">{log.heuristics.workExperienceCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Skills</p>
                    <p className="font-medium">{log.heuristics.skillsCount}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Badge className={getStatusColor(log.evaluation.accuracy)} variant="outline">
                    {log.evaluation.accuracy}
                  </Badge>
                  <Badge className={getStatusColor(log.evaluation.relevance)} variant="outline">
                    {log.evaluation.relevance}
                  </Badge>
                  <Badge className={getStatusColor(log.evaluation.personalization)} variant="outline">
                    {log.evaluation.personalization}
                  </Badge>
                  <Badge className={getStatusColor(log.evaluation.clarity_tone)} variant="outline">
                    {log.evaluation.clarity_tone}
                  </Badge>
                  <Badge className={getStatusColor(log.evaluation.framework)} variant="outline">
                    {log.evaluation.framework}
                  </Badge>
                </div>

                {log.evaluation.rationale && (
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Rationale:</strong> {log.evaluation.rationale}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
