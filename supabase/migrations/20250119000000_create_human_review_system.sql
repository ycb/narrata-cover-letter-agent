-- Create human review system for evaluation validation
CREATE TABLE public.human_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  evaluation_run_id uuid NOT NULL REFERENCES public.evaluation_runs(id),
  reviewer_id text NOT NULL,
  reviewer_name text NOT NULL,
  reviewer_email text NOT NULL,
  
  -- Human evaluation scores (matching LLM criteria)
  human_accuracy text,
  human_relevance text,
  human_personalization text,
  human_clarity_tone text,
  human_framework text,
  human_go_nogo text,
  
  -- Enhanced criteria
  human_work_history_deduplication text,
  human_metrics_extraction text,
  human_story_structure text,
  human_template_quality text,
  human_template_reusability text,
  human_template_completeness text,
  
  -- Human-specific feedback
  human_notes text,
  human_rationale text,
  human_confidence text,
  human_recommendations jsonb,
  
  -- Comparison with LLM
  llm_human_agreement text,
  disagreement_areas jsonb,
  overall_assessment text,
  
  -- Status and timestamps
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.human_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own human reviews." ON public.human_reviews
  FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.evaluation_runs WHERE id = evaluation_run_id));

CREATE POLICY "Users can insert their own human reviews." ON public.human_reviews
  FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.evaluation_runs WHERE id = evaluation_run_id));

CREATE POLICY "Users can update their own human reviews." ON public.human_reviews
  FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.evaluation_runs WHERE id = evaluation_run_id));

-- Create indexes for performance
CREATE INDEX idx_human_reviews_evaluation_run_id ON public.human_reviews(evaluation_run_id);
CREATE INDEX idx_human_reviews_reviewer_id ON public.human_reviews(reviewer_id);
CREATE INDEX idx_human_reviews_status ON public.human_reviews(status);
CREATE INDEX idx_human_reviews_created_at ON public.human_reviews(created_at);

-- Create unified work history table
CREATE TABLE public.unified_work_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  company text NOT NULL,
  company_description text,
  role text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  description text,
  achievements jsonb,
  metrics jsonb,
  stories jsonb,
  location text,
  current boolean DEFAULT false,
  source_confidence text NOT NULL DEFAULT 'medium',
  source_details jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for unified work history
ALTER TABLE public.unified_work_history ENABLE ROW LEVEL SECURITY;

-- Create policies for unified work history
CREATE POLICY "Users can view their own unified work history." ON public.unified_work_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own unified work history." ON public.unified_work_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own unified work history." ON public.unified_work_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own unified work history." ON public.unified_work_history
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for unified work history
CREATE INDEX idx_unified_work_history_user_id ON public.unified_work_history(user_id);
CREATE INDEX idx_unified_work_history_company ON public.unified_work_history(company);
CREATE INDEX idx_unified_work_history_role ON public.unified_work_history(role);
CREATE INDEX idx_unified_work_history_current ON public.unified_work_history(current);

-- Create cover letter templates table
CREATE TABLE public.cover_letter_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES public.profiles(id),
  template_name text NOT NULL,
  template_type text NOT NULL,
  intro_structure text,
  intro_key_elements jsonb,
  intro_tone text,
  intro_length text,
  stories jsonb,
  closer_structure text,
  closer_key_elements jsonb,
  closer_call_to_action text,
  closer_tone text,
  overall_structure jsonb,
  usage_instructions text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for cover letter templates
ALTER TABLE public.cover_letter_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for cover letter templates
CREATE POLICY "Users can view their own cover letter templates." ON public.cover_letter_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cover letter templates." ON public.cover_letter_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cover letter templates." ON public.cover_letter_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cover letter templates." ON public.cover_letter_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for cover letter templates
CREATE INDEX idx_cover_letter_templates_user_id ON public.cover_letter_templates(user_id);
CREATE INDEX idx_cover_letter_templates_template_type ON public.cover_letter_templates(template_type);
CREATE INDEX idx_cover_letter_templates_created_at ON public.cover_letter_templates(created_at);
