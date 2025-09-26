import { useState, useEffect } from 'react';
import { DashboardService, type DashboardData } from '@/services/dashboardService';
import { useAuth } from '@/contexts/AuthContext';

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        console.log('useDashboardData: Starting fetch for user:', user.id);
        setIsLoading(true);
        setError(null);
        
        const dashboardService = new DashboardService(session);
        console.log('useDashboardData: Calling getDashboardData...');
        const dashboardData = await dashboardService.getDashboardData(user.id);
        console.log('useDashboardData: Dashboard data received:', dashboardData);
        
        setData(dashboardData);
      } catch (err) {
        console.error('useDashboardData: Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        console.log('useDashboardData: Setting loading to false');
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const refetch = async () => {
    if (!user) return;
    
    try {
      setError(null);
      const dashboardService = new DashboardService(session);
      const dashboardData = await dashboardService.getDashboardData(user.id);
      setData(dashboardData);
    } catch (err) {
      console.error('Error refetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refetch dashboard data');
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch
  };
}
