/**
 * Admin Evaluation Dashboard
 * 
 * Global version of /evaluation-dashboard showing ALL users' data.
 * Same rich UI (cards, charts, flags, document previews) with global controls.
 */

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { EvaluationDashboard } from '../../components/evaluation/EvaluationDashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import { supabase } from '../../lib/supabase';

interface UserOption {
  id: string;
  email: string;
}

export function AdminEvaluationDashboard() {
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'real' | 'synthetic'>('all');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'go' | 'nogo' | 'needs-review'>('all');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        console.error('Not authenticated');
        return;
      }

      // Fetch list of users from admin endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ limit: 1000 }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const users = (result.users || []).map((u: any) => ({
          id: u.id,
          email: u.email || `User ${u.id.slice(0, 8)}...`,
        }));
        setUserOptions(users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading users...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        <AdminNav currentTab="evaluation" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin: File Upload Quality (Global)</h1>
            <p className="mt-2 text-gray-600">
              Global view of resume and cover letter parsing quality with search, sort, and filter controls
            </p>
          </div>

          {/* Global Controls */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by User</label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users ({userOptions.length})</SelectItem>
                      {userOptions
                        .sort((a, b) => a.email.localeCompare(b.email))
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                  <Select value={userTypeFilter} onValueChange={(v: any) => setUserTypeFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="real">Real Users</SelectItem>
                      <SelectItem value="synthetic">Synthetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quality Status</label>
                  <Select value={qualityFilter} onValueChange={(v: any) => setQualityFilter(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="go">Go (≥0.8)</SelectItem>
                      <SelectItem value="nogo">No Go (&lt;0.5)</SelectItem>
                      <SelectItem value="needs-review">Needs Review (0.5-0.8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Original Rich Dashboard */}
          <EvaluationDashboard 
            isAdminView={true}
            adminUserId={selectedUserId === 'all' ? undefined : selectedUserId}
            adminUserType={userTypeFilter}
            adminQualityFilter={qualityFilter}
          />
        </div>
      </div>
    </AdminGuard>
  );
}
