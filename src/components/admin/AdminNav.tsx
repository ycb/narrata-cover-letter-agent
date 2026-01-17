/**
 * AdminNav Component
 * 
 * Navigation tabs for admin dashboards.
 * Allows quick switching between admin tools.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Cpu, TrendingUp, Trophy, FileCheck, UserRound } from 'lucide-react';

interface AdminNavProps {
  currentTab?: string;
}

export function AdminNav({ currentTab }: AdminNavProps = {}) {
  const location = useLocation();
  
  const tabs = [
    { name: 'Pipeline Evals', href: '/admin/evals', icon: Cpu, key: 'evals' },
    { name: 'File Upload Quality', href: '/admin/evaluation', icon: FileCheck, key: 'evaluation' },
    { name: 'Funnel Analytics', href: '/admin/funnel', icon: TrendingUp, key: 'funnel' },
    { name: 'User Leaderboard', href: '/admin/leaderboard', icon: Trophy, key: 'leaderboard' },
    { name: 'View As User', href: '/admin/spoof', icon: UserRound, key: 'spoof' },
  ];
  
  return (
    <div className="border-b border-gray-200 bg-white">
      <nav className="-mb-px flex space-x-8 px-6" aria-label="Admin navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab ? tab.key === currentTab : location.pathname === tab.href;
          
          return (
            <Link
              key={tab.name}
              to={tab.href}
              className={cn(
                isActive
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-colors'
              )}
            >
              <Icon
                className={cn(
                  isActive ? 'text-pink-500' : 'text-gray-400 group-hover:text-gray-500',
                  'mr-2 h-5 w-5 transition-colors'
                )}
                aria-hidden="true"
              />
              {tab.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
