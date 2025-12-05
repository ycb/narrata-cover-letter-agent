/**
 * UserSpoofBanner Component
 * 
 * Displays a prominent banner when admin is spoofing a user.
 * Shows target user info and "Stop Spoofing" button.
 */

import React from 'react';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export function UserSpoofBanner() {
  const { isSpoofing, spoofedUserEmail, stopSpoofing } = useAdminAuth();
  
  if (!isSpoofing) {
    return null;
  }
  
  return (
    <div className="bg-yellow-400 text-yellow-900 px-4 py-3 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="font-semibold">Admin Mode: Viewing as {spoofedUserEmail || 'User'}</span>
        </div>
        <button
          onClick={stopSpoofing}
          className="px-4 py-1 bg-yellow-900 text-yellow-100 rounded hover:bg-yellow-800 transition-colors font-medium text-sm"
        >
          Stop Spoofing
        </button>
      </div>
    </div>
  );
}

