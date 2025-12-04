/**
 * React hooks for Evals dashboard data fetching
 */

import { useState, useEffect } from 'react';
import {
  EvalsService,
  type JobTypeAggregate,
  type StageAggregate,
  type QualityScoreBucket,
  type RecentFailure,
} from '@/services/evalsService';

/**
 * Hook for job-level aggregates (success rate, latency, quality score)
 */
export function useJobTypeAggregates(days: number = 7) {
  const [data, setData] = useState<JobTypeAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await EvalsService.getAggregateByJobType(days);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [days]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook for stage-level aggregates (stage latency, TTFU)
 */
export function useStageAggregates(days: number = 7, jobType?: string) {
  const [data, setData] = useState<StageAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await EvalsService.getAggregateByStage(days, jobType);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [days, jobType]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook for quality score distribution (histogram)
 */
export function useQualityDistribution(days: number = 7, jobType?: string) {
  const [data, setData] = useState<QualityScoreBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await EvalsService.getQualityScoreDistribution(days, jobType);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [days, jobType]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

/**
 * Hook for recent failures (error debugging)
 */
export function useRecentFailures(jobType?: string, limit: number = 50) {
  const [data, setData] = useState<RecentFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const result = await EvalsService.getRecentFailures(jobType, limit);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err as Error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [jobType, limit]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

