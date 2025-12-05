# Admin Tooling Suite — Implementation Complete ✅

**Date**: 2025-12-06  
**Status**: Phase 1 & 2 Complete (Foundation + Global Evals + Spoofing)  
**Total LOE**: 16-20 hours (Phase 1-4), 6-8 hours delivered in this sprint  

---

## 📋 What We Built

### Phase 1: Foundation (Database + Backend) ✅

**Migrations:**
1. `20251206_create_user_roles.sql`
   - `user_roles` table (user_id, role, created_at)
   - RLS policies (admins can manage all, users can read own)
   - `is_admin(user_id)` helper function
   - Indexes on role and created_at

2. `20251207_create_user_events.sql`
   - `user_events` table (user_id, event_type, metadata, created_at)
   - Event types: account_created, email_verified, first_login, onboarding_started, onboarding_completed, product_tour_started, product_tour_completed, checklist_completed, first_cl_created, first_cl_saved, admin_spoofed_user
   - `log_user_event(user_id, event_type, metadata)` helper function
   - `get_funnel_stats(since_date)` aggregate function
   - `get_user_activity_leaderboard(since_date, limit)` aggregate function
   - Indexes on user_id, event_type, created_at

**Edge Functions:**
1. `admin-evals-query` — Global evals_log data (bypasses RLS)
2. `admin-evaluation-runs-query` — Global evaluation_runs data (bypasses RLS)
3. `admin-funnel-stats` — Funnel analytics
4. `admin-leaderboard` — User activity leaderboard
5. `admin-spoof-user` — User spoofing token generation

**Shared Utilities:**
- `_shared/admin-client.ts` — Service role Supabase client
- `_shared/admin-guard.ts` — Admin role verification middleware

---

### Phase 2: Global Evals + Spoofing (Frontend) ✅

**Types:**
- `src/types/admin.ts` — UserRole, UserEvent, FunnelStage, LeaderboardUser, AdminEvalsFilters, AdminEvaluationRunsFilters, SpoofUserRequest, SpoofUserResponse, AdminState

**Services:**
- `src/services/adminService.ts` — Frontend service layer for admin tools
  - `isAdmin()` — Check if current user is admin
  - `getUserRole()` — Get current user's role
  - `queryEvalsLog(filters)` — Global evals data
  - `queryEvaluationRuns(filters)` — Global evaluation runs
  - `getFunnelStats(since)` — Funnel analytics
  - `getLeaderboard(since, limit)` — User activity leaderboard
  - `spoofUser(target_user_id)` — Start spoofing
  - `getAllUsers(limit)` — Get user list for spoofing dropdown

**Hooks:**
- `src/hooks/useAdminAuth.ts` — Admin auth state + spoofing control
- `src/hooks/useAdminData.ts` — Admin data fetching (evals, funnel, leaderboard)

**Components:**
- `src/components/admin/AdminGuard.tsx` — Route guard for admin-only pages
- `src/components/admin/UserSpoofBanner.tsx` — Prominent banner when spoofing
- `src/components/admin/UserSpoofSelector.tsx` — Dropdown to select user to spoof

**Pages:**
- `src/pages/admin/AdminEvalsDashboard.tsx` — Global /evals view
- `src/pages/admin/AdminFunnelDashboard.tsx` — User progression funnel
- `src/pages/admin/AdminLeaderboardDashboard.tsx` — User activity leaderboard

**Routes (App.tsx):**
- `/admin/evals` — Global evals dashboard
- `/admin/funnel` — Funnel analytics
- `/admin/leaderboard` — User leaderboard

---

## 🎯 Feature Highlights

### 1. Global Evals Dashboard (`/admin/evals`)
- View `evals_log` data for **all users** (bypasses RLS)
- Filters: time range (7d/30d/90d), job type, user ID, limit
- Table view: job_id, type, stage, user_id, success, duration, tokens, created_at
- Includes user spoofing selector for CS

### 2. Funnel Analytics (`/admin/funnel`)
- Funnel stages: account_created → email_verified → first_login → onboarding_started → onboarding_completed → product_tour_started → product_tour_completed → checklist_completed
- Conversion rate at each stage
- Drop-off % between stages
- Visual progress bars

### 3. User Activity Leaderboard (`/admin/leaderboard`)
- Ranks users by activity score (weighted sum):
  - Sessions: 1pt
  - Stories: 5pts
  - Metrics: 2pts
  - Saved Sections: 3pts
  - CLs Created: 10pts
  - CLs Saved: 15pts
- Table view: rank, email, sessions, stories, metrics, saved_sections, CLs created, CLs saved, total score
- Medal icons for top 3

### 4. User Spoofing
- Admin can "become" any user to see their exact view (RLS-scoped)
- Generates temporary session token (1 hour expiry)
- Prominent yellow banner when spoofing
- "Stop Spoofing" button to return to admin view
- Audit trail: all spoofing actions logged to `user_events`

---

## 📦 Deployment Checklist

### 1. Database Migrations

```bash
# Apply migrations locally
supabase db push

# Or apply manually via SQL Editor:
# 1. Copy contents of supabase/migrations/20251206_create_user_roles.sql
# 2. Run in SQL Editor
# 3. Copy contents of supabase/migrations/20251207_create_user_events.sql
# 4. Run in SQL Editor

# Verify tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND (tablename = 'user_roles' OR tablename = 'user_events');

# Verify functions exist
SELECT proname FROM pg_proc WHERE proname IN ('is_admin', 'log_user_event', 'get_funnel_stats', 'get_user_activity_leaderboard');
```

### 2. Make Yourself Admin

```sql
-- Find your user_id
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Grant admin role
INSERT INTO user_roles (user_id, role) 
VALUES ('<your-user-id-from-above>', 'admin');

-- Verify
SELECT * FROM user_roles WHERE user_id = '<your-user-id>';
```

### 3. Deploy Edge Functions

```bash
# Deploy all 5 admin Edge Functions
supabase functions deploy admin-evals-query
supabase functions deploy admin-evaluation-runs-query
supabase functions deploy admin-funnel-stats
supabase functions deploy admin-leaderboard
supabase functions deploy admin-spoof-user

# Verify deployment
supabase functions list
```

### 4. Frontend Deployment

```bash
# No special steps — just deploy as usual
# Admin routes are protected by AdminGuard (checks user_roles table)
```

---

## 🧪 Testing

### 1. Admin Access

```bash
# 1. Navigate to /admin/evals
# 2. If not admin → should redirect to /
# 3. If admin → should show global evals dashboard
```

### 2. Global Evals Data

```bash
# 1. Create some evals_log data (via instrumented pipelines)
# 2. Visit /admin/evals
# 3. Should see ALL users' data (not just yours)
# 4. Try filters: 7d/30d/90d, job_type, user_id
```

### 3. Funnel Analytics

```bash
# 1. Visit /admin/funnel
# 2. Should see funnel stages with conversion rates
# 3. Try different time ranges (7d/30d/90d)
```

### 4. Leaderboard

```bash
# 1. Visit /admin/leaderboard
# 2. Should see users ranked by activity score
# 3. Try different time ranges and limits
```

### 5. User Spoofing

```bash
# 1. Visit /admin/evals
# 2. Use "View as User" dropdown
# 3. Select a user and click "Spoof"
# 4. Page should reload with yellow banner
# 5. Navigate to /evals (regular dashboard)
# 6. Should see ONLY that user's data
# 7. Click "Stop Spoofing" to return to admin view
# 8. Check user_events table for audit trail:
#    SELECT * FROM user_events WHERE event_type = 'admin_spoofed_user';
```

---

## 🔒 Security

### RLS Policies
- `user_roles`: Admins can read/write all, users can read own role
- `user_events`: Admins can read all, users can insert own events
- `evals_log`: Regular RLS remains (admin Edge Functions bypass via service role)
- `evaluation_runs`: Regular RLS remains (admin Edge Functions bypass via service role)

### Service Role Usage
- Admin Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Service role key **NEVER** exposed to frontend
- Admin guard middleware verifies role before allowing service role queries

### Audit Trail
- All user spoofing actions logged to `user_events`
- Includes: admin_user_id, target_user_id, target_user_email, timestamp

---

## 🚀 Phase 3 & 4 (Future Work)

### Phase 3: Admin Evaluation Dashboard (4-6 hours)
- Global view of `/evaluation-dashboard` (file upload quality)
- Same filters/spoofing as evals dashboard

### Phase 4: Event Instrumentation (4-6 hours)
- Add `log_user_event()` calls to frontend flows:
  - Sign up → `account_created`
  - Email verification → `email_verified`
  - First login → `first_login`
  - Onboarding start → `onboarding_started`
  - Onboarding complete → `onboarding_completed`
  - Product tour start/complete → `product_tour_started`, `product_tour_completed`
  - Checklist complete → `checklist_completed`
  - First CL created/saved → `first_cl_created`, `first_cl_saved`

---

## 📚 Documentation

- **Implementation Plan**: This file
- **API Reference**: `/docs/admin/ADMIN_API_REFERENCE.md` (TODO)
- **User Guide**: `/docs/admin/ADMIN_USER_GUIDE.md` (TODO)

---

## ✅ Summary

**What's Working:**
- ✅ Admin role system (database + RLS)
- ✅ User events tracking (database + functions)
- ✅ 5 admin Edge Functions (global data + spoofing)
- ✅ Frontend admin service + hooks
- ✅ 3 admin dashboards (evals, funnel, leaderboard)
- ✅ User spoofing (session hijacking + audit trail)
- ✅ Admin route guards (enforces role verification)

**What's Left:**
- ⏸️ Phase 3: Global `/evaluation-dashboard` view
- ⏸️ Phase 4: Event instrumentation (frontend flows)
- ⏸️ Improve user list fetching (currently returns user IDs, needs emails)
- ⏸️ Add time-to-next-stage calculations to funnel (currently NULL)
- ⏸️ Add export to CSV for all admin dashboards

**Ready to Deploy:**
- 🟢 Database migrations (tested)
- 🟢 Edge Functions (ready)
- 🟢 Frontend pages (ready)
- 🟡 Needs manual admin role assignment (SQL command)

