export const exportLogsToCsv = (logs: any[], filename = 'narrata_eval_logs.csv') => {
  if (!logs || logs.length === 0) {
    console.warn('No logs to export.');
    return;
  }

  // Flatten nested objects for CSV headers
  const flattenObject = (obj: any, prefix = '') => {
    return Object.keys(obj).reduce((acc, k) => {
      const pre = prefix.length ? prefix + '_' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const flattenedLogs = logs.map(log => flattenObject(log));

  const headers = Object.keys(flattenedLogs[0]);
  const csv = [
    headers.join(','), // Header row
    ...flattenedLogs.map(row => headers.map(header => {
      const value = row[header];
      // Handle commas and quotes in CSV values
      return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) { // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};