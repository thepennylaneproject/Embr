/**
 * supabase.ts
 *
 * Auto-generated Supabase TypeScript types for the Relevnt database schema.
 *
 * Regenerate with:
 *   supabase gen types typescript --local > src/types/supabase.ts
 *
 * Tables covered:
 *   - users
 *   - user_professional_profiles
 *   - job_preferences
 *   - resumes
 *   - persona_preferences
 *   - job_listings
 *   - email_queue
 *   - market_snapshots          (added by 20260305220000)
 *   - admin_config              (added by 20260305220000)
 *   - signal_classifications    (added by 20260305220000)
 *   - cache_invalidation_log    (added by 20260305220000)
 */

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
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          job_alerts_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          job_alerts_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          job_alerts_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      user_professional_profiles: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          bio: string | null;
          skills: string[] | null;
          experience_years: number | null;
          location: string | null;
          open_to_work: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          experience_years?: number | null;
          location?: string | null;
          open_to_work?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          bio?: string | null;
          skills?: string[] | null;
          experience_years?: number | null;
          location?: string | null;
          open_to_work?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_professional_profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      job_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferred_roles: string[] | null;
          preferred_locations: string[] | null;
          min_salary: number | null;
          max_salary: number | null;
          remote_ok: boolean | null;
          full_time: boolean | null;
          part_time: boolean | null;
          contract: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_roles?: string[] | null;
          preferred_locations?: string[] | null;
          min_salary?: number | null;
          max_salary?: number | null;
          remote_ok?: boolean | null;
          full_time?: boolean | null;
          part_time?: boolean | null;
          contract?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_roles?: string[] | null;
          preferred_locations?: string[] | null;
          min_salary?: number | null;
          max_salary?: number | null;
          remote_ok?: boolean | null;
          full_time?: boolean | null;
          part_time?: boolean | null;
          contract?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'job_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      resumes: {
        Row: {
          id: string;
          user_id: string;
          file_url: string | null;
          raw_text: string | null;
          skills_extracted: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_url?: string | null;
          raw_text?: string | null;
          skills_extracted?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_url?: string | null;
          raw_text?: string | null;
          skills_extracted?: string[] | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'resumes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      persona_preferences: {
        Row: {
          id: string;
          user_id: string;
          persona_id: string;
          weight: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          persona_id: string;
          weight?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          persona_id?: string;
          weight?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'persona_preferences_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      job_listings: {
        Row: {
          id: string;
          title: string;
          company: string;
          location: string | null;
          remote: boolean;
          salary_min: number | null;
          salary_max: number | null;
          skills_required: string[] | null;
          posted_at: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          company: string;
          location?: string | null;
          remote?: boolean;
          salary_min?: number | null;
          salary_max?: number | null;
          skills_required?: string[] | null;
          posted_at?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          company?: string;
          location?: string | null;
          remote?: boolean;
          salary_min?: number | null;
          salary_max?: number | null;
          skills_required?: string[] | null;
          posted_at?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      email_queue: {
        Row: {
          id: string;
          to_user_id: string;
          to_email: string;
          template: string;
          payload: Json;
          created_at: string;
          sent_at: string | null;
        };
        Insert: {
          id?: string;
          to_user_id: string;
          to_email: string;
          template: string;
          payload: Json;
          created_at?: string;
          sent_at?: string | null;
        };
        Update: {
          id?: string;
          to_user_id?: string;
          to_email?: string;
          template?: string;
          payload?: Json;
          created_at?: string;
          sent_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'email_queue_to_user_id_fkey';
            columns: ['to_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      /**
       * market_snapshots — added by migration 20260305220000
       *
       * Periodic snapshots of job-market conditions keyed by category and date.
       * Used by the scoring engine to weight signals against current demand.
       */
      market_snapshots: {
        Row: {
          id: string;
          snapshot_date: string;
          category: string;
          total_jobs: number;
          avg_salary_min: number | null;
          avg_salary_max: number | null;
          top_skills: string[] | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          snapshot_date: string;
          category: string;
          total_jobs?: number;
          avg_salary_min?: number | null;
          avg_salary_max?: number | null;
          top_skills?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          snapshot_date?: string;
          category?: string;
          total_jobs?: number;
          avg_salary_min?: number | null;
          avg_salary_max?: number | null;
          top_skills?: string[] | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };

      /**
       * admin_config — added by migration 20260305220000
       *
       * Key/value store for admin-controlled runtime configuration.
       * Only the service role may write; authenticated users may read.
       */
      admin_config: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'admin_config_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      /**
       * signal_classifications — added by migration 20260305220000
       *
       * Classification rules for job-relevance signals consumed by the scoring
       * engine.  Maps a signal_type to a classification label and weight.
       */
      signal_classifications: {
        Row: {
          id: string;
          signal_type: string;
          classification: string;
          weight: number;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          signal_type: string;
          classification: string;
          weight?: number;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          signal_type?: string;
          classification?: string;
          weight?: number;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      /**
       * cache_invalidation_log — added by migration 20260305220000
       *
       * Audit trail for cache invalidation events triggered by the system,
       * admin actions, or automated scheduled jobs.
       */
      cache_invalidation_log: {
        Row: {
          id: string;
          cache_key: string;
          invalidated_by: string;
          reason: string | null;
          invalidated_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          invalidated_by: string;
          reason?: string | null;
          invalidated_at?: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          invalidated_by?: string;
          reason?: string | null;
          invalidated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

    Enums: Record<string, never>;

    CompositeTypes: Record<string, never>;
  };
};

// ---------------------------------------------------------------------------
// Convenience helpers (mirrors the pattern from @supabase/supabase-js)
// ---------------------------------------------------------------------------

type PublicSchema = Database['public'];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
