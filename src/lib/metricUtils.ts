export function formatMetricText(metric: unknown): string {
  if (!metric) return '';
  if (typeof metric === 'string') {
    return metric.trim();
  }

  const value = String((metric as { value?: string; metric?: string; name?: string }).value ?? (metric as any).metric ?? (metric as any).name ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  const context = String((metric as { context?: string; details?: string; description?: string }).context ?? (metric as any).details ?? (metric as any).description ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!value && !context) return '';
  if (!value) return context;
  if (!context) return value;

  return `${value} ${context}`.trim();
}
