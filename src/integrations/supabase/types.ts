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
      achievements: {
        Row: {
          id: string
          user_id: string
          achievement_type: string
          title: string
          description: string
          icon: string | null
          points: number
          unlocked_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          achievement_type: string
          title: string
          description: string
          icon?: string | null
          points?: number
          unlocked_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          achievement_type?: string
          title?: string
          description?: string
          icon?: string | null
          points?: number
          unlocked_at?: string
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          table_name: string | null
          record_id: string | null
          old_data: Json | null
          new_data: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          table_name?: string | null
          record_id?: string | null
          old_data?: Json | null
          new_data?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      flashcards: {
        Row: {
          id: string
          user_id: string
          front_text: string
          back_text: string
          subject: string | null
          difficulty: string
          next_review: string | null
          review_count: number
          correct_streak: number
          created_at: string
          updated_at: string
          tags: string[] | null
          correct_count: number
          current_streak: number
          next_review_date: string | null
        }
        Insert: {
          id?: string
          user_id: string
          front_text: string
          back_text: string
          subject?: string | null
          difficulty?: string
          next_review?: string | null
          review_count?: number
          correct_streak?: number
          created_at?: string
          updated_at?: string
          tags?: string[] | null
          correct_count?: number
          current_streak?: number
          next_review_date?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          front_text?: string
          back_text?: string
          subject?: string | null
          difficulty?: string
          next_review?: string | null
          review_count?: number
          correct_streak?: number
          created_at?: string
          updated_at?: string
          tags?: string[] | null
          correct_count?: number
          current_streak?: number
          next_review_date?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          priority: string
          is_read: boolean
          action_url: string | null
          action_text: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: string
          priority?: string
          is_read?: boolean
          action_url?: string | null
          action_text?: string | null
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          priority?: string
          is_read?: boolean
          action_url?: string | null
          action_text?: string | null
          expires_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          avatar_url: string | null
          study_streak: number
          total_study_time: number
          preferred_session_length: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          avatar_url?: string | null
          study_streak?: number
          total_study_time?: number
          preferred_session_length?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          avatar_url?: string | null
          study_streak?: number
          total_study_time?: number
          preferred_session_length?: number
          created_at?: string
          updated_at?: string
        }
      }
      spaced_repetition_data: {
        Row: {
          id: string
          flashcard_id: string
          user_id: string
          ease_factor: number
          interval_days: number
          repetitions: number
          last_reviewed_at: string | null
          next_review_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          flashcard_id: string
          user_id: string
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          flashcard_id?: string
          user_id?: string
          ease_factor?: number
          interval_days?: number
          repetitions?: number
          last_reviewed_at?: string | null
          next_review_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      study_goals: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          target_value: number
          current_value: number
          unit: string
          deadline: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          target_value: number
          current_value?: number
          unit?: string
          deadline?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          target_value?: number
          current_value?: number
          unit?: string
          deadline?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      study_sessions: {
        Row: {
          id: string
          user_id: string
          session_type: string
          duration_minutes: number
          subject: string | null
          notes: string | null
          completed_at: string
          created_at: string
          updated_at: string | null
          focus_score: number
          interruptions: number
        }
        Insert: {
          id?: string
          user_id: string
          session_type?: string
          duration_minutes: number
          subject?: string | null
          notes?: string | null
          completed_at?: string
          created_at?: string
          updated_at?: string | null
          focus_score?: number
          interruptions?: number
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: string
          duration_minutes?: number
          subject?: string | null
          notes?: string | null
          completed_at?: string
          created_at?: string
          updated_at?: string | null
          focus_score?: number
          interruptions?: number
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          description: string | null
          credits: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          description?: string | null
          credits?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          description?: string | null
          credits?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          subject: string | null
          due_date: string | null
          priority: string
          status: string
          estimated_time: number | null
          actual_time: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          subject?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          estimated_time?: number | null
          actual_time?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          subject?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          estimated_time?: number | null
          actual_time?: number
          created_at?: string
          updated_at?: string
        }
      }
      timetable_entries: {
        Row: {
          id: string
          user_id: string
          subject_name: string
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          instructor: string | null
          notes: string | null
          is_recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_name: string
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          instructor?: string | null
          notes?: string | null
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subject_name?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          room?: string | null
          instructor?: string | null
          notes?: string | null
          is_recurring?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          notifications_enabled: boolean
          email_notifications: boolean
          dark_mode: boolean
          timezone: string
          language: string
          session_reminders: boolean
          break_reminders: boolean
          daily_goal_reminders: boolean
          week_start_day: number
          pomodoro_work_duration: number
          pomodoro_short_break: number
          pomodoro_long_break: number
          pomodoro_sessions_until_long_break: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          dark_mode?: boolean
          timezone?: string
          language?: string
          session_reminders?: boolean
          break_reminders?: boolean
          daily_goal_reminders?: boolean
          week_start_day?: number
          pomodoro_work_duration?: number
          pomodoro_short_break?: number
          pomodoro_long_break?: number
          pomodoro_sessions_until_long_break?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          notifications_enabled?: boolean
          email_notifications?: boolean
          dark_mode?: boolean
          timezone?: string
          language?: string
          session_reminders?: boolean
          break_reminders?: boolean
          daily_goal_reminders?: boolean
          week_start_day?: number
          pomodoro_work_duration?: number
          pomodoro_short_break?: number
          pomodoro_long_break?: number
          pomodoro_sessions_until_long_break?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_spaced_repetition: {
        Args: {
          p_flashcard_id: string
          p_user_id: string
          p_quality: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
