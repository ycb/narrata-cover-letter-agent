/**
 * Admin Service
 * 
 * Frontend service layer for admin tooling.
 * Calls admin-only Edge Functions with service role access.
 */

import { supabase } from '../lib/supabase';
import type {
  AdminEvalsFilters,
  AdminEvaluationRunsFilters,
  AdminUserListItem,
  FunnelStatsResponse,
  LeaderboardResponse,
  SpoofUserRequest,
  SpoofUserResponse,
  UserRole,
} from '../types/admin';

class AdminService {
  /**
   * Check if current user is an admin
   */
  async isAdmin(): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.role === 'admin';
  }
  
  /**
   * Get current user's role
   */
  async getUserRole(): Promise<UserRole | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[adminService] No authenticated user');
        return null;
      }
      
      console.log('[adminService] Checking role for user:', user.id);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        console.error('[adminService] Error fetching user role:', error);
        return null;
      }
      
      if (!data) {
        console.warn('[adminService] No role found for user:', user.id);
        return null;
      }
      
      console.log('[adminService] User role:', data.role);
      return data.role as UserRole;
    } catch (err) {
      console.error('[adminService] Unexpected error in getUserRole:', err);
      return null;
    }
  }
  
  /**
   * Query global evals_log data (admin-only)
   */
  async queryEvalsLog(filters: AdminEvalsFilters = {}): Promise<{ data: any[]; count: number }> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-evals-query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch evals data');
    }
    
    return response.json();
  }
  
  /**
   * Query global evaluation_runs data (admin-only)
   */
  async queryEvaluationRuns(filters: AdminEvaluationRunsFilters = {}): Promise<{ data: any[]; count: number }> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-evaluation-runs-query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch evaluation runs');
    }
    
    return response.json();
  }
  
  /**
   * Get funnel analytics (admin-only)
   */
  async getFunnelStats(since: '7d' | '30d' | '90d' = '30d'): Promise<FunnelStatsResponse> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-funnel-stats`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ since }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch funnel stats');
    }
    
    return response.json();
  }
  
  /**
   * Get user activity leaderboard (admin-only)
   */
  async getLeaderboard(
    since: '7d' | '30d' | '90d' = '30d', 
    limit: number = 100
  ): Promise<LeaderboardResponse> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-leaderboard`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ since, limit }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch leaderboard');
    }
    
    return response.json();
  }
  
  /**
   * Spoof user (admin-only)
   * Returns a session token that allows admin to view app as target user
   */
  async spoofUser(request: SpoofUserRequest): Promise<SpoofUserResponse> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-spoof-user`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to spoof user');
    }
    
    return response.json();
  }
  
  /**
   * Get list of all users (for spoofing dropdown)
   */
  async getAllUsers(limit: number = 100): Promise<AdminUserListItem[]> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit }),
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch users');
    }
    
    const result = await response.json();
    return result.users || [];
  }

  /**
   * Flag or unflag a user account (admin-only)
   */
  async setUserFlag(userId: string, isFlagged: boolean, reason?: string): Promise<AdminUserListItem | null> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-user-flag`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, is_flagged: isFlagged, reason }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user flag');
    }

    const result = await response.json();
    return result.user || null;
  }
}

export const adminService = new AdminService();
