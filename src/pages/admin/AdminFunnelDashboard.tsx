import React, { useEffect, useMemo, useState } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import {
  useFunnelStats,
  useFunnelStageDropoff,
  useFunnelStageUsers,
} from '../../hooks/useAdminData';

const STAGE_META: Record<string, { label: string; flow: string }> = {
  account_created: { label: 'Account created', flow: 'Onboard' },
  onboarding_completed: { label: 'Onboarding completed', flow: 'Onboard' },
  dashboard_viewed: { label: 'Dashboard viewed', flow: 'Onboard' },
  work_history_edited: { label: 'Work history edited', flow: 'Setup' },
  saved_section_edited: { label: 'Saved section edited', flow: 'Setup' },
  template_edited: { label: 'Template edited', flow: 'Setup' },
  cover_letter_created: { label: 'Cover letter created', flow: 'Usage' },
  cover_letter_saved: { label: 'Cover letter saved', flow: 'Usage' },
  checklist_completed: { label: 'Checklist completed', flow: 'Onboard' },
};

const formatTimestamp = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '—';

const formatGeo = (city?: string | null, region?: string | null, country?: string | null) => {
  const parts = [city, region, country].filter((value) => value && value.trim());
  if (parts.length > 0) return parts.join(', ');
  return '—';
};

const formatIp = (ip?: string | null, geo?: Record<string, unknown> | null) => {
  if (ip) return ip;
  if (geo && typeof geo === 'object' && typeof (geo as any).ip === 'string') {
    return (geo as any).ip as string;
  }
  return '—';
};

export function AdminFunnelDashboard() {
  const [since, setSince] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, loading, error } = useFunnelStats(since);
  const [selectedStage, setSelectedStage] = useState<string>('account_created');
  const stageStats = data?.data || [];
  const stageOptions = stageStats.length > 0 ? stageStats : [];
  const selectedStageData = useMemo(
    () => stageStats.find((stage) => stage.stage === selectedStage) ?? stageStats[0],
    [selectedStage, stageStats]
  );
  const stageFlow = STAGE_META[selectedStage]?.flow || 'Flow';

  const {
    data: stageUsers,
    loading: stageUsersLoading,
    error: stageUsersError,
  } = useFunnelStageUsers(selectedStage);
  const {
    data: dropoffUsers,
    loading: dropoffLoading,
    error: dropoffError,
  } = useFunnelStageDropoff(selectedStage);

  useEffect(() => {
    if (!stageOptions.length) return;
    if (stageOptions.some((stage) => stage.stage === selectedStage)) return;
    setSelectedStage(stageOptions[0].stage);
  }, [stageOptions, selectedStage]);

  const headerActionLabel = since === '7d' ? 'Last 7 days' : since === '90d' ? 'Last 90 days' : 'Last 30 days';

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        <AdminNav />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Admin: User Funnel Analytics</h1>
            <p className="mt-2 text-gray-600">
              Track user progression through onboarding and key product milestones.
            </p>
          </header>

          <section className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Conversion Funnel</h2>
                <p className="text-sm text-gray-500">{headerActionLabel}</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600">Time Range</label>
                <select
                  value={since}
                  onChange={(e) => setSince(e.target.value as '7d' | '30d' | '90d')}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading funnel stats...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <strong>Error:</strong> {error}
              </div>
            )}

            {!loading && !error && stageOptions.length > 0 && (
              <div className="space-y-4">
                {stageOptions.map((stage, index) => {
                  const prevStage = index > 0 ? stageOptions[index - 1] : null;
                  const dropOff = prevStage
                    ? ((prevStage.users_reached - stage.users_reached) / (prevStage.users_reached || 1) * 100).toFixed(1)
                    : '0';
                  const isSelected = stage.stage === selectedStage;

                  return (
                    <button
                      key={stage.stage}
                      type="button"
                      onClick={() => setSelectedStage(stage.stage)}
                      className={`relative w-full rounded-lg border ${isSelected ? 'border-blue-500 bg-blue-50 shadow' : 'border-transparent bg-gray-50'} p-5 text-left transition-colors`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-700 w-6">
                            {stage.stage_order}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {STAGE_META[stage.stage]?.label || stage.stage.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-600">
                            {stage.users_reached} users
                          </span>
                          <span className="text-sm font-semibold text-blue-600">
                            {stage.conversion_rate}%
                          </span>
                          {index > 0 && (
                            <span className="text-sm text-red-600">
                              -{dropOff}% drop
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-8">
                        <div
                          className="bg-blue-600 h-8 rounded-full flex items-center justify-end px-3 transition-all"
                          style={{ width: `${stage.conversion_rate}%` }}
                        >
                          <span className="text-xs font-semibold text-white">
                            {stage.conversion_rate}%
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users Started</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {stageOptions[0]?.users_reached || 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Onboarding</h3>
                <p className="text-3xl font-bold text-gray-900">
                  {stageOptions.find((s) => s.stage === 'onboarding_completed')?.users_reached || 0}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
                <h3 className="text-sm font-medium text-gray-500 mb-2">End-to-End Conversion</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {stageOptions[stageOptions.length - 1]?.conversion_rate || 0}%
                </p>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Stage detail</p>
                <h3 className="text-2xl font-semibold text-gray-900">{STAGE_META[selectedStage]?.label || selectedStage}</h3>
                <p className="text-sm text-gray-500">
                  {stageFlow} · {selectedStageData?.users_reached ?? 0} users reached
                </p>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Users at stage: {stageUsers?.length || 0}</p>
                <p>Dropped off before {STAGE_META[selectedStage]?.label || selectedStage}: {dropoffUsers?.length || 0}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-700">Users at stage</h4>
                  <p className="text-xs text-gray-500">Latest users and their metadata</p>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {stageUsersLoading && (
                    <div className="px-4 py-6 text-sm text-gray-500">Loading users...</div>
                  )}
                  {stageUsersError && (
                    <div className="px-4 py-6 text-sm text-red-600">Error: {stageUsersError}</div>
                  )}
                  {!stageUsersLoading && !stageUsersError && stageUsers?.length === 0 && (
                    <div className="px-4 py-6 text-sm text-gray-500">No users have reached this stage yet.</div>
                  )}
                  {stageUsers?.map((user) => (
                    <div key={user.user_id} className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(user.stage_timestamp)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                        <span>Acquisition: {user.acquisition_source || '—'}</span>
                        <span>IP: {formatIp(user.signup_ip, user.geo)}</span>
                        <span>Geo: {formatGeo(user.geo_city, user.geo_region, user.geo_country)}</span>
                        <span>First visit: {formatTimestamp(user.first_visit_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-3">
                  <h4 className="text-sm font-semibold text-gray-700">Dropped off before stage</h4>
                  <p className="text-xs text-gray-500">Users who reached the prior milestone</p>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                  {dropoffLoading && (
                    <div className="px-4 py-6 text-sm text-gray-500">Loading drop-offs...</div>
                  )}
                  {dropoffError && (
                    <div className="px-4 py-6 text-sm text-red-600">Error: {dropoffError}</div>
                  )}
                  {!dropoffLoading && !dropoffError && dropoffUsers?.length === 0 && (
                    <div className="px-4 py-6 text-sm text-gray-500">No drop-offs recorded at this time.</div>
                  )}
                  {dropoffUsers?.map((user) => (
                    <div key={user.user_id} className="px-4 py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                        <p className="text-xs text-gray-500">{formatTimestamp(user.previous_stage_timestamp)}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                        <span>Previous: {user.previous_stage || '—'}</span>
                        <span>Missing: {user.missing_stage}</span>
                        <span>Acquisition: {user.acquisition_source || '—'}</span>
                        <span>IP: {formatIp(user.signup_ip, user.geo)}</span>
                        <span>Geo: {formatGeo(user.geo_city, user.geo_region, user.geo_country)}</span>
                        <span>First visit: {formatTimestamp(user.first_visit_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AdminGuard>
  );
}
