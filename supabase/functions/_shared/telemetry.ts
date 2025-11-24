/**
 * Telemetry and Monitoring Utilities
 * 
 * Provides structured logging and metrics for streaming pipelines
 */

// ============================================================================
// Types
// ============================================================================

export interface TelemetryEvent {
  timestamp: string;
  jobId: string;
  jobType: string;
  eventType: 'job_started' | 'stage_started' | 'stage_completed' | 'stage_failed' | 'job_completed' | 'job_failed';
  stage?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface StageMetrics {
  stageName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
}

export interface JobMetrics {
  jobId: string;
  jobType: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  stages: StageMetrics[];
  success: boolean;
  error?: string;
}

// ============================================================================
// Telemetry Class
// ============================================================================

export class PipelineTelemetry {
  private jobMetrics: JobMetrics;
  private currentStage: StageMetrics | null = null;

  constructor(jobId: string, jobType: string) {
    this.jobMetrics = {
      jobId,
      jobType,
      startTime: Date.now(),
      stages: [],
      success: false,
    };

    this.log({
      timestamp: new Date().toISOString(),
      jobId,
      jobType,
      eventType: 'job_started',
    });
  }

  /**
   * Mark start of a stage
   */
  startStage(stageName: string) {
    if (this.currentStage) {
      console.warn(`[Telemetry] Stage ${this.currentStage.stageName} not finished before starting ${stageName}`);
      this.endStage(false, 'Stage interrupted');
    }

    this.currentStage = {
      stageName,
      startTime: Date.now(),
      success: false,
    };

    this.log({
      timestamp: new Date().toISOString(),
      jobId: this.jobMetrics.jobId,
      jobType: this.jobMetrics.jobType,
      eventType: 'stage_started',
      stage: stageName,
    });
  }

  /**
   * Mark end of a stage
   */
  endStage(success: boolean, error?: string) {
    if (!this.currentStage) {
      console.warn('[Telemetry] No stage in progress to end');
      return;
    }

    const endTime = Date.now();
    const duration = endTime - this.currentStage.startTime;

    this.currentStage.endTime = endTime;
    this.currentStage.duration = duration;
    this.currentStage.success = success;
    if (error) {
      this.currentStage.error = error;
    }

    this.jobMetrics.stages.push(this.currentStage);

    this.log({
      timestamp: new Date().toISOString(),
      jobId: this.jobMetrics.jobId,
      jobType: this.jobMetrics.jobType,
      eventType: success ? 'stage_completed' : 'stage_failed',
      stage: this.currentStage.stageName,
      duration,
      metadata: error ? { error } : undefined,
    });

    this.currentStage = null;
  }

  /**
   * Mark job completion
   */
  complete(success: boolean, error?: string) {
    if (this.currentStage) {
      this.endStage(false, 'Job completed before stage finished');
    }

    const endTime = Date.now();
    const totalDuration = endTime - this.jobMetrics.startTime;

    this.jobMetrics.endTime = endTime;
    this.jobMetrics.totalDuration = totalDuration;
    this.jobMetrics.success = success;
    if (error) {
      this.jobMetrics.error = error;
    }

    this.log({
      timestamp: new Date().toISOString(),
      jobId: this.jobMetrics.jobId,
      jobType: this.jobMetrics.jobType,
      eventType: success ? 'job_completed' : 'job_failed',
      duration: totalDuration,
      metadata: {
        stagesCompleted: this.jobMetrics.stages.length,
        success,
        ...(error && { error }),
      },
    });

    // Print summary
    this.printSummary();
  }

  /**
   * Get current metrics
   */
  getMetrics(): JobMetrics {
    return this.jobMetrics;
  }

  /**
   * Log telemetry event
   */
  private log(event: TelemetryEvent) {
    // In production, this would send to a real telemetry service
    // For MVP, we just console.log with structured format
    console.log('[Telemetry]', JSON.stringify(event));
  }

  /**
   * Print human-readable summary
   */
  private printSummary() {
    console.log('\n========================================');
    console.log('Pipeline Execution Summary');
    console.log('========================================');
    console.log(`Job ID: ${this.jobMetrics.jobId}`);
    console.log(`Job Type: ${this.jobMetrics.jobType}`);
    console.log(`Success: ${this.jobMetrics.success ? '✅' : '❌'}`);
    console.log(`Total Duration: ${this.jobMetrics.totalDuration}ms (${(this.jobMetrics.totalDuration! / 1000).toFixed(2)}s)`);
    console.log('\nStage Breakdown:');
    this.jobMetrics.stages.forEach((stage, i) => {
      const status = stage.success ? '✅' : '❌';
      console.log(`  ${i + 1}. ${stage.stageName}: ${status} ${stage.duration}ms (${(stage.duration! / 1000).toFixed(2)}s)`);
      if (stage.error) {
        console.log(`     Error: ${stage.error}`);
      }
    });
    console.log('========================================\n');
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

/**
 * Calculate time to first progress (TTFP)
 */
export function calculateTTFP(startTime: number, firstProgressTime: number): number {
  return firstProgressTime - startTime;
}

/**
 * Calculate average stage duration
 */
export function calculateAverageStageDuration(stages: StageMetrics[]): number {
  if (stages.length === 0) return 0;
  const total = stages.reduce((sum, stage) => sum + (stage.duration || 0), 0);
  return total / stages.length;
}

