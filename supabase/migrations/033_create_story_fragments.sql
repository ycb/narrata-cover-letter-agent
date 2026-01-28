-- Create story fragments table (resume-driven placeholders before final stories)

CREATE TABLE IF NOT EXISTS public.story_fragments (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('resume','linkedin','cover_letter','manual','other')) DEFAULT 'resume',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  narrative_hints TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('pending','in_progress','promoted','archived')) DEFAULT 'pending',
  converted_story_id UUID REFERENCES public.stories(id) ON DELETE SET NULL,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.story_fragments IS 'Resume-derived story fragments that can be promoted into approved stories.';

CREATE INDEX IF NOT EXISTS idx_story_fragments_user_id ON public.story_fragments(user_id);
CREATE INDEX IF NOT EXISTS idx_story_fragments_work_item_id ON public.story_fragments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_story_fragments_status ON public.story_fragments(status);

ALTER TABLE public.story_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own story fragments" ON public.story_fragments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own story fragments" ON public.story_fragments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story fragments" ON public.story_fragments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own story fragments" ON public.story_fragments
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_story_fragments_updated_at
  BEFORE UPDATE ON public.story_fragments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
