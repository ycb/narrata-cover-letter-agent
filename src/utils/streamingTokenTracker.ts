/**
 * Streaming Token Tracker
 * 
 * Lightweight utility for sampling tokens during LLM streaming.
 * Complements EvaluationEventLogger by tracking token samples separately.
 * 
 * Usage:
 *   const tracker = new StreamingTokenTracker();
 *   for (const token of stream) {
 *     tracker.sampleToken(token, sequence);
 *   }
 *   const samples = tracker.getSamples(); // Use in event metadata
 */

export interface TokenSample {
  token: string;
  sequence: number;
}

export class StreamingTokenTracker {
  private samples: TokenSample[] = [];

  /**
   * Sample a token if it matches the sampling strategy.
   * Strategy: first token (sequence 0), every 10th token, and last token (handled separately).
   */
  sampleToken(token: string, sequence: number): void {
    const shouldSample = sequence === 0 || sequence % 10 === 0;
    if (shouldSample) {
      // Remove any existing sample at this sequence to avoid duplicates
      this.samples = this.samples.filter(s => s.sequence !== sequence);
      this.samples.push({ token, sequence });
      this.samples.sort((a, b) => a.sequence - b.sequence);
    }
  }

  /**
   * Add the final token sample (last token in stream).
   */
  addFinalToken(token: string, finalSequence: number): void {
    // Remove any sample at or after finalSequence
    this.samples = this.samples.filter(s => s.sequence < finalSequence);
    this.samples.push({ token, sequence: finalSequence });
    this.samples.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Get all token samples collected so far.
   */
  getSamples(): TokenSample[] {
    return [...this.samples];
  }

  /**
   * Reset the tracker (useful for reuse).
   */
  reset(): void {
    this.samples = [];
  }
}

