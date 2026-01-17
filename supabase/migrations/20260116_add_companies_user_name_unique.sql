-- Add unique index to support companies upsert by (user_id, name)
-- Required by fileUploadService.processStructuredData onConflict: 'user_id,name'
CREATE UNIQUE INDEX IF NOT EXISTS companies_user_id_name_unique
  ON public.companies (user_id, name);
