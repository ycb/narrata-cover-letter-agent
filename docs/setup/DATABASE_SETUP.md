# Database Setup for File Upload Feature

## Quick Setup

The file upload feature requires the database migration to be applied. Here's how to set it up:

### 1. Apply the Migration

Run this SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sources table for file metadata
CREATE TABLE public.sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_checksum TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  raw_text TEXT, -- Extracted text
  structured_data JSONB, -- LLM analysis results
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LinkedIn profiles table
CREATE TABLE public.linkedin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  linkedin_id TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  about TEXT,
  experience JSONB, -- Array of work experiences
  education JSONB, -- Array of education
  skills TEXT[], -- Array of skills
  certifications JSONB, -- Array of certifications
  projects JSONB, -- Array of projects
  raw_data JSONB, -- Full LinkedIn API response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, linkedin_id)
);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-files', 'user-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket policies
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own files" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 2. Environment Variables

Make sure you have these in your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_KEY=your_openai_api_key
VITE_OPENAI_MODEL=gpt-4
```

### 3. Test the Upload

1. Go to `/new-user` page
2. Try uploading a PDF file
3. Check the browser console for detailed logs
4. The upload should now work properly

## Troubleshooting

### Upload gets stuck at 25%
- Check if the `sources` table exists in your database
- Check browser console for error messages
- Verify Supabase connection is working

### LinkedIn connection fails
- The LinkedIn integration now uses real API calls
- Make sure you have proper LinkedIn API credentials
- Check browser console for detailed error messages

### Storage upload fails
- Verify the `user-files` bucket exists in Supabase Storage
- Check RLS policies are properly set up
- Ensure user is authenticated
