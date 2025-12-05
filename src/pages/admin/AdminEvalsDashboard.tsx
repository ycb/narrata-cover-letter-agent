/**
 * Admin Evals Dashboard
 * 
 * Global view of /evals dashboard for all users.
 * Extends PipelineEvaluationDashboard with admin data source.
 */

import React, { useState } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { UserSpoofSelector } from '../../components/admin/UserSpoofSelector';
import { useAdminEvalsData } from '../../hooks/useAdminData';
import type { AdminEvalsFilters } from '../../types/admin';

export function AdminEvalsDashboard() {
  const [filters, setFilters] = useState<AdminEvalsFilters>({
    since: '7d',
    job_type: null,
    user_id: null,
    limit: 1000,
  });
  
  const { data, count, loading, error } = useAdminEvalsData(filters);
  
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin: Pipeline Evals (Global)</h1>
            <p className="mt-2 text-gray-600">
              Global view of pipeline performance, LLM usage, and quality metrics across all users.
            </p>
          </div>
          
          {/* User Spoofing */}
          <div className="mb-6">
            <UserSpoofSelector />
          </div>
          
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  value={filters.since}
                  onChange={(e) => setFilters({ ...filters, since: e.target.value as any })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Type
                </label>
                <select
                  value={filters.job_type || ''}
                  onChange={(e) => setFilters({ ...filters, job_type: e.target.value || null })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">All Types</option>
                  <option value="coverLetter">Cover Letter</option>
                  <option value="pmLevels">PM Levels</option>
                  <option value="onboarding">Onboarding</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User ID (Filter)
                </label>
                <input
                  type="text"
                  value={filters.user_id || ''}
                  onChange={(e) => setFilters({ ...filters, user_id: e.target.value || null })}
                  placeholder="UUID or leave blank"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Limit
                </label>
                <input
                  type="number"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 1000 })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
          
          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading evals data...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {!loading && !error && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">
                  Results <span className="text-gray-500 font-normal">({count} records)</span>
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Job ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Success
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {row.job_id?.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.job_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.stage}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                          {row.user_id?.slice(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {row.success ? (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Success
                            </span>
                          ) : (
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.duration_ms ? `${row.duration_ms}ms` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.total_tokens || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(row.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {data.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No evals data found for the selected filters.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}

