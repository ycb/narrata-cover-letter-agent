export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'user' | 'admin'
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'user' | 'admin'
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string
          name: string
          logo_url: string | null
          description: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          logo_url?: string | null
          description?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          logo_url?: string | null
          description?: string | null
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      user_dictionary_words: {
        Row: {
          id: string
          user_id: string
          word: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          word: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          word?: string
          created_at?: string
        }
      }
      work_items: {
        Row: {
          id: string
          user_id: string
          company_id: string
          title: string
          start_date: string
          end_date: string | null
          description: string | null
          tags: string[]
          achievements: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
          title: string
          start_date: string
          end_date?: string | null
          description?: string | null
          tags?: string[]
          achievements?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
          title?: string
          start_date?: string
          end_date?: string | null
          description?: string | null
          tags?: string[]
          achievements?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      stories: {
        Row: {
          id: string
          user_id: string
          work_item_id: string
          title: string
          content: string
          status: 'draft' | 'approved' | 'needs-review'
          confidence: 'low' | 'medium' | 'high'
          tags: string[]
          times_used: number
          last_used: string | null
          embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_item_id: string
          title: string
          content: string
          status?: 'draft' | 'approved' | 'needs-review'
          confidence?: 'low' | 'medium' | 'high'
          tags?: string[]
          times_used?: number
          last_used?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_item_id?: string
          title?: string
          content?: string
          status?: 'draft' | 'approved' | 'needs-review'
          confidence?: 'low' | 'medium' | 'high'
          tags?: string[]
          times_used?: number
          last_used?: string | null
          embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
      public_demo_profiles: {
        Row: {
          slug: string
          user_id: string
          visitor_user_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          slug: string
          user_id: string
          visitor_user_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          slug?: string
          user_id?: string
          visitor_user_id?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
      external_links: {
        Row: {
          id: string
          user_id: string
          work_item_id: string
          url: string
          label: string
          tags: string[]
          times_used: number
          last_used: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          work_item_id: string
          url: string
          label: string
          tags?: string[]
          times_used?: number
          last_used?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          work_item_id?: string
          url?: string
          label?: string
          tags?: string[]
          times_used?: number
          last_used?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_descriptions: {
        Row: {
          id: string
          user_id: string
          url: string | null
          content: string
          company: string
          role: string
          extracted_requirements: string[]
          structured_data: Json
          standard_requirements: Json
          differentiator_requirements: Json
          preferred_requirements: Json
          keywords: string[]
          analysis: Json
          differentiator_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          url?: string | null
          content: string
          company: string
          role: string
          extracted_requirements?: string[]
          structured_data?: Json
          standard_requirements?: Json
          differentiator_requirements?: Json
          preferred_requirements?: Json
          keywords?: string[]
          analysis?: Json
          differentiator_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string | null
          content?: string
          company?: string
          role?: string
          extracted_requirements?: string[]
          structured_data?: Json
          standard_requirements?: Json
          differentiator_requirements?: Json
          preferred_requirements?: Json
          keywords?: string[]
          analysis?: Json
          differentiator_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cover_letter_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          sections: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sections: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sections?: Json
          created_at?: string
          updated_at?: string
        }
      }
      cover_letters: {
        Row: {
          id: string
          user_id: string
          template_id: string
          job_description_id: string
          sections: Json
          llm_feedback: Json
          differentiator_summary: Json
          metrics: Json
          analytics: Json
          status: 'draft' | 'reviewed' | 'finalized'
          created_at: string
          updated_at: string
          finalized_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          template_id: string
          job_description_id: string
          sections: Json
          llm_feedback: Json
          differentiator_summary?: Json
          metrics?: Json
          analytics?: Json
          status?: 'draft' | 'reviewed' | 'finalized'
          created_at?: string
          updated_at?: string
          finalized_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string
          job_description_id?: string
          sections?: Json
          llm_feedback?: Json
          differentiator_summary?: Json
          metrics?: Json
          analytics?: Json
          status?: 'draft' | 'reviewed' | 'finalized'
          created_at?: string
          updated_at?: string
          finalized_at?: string | null
        }
      }
      cover_letter_workpads: {
        Row: {
          id: string
          user_id: string
          draft_id: string | null
          job_description_id: string
          phase: string | null
          payload: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          draft_id?: string | null
          job_description_id: string
          phase?: string | null
          payload?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          draft_id?: string | null
          job_description_id?: string
          phase?: string | null
          payload?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_levels: {
        Row: {
          id: string
          user_id: string
          inferred_level: string
          confidence: number
          scope_score: number
          maturity_modifier: number
          role_type: string[]
          delta_summary: string | null
          recommendations: Json
          competency_scores: Json
          signals: Json
          last_run_timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          inferred_level: string
          confidence: number
          scope_score: number
          maturity_modifier: number
          role_type?: string[]
          delta_summary?: string | null
          recommendations?: Json
          competency_scores?: Json
          signals?: Json
          last_run_timestamp?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          inferred_level?: string
          confidence?: number
          scope_score?: number
          maturity_modifier?: number
          role_type?: string[]
          delta_summary?: string | null
          recommendations?: Json
          competency_scores?: Json
          signals?: Json
          last_run_timestamp?: string
          created_at?: string
          updated_at?: string
        }
      }
      waitlist_signups: {
        Row: {
          id: string
          email: string
          source: string | null
          referrer: string | null
          utm: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          source?: string | null
          referrer?: string | null
          utm?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          source?: string | null
          referrer?: string | null
          utm?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'user' | 'admin'
      content_status: 'draft' | 'approved' | 'needs-review'
      confidence_level: 'low' | 'medium' | 'high'
      letter_status: 'draft' | 'reviewed' | 'finalized'
      go_no_go: 'go' | 'no-go' | 'needs-work'
    }
  }
}
