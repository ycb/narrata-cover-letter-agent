/**
 * useAdminAuth Hook
 * 
 * Checks if the current user has admin privileges.
 * Use this to gate admin-only routes and features.
 */

import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
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
      
      const role = await adminService.getUserRole();
      const isAdmin = role === 'admin';
      
      // Check if spoofing (stored in localStorage)
      const spoofData = localStorage.getItem('admin_spoof');
      const parsedSpoof = spoofData ? JSON.parse(spoofData) : null;
      
      setState({
        isAdmin,
        role,
        isSpoofing: !!parsedSpoof,
        originalUserId: parsedSpoof?.original_user_id || null,
        spoofedUserId: parsedSpoof?.target_user_id || null,
        spoofedUserEmail: parsedSpoof?.target_user_email || null,
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
      const result = await adminService.spoofUser({ target_user_id: targetUserId });
      
      // Store spoof data in localStorage
      localStorage.setItem('admin_spoof', JSON.stringify({
        original_user_id: state.originalUserId, // TODO: Get from current session
        target_user_id: result.target_user.id,
        target_user_email: result.target_user.email,
        expires_at: result.expires_at,
      }));
      
      // Reload page to apply new session
      // TODO: More elegant approach would be to update Supabase client session
      window.location.reload();
    } catch (err) {
      console.error('Failed to start spoofing:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }
  
  function stopSpoofing() {
    localStorage.removeItem('admin_spoof');
    window.location.reload();
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

