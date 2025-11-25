// Simple logging utility with level gating for the frontend
// Usage:
//   import { log } from '@/lib/log';
//   log.debug('message', data);
//   log.info('message');
//   log.error('message', err);
//
// Levels: none < error < info < debug

type LogLevel = 'none' | 'error' | 'info' | 'debug';

function getLevel(): LogLevel {
  // Vite env var for client builds
  const level = (import.meta.env?.VITE_LOG_LEVEL as LogLevel | undefined) ?? 'info';
  if (level === 'none' || level === 'error' || level === 'info' || level === 'debug') {
    return level;
  }
  return 'info';
}

function shouldLog(target: LogLevel): boolean {
  const order: Record<LogLevel, number> = { none: 0, error: 1, info: 2, debug: 3 };
  return order[getLevel()] >= order[target];
}

export const log = {
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (shouldLog('info')) console.log(...args);
  },
  error: (...args: unknown[]) => {
    if (shouldLog('error')) console.error(...args);
  },
};


