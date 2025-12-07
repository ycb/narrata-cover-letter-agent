# Admin Tooling Suite — Documentation Index

**Last Updated**: 2025-12-06  
**Status**: Phase 1 & 2 Complete ✅  
**Version**: 1.0  

---

## 📚 Quick Links

- **[Implementation Plan](./ADMIN_TOOLING_IMPLEMENTATION_PLAN.md)** — Full technical spec, architecture, and roadmap
- **[Deployment Summary](./DEPLOYMENT_SUMMARY.md)** — Step-by-step deployment guide, smoke tests, troubleshooting
- **[Backlog: Frontend LLM Migration](../backlog/FRONTEND_LLM_TO_EDGE_FUNCTIONS.md)** — Deferred work for My Voice + Story Detection

---

## 🎯 What is Admin Tooling?

A suite of **admin-only dashboards and tools** for:
1. **Global Visibility** — View all users' data (evals, evaluation runs, activity)
2. **Analytics** — Track user progression (funnel), engagement (leaderboard)
3. **Customer Support** — Spoof users to see their exact view (RLS-scoped)
4. **Troubleshooting** — Diagnose issues by viewing as the affected user

---

## 🗂️ Components

### 1. Global Evals Dashboard (`/admin/evals`)
**Purpose:** Monitor pipeline performance, LLM usage, and quality metrics across all users.

**Features:**
- View `evals_log` data for ALL users (bypasses RLS)
- Filters: time range (7d/30d/90d), job type, user ID, limit
- Table view: job_id, type, stage, user_id, success, duration, tokens, created_at
- User spoofing selector for CS

**Use Cases:**
- Monitor production pipeline health
- Identify failing stages or high-cost LLM calls
- Debug user-specific issues via spoofing

**Tech Stack:**
- Edge Function: `admin-evals-query` (service role)
- Frontend: `AdminEvalsDashboard.tsx`
- Data Source: `evals_log` table

---

### 2. Funnel Analytics Dashboard (`/admin/funnel`)
**Purpose:** Track user progression through onboarding and product milestones.

**Features:**
- Funnel stages: account_created → email_verified → first_login → onboarding_started → onboarding_completed → product_tour_started → product_tour_completed → checklist_completed
- Conversion rate at each stage
- Drop-off % between stages
- Visual progress bars

**Use Cases:**
- Identify onboarding bottlenecks
- Measure conversion rates
- Track product adoption

**Tech Stack:**
- Edge Function: `admin-funnel-stats`
- SQL Function: `get_funnel_stats(since_date)`
- Data Source: `user_events` table
- Frontend: `AdminFunnelDashboard.tsx`

**Note:** Requires event instrumentation (Phase 4) to populate data.

---

### 3. User Activity Leaderboard (`/admin/leaderboard`)
**Purpose:** Rank users by activity score to identify power users and engagement patterns.

**Features:**
- Activity score = weighted sum:
  - Sessions: 1pt
  - Stories: 5pts
  - Metrics: 2pts
  - Saved Sections: 3pts
  - CLs Created: 10pts
  - CLs Saved: 15pts
- Table view: rank, email, sessions, stories, metrics, saved_sections, CLs created, CLs saved, total score
- Medal icons for top 3 users

**Use Cases:**
- Identify power users for beta testing
- Measure user engagement
- Spot inactive users for re-engagement campaigns

**Tech Stack:**
- Edge Function: `admin-leaderboard`
- SQL Function: `get_user_activity_leaderboard(since_date, limit)`
- Data Sources: `user_events`, `stories`, `saved_sections`, `jobs` tables
- Frontend: `AdminLeaderboardDashboard.tsx`

---

### 4. User Spoofing
**Purpose:** Allow admin to "become" any user to see their exact view (RLS-scoped).

**Features:**
- Dropdown to select user
- Generates temporary session token (1 hour expiry)
- Prominent yellow banner when spoofing
- "Stop Spoofing" button to return to admin view
- Audit trail: all spoofing actions logged to `user_events`

**Use Cases:**
- Customer support: "I see what you're seeing..."
- Bug reproduction: View app as user who reported issue
- QA: Test user-specific data states
- Debugging: Check RLS policies, permissions, edge cases

**Tech Stack:**
- Edge Function: `admin-spoof-user`
- Session Management: Supabase Auth magic links
- Audit Trail: `user_events.admin_spoofed_user`
- Frontend: `UserSpoofSelector.tsx`, `UserSpoofBanner.tsx`

**Security:**
- Only users with `role = 'admin'` in `user_roles` can spoof
- All spoofing actions logged for audit
- Session expires after 1 hour

---

## 🚀 Getting Started

### Prerequisites
- Supabase project
- Admin role assigned (`INSERT INTO user_roles (user_id, role) VALUES ('<YOUR_USER_ID>', 'admin');`)

### Access Admin Dashboards
1. Log in with your admin account
2. Navigate to:
   - `/admin/evals` — Global evals
   - `/admin/funnel` — Funnel analytics
   - `/admin/leaderboard` — User leaderboard

### Grant Admin Role to Another User
```sql
-- Find user_id
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Grant admin
INSERT INTO user_roles (user_id, role) VALUES ('<USER_ID>', 'admin');
```

### Spoof a User (CS/Troubleshooting)
1. Visit `/admin/evals`
2. Use "View as User" dropdown
3. Select user and click "Spoof"
4. Page reloads with yellow banner
5. Navigate to regular dashboards (e.g., `/evals`, `/cover-letters`)
6. Click "Stop Spoofing" when done

---

## 📦 Architecture

### Database Schema

```sql
-- User Roles
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Events (Funnel Tracking)
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'account_created', 'email_verified', 'first_login',
    'onboarding_started', 'onboarding_completed',
    'product_tour_started', 'product_tour_completed',
    'checklist_completed', 'first_cl_created', 'first_cl_saved',
    'admin_spoofed_user'
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `admin-evals-query` | Global evals_log data | Service Role |
| `admin-evaluation-runs-query` | Global evaluation_runs data | Service Role |
| `admin-funnel-stats` | Funnel analytics | Service Role |
| `admin-leaderboard` | User activity leaderboard | Service Role |
| `admin-spoof-user` | Generate user session token | Service Role |
| `admin-list-users` | Fetch users with emails | Service Role |

### Security Model

**RLS Policies:**
- `user_roles`: Admins can read/write all, users can read own role
- `user_events`: Admins can read all, users can insert own events
- `evals_log`, `evaluation_runs`: Regular RLS remains (admin bypasses via service role)

**Admin Guard:**
- All admin routes protected by `AdminGuard` component
- Checks `user_roles` table for `role = 'admin'`
- Redirects to `/` if not admin

**Service Role:**
- Admin Edge Functions use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Service role key **NEVER** exposed to frontend
- Admin guard middleware verifies role before allowing service role queries

---

## 🧪 Testing

See **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** for:
- Smoke tests (5 test scenarios)
- Troubleshooting guide
- Expected data flow diagrams

---

## 📊 Roadmap

### ✅ Phase 1: Foundation (Complete)
- Database schema (`user_roles`, `user_events`)
- SQL functions (`is_admin`, `log_user_event`, `get_funnel_stats`, `get_user_activity_leaderboard`)
- Edge Functions (5 total)
- Shared utilities (`admin-client.ts`, `admin-guard.ts`)

### ✅ Phase 2: Global Evals + Spoofing (Complete)
- Admin service layer (`adminService.ts`)
- Admin hooks (`useAdminAuth.ts`, `useAdminData.ts`)
- Admin components (`AdminGuard`, `UserSpoofBanner`, `UserSpoofSelector`)
- Admin dashboards (`AdminEvalsDashboard`, `AdminFunnelDashboard`, `AdminLeaderboardDashboard`)
- Routes (`/admin/evals`, `/admin/funnel`, `/admin/leaderboard`)

### ⏸️ Phase 3: Global Evaluation Dashboard (4-6h)
- Global view of `/evaluation-dashboard` (file upload quality)
- Same filters/spoofing as evals dashboard

### ⏸️ Phase 4: Event Instrumentation (4-6h)
- Add `log_user_event()` calls to frontend flows
- Populate funnel analytics data

### ⏸️ Phase 5: Export to CSV (2-3h)
- Add export buttons to all admin dashboards

### ✅ Phase 6: User List API (Complete)
- Improve user list fetching (emails, not just IDs)
- Create dedicated admin Edge Function for user listing
- **See:** [USER_LIST_EMAIL_FIX.md](./USER_LIST_EMAIL_FIX.md)

---

## 🔗 Related Documentation

- **[Evals V1.1](../evals/README.md)** — Pipeline evaluation system
- **[Frontend LLM Migration](../backlog/FRONTEND_LLM_TO_EDGE_FUNCTIONS.md)** — My Voice + Story Detection Edge Functions

---

## 💡 Best Practices

1. **Grant Admin Role Sparingly** — Only trusted team members
2. **Audit Spoofing Actions** — Regularly check `user_events` for `admin_spoofed_user`
3. **Use Spoofing for CS** — Great for "I see what you're seeing" support
4. **Monitor Funnel Drop-offs** — Identify onboarding bottlenecks early
5. **Celebrate Power Users** — Use leaderboard to identify advocates
6. **Export Data Regularly** — (After Phase 5) Download CSV snapshots for offline analysis

---

## 🆘 Support

For issues or questions:
1. Check browser console for errors
2. Check Edge Function logs: `supabase functions logs <function_name>`
3. Verify database schema and RLS policies
4. Refer to **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** troubleshooting section
5. Refer to **[ADMIN_TOOLING_IMPLEMENTATION_PLAN.md](./ADMIN_TOOLING_IMPLEMENTATION_PLAN.md)** for detailed architecture

---

## 📄 File Manifest

### Database
- `supabase/migrations/20251206_create_user_roles.sql`
- `supabase/migrations/20251207_create_user_events.sql`

### Backend (Edge Functions)
- `supabase/functions/_shared/admin-client.ts`
- `supabase/functions/_shared/admin-guard.ts`
- `supabase/functions/admin-evals-query/index.ts`
- `supabase/functions/admin-evaluation-runs-query/index.ts`
- `supabase/functions/admin-funnel-stats/index.ts`
- `supabase/functions/admin-leaderboard/index.ts`
- `supabase/functions/admin-spoof-user/index.ts`
- `supabase/functions/admin-list-users/index.ts`

### Frontend
- `src/types/admin.ts`
- `src/services/adminService.ts`
- `src/hooks/useAdminAuth.ts`
- `src/hooks/useAdminData.ts`
- `src/components/admin/AdminGuard.tsx`
- `src/components/admin/UserSpoofBanner.tsx`
- `src/components/admin/UserSpoofSelector.tsx`
- `src/pages/admin/AdminEvalsDashboard.tsx`
- `src/pages/admin/AdminFunnelDashboard.tsx`
- `src/pages/admin/AdminLeaderboardDashboard.tsx`
- `src/App.tsx` (modified)

### Documentation
- `docs/admin/README.md` (this file)
- `docs/admin/ADMIN_TOOLING_IMPLEMENTATION_PLAN.md`
- `docs/admin/DEPLOYMENT_SUMMARY.md`
- `docs/admin/USER_LIST_EMAIL_FIX.md`
- `docs/admin/ADMIN_EVAL_FILTERS_COMPLETE.md`

**Total:** 22 new files, 1 modified, ~62KB code, ~2,500 lines

---

## ✨ Summary

**Admin Tooling Suite** provides comprehensive **global dashboards**, **user spoofing**, and **analytics** for internal tools and customer support. Built on Supabase with Edge Functions, RLS policies, and React frontend. **Phases 1 & 2 complete**, ready for deployment.

**Next Steps:** Deploy to production, grant admin roles, test spoofing, and plan Phase 3-6 enhancements.

