/**
 * Admin Leaderboard Dashboard
 * 
 * User activity leaderboard.
 * Ranks users by activity score (weighted sum of actions).
 */

import React, { useState } from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { useLeaderboard } from '../../hooks/useAdminData';

export function AdminLeaderboardDashboard() {
  const [since, setSince] = useState<'7d' | '30d' | '90d'>('30d');
  const [limit, setLimit] = useState(100);
  const { data, loading, error } = useLeaderboard(since, limit);
  
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        <AdminNav />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin: User Activity Leaderboard</h1>
            <p className="mt-2 text-gray-600">
              Top users ranked by activity score (stories, metrics, saved sections, cover letters).
            </p>
          </div>
          
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Limit
                </label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
                  className="border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
          </div>
          
          {/* Results */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading leaderboard...</p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {!loading && !error && data && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">
                  Top {data.count} Users
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sessions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stories
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metrics
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saved Sections
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CLs Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CLs Saved
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.data.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.rank <= 3 && (
                              <span className="text-2xl mr-2">
                                {user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'}
                              </span>
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              #{user.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.user_email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.sessions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.stories_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.metrics_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.saved_sections_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.cover_letters_created}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.cover_letters_saved}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {user.total_activity_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {data.data.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No users with activity in the selected time range.
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

