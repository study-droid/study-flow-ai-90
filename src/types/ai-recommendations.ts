/**
 * Type definitions for AI Study Recommendations
 * Replaces 'any' types with proper interfaces
 */

// Student data structure
export interface StudyData {
  totalHours: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  focusScore: number;
  streakDays: number;
}

export interface SubjectData {
  name: string;
  hours: number;
  performance: number;
}

export interface GoalData {
  subject: string;
  target_hours: number;
  current_hours: number;
}

export interface TimePreferences {
  preferredStudyTimes: string[];
  sessionLength: number;
  breakPreference: string;
}

export interface CurrentPerformance {
  overall_efficiency: number;
  focus_quality: number;
  consistency_score: number;
}

export interface StudentData {
  studyData: StudyData;
  subjects: SubjectData[];
  goals: GoalData[];
  timePreferences: TimePreferences;
  currentPerformance: CurrentPerformance;
}

// AI Recommendations structure
export interface AIRecommendation {
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ScheduleOptimization {
  best_study_times: string[];
  suggested_session_length: string;
  break_recommendations: string;
}

export interface SubjectFocus {
  subject: string;
  recommended_hours_per_week: number;
  focus_areas: string[];
  study_methods: string[];
}

export interface LearningTechnique {
  technique: string;
  description: string;
  best_for: string[];
}

export interface MotivationalInsights {
  strengths: string[];
  growth_areas: string[];
  encouraging_message: string;
}

export interface AIRecommendations {
  priority_recommendations: AIRecommendation[];
  schedule_optimization: ScheduleOptimization;
  subject_focus: SubjectFocus[];
  learning_techniques: LearningTechnique[];
  motivational_insights: MotivationalInsights;
}

// API Response types
export interface DeepSeekResponse {
  data?: string | {
    content?: string;
    choices?: Array<{
      message: {
        content: string;
      };
    }>;
  };
  error?: string;
  success?: boolean;
}

export interface ParsedRecommendationContent {
  priority_recommendations?: unknown[];
  schedule_optimization?: unknown;
  subject_focus?: unknown[];
  learning_techniques?: unknown[];
  motivational_insights?: unknown;
}

// Validation functions type guards
export type RecommendationValidator<T> = (data: unknown) => T;

// Fallback recommendation generators
export interface FallbackRecommendationOptions {
  hasLowHours: boolean;
  hasHighHours: boolean;
  hasShortSessions: boolean;
  hasLongSessions: boolean;
  hasMultipleSubjects: boolean;
}