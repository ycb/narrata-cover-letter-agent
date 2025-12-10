-- Add unique constraint for (user_id, name) to enable proper upsert behavior
-- This prevents duplicate companies for the same user with the same name

-- First, clean up any existing duplicates (keep the oldest one)
WITH duplicates AS (
  SELECT 
    id,
    user_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) as rn
  FROM companies
)
DELETE FROM companies
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add the unique constraint
ALTER TABLE companies 
ADD CONSTRAINT companies_user_id_name_unique 
UNIQUE (user_id, name);

-- Add helpful comment
COMMENT ON CONSTRAINT companies_user_id_name_unique ON companies IS 
'Ensures each user can only have one company with a given name. Required for upsert operations.';
