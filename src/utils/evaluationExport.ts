// Utility to export evaluation data for analysis
export interface EvaluationLog {
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
  performance: {
    inputLength: number;
    outputLength: number;
    tokenEfficiency: number;
    processingSpeed: number;
    model: string;
  };
  heuristics: {
    hasWorkExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    hasContactInfo: boolean;
    workExperienceCount: number;
    educationCount: number;
    skillsCount: number;
    hasQuantifiableMetrics: boolean;
    hasCompanyNames: boolean;
    hasJobTitles: boolean;
    dataCompleteness: number;
  };
  evaluation: {
    accuracy: string;
    relevance: string;
    personalization: string;
    clarity_tone: string;
    framework: string;
    go_nogo: string;
    rationale: string;
  };
}

export class EvaluationExporter {
  /**
   * Get all evaluation logs from localStorage
   */
  static getLogs(): EvaluationLog[] {
    try {
      return JSON.parse(localStorage.getItem('narrata-eval-logs') || '[]');
    } catch (error) {
      console.warn('Failed to retrieve evaluation logs:', error);
      return [];
    }
  }

  /**
   * Export logs as CSV for spreadsheet analysis
   */
  static exportToCSV(): string {
    const logs = this.getLogs();
    if (logs.length === 0) {
      return 'No evaluation data available';
    }

    // CSV headers
    const headers = [
      'timestamp',
      'sessionId',
      'type',
      'processingSpeed',
      'tokenEfficiency',
      'dataCompleteness',
      'workExperienceCount',
      'educationCount',
      'skillsCount',
      'hasQuantifiableMetrics',
      'accuracy',
      'relevance',
      'personalization',
      'clarity_tone',
      'framework',
      'go_nogo',
      'rationale'
    ];

    // CSV rows
    const rows = logs.map(log => [
      log.timestamp,
      log.sessionId,
      log.type,
      log.performance.processingSpeed.toFixed(2),
      log.performance.tokenEfficiency.toFixed(2),
      log.heuristics.dataCompleteness,
      log.heuristics.workExperienceCount,
      log.heuristics.educationCount,
      log.heuristics.skillsCount,
      log.heuristics.hasQuantifiableMetrics,
      log.evaluation.accuracy,
      log.evaluation.relevance,
      log.evaluation.personalization,
      log.evaluation.clarity_tone,
      log.evaluation.framework,
      log.evaluation.go_nogo,
      `"${log.evaluation.rationale.replace(/"/g, '""')}"` // Escape quotes
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * Generate evaluation summary
   */
  static generateSummary(): string {
    const logs = this.getLogs();
    if (logs.length === 0) {
      return 'No evaluation data available';
    }

    const totalLogs = logs.length;
    const avgProcessingSpeed = logs.reduce((sum, log) => sum + log.performance.processingSpeed, 0) / totalLogs;
    const avgDataCompleteness = logs.reduce((sum, log) => sum + log.heuristics.dataCompleteness, 0) / totalLogs;
    const avgTokenEfficiency = logs.reduce((sum, log) => sum + log.performance.tokenEfficiency, 0) / totalLogs;

    // Count evaluation results
    const goCount = logs.filter(log => log.evaluation.go_nogo === '✅ Go').length;
    const accuracyCount = logs.filter(log => log.evaluation.accuracy.startsWith('✅')).length;
    const relevanceCount = logs.filter(log => log.evaluation.relevance.startsWith('✅')).length;
    const personalizationCount = logs.filter(log => log.evaluation.personalization.startsWith('✅')).length;

    return `📊 Evaluation Summary (${totalLogs} samples):

Performance:
- Average Processing Speed: ${avgProcessingSpeed.toFixed(2)}s
- Average Data Completeness: ${avgDataCompleteness.toFixed(1)}%
- Average Token Efficiency: ${avgTokenEfficiency.toFixed(2)}

Quality Metrics:
- Go/No-Go: ${goCount}/${totalLogs} (${((goCount/totalLogs)*100).toFixed(1)}%)
- Accuracy: ${accuracyCount}/${totalLogs} (${((accuracyCount/totalLogs)*100).toFixed(1)}%)
- Relevance: ${relevanceCount}/${totalLogs} (${((relevanceCount/totalLogs)*100).toFixed(1)}%)
- Personalization: ${personalizationCount}/${totalLogs} (${((personalizationCount/totalLogs)*100).toFixed(1)}%)

Data Completeness:
- Work Experience: ${logs.filter(log => log.heuristics.hasWorkExperience).length}/${totalLogs}
- Education: ${logs.filter(log => log.heuristics.hasEducation).length}/${totalLogs}
- Skills: ${logs.filter(log => log.heuristics.hasSkills).length}/${totalLogs}
- Contact Info: ${logs.filter(log => log.heuristics.hasContactInfo).length}/${totalLogs}
- Quantifiable Metrics: ${logs.filter(log => log.heuristics.hasQuantifiableMetrics).length}/${totalLogs}`;
  }

  /**
   * Clear all evaluation logs
   */
  static clearLogs(): void {
    localStorage.removeItem('narrata-eval-logs');
    console.log('Evaluation logs cleared');
  }

  /**
   * Download evaluation data as CSV file
   */
  static downloadCSV(): void {
    const csv = this.exportToCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narrata-evaluation-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
