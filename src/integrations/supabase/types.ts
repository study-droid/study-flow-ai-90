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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          max_progress: number | null
          progress: number | null
          reward_points: number | null
          title: string
          unlocked: boolean | null
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          max_progress?: number | null
          progress?: number | null
          reward_points?: number | null
          title: string
          unlocked?: boolean | null
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          max_progress?: number | null
          progress?: number | null
          reward_points?: number | null
          title?: string
          unlocked?: boolean | null
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          ai_provider: Database["public"]["Enums"]["ai_provider"] | null
          content: string
          created_at: string
          id: string
          message_metadata: Json | null
          response_time: number | null
          role: string
          session_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          ai_provider?: Database["public"]["Enums"]["ai_provider"] | null
          content: string
          created_at?: string
          id?: string
          message_metadata?: Json | null
          response_time?: number | null
          role: string
          session_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          ai_provider?: Database["public"]["Enums"]["ai_provider"] | null
          content?: string
          created_at?: string
          id?: string
          message_metadata?: Json | null
          response_time?: number | null
          role?: string
          session_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_tutor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tutor_sessions: {
        Row: {
          ai_provider: Database["public"]["Enums"]["ai_provider"] | null
          created_at: string
          id: string
          last_activity: string
          session_metadata: Json | null
          started_at: string
          status: string | null
          subject_id: string | null
          title: string | null
          total_messages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_provider?: Database["public"]["Enums"]["ai_provider"] | null
          created_at?: string
          id?: string
          last_activity?: string
          session_metadata?: Json | null
          started_at?: string
          status?: string | null
          subject_id?: string | null
          title?: string | null
          total_messages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_provider?: Database["public"]["Enums"]["ai_provider"] | null
          created_at?: string
          id?: string
          last_activity?: string
          session_metadata?: Json | null
          started_at?: string
          status?: string | null
          subject_id?: string | null
          title?: string | null
          total_messages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_tutor_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_logs: {
        Row: {
          created_at: string | null
          id: string
          model: string | null
          provider: string
          request_timestamp: string
          success: boolean | null
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          model?: string | null
          provider: string
          request_timestamp: string
          success?: boolean | null
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          model?: string | null
          provider?: string
          request_timestamp?: string
          success?: boolean | null
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string | null
          completed: boolean | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          location: string | null
          notification_time: number | null
          recurring: boolean | null
          recurring_pattern: string | null
          subject_id: string | null
          subject_name: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          notification_time?: number | null
          recurring?: boolean | null
          recurring_pattern?: string | null
          subject_id?: string | null
          subject_name?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          completed?: boolean | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          location?: string | null
          notification_time?: number | null
          recurring?: boolean | null
          recurring_pattern?: string | null
          subject_id?: string | null
          subject_name?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          exam_date: string | null
          exam_time: string | null
          id: string
          location: string | null
          passing_marks: number | null
          questions: Json | null
          status: string | null
          subject_id: string | null
          title: string
          total_marks: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          exam_date?: string | null
          exam_time?: string | null
          id?: string
          location?: string | null
          passing_marks?: number | null
          questions?: Json | null
          status?: string | null
          subject_id?: string | null
          title: string
          total_marks?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          exam_date?: string | null
          exam_time?: string | null
          id?: string
          location?: string | null
          passing_marks?: number | null
          questions?: Json | null
          status?: string | null
          subject_id?: string | null
          title?: string
          total_marks?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sessions: {
        Row: {
          cards_correct: number | null
          cards_incorrect: number | null
          cards_studied: number | null
          completed: boolean | null
          created_at: string
          duration: number | null
          flashcard_set_id: string | null
          id: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cards_correct?: number | null
          cards_incorrect?: number | null
          cards_studied?: number | null
          completed?: boolean | null
          created_at?: string
          duration?: number | null
          flashcard_set_id?: string | null
          id?: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cards_correct?: number | null
          cards_incorrect?: number | null
          cards_studied?: number | null
          completed?: boolean | null
          created_at?: string
          duration?: number | null
          flashcard_set_id?: string | null
          id?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sessions_flashcard_set_id_fkey"
            columns: ["flashcard_set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          subject_id: string | null
          title: string
          total_cards: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          subject_id?: string | null
          title: string
          total_cards?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          subject_id?: string | null
          title?: string
          total_cards?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_sets_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcard_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back_content: string
          created_at: string
          difficulty: string | null
          front_content: string
          id: string
          last_reviewed: string | null
          mastery_level: number | null
          review_count: number | null
          set_id: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          back_content: string
          created_at?: string
          difficulty?: string | null
          front_content: string
          id?: string
          last_reviewed?: string | null
          mastery_level?: number | null
          review_count?: number | null
          set_id: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          back_content?: string
          created_at?: string
          difficulty?: string | null
          front_content?: string
          id?: string
          last_reviewed?: string | null
          mastery_level?: number | null
          review_count?: number | null
          set_id?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_level: Database["public"]["Enums"]["academic_level"] | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          language: string | null
          last_name: string | null
          onboarding_completed: boolean | null
          study_streak: number | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone: string | null
          total_study_time: number | null
          updated_at: string
        }
        Insert: {
          academic_level?: Database["public"]["Enums"]["academic_level"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          study_streak?: number | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone?: string | null
          total_study_time?: number | null
          updated_at?: string
        }
        Update: {
          academic_level?: Database["public"]["Enums"]["academic_level"] | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          language?: string | null
          last_name?: string | null
          onboarding_completed?: boolean | null
          study_streak?: number | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          timezone?: string | null
          total_study_time?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          time_taken: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          time_taken?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          time_taken?: number | null
          user_id?: string
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
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          passing_score: number | null
          questions: Json | null
          subject_id: string | null
          time_limit: number | null
          title: string
          total_questions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          passing_score?: number | null
          questions?: Json | null
          subject_id?: string | null
          time_limit?: number | null
          title: string
          total_questions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          passing_score?: number | null
          questions?: Json | null
          subject_id?: string | null
          time_limit?: number | null
          title?: string
          total_questions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string | null
          id: string
          requests_count: number | null
          updated_at: string | null
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          requests_count?: number | null
          updated_at?: string | null
          user_id: string
          window_start: string
        }
        Update: {
          created_at?: string | null
          id?: string
          requests_count?: number | null
          updated_at?: string | null
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      study_analytics: {
        Row: {
          ai_interactions: number | null
          average_focus_score: number | null
          created_at: string
          date: string
          flashcards_studied: number | null
          id: string
          session_count: number | null
          subject_id: string | null
          tasks_completed: number | null
          total_study_time: number | null
          user_id: string
        }
        Insert: {
          ai_interactions?: number | null
          average_focus_score?: number | null
          created_at?: string
          date: string
          flashcards_studied?: number | null
          id?: string
          session_count?: number | null
          subject_id?: string | null
          tasks_completed?: number | null
          total_study_time?: number | null
          user_id: string
        }
        Update: {
          ai_interactions?: number | null
          average_focus_score?: number | null
          created_at?: string
          date?: string
          flashcards_studied?: number | null
          id?: string
          session_count?: number | null
          subject_id?: string | null
          tasks_completed?: number | null
          total_study_time?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_analytics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_goals: {
        Row: {
          created_at: string
          current_value: number | null
          deadline: string | null
          description: string | null
          id: string
          status: Database["public"]["Enums"]["goal_status"] | null
          subject_id: string | null
          target_value: number
          title: string
          type: Database["public"]["Enums"]["goal_type"] | null
          unit: Database["public"]["Enums"]["goal_unit"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"] | null
          subject_id?: string | null
          target_value: number
          title: string
          type?: Database["public"]["Enums"]["goal_type"] | null
          unit?: Database["public"]["Enums"]["goal_unit"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          deadline?: string | null
          description?: string | null
          id?: string
          status?: Database["public"]["Enums"]["goal_status"] | null
          subject_id?: string | null
          target_value?: number
          title?: string
          type?: Database["public"]["Enums"]["goal_type"] | null
          unit?: Database["public"]["Enums"]["goal_unit"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          break_duration: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          distractions: number | null
          duration: number | null
          focus_score: number | null
          id: string
          notes: string | null
          planned_duration: number | null
          pomodoro_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["study_session_status"] | null
          subject_id: string | null
          title: string
          type: Database["public"]["Enums"]["study_session_type"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_duration?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          distractions?: number | null
          duration?: number | null
          focus_score?: number | null
          id?: string
          notes?: string | null
          planned_duration?: number | null
          pomodoro_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["study_session_status"] | null
          subject_id?: string | null
          title: string
          type?: Database["public"]["Enums"]["study_session_type"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_duration?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          distractions?: number | null
          duration?: number | null
          focus_score?: number | null
          id?: string
          notes?: string | null
          planned_duration?: number | null
          pomodoro_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["study_session_status"] | null
          subject_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["study_session_type"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_study_date: string | null
          longest_streak: number | null
          streak_start_date: string | null
          total_study_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          streak_start_date?: string | null
          total_study_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_study_date?: string | null
          longest_streak?: number | null
          streak_start_date?: string | null
          total_study_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_duration: number | null
          assignment_type: string | null
          attachments: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_duration: number | null
          id: string
          points: number | null
          priority: Database["public"]["Enums"]["task_priority"] | null
          status: Database["public"]["Enums"]["task_status"] | null
          subject_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          assignment_type?: string | null
          attachments?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          points?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          subject_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          assignment_type?: string | null
          attachments?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_duration?: number | null
          id?: string
          points?: number | null
          priority?: Database["public"]["Enums"]["task_priority"] | null
          status?: Database["public"]["Enums"]["task_status"] | null
          subject_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          ai_suggestions_enabled: boolean | null
          created_at: string
          daily_goal_hours: number | null
          dashboard_layout: Json | null
          email_notifications: boolean | null
          id: string
          notifications_enabled: boolean | null
          pomodoro_break_duration: number | null
          pomodoro_enabled: boolean | null
          pomodoro_long_break_duration: number | null
          pomodoro_work_duration: number | null
          sound_enabled: boolean | null
          study_reminder_time: string | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_suggestions_enabled?: boolean | null
          created_at?: string
          daily_goal_hours?: number | null
          dashboard_layout?: Json | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          pomodoro_break_duration?: number | null
          pomodoro_enabled?: boolean | null
          pomodoro_long_break_duration?: number | null
          pomodoro_work_duration?: number | null
          sound_enabled?: boolean | null
          study_reminder_time?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_suggestions_enabled?: boolean | null
          created_at?: string
          daily_goal_hours?: number | null
          dashboard_layout?: Json | null
          email_notifications?: boolean | null
          id?: string
          notifications_enabled?: boolean | null
          pomodoro_break_duration?: number | null
          pomodoro_enabled?: boolean | null
          pomodoro_long_break_duration?: number | null
          pomodoro_work_duration?: number | null
          sound_enabled?: boolean | null
          study_reminder_time?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_rate_limit: {
        Args: { p_user_id: string; p_window_start: string }
        Returns: undefined
      }
    }
    Enums: {
      academic_level:
        | "elementary"
        | "middle_school"
        | "high_school"
        | "undergraduate"
        | "graduate"
        | "professional"
      ai_provider: "deepseek" | "openai" | "anthropic" | "google" | "local"
      event_type:
        | "study"
        | "assignment"
        | "exam"
        | "quiz"
        | "flashcard"
        | "ai_session"
        | "reminder"
      goal_status: "active" | "completed" | "paused" | "cancelled"
      goal_type: "daily" | "weekly" | "monthly" | "custom"
      goal_unit:
        | "hours"
        | "sessions"
        | "pages"
        | "chapters"
        | "problems"
        | "custom"
      study_session_status:
        | "planned"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      study_session_type:
        | "focus"
        | "review"
        | "practice"
        | "reading"
        | "writing"
        | "problem_solving"
        | "memorization"
        | "ai_tutoring"
      subscription_tier: "free" | "premium" | "enterprise"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "todo" | "in_progress" | "completed" | "cancelled"
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
      academic_level: [
        "elementary",
        "middle_school",
        "high_school",
        "undergraduate",
        "graduate",
        "professional",
      ],
      ai_provider: ["deepseek", "openai", "anthropic", "google", "local"],
      event_type: [
        "study",
        "assignment",
        "exam",
        "quiz",
        "flashcard",
        "ai_session",
        "reminder",
      ],
      goal_status: ["active", "completed", "paused", "cancelled"],
      goal_type: ["daily", "weekly", "monthly", "custom"],
      goal_unit: [
        "hours",
        "sessions",
        "pages",
        "chapters",
        "problems",
        "custom",
      ],
      study_session_status: [
        "planned",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      study_session_type: [
        "focus",
        "review",
        "practice",
        "reading",
        "writing",
        "problem_solving",
        "memorization",
        "ai_tutoring",
      ],
      subscription_tier: ["free", "premium", "enterprise"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["todo", "in_progress", "completed", "cancelled"],
    },
  },
} as const
