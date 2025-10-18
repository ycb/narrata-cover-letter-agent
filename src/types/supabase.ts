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
      approved_content: {
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
          status: 'draft' | 'reviewed' | 'finalized'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          template_id: string
          job_description_id: string
          sections: Json
          llm_feedback: Json
          status?: 'draft' | 'reviewed' | 'finalized'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string
          job_description_id?: string
          sections?: Json
          llm_feedback?: Json
          status?: 'draft' | 'reviewed' | 'finalized'
          created_at?: string
          updated_at?: string
        }
      }
      sources: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_checksum: string
          storage_path: string
          source_type: 'resume' | 'cover_letter'
          processing_status: 'pending' | 'processing' | 'completed' | 'failed'
          raw_text: string | null
          structured_data: Json | null
          processing_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_type: string
          file_size: number
          file_checksum: string
          storage_path: string
          source_type?: 'resume' | 'cover_letter'
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          raw_text?: string | null
          structured_data?: Json | null
          processing_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_type?: string
          file_size?: number
          file_checksum?: string
          storage_path?: string
          source_type?: 'resume' | 'cover_letter'
          processing_status?: 'pending' | 'processing' | 'completed' | 'failed'
          raw_text?: string | null
          structured_data?: Json | null
          processing_error?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      linkedin_profiles: {
        Row: {
          id: string
          user_id: string
          linkedin_id: string
          profile_url: string
          about: string | null
          experience: Json | null
          education: Json | null
          skills: string[] | null
          certifications: Json | null
          projects: Json | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          linkedin_id: string
          profile_url: string
          about?: string | null
          experience?: Json | null
          education?: Json | null
          skills?: string[] | null
          certifications?: Json | null
          projects?: Json | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          linkedin_id?: string
          profile_url?: string
          about?: string | null
          experience?: Json | null
          education?: Json | null
          skills?: string[] | null
          certifications?: Json | null
          projects?: Json | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
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
      source_type: 'resume' | 'cover_letter'
      processing_status: 'pending' | 'processing' | 'completed' | 'failed'
    }
  }
}
