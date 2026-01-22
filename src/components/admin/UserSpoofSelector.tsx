/**
 * UserSpoofSelector Component
 * 
 * Dropdown to select a user to spoof.
 * Used in admin dashboards for CS/troubleshooting.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminService } from '../../services/adminService';
import type { AdminUserListItem } from '../../types/admin';

export function UserSpoofSelector() {
  const { startSpoofing, isSpoofing } = useAdminAuth();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagSubmitting, setFlagSubmitting] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) ?? null,
    [users, selectedUserId]
  );
  
  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setFlagReason(selectedUser.flag_reason ?? '');
    } else {
      setFlagReason('');
    }
  }, [selectedUser]);
  
  async function loadUsers() {
    try {
      setLoading(true);
      const userList = await adminService.getAllUsers(100);
      setUsers(userList);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }
  
  async function handleSpoof() {
    if (!selectedUserId) {
      return;
    }
    
    try {
      await startSpoofing(selectedUserId);
    } catch (err) {
      console.error('Failed to spoof user:', err);
      alert(`Failed to spoof user: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function handleFlagUpdate(isFlagged: boolean) {
    if (!selectedUserId) {
      return;
    }

    try {
      setFlagSubmitting(true);
      await adminService.setUserFlag(selectedUserId, isFlagged, flagReason);
      await loadUsers();
    } catch (err) {
      console.error('Failed to update user flag:', err);
      alert(`Failed to update user flag: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setFlagSubmitting(false);
    }
  }
  
  if (isSpoofing) {
    return null; // Hide when already spoofing
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        View as User (Admin)
      </label>
      <div className="flex space-x-2">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        >
          <option value="">Select a user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email || user.id}{user.is_flagged ? ' (flagged)' : ''}
            </option>
          ))}
        </select>
        <button
          onClick={handleSpoof}
          disabled={!selectedUserId || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Spoof
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        This will open the app as the selected user (same RLS scope).
      </p>

      {selectedUser && (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-700">
              Account review status
            </div>
            <span className={`text-xs font-semibold ${selectedUser.is_flagged ? 'text-amber-700' : 'text-gray-500'}`}>
              {selectedUser.is_flagged ? 'Flagged' : 'Not flagged'}
            </span>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Flag reason (internal)
            </label>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a brief reason for flagging this account..."
            />
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleFlagUpdate(true)}
              disabled={flagSubmitting}
              className="px-3 py-2 text-sm rounded bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-300"
            >
              Flag user
            </button>
            <button
              onClick={() => handleFlagUpdate(false)}
              disabled={flagSubmitting}
              className="px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:text-gray-400"
            >
              Clear flag
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
