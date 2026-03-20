// Auto-generated Supabase types for Relevnt
// Schema reflects all migrations up to and including:
//   20260319000000_fix_ai_usage_log_fk_constraint.sql
//
// To regenerate, run:
//   npx supabase gen types typescript --project-id <project-id> > src/types/supabase.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resumes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string | null;
          file_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string | null;
          file_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resumes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          role: string;
          status: 'applied' | 'reviewing' | 'interviewing' | 'in_review' | 'offer' | 'accepted' | 'rejected';
          applied_at: string;
          updated_at: string;
          location: string | null;
          salary: string | null;
          notes: string | null;
          url: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          role: string;
          status?: 'applied' | 'reviewing' | 'interviewing' | 'in_review' | 'offer' | 'accepted' | 'rejected';
          applied_at?: string;
          updated_at?: string;
          location?: string | null;
          salary?: string | null;
          notes?: string | null;
          url?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          company_name?: string;
          role?: string;
          status?: 'applied' | 'reviewing' | 'interviewing' | 'in_review' | 'offer' | 'accepted' | 'rejected';
          applied_at?: string;
          updated_at?: string;
          location?: string | null;
          salary?: string | null;
          notes?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'applications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      cover_letters: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          job_id: string | null;
          title: string;
          content: string;
          ai_generated: boolean;
          template_used: string | null;
          // Added by migration 20260226000000_cover_letters_add_missing_columns.sql
          resume_id: string | null;
          job_description: string | null;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          job_id?: string | null;
          title: string;
          content: string;
          ai_generated?: boolean;
          template_used?: string | null;
          resume_id?: string | null;
          job_description?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          application_id?: string | null;
          job_id?: string | null;
          title?: string;
          content?: string;
          ai_generated?: boolean;
          template_used?: string | null;
          resume_id?: string | null;
          job_description?: string | null;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'cover_letters_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cover_letters_application_id_fkey';
            columns: ['application_id'];
            isOneToOne: false;
            referencedRelation: 'applications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'cover_letters_resume_id_fkey';
            columns: ['resume_id'];
            isOneToOne: false;
            referencedRelation: 'resumes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Resume = Database['public']['Tables']['resumes']['Row'];
export type ResumeInsert = Database['public']['Tables']['resumes']['Insert'];
export type ResumeUpdate = Database['public']['Tables']['resumes']['Update'];
export type Application = Database['public']['Tables']['applications']['Row'];
export type ApplicationInsert = Database['public']['Tables']['applications']['Insert'];
export type ApplicationUpdate = Database['public']['Tables']['applications']['Update'];
export type CoverLetter = Database['public']['Tables']['cover_letters']['Row'];
export type CoverLetterInsert = Database['public']['Tables']['cover_letters']['Insert'];
export type CoverLetterUpdate = Database['public']['Tables']['cover_letters']['Update'];
export type AiUsageLog = Database['public']['Tables']['ai_usage_log']['Row'];
export type AiUsageLogInsert = Database['public']['Tables']['ai_usage_log']['Insert'];
