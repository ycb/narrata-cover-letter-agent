/**
 * useAdminAuth Hook
 * 
 * Checks if the current user has admin privileges.
 * Use this to gate admin-only routes and features.
 */

import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { supabase } from '../lib/supabase';
import type { UserRole, AdminState } from '../types/admin';

export function useAdminAuth() {
  const [state, setState] = useState<AdminState>({
    isAdmin: false,
    role: null,
    isSpoofing: false,
    originalUserId: null,
    spoofedUserId: null,
    spoofedUserEmail: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    checkAdminStatus();
  }, []);
  
  async function checkAdminStatus() {
    try {
      setLoading(true);
      setError(null);
      
      // Check if spoofing (stored in localStorage)
      const spoofData = localStorage.getItem('admin_spoof');
      const parsedSpoof = spoofData ? JSON.parse(spoofData) : null;

      if (parsedSpoof?.target_user_id) {
        setState({
          isAdmin: false,
          role: null,
          isSpoofing: true,
          originalUserId: parsedSpoof?.original_user_id || null,
          spoofedUserId: parsedSpoof?.target_user_id || null,
          spoofedUserEmail: parsedSpoof?.target_user_email || null,
        });
        return;
      }

      const role = await adminService.getUserRole();
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = role === 'admin';

      setState({
        isAdmin,
        role,
        isSpoofing: false,
        originalUserId: user?.id || null,
        spoofedUserId: null,
        spoofedUserEmail: null,
      });
    } catch (err) {
      console.error('Failed to check admin status:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState({
        isAdmin: false,
        role: null,
        isSpoofing: false,
        originalUserId: null,
        spoofedUserId: null,
        spoofedUserEmail: null,
      });
    } finally {
      setLoading(false);
    }
  }
  
  async function startSpoofing(targetUserId: string) {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active admin session');
      }

      const redirectTo = `${window.location.origin}/auth/callback?redirect=/dashboard`;
      const result = await adminService.spoofUser({
        target_user_id: targetUserId,
        redirect_to: redirectTo,
      });
      
      // Store spoof data in localStorage
      localStorage.setItem('admin_spoof', JSON.stringify({
        original_user_id: session.user.id,
        original_session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
        },
        target_user_id: result.target_user.id,
        target_user_email: result.target_user.email,
        expires_at: result.expires_at,
      }));
      
      const actionUrl = new URL(result.spoof_token);
      const tokenHash =
        actionUrl.searchParams.get('token') || actionUrl.searchParams.get('token_hash');
      const otpType = actionUrl.searchParams.get('type') || 'magiclink';

      if (!tokenHash) {
        window.location.assign(result.spoof_token);
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType as 'magiclink' | 'signup' | 'recovery' | 'invite' | 'email',
      });

      if (verifyError) {
        console.error('Failed to verify spoof token:', verifyError);
        window.location.assign(result.spoof_token);
        return;
      }

      window.location.assign('/dashboard');
    } catch (err) {
      console.error('Failed to start spoofing:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }
  
  async function stopSpoofing() {
    const spoofData = localStorage.getItem('admin_spoof');
    if (!spoofData) {
      return;
    }

    const parsedSpoof = JSON.parse(spoofData);
    const originalSession = parsedSpoof?.original_session;

    if (!originalSession?.access_token || !originalSession?.refresh_token) {
      localStorage.removeItem('admin_spoof');
      await supabase.auth.signOut();
      window.location.assign('/signin');
      return;
    }

    const { error: restoreError } = await supabase.auth.setSession({
      access_token: originalSession.access_token,
      refresh_token: originalSession.refresh_token,
    });

    if (restoreError) {
      console.error('Failed to restore admin session:', restoreError);
      localStorage.removeItem('admin_spoof');
      await supabase.auth.signOut();
      window.location.assign('/signin');
      return;
    }

    localStorage.removeItem('admin_spoof');
    window.location.assign('/admin/spoof');
  }
  
  return {
    ...state,
    loading,
    error,
    checkAdminStatus,
    startSpoofing,
    stopSpoofing,
  };
}
