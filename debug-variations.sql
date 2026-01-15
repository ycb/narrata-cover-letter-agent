-- Debug: Why aren't variations surfacing?
-- User ID: 5d6575e8-eed6-4320-9d3b-2565cc340e30

-- 1. Find recent stories
SELECT id, title, work_item_id, user_id, updated_at
FROM stories
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
ORDER BY updated_at DESC
LIMIT 10;

-- 2. Check if any story variations exist for this user
SELECT 
  cv.id,
  cv.parent_entity_type,
  cv.parent_entity_id,
  cv.title,
  LEFT(cv.content, 100) as content_preview,
  cv.created_by,
  cv.created_at,
  cv.times_used
FROM content_variations cv
WHERE cv.user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
  AND cv.parent_entity_type = 'approved_content'
ORDER BY cv.created_at DESC
LIMIT 20;

-- 3. Check saved sections variations
SELECT 
  cv.id,
  cv.parent_entity_type,
  cv.parent_entity_id,
  cv.title,
  LEFT(cv.content, 100) as content_preview,
  cv.created_by,
  cv.created_at,
  cv.times_used
FROM content_variations cv
WHERE cv.user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
  AND cv.parent_entity_type = 'saved_section'
ORDER BY cv.created_at DESC
LIMIT 20;

-- 4. Get total count of variations by type
SELECT 
  parent_entity_type,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM content_variations
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
GROUP BY parent_entity_type;

-- 5. For a specific story, check details (replace STORY_ID after finding one above)
-- SELECT id, source_id, created_at
-- FROM stories
-- WHERE id = '<STORY_ID>';

-- 6. Check if there are ANY variations at all in the DB
SELECT COUNT(*) as total_variations, COUNT(DISTINCT user_id) as unique_users
FROM content_variations;

-- 7. Check content_variations schema to confirm columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'content_variations'
ORDER BY ordinal_position;
