/**
 * Admin Debug Page
 * 
 * Diagnostic page to check admin authentication flow.
 * Visit /admin/debug to see what's happening.
 */

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function AdminDebug() {
  const [user, setUser] = useState<any>(null);
  const [roleData, setRoleData] = useState<any>(null);
  const [roleError, setRoleError] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  async function checkAuth() {
    try {
      setLoading(true);
      
      // 1. Check if user is authenticated
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('[AdminDebug] Auth user:', authUser);
      console.log('[AdminDebug] Auth error:', authError);
      setUser(authUser);
      
      if (!authUser) {
        setLoading(false);
        return;
      }
      
      // 2. Try to fetch role from user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authUser.id)
        .single();
      
      console.log('[AdminDebug] Role data:', data);
      console.log('[AdminDebug] Role error:', error);
      
      setRoleData(data);
      setRoleError(error);
    } catch (err) {
      console.error('[AdminDebug] Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading debug info...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Auth Debug</h1>
        
        {/* User Auth Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">1. User Authentication</h2>
          {user ? (
            <div className="space-y-2">
              <p className="text-green-600 font-semibold">✅ User is authenticated</p>
              <div className="bg-gray-50 p-4 rounded font-mono text-sm">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Created:</strong> {user.created_at}</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600 font-semibold">❌ No authenticated user</p>
          )}
        </div>
        
        {/* Role Data */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">2. User Role Query</h2>
          {roleError ? (
            <div className="space-y-2">
              <p className="text-red-600 font-semibold">❌ Error fetching role</p>
              <div className="bg-red-50 p-4 rounded font-mono text-sm text-red-800">
                <p><strong>Error Code:</strong> {roleError.code}</p>
                <p><strong>Message:</strong> {roleError.message}</p>
                <p><strong>Details:</strong> {roleError.details}</p>
                <p><strong>Hint:</strong> {roleError.hint}</p>
              </div>
            </div>
          ) : roleData ? (
            <div className="space-y-2">
              <p className="text-green-600 font-semibold">✅ Role found</p>
              <div className="bg-gray-50 p-4 rounded font-mono text-sm">
                <p><strong>Role:</strong> {roleData.role}</p>
                <p><strong>Created:</strong> {roleData.created_at}</p>
                <p><strong>Is Admin:</strong> {roleData.role === 'admin' ? 'YES ✅' : 'NO ❌'}</p>
              </div>
            </div>
          ) : (
            <p className="text-yellow-600 font-semibold">⚠️ No role found (user_roles table empty for this user)</p>
          )}
        </div>
        
        {/* Expected vs Actual */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">3. Diagnosis</h2>
          {user && roleData && roleData.role === 'admin' ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 font-semibold">✅ Everything looks good!</p>
              <p className="text-green-700 mt-2">You should be able to access admin dashboards.</p>
              <p className="text-green-700 mt-2">If /admin/evals still redirects, try:</p>
              <ul className="list-disc ml-6 mt-2 text-green-700">
                <li>Hard refresh (Cmd+Shift+R)</li>
                <li>Clear localStorage and cookies</li>
                <li>Log out and log back in</li>
              </ul>
            </div>
          ) : !user ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="text-red-800 font-semibold">❌ Not authenticated</p>
              <p className="text-red-700 mt-2">Please log in first.</p>
            </div>
          ) : !roleData ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 font-semibold">⚠️ No admin role assigned</p>
              <p className="text-yellow-700 mt-2">Run this SQL in Supabase Dashboard:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded mt-2 overflow-x-auto">
{`INSERT INTO user_roles (user_id, role) 
VALUES ('${user?.id}', 'admin');`}
              </pre>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
              <p className="text-yellow-800 font-semibold">⚠️ Role is not 'admin'</p>
              <p className="text-yellow-700 mt-2">Current role: <strong>{roleData.role}</strong></p>
              <p className="text-yellow-700 mt-2">Update to admin with this SQL:</p>
              <pre className="bg-gray-900 text-green-400 p-4 rounded mt-2 overflow-x-auto">
{`UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = '${user?.id}';`}
              </pre>
            </div>
          )}
        </div>
        
        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh Debug Info
          </button>
        </div>
      </div>
    </div>
  );
}

