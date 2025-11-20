/**
 * Retry Utility with Exponential Backoff
 * 
 * Provides resilient error handling for LLM API calls and other async operations.
 * Implements exponential backoff with jitter to prevent thundering herd problems.
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[]; // Error messages/patterns that should trigger retry
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'rate limit',
    'timeout',
    'network',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND',
    '429',
    '502',
    '503',
    '504',
  ],
  onRetry: () => {},
};

/**
 * Check if an error is retryable based on error message patterns
 */
function isRetryableError(error: Error, retryablePatterns: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  return retryablePatterns.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  multiplier: number,
  maxDelay: number
): number {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (±25% randomness) to prevent thundering herd
  const jitter = cappedDelay * 0.25 * (Math.random() * 2 - 1);
  
  return Math.round(cappedDelay + jitter);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => {
 *     return await llmService.analyze(text);
 *   },
 *   {
 *     maxRetries: 3,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry attempt ${attempt}: ${error.message}`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Attempt the operation
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if we should retry
      const shouldRetry = 
        attempt < opts.maxRetries &&
        isRetryableError(lastError, opts.retryableErrors);
      
      if (!shouldRetry) {
        // Not retryable or max retries reached
        throw lastError;
      }
      
      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.backoffMultiplier,
        opts.maxDelayMs
      );
      
      // Notify caller of retry
      opts.onRetry(attempt + 1, lastError);
      
      // Wait before retrying
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Wrap an async function to automatically retry on failure
 * Useful for creating resilient service methods
 * 
 * @example
 * ```typescript
 * const resilientAnalyze = withRetry(
 *   llmService.analyze.bind(llmService),
 *   { maxRetries: 2 }
 * );
 * 
 * const result = await resilientAnalyze(text);
 * ```
 */
export function withRetry<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    return retryWithBackoff(() => fn(...args), options);
  };
}

