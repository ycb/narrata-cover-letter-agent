/**
 * Admin Evals Dashboard
 * 
 * Global view of pipeline performance across all users.
 * Shows rich UI with latency, quality, token/cost metrics.
 */

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { Card, CardContent } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LatencyOverviewCard } from '../../components/evaluation/pipeline/LatencyOverviewCard';
import { StageLatencyChart } from '../../components/evaluation/pipeline/StageLatencyChart';
import { StructuralChecksCard } from '../../components/evaluation/pipeline/StructuralChecksCard';
import { ErrorTable } from '../../components/evaluation/pipeline/ErrorTable';
import { TokenCostCard } from '../../components/evaluation/pipeline/TokenCostCard';
import { supabase } from '../../lib/supabase';
import { computeAllAggregates } from '../../utils/evalsAggregates';
import { Loader2 } from 'lucide-react';

interface UserOption {
  id: string;
  email: string;
}

export function AdminEvalsDashboard() {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users list
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch evals data
  useEffect(() => {
    fetchEvalsData();
  }, [timeRange, jobTypeFilter, selectedUserId]);

  async function fetchUsers() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

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
    }
  }

  async function fetchEvalsData() {
    setLoading(true);
    setError(null);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-evals-query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: {
              since: timeRange,
              job_type: jobTypeFilter === 'all' ? null : jobTypeFilter,
              user_id: selectedUserId === 'all' ? null : selectedUserId,
              limit: 1000,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || 'Failed to fetch data');
        return;
      }

      const result = await response.json();
      setRawData(result.data || []);
    } catch (err) {
      console.error('Failed to fetch evals data:', err);
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }

  // Compute aggregates from raw data
  const aggregates = rawData.length > 0 
    ? computeAllAggregates(rawData, jobTypeFilter)
    : null;

  if (loading && rawData.length === 0) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-pink-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading pipeline evaluations...</p>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        <AdminNav currentTab="evals" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Admin: Pipeline Evals (Global)</h1>
            <p className="mt-2 text-gray-600">
              Global view of pipeline performance, LLM usage, and quality metrics across all users
            </p>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="coverLetter">Cover Letter</SelectItem>
                      <SelectItem value="pmLevels">PM Levels</SelectItem>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              <div className="mt-4 text-sm text-gray-600">
                Showing {rawData.length} evaluation runs
              </div>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-6 border-red-200">
              <CardContent className="pt-6">
                <p className="text-red-600">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!loading && rawData.length === 0 && !error && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-gray-500 py-8">
                  No evaluation data available for the selected filters.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Rich Dashboard Cards */}
          {aggregates && (
            <div className="space-y-6">
              {/* Row 1: Latency + Token/Cost */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <LatencyOverviewCard 
                  data={aggregates.jobTypeAggregates} 
                  loading={loading} 
                />
                <TokenCostCard 
                  data={aggregates.tokenCost} 
                  loading={loading} 
                />
              </div>

              {/* Row 2: Quality Distribution */}
              <StructuralChecksCard 
                data={aggregates.qualityBuckets} 
                loading={loading} 
              />

              {/* Row 3: Stage Breakdown */}
              <StageLatencyChart 
                data={aggregates.stageAggregates} 
                loading={loading} 
              />

              {/* Row 4: Recent Failures */}
              <ErrorTable 
                data={aggregates.recentFailures} 
                loading={loading} 
              />
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
