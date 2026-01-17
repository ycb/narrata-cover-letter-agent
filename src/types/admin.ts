/**
 * Admin Tooling Types
 * 
 * Types for admin dashboards, funnel analytics, and user spoofing.
 */

// ============================================================================
// User Role
// ============================================================================

export type UserRole = 'user' | 'admin' | 'viewer';

export interface UserRoleData {
  user_id: string;
  role: UserRole;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

// ============================================================================
// User Events (Funnel Tracking)
// ============================================================================

export type UserEventType =
  | 'account_created'
  | 'email_verified'
  | 'first_login'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'product_tour_started'
  | 'product_tour_completed'
  | 'checklist_completed'
  | 'first_cl_created'
  | 'first_cl_saved'
  | 'admin_spoofed_user';

export interface UserEvent {
  id: string;
  user_id: string;
  event_type: UserEventType;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Funnel Analytics
// ============================================================================

export interface FunnelStage {
  stage: string;
  stage_order: number;
  users_reached: number;
  conversion_rate: number;
  avg_time_to_next_stage_hours: number | null;
}

export interface FunnelStatsResponse {
  data: FunnelStage[];
  since: string;
  generated_at: string;
}

// ============================================================================
// User Activity Leaderboard
// ============================================================================

export interface LeaderboardUser {
  user_id: string;
  user_email: string;
  sessions: number;
  stories_count: number;
  metrics_count: number;
  saved_sections_count: number;
  cover_letters_created: number;
  cover_letters_saved: number;
  total_activity_score: number;
  rank: number;
}

export interface LeaderboardResponse {
  data: LeaderboardUser[];
  count: number;
  since: string;
  limit: number;
  generated_at: string;
}

// ============================================================================
// Admin Query Filters
// ============================================================================

export interface AdminEvalsFilters {
  since?: '7d' | '30d' | '90d';
  job_type?: 'coverLetter' | 'pmLevels' | 'onboarding' | null;
  user_id?: string | null;
  limit?: number;
}

export interface AdminEvaluationRunsFilters {
  since?: '7d' | '30d' | '90d';
  llm_call_type?: string | null;
  user_id?: string | null;
  limit?: number;
}

// ============================================================================
// User Spoofing
// ============================================================================

export interface SpoofUserRequest {
  target_user_id: string;
  redirect_to?: string;
}

export interface SpoofUserResponse {
  spoof_token: string;
  target_user: {
    id: string;
    email: string;
  };
  expires_at: string;
  warning: string;
}

// ============================================================================
// Admin Dashboard State
// ============================================================================

export interface AdminState {
  isAdmin: boolean;
  role: UserRole | null;
  isSpoofing: boolean;
  originalUserId: string | null;
  spoofedUserId: string | null;
  spoofedUserEmail: string | null;
}
