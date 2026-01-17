/**
 * UserSpoofSelector Component
 * 
 * Dropdown to select a user to spoof.
 * Used in admin dashboards for CS/troubleshooting.
 */

import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { adminService } from '../../services/adminService';

export function UserSpoofSelector() {
  const { startSpoofing, isSpoofing } = useAdminAuth();
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  
  useEffect(() => {
    loadUsers();
  }, []);
  
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
              {user.email || user.id}
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
    </div>
  );
}
