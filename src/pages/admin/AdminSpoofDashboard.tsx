/**
 * Admin Spoof Dashboard
 * 
 * View the app as another user for support/debugging.
 */

import React from 'react';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { AdminNav } from '../../components/admin/AdminNav';
import { UserSpoofBanner } from '../../components/admin/UserSpoofBanner';
import { UserSpoofSelector } from '../../components/admin/UserSpoofSelector';

export function AdminSpoofDashboard() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-50">
        <UserSpoofBanner />
        <AdminNav currentTab="spoof" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin: View As User</h1>
            <p className="mt-2 text-gray-600">
              Select a user to load their experience in your session. This uses the same RLS
              permissions as the user and is intended for support/debugging only.
            </p>
          </div>

          <UserSpoofSelector />
        </div>
      </div>
    </AdminGuard>
  );
}
