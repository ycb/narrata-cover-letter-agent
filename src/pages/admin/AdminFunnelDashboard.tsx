/**
 * Admin Funnel Dashboard
 * 
 * User progression funnel analytics.
 * Shows conversion rates at each stage of onboarding.
 */

import React, { useState } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { useFunnelStats } from '../../hooks/useAdminData';

export function AdminFunnelDashboard() {
  const [since, setSince] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, loading, error } = useFunnelStats(since);
  
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin: User Funnel Analytics</h1>
            <p className="mt-2 text-gray-600">
              Track user progression through onboarding and key product milestones.
            </p>
          </div>
          
          {/* Time Range Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={since}
              onChange={(e) => setSince(e.target.value as any)}
              className="border border-gray-300 rounded px-3 py-2"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          
          {/* Results */}
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
          
          {!loading && !error && data && (
            <>
              {/* Funnel Visualization */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Conversion Funnel</h2>
                <div className="space-y-4">
                  {data.data.map((stage, index) => {
                    const prevStage = index > 0 ? data.data[index - 1] : null;
                    const dropOff = prevStage 
                      ? ((prevStage.users_reached - stage.users_reached) / prevStage.users_reached * 100).toFixed(1)
                      : '0';
                    
                    return (
                      <div key={stage.stage} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-medium text-gray-700 w-6">
                              {stage.stage_order}
                            </span>
                            <span className="text-sm font-medium text-gray-900 capitalize">
                              {stage.stage.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4">
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
                        
                        {/* Progress Bar */}
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
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users Started</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.data[0]?.users_reached || 0}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Onboarding</h3>
                  <p className="text-3xl font-bold text-gray-900">
                    {data.data.find(s => s.stage === 'onboarding_completed')?.users_reached || 0}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">End-to-End Conversion</h3>
                  <p className="text-3xl font-bold text-blue-600">
                    {data.data[data.data.length - 1]?.conversion_rate || 0}%
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

