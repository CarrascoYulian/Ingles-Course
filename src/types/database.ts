/**
 * Tipos generados a partir del esquema de Supabase.
 * En producción se regeneran con:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * Se mantienen aquí a mano para que el proyecto tipe-chequee sin conexión.
 *
 * `Relationships: []` en cada tabla no es decorativo: `supabase-js` sólo
 * infiere los tipos de `.from(...)` cuando cada tabla cumple `GenericTable`
 * (Row/Insert/Update/Relationships). Omitir `Relationships` degrada todo el
 * esquema a `never` de forma silenciosa — el cliente sigue compilando, pero
 * cada `.select()` deja de tipar sus filas.
 */

import type { BlockType, CefrLevel, UserRole } from './domain';

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          enrollment_code: string | null;
          level: CefrLevel | null;
          avatar_color: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'> & {
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          name: string;
          level: CefrLevel;
          published: boolean;
          position: number;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['courses']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          position: number;
          requires_module_id: string | null;
        };
        Insert: Omit<Database['public']['Tables']['modules']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['modules']['Insert']>;
        Relationships: [];
      };
      content_blocks: {
        Row: {
          id: string;
          module_id: string;
          type: BlockType;
          title: string;
          meta: string;
          position: number;
          /** Ruta del objeto en Supabase Storage (bucket `course-files`) — nunca el binario. */
          media_key: string | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['content_blocks']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['content_blocks']['Insert']>;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          position: number;
          title: string;
          duration_minutes: number;
          media_key: string | null;
          description: string | null;
        };
        Insert: Omit<Database['public']['Tables']['lessons']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['lessons']['Insert']>;
        Relationships: [];
      };
      lesson_notes: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          body: string;
          timestamp_seconds: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['lesson_notes']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['lesson_notes']['Insert']>;
        Relationships: [];
      };
      enrollments: {
        Row: {
          id: string;
          student_id: string;
          course_id: string;
          progress: number;
          watched_minutes: number;
          completed_lessons: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['enrollments']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['enrollments']['Insert']>;
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          id: string;
          student_id: string;
          lesson_id: string;
          watched_percent: number;
          completed_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['lesson_progress']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['lesson_progress']['Insert']>;
        Relationships: [];
      };
      badges: {
        Row: { id: string; name: string; requirement: string; position: number };
        Insert: Omit<Database['public']['Tables']['badges']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['badges']['Insert']>;
        Relationships: [];
      };
      student_badges: {
        Row: { student_id: string; badge_id: string; earned_at: string };
        Insert: Database['public']['Tables']['student_badges']['Row'];
        Update: Partial<Database['public']['Tables']['student_badges']['Row']>;
        Relationships: [];
      };
      practice_progress: {
        Row: {
          student_id: string;
          xp: number;
          coins: number;
          streak_days: number;
          current_level: number;
          current_step: number;
          hearts_remaining: number;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['practice_progress']['Row'], 'hearts_remaining'> & {
          hearts_remaining?: number;
        };
        Update: Partial<Database['public']['Tables']['practice_progress']['Insert']>;
        Relationships: [];
      };
      practice_daily_progress: {
        Row: {
          student_id: string;
          date: string;
          xp_earned: number;
          goal_met: boolean;
        };
        Insert: Database['public']['Tables']['practice_daily_progress']['Row'];
        Update: Partial<Database['public']['Tables']['practice_daily_progress']['Insert']>;
        Relationships: [];
      };
      course_resources: {
        Row: {
          id: string;
          course_id: string;
          type: 'PDF' | 'MP3' | 'DOC';
          title: string;
          meta: string;
          media_key: string | null;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['course_resources']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['course_resources']['Insert']>;
        Relationships: [];
      };
      practice_levels: {
        Row: {
          id: string;
          position: number;
          title: string;
          xp_reward: number;
          total_steps: number;
          cefr_tier: CefrLevel;
        };
        Insert: Omit<Database['public']['Tables']['practice_levels']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['practice_levels']['Insert']>;
        Relationships: [];
      };
      practice_questions: {
        Row: {
          id: string;
          cefr_tier: CefrLevel;
          position: number;
          category: string;
          xp_reward: number;
          prompt: string;
          source_text: string;
          options: Json;
          correct_option_id: string;
          explanation_correct: string;
          explanation_wrong: string;
        };
        Insert: Omit<Database['public']['Tables']['practice_questions']['Row'], 'id'> & {
          id?: string;
        };
        Update: Partial<Database['public']['Tables']['practice_questions']['Insert']>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          tone: 'success' | 'info' | 'warning' | 'danger';
          segments: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activity_log']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activity_log']['Insert']>;
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          student_id: string;
          body: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
        Relationships: [];
      };
    };
    Views: {
      course_aggregates: {
        Row: { course_id: string; students: number; avg_progress: number };
        Relationships: [];
      };
    };
    Functions: {
      swap_content_block_position: {
        Args: { block_a_id: string; block_b_id: string };
        Returns: void;
      };
      next_enrollment_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      swap_course_position: {
        Args: { course_a_id: string; course_b_id: string };
        Returns: void;
      };
    };
    Enums: {
      user_role: UserRole;
      cefr_level: CefrLevel;
      block_type: BlockType;
    };
    CompositeTypes: Record<string, never>;
  };
}
