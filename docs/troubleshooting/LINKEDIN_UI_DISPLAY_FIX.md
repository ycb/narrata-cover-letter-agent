# LinkedIn Data Not Displaying in UI - Dec 2, 2024

## Issue
LinkedIn profile data was successfully saved to database (15 experience items) but the Work History page showed "Import LinkedIn Data" instead of displaying the profile.

## Root Cause
**Data Storage Mismatch**:
- LinkedIn data was saved to `linkedin_profiles` table ✅
- UI component was only checking `sources` table ❌

The `LinkedInDataSource.tsx` component query:
```typescript
// OLD CODE - Only checks sources table
supabase
  .from('sources')
  .select('*')
  .eq('user_id', user.id)
  .ilike('file_name', '%linkedin%')
```

But onboarding saves LinkedIn data to:
```typescript
// Data saved here instead
supabase
  .from('linkedin_profiles')
  .insert({ ... })
```

## The Fix

### Updated Component: `src/components/work-history/LinkedInDataSource.tsx`

**Strategy**: Check BOTH tables (linkedin_profiles first, then sources as fallback)

```typescript
const fetchLinkedInProfile = async () => {
  // 1. Try linkedin_profiles table (primary)
  const { data: linkedinProfile } = await supabase
    .from('linkedin_profiles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (linkedinProfile) {
    // Convert to sources format for display
    const linkedinSource = {
      id: linkedinProfile.id,
      file_name: 'LinkedIn Profile',
      file_type: 'linkedin',
      structured_data: {
        workHistory: linkedinProfile.experience || [],
        education: linkedinProfile.education || [],
        skills: linkedinProfile.skills || [],
        summary: linkedinProfile.summary || '',
        fullName: `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
      },
      ...
    };
    setSource(linkedinSource);
    return;
  }

  // 2. Fallback to sources table (legacy data)
  const { data } = await supabase
    .from('sources')
    .select('*')
    .ilike('file_name', '%linkedin%')
    ...
```

## Database Schema Difference

### linkedin_profiles Table
```sql
{
  id: uuid,
  user_id: uuid,
  linkedin_id: text,
  profile_url: text,
  first_name: text,
  last_name: text,
  headline: text,
  summary: text,
  experience: jsonb,  -- Array of work experience
  education: jsonb,   -- Array of education
  skills: jsonb,      -- Array of skills
  created_at: timestamp
}
```

### sources Table (Legacy)
```sql
{
  id: uuid,
  user_id: uuid,
  file_name: text,
  file_type: text,
  structured_data: jsonb,  -- Contains workHistory, education, skills
  raw_text: text,
  created_at: timestamp
}
```

## Data Mapping

The component now maps `linkedin_profiles` data to match the `sources` format:

| linkedin_profiles | → | sources (display format) |
|-------------------|---|---------------------------|
| `experience` | → | `structured_data.workHistory` |
| `education` | → | `structured_data.education` |
| `skills` | → | `structured_data.skills` |
| `summary` | → | `structured_data.summary` |
| `first_name + last_name` | → | `structured_data.fullName` |

## Testing

### Verify LinkedIn Data Exists
```sql
SELECT 
  linkedin_id,
  profile_url,
  jsonb_array_length(experience) as experience_count,
  created_at
FROM linkedin_profiles
WHERE user_id = '[user-id]'
ORDER BY created_at DESC;
```

### Expected Result
- ✅ Data exists in `linkedin_profiles` table
- ✅ `experience` array has items
- ✅ UI now displays the profile

### Test Cases

**Test 1: Fresh Onboarding with Appify**
1. Upload resume + LinkedIn URL + cover letter
2. Appify enriches profile → saved to `linkedin_profiles`
3. Navigate to Work History
4. **Expected**: LinkedIn panel shows profile with work history

**Test 2: Legacy Data (sources table)**
1. User has old LinkedIn data in `sources` table
2. Component falls back to `sources` query
3. **Expected**: LinkedIn panel shows legacy data

**Test 3: No LinkedIn Data**
1. User hasn't connected LinkedIn
2. Both tables are empty
3. **Expected**: "Import LinkedIn Data" message

## Files Modified
- `src/components/work-history/LinkedInDataSource.tsx`
  - Added linkedin_profiles table query
  - Added data format conversion
  - Kept sources table as fallback

## Related Issues

### Why Two Tables?
Historical evolution:
1. **Original**: LinkedIn data saved to `sources` table with `file_type = 'linkedin'`
2. **New**: LinkedIn OAuth creates dedicated `linkedin_profiles` table
3. **Hybrid**: Now we support both for backward compatibility

### Future Improvement
Consider migrating all LinkedIn data from `sources` to `linkedin_profiles` for consistency:
```sql
INSERT INTO linkedin_profiles (...)
SELECT ... FROM sources
WHERE file_type = 'linkedin' OR file_name LIKE '%linkedin%';
```

## Console Logging

The fix adds helpful logging:
```
✅ Found LinkedIn profile in linkedin_profiles table: {...}
✅ Found LinkedIn data in sources table
ℹ️ No LinkedIn data found in either linkedin_profiles or sources table
```

## Refresh After Fix

**User needs to refresh the page** after deploying this fix to see the LinkedIn data appear in the UI.

Or click the refresh button in the LinkedIn panel (if component supports it).

## Conclusion

The LinkedIn data was always there in the database - the UI just wasn't looking in the right place. Now it checks both `linkedin_profiles` (primary) and `sources` (fallback) tables, ensuring the data displays correctly regardless of where it's stored.





















