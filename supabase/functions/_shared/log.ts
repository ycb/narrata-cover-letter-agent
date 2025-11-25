// Lightweight logging utility for Edge Functions (Deno)
// Levels: none < error < info < debug

type LogLevel = 'none' | 'error' | 'info' | 'debug';

function getLevel(): LogLevel {
  const level = (Deno.env.get('LOG_LEVEL') as LogLevel | undefined) ?? 'info';
  if (level === 'none' || level === 'error' || level === 'info' || level === 'debug') {
    return level;
  }
  return 'info';
}

function shouldLog(target: LogLevel): boolean {
  const order: Record<LogLevel, number> = { none: 0, error: 1, info: 2, debug: 3 };
  return order[getLevel()] >= order[target];
}

export const elog = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.log(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...args);
  },
};


