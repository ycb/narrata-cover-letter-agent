/**
 * useAdminData Hook
 * 
 * Fetches admin dashboard data (evals, funnel, leaderboard).
 */

import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import type {
  AdminEvalsFilters,
  AdminEvaluationRunsFilters,
  FunnelDropoffUser,
  FunnelStageUser,
  FunnelStatsResponse,
  LeaderboardResponse,
} from '../types/admin';

export function useAdminEvalsData(filters: AdminEvalsFilters = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [JSON.stringify(filters)]);
  
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.queryEvalsLog(filters);
      setData(result.data);
      setCount(result.count);
    } catch (err) {
      console.error('Failed to fetch evals data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  
  return { data, count, loading, error, refetch: fetchData };
}

export function useAdminEvaluationRunsData(filters: AdminEvaluationRunsFilters = {}) {
  const [data, setData] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [JSON.stringify(filters)]);
  
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.queryEvaluationRuns(filters);
      setData(result.data);
      setCount(result.count);
    } catch (err) {
      console.error('Failed to fetch evaluation runs:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  
  return { data, count, loading, error, refetch: fetchData };
}

export function useFunnelStats(since: '7d' | '30d' | '90d' = '30d') {
  const [data, setData] = useState<FunnelStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [since]);
  
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getFunnelStats(since);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch funnel stats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  
  return { data, loading, error, refetch: fetchData };
}

export function useFunnelStageUsers(stage: string, limit: number = 100) {
  const [data, setData] = useState<FunnelStageUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [stage, limit]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getFunnelStageUsers(stage, limit);
      setData(result.data || []);
    } catch (err) {
      console.error('Failed to fetch funnel stage users:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchData };
}

export function useFunnelStageDropoff(stage: string, limit: number = 100) {
  const [data, setData] = useState<FunnelDropoffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [stage, limit]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getFunnelStageDropoff(stage, limit);
      setData(result.data || []);
    } catch (err) {
      console.error('Failed to fetch funnel stage dropoff:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchData };
}

export function useLeaderboard(since: '7d' | '30d' | '90d' = '30d', limit: number = 100) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchData();
  }, [since, limit]);
  
  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const result = await adminService.getLeaderboard(since, limit);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }
  
  return { data, loading, error, refetch: fetchData };
}
