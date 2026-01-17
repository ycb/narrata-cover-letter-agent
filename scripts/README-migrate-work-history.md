# Work History Migration Script

## Purpose
Migrates work history data from `sources.structured_data` JSON blob to normalized database tables (`companies`, `work_items`, `stories`) for users where the automatic migration failed during upload.

## Usage

### Quick Command (Jungwon Yang):
```bash
npm run migrate:work-history d3937780-28ec-4221-8bfb-2bb0f670fd52 c085335a-186e-42a7-a589-63ac15324150
```

### General Usage:
```bash
npm run migrate:work-history <user_id> <source_id>
```

### Finding User/Source IDs:
```sql
-- Find users with structured_data but no work_items
SELECT 
  s.user_id,
  s.id as source_id,
  s.file_name,
  s.created_at,
  jsonb_array_length((s.structured_data->'workHistory')::jsonb) as work_history_count,
  COUNT(wi.id) as existing_work_items
FROM sources s
LEFT JOIN work_items wi ON wi.user_id = s.user_id
WHERE s.source_type = 'resume'
  AND s.processing_status = 'completed'
  AND s.structured_data->'workHistory' IS NOT NULL
GROUP BY s.user_id, s.id, s.file_name, s.created_at
HAVING COUNT(wi.id) = 0
ORDER BY s.created_at DESC;
```

## What It Does

1. ✅ Fetches structured data from `sources` table
2. ✅ Validates work history data exists
3. ✅ Checks for existing data (warns if already present)
4. ✅ Inserts companies (with deduplication)
5. ✅ Inserts work items with company relationships
6. ✅ Inserts stories linked to work items
7. ✅ Verifies counts before/after migration

## Requirements

- `VITE_SUPABASE_URL` in `.env` or `.env.local`
- `SUPABASE_SERVICE_ROLE_KEY` in `.env` or `.env.local` (for admin operations)

## Example Output

```
═══════════════════════════════════════════════════════════
🔄 Work History Migration Script
═══════════════════════════════════════════════════════════
User ID:   d3937780-28ec-4221-8bfb-2bb0f670fd52
Source ID: c085335a-186e-42a7-a589-63ac15324150

📥 Step 1: Fetching source data...
✅ Found source: JUNGWON YANG Resume.pdf (resume)
✅ Found 6 work history items

🔍 Step 2: Checking for existing data...
Current work_items: 0
Current stories: 0

🔧 Step 3: Preparing data for insertion...
📦 Prepared 3 unique companies

💾 Step 4: Inserting companies...
✅ Inserted/updated 3 companies

💾 Step 5: Inserting work items...
📦 Prepared 6 work items
✅ Inserted 6 work items

💾 Step 6: Inserting stories...
📦 Prepared 23 stories
✅ Inserted 23 stories

✅ Step 7: Verifying results...

═══════════════════════════════════════════════════════════
📊 Migration Complete!
═══════════════════════════════════════════════════════════
Companies:   0 → 3 (+3)
Work Items:  0 → 6 (+6)
Stories:     0 → 23 (+23)
═══════════════════════════════════════════════════════════
```

## Troubleshooting

### Error: "Missing environment variables"
- Ensure `.env.local` or `.env` contains:
  ```
  VITE_SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
  ```

### Error: "No workHistory found in structured_data"
- The source's structured_data may not have been populated during upload
- Check `sources.structured_data` in the database to confirm it has content

### Error: "Error inserting companies/work_items/stories"
- Check RLS policies on the tables
- Ensure service role key has permissions
- Check for data validation errors (missing required fields)

## Safety

- ✅ **Idempotent**: Companies use `upsert` (won't duplicate)
- ⚠️ **Not fully idempotent**: Work items and stories use `insert` (may duplicate if run twice)
- 🔒 **Service role required**: Uses admin key to bypass RLS policies
- 📊 **Verification**: Shows before/after counts to confirm success

## Next Steps

After running the script:
1. User should refresh their browser
2. Navigate to `/work-history` to verify data appears
3. Try creating a cover letter to confirm integration works
