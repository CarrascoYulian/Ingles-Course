export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          created_at: string
          id: string
          segments: Json
          tone: string
        }
        Insert: {
          created_at?: string
          id?: string
          segments: Json
          tone: string
        }
        Update: {
          created_at?: string
          id?: string
          segments?: Json
          tone?: string
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_name: string
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          kind: string
          media_key: string
          student_id: string
          submitted_at: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_name: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          kind: string
          media_key: string
          student_id: string
          submitted_at?: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_name?: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          kind?: string
          media_key?: string
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string
          due_at: string
          file_name: string | null
          id: string
          instructions: string
          media_key: string | null
          module_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          due_at: string
          file_name?: string | null
          id?: string
          instructions?: string
          media_key?: string | null
          module_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          due_at?: string
          file_name?: string | null
          id?: string
          instructions?: string
          media_key?: string | null
          module_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          id: string
          name: string
          position: number
          requirement: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          requirement: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          requirement?: string
        }
        Relationships: []
      }
      course_ratings: {
        Row: {
          course_id: string
          created_at: string
          id: string
          review: string | null
          stars: number
          student_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          review?: string | null
          stars: number
          student_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          review?: string | null
          stars?: number
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_thread_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_thread_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "course_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      course_threads: {
        Row: {
          author_id: string
          body: string
          course_id: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          body: string
          course_id: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          course_id?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          level: Database["public"]["Enums"]["cefr_level"]
          name: string
          position: number
          published: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          level: Database["public"]["Enums"]["cefr_level"]
          name: string
          position?: number
          published?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          level?: Database["public"]["Enums"]["cefr_level"]
          name?: string
          position?: number
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_lessons: number
          course_id: string
          created_at: string
          id: string
          progress: number
          student_id: string
          watched_minutes: number
        }
        Insert: {
          completed_lessons?: number
          course_id: string
          created_at?: string
          id?: string
          progress?: number
          student_id: string
          watched_minutes?: number
        }
        Update: {
          completed_lessons?: number
          course_id?: string
          created_at?: string
          id?: string
          progress?: number
          student_id?: string
          watched_minutes?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comment_reads: {
        Row: {
          last_seen_at: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comment_reads_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comment_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          lesson_id: string
          parent_id: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          parent_id?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "lesson_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lesson_id: string
          student_id: string
          timestamp_seconds: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lesson_id: string
          student_id: string
          timestamp_seconds: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string
          student_id?: string
          timestamp_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          student_id: string
          watched_percent: number
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          student_id: string
          watched_percent?: number
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          student_id?: string
          watched_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          description: string | null
          duration_minutes: number
          duration_seconds: number | null
          id: string
          media_key: string | null
          meta: string
          module_id: string
          position: number
          title: string
          type: Database["public"]["Enums"]["block_type"]
          uploaded_by: string | null
        }
        Insert: {
          description?: string | null
          duration_minutes?: number
          duration_seconds?: number | null
          id?: string
          media_key?: string | null
          meta?: string
          module_id: string
          position: number
          title: string
          type?: Database["public"]["Enums"]["block_type"]
          uploaded_by?: string | null
        }
        Update: {
          description?: string | null
          duration_minutes?: number
          duration_seconds?: number | null
          id?: string
          media_key?: string | null
          meta?: string
          module_id?: string
          position?: number
          title?: string
          type?: Database["public"]["Enums"]["block_type"]
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          read_by_staff_at: string | null
          sender_id: string
          student_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          read_by_staff_at?: string | null
          sender_id: string
          student_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          read_by_staff_at?: string | null
          sender_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      module_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          module_id: string
          student_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id: string
          student_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          module_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_access_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          id: string
          position: number
          requires_module_id: string | null
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          position?: number
          requires_module_id?: string | null
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          position?: number
          requires_module_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_requires_module_id_fkey"
            columns: ["requires_module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_daily_progress: {
        Row: {
          date: string
          goal_met: boolean
          student_id: string
          xp_earned: number
        }
        Insert: {
          date: string
          goal_met?: boolean
          student_id: string
          xp_earned?: number
        }
        Update: {
          date?: string
          goal_met?: boolean
          student_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_daily_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_levels: {
        Row: {
          cefr_tier: Database["public"]["Enums"]["cefr_level"]
          id: string
          position: number
          title: string
          total_steps: number
          xp_reward: number
        }
        Insert: {
          cefr_tier: Database["public"]["Enums"]["cefr_level"]
          id?: string
          position: number
          title: string
          total_steps?: number
          xp_reward?: number
        }
        Update: {
          cefr_tier?: Database["public"]["Enums"]["cefr_level"]
          id?: string
          position?: number
          title?: string
          total_steps?: number
          xp_reward?: number
        }
        Relationships: []
      }
      practice_progress: {
        Row: {
          coins: number
          current_level: number
          current_step: number
          hearts_remaining: number
          streak_days: number
          student_id: string
          updated_at: string
          xp: number
        }
        Insert: {
          coins?: number
          current_level?: number
          current_step?: number
          hearts_remaining?: number
          streak_days?: number
          student_id: string
          updated_at?: string
          xp?: number
        }
        Update: {
          coins?: number
          current_level?: number
          current_step?: number
          hearts_remaining?: number
          streak_days?: number
          student_id?: string
          updated_at?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "practice_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_questions: {
        Row: {
          category: string
          cefr_tier: Database["public"]["Enums"]["cefr_level"]
          correct_option_id: string
          explanation_correct: string
          explanation_wrong: string
          id: string
          options: Json
          position: number
          prompt: string
          source_text: string
          xp_reward: number
        }
        Insert: {
          category: string
          cefr_tier: Database["public"]["Enums"]["cefr_level"]
          correct_option_id: string
          explanation_correct: string
          explanation_wrong: string
          id?: string
          options: Json
          position: number
          prompt: string
          source_text: string
          xp_reward: number
        }
        Update: {
          category?: string
          cefr_tier?: Database["public"]["Enums"]["cefr_level"]
          correct_option_id?: string
          explanation_correct?: string
          explanation_wrong?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
          source_text?: string
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string | null
          created_at: string
          enrollment_code: string | null
          full_name: string
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["cefr_level"] | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          enrollment_code?: string | null
          full_name: string
          id: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["cefr_level"] | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          enrollment_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["cefr_level"] | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          passed: boolean
          quiz_id: string
          score: number
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean
          label: string
          position: number
          question_id: string
        }
        Insert: {
          id?: string
          is_correct?: boolean
          label: string
          position?: number
          question_id: string
        }
        Update: {
          id?: string
          is_correct?: boolean
          label?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          id: string
          position: number
          prompt: string
          quiz_id: string
        }
        Insert: {
          id?: string
          position?: number
          prompt: string
          quiz_id: string
        }
        Update: {
          id?: string
          position?: number
          prompt?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          id: string
          module_id: string
          passing_score: number
        }
        Insert: {
          created_at?: string
          id?: string
          module_id: string
          passing_score?: number
        }
        Update: {
          created_at?: string
          id?: string
          module_id?: string
          passing_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_reconcile_runs: {
        Row: {
          deleted_count: number
          deleted_keys: Json
          error: string | null
          id: string
          ran_at: string
          scanned_count: number
        }
        Insert: {
          deleted_count: number
          deleted_keys?: Json
          error?: string | null
          id?: string
          ran_at?: string
          scanned_count: number
        }
        Update: {
          deleted_count?: number
          deleted_keys?: Json
          error?: string | null
          id?: string
          ran_at?: string
          scanned_count?: number
        }
        Relationships: []
      }
      student_badges: {
        Row: {
          badge_id: string
          earned_at: string
          student_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          student_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_aggregates: {
        Row: {
          avg_progress: number | null
          course_id: string | null
          students: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_active_student: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      next_enrollment_code: { Args: never; Returns: string }
      recalc_enrollment_progress_core: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: undefined
      }
      swap_course_position: {
        Args: { course_a_id: string; course_b_id: string }
        Returns: undefined
      }
      swap_lesson_position: {
        Args: { lesson_a_id: string; lesson_b_id: string }
        Returns: undefined
      }
      swap_module_position: {
        Args: { module_a_id: string; module_b_id: string }
        Returns: undefined
      }
    }
    Enums: {
      block_type: "Video" | "PDF" | "Ejercicio" | "Audio" | "Evaluación"
      cefr_level: "A1" | "A2" | "B1" | "B2" | "C1"
      user_role: "admin" | "instructor" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      block_type: ["Video", "PDF", "Ejercicio", "Audio", "Evaluación"],
      cefr_level: ["A1", "A2", "B1", "B2", "C1"],
      user_role: ["admin", "instructor", "student"],
    },
  },
} as const
