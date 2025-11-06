# Synthetic Mode Architecture

## Overview

Synthetic mode allows specified users (currently `narrata.ai@gmail.com`) to switch between synthetic test personas (P01-P10) and view their parsed data in the UI as if it were their own.

## Design Principles

1. **Allowlist-Based Access**: Only explicitly allowed users can access synthetic mode
2. **Simple & Explicit**: No complex role-based logic - just an email allowlist
3. **Auto-Creation**: Synthetic users are automatically created if missing
4. **Profile Filtering**: All queries filter by active synthetic profile when in synthetic mode

## Components

### 1. SyntheticUserService (`src/services/syntheticUserService.ts`)

**Allowlist**:
```typescript
private readonly SYNTHETIC_TESTING_ALLOWLIST = [
  'narrata.ai@gmail.com'
  // Add more emails here as needed
];
```

**Key Methods**:
- `isSyntheticTestingEnabled()`: Checks if current user is in allowlist
- `getSyntheticUserContext()`: Gets active profile and available profiles (auto-creates if missing)
- `switchSyntheticUser(profileId)`: Switches active profile
- `ensureSyntheticUsersExist()`: Creates P01-P10 synthetic users if they don't exist

### 2. Work History Filtering (`src/pages/WorkHistory.tsx`)

When synthetic mode is enabled:
1. Gets active profile (e.g., P01)
2. Finds all sources with `file_name` starting with profile ID (e.g., `P01_resume.txt`)
3. Filters `work_items` by `source_id` matching those sources
4. Filters `companies` to only those linked to filtered work_items
5. Cascades filter to `approved_content` and `external_links`

**Debug Logging**: All steps are logged with `[WorkHistory]` prefix for troubleshooting

## Database Schema

### `synthetic_users` Table
- `parent_user_id`: UUID of the real user (e.g., narrata.ai@gmail.com)
- `profile_id`: Text like "P01", "P02", etc.
- `profile_name`: Display name like "Avery Chen"
- `is_active`: Boolean - only one active per parent_user
- `profile_data`: JSONB - full persona data (optional)

### Data Lineage
- `sources.file_name`: Contains profile prefix (e.g., `P01_resume.txt`)
- `work_items.source_id`: Links to `sources.id` for filtering
- `approved_content.source_id`: Links to `sources.id` for story filtering

## How It Works

### Initial Setup
1. User logs in as `narrata.ai@gmail.com`
2. Synthetic mode is detected (email in allowlist)
3. System checks for synthetic_users records
4. If missing, creates P01-P10 automatically
5. Sets P01 as active by default

### Switching Profiles
1. User selects profile from Synthetic Testing menu
2. `switchSyntheticUser()` updates `synthetic_users.is_active`
3. Page refreshes to clear cached data
4. Work History queries filter by active profile

### Data Filtering Flow
```
Active Profile (P01)
  ↓
Sources: file_name LIKE 'P01_%'
  ↓
Work Items: source_id IN [P01 sources]
  ↓
Companies: id IN [companies from P01 work_items]
  ↓
Approved Content: work_item_id IN [P01 work_items]
```

## Adding More Users

To allow another user access to synthetic mode:

```typescript
// src/services/syntheticUserService.ts
private readonly SYNTHETIC_TESTING_ALLOWLIST = [
  'narrata.ai@gmail.com',
  'newuser@example.com'  // Add here
];
```

## Troubleshooting

### Still Seeing Preview Mode
1. Check browser console for `[WorkHistory]` and `[Synthetic]` logs
2. Verify `synthetic_users` table has records for your user
3. Verify `work_items` have `source_id` populated (not NULL)
4. Verify sources have `file_name` starting with profile ID (e.g., `P01_`)

### Debug Logs to Check
- `[Synthetic] User ... - Synthetic testing: ENABLED/DISABLED`
- `[WorkHistory] Synthetic context: { enabled, currentProfile }`
- `[WorkHistory] Found X sources for P01`
- `[WorkHistory] Found X work_items with matching source_id`

## Future Improvements

1. **Profile-Specific User Context**: Instead of filtering queries, could create separate user sessions
2. **Profile Data Storage**: Store full persona JSON in `synthetic_users.profile_data`
3. **UI Indicators**: Show active profile name in header/navigation
4. **Profile Switching Without Refresh**: Use React state instead of page reload

