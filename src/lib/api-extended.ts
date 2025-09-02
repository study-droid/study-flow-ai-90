/**
 * Extended API services - Part 2
 * Additional API functions for goals, timetable, notifications, etc.
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { log, getApiUrl } from '@/lib/config';
import { ApiError } from '@/lib/api';

// Type aliases
type Tables = Database['public']['Tables'];
type StudyGoal = Tables['study_goals']['Row'];
type StudyGoalInsert = Tables['study_goals']['Insert'];
type TimetableEntry = Tables['timetable_entries']['Row'];
type TimetableEntryInsert = Tables['timetable_entries']['Insert'];
type NotificationRow = Tables['notifications']['Row'];
type NotificationInsert = Tables['notifications']['Insert'];
type UserSettings = Tables['user_settings']['Row'];
type UserSettingsInsert = Tables['user_settings']['Insert'];
type Profile = Tables['profiles']['Row'];
type Achievement = Tables['achievements']['Row'];

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Authentication utilities
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new ApiError('Authentication required', 401, error);
  if (!user) throw new ApiError('User not found', 401);
  return user;
};

const handleApiError = (error: any, operation: string): ApiError => {
  log.error(`API Error in ${operation}:`, error);
  return new ApiError(error?.message || `Failed to ${operation}`, error?.status || 500, error);
};

// Study Goals API
export const studyGoalsApi = {
  async getAll(): Promise<ApiResponse<StudyGoal[]>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('study_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw handleApiError(error, 'fetch study goals');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch study goals');
    }
  },

  async create(goal: Omit<StudyGoalInsert, 'user_id'>): Promise<ApiResponse<StudyGoal>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('study_goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create study goal');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create study goal');
    }
  },

  async update(id: string, updates: Partial<StudyGoalInsert>): Promise<ApiResponse<StudyGoal>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('study_goals')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update study goal');
      
      // Check if goal is completed and create achievement
      if (updates.status === 'completed' && data) {
        await achievementsApi.create({
          achievement_type: 'goal_completed',
          title: 'Goal Achieved!',
          description: `Completed goal: ${data.title}`,
          icon: 'target',
          points: Math.floor(data.target_value / 10),
        });
      }
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update study goal');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('study_goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete study goal');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete study goal');
    }
  },

  async updateProgress(id: string, progress: number): Promise<ApiResponse<StudyGoal>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('study_goals')
        .update({ current_value: progress })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update goal progress');
      
      // Auto-complete goal if target reached
      if (data && progress >= data.target_value && data.status !== 'completed') {
        return await this.update(id, { status: 'completed', current_value: progress });
      }
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update goal progress');
    }
  },
};

// Timetable API
export const timetableApi = {
  async getAll(): Promise<ApiResponse<TimetableEntry[]>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('start_time');
      
      if (error) throw handleApiError(error, 'fetch timetable entries');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch timetable entries');
    }
  },

  async getByDay(dayOfWeek: number): Promise<ApiResponse<TimetableEntry[]>> {
    try {
      const user = await getCurrentUser();
      
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        throw new ApiError('Day of week must be between 0 and 6', 400);
      }
      
      const { data, error } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('day_of_week', dayOfWeek)
        .order('start_time');
      
      if (error) throw handleApiError(error, 'fetch timetable for day');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch timetable for day');
    }
  },

  async create(entry: Omit<TimetableEntryInsert, 'user_id'>): Promise<ApiResponse<TimetableEntry>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('timetable_entries')
        .insert([{ ...entry, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create timetable entry');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create timetable entry');
    }
  },

  async update(id: string, updates: Partial<TimetableEntryInsert>): Promise<ApiResponse<TimetableEntry>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('timetable_entries')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update timetable entry');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update timetable entry');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('timetable_entries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete timetable entry');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete timetable entry');
    }
  },
};

// Notifications API
export const notificationsApi = {
  async getAll(options: { unreadOnly?: boolean; limit?: number } = {}): Promise<ApiResponse<NotificationRow[]>> {
    try {
      const user = await getCurrentUser();
      const { unreadOnly = false, limit = 50 } = options;
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (unreadOnly) {
        query = query.eq('is_read', false);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      // Filter out expired notifications
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      const { data, error } = await query;
      
      if (error) throw handleApiError(error, 'fetch notifications');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch notifications');
    }
  },

  async markAsRead(id: string): Promise<ApiResponse<NotificationRow>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'mark notification as read');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'mark notification as read');
    }
  },

  async markAllAsRead(): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw handleApiError(error, 'mark all notifications as read');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'mark all notifications as read');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete notification');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete notification');
    }
  },

  async create(notification: Omit<NotificationInsert, 'user_id'>): Promise<ApiResponse<NotificationRow>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('notifications')
        .insert([{ ...notification, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create notification');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create notification');
    }
  },

  async getUnreadCount(): Promise<ApiResponse<number>> {
    try {
      const user = await getCurrentUser();
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      if (error) throw handleApiError(error, 'fetch unread notification count');
      
      return { success: true, data: count || 0 };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch unread notification count');
    }
  },
};

// User Settings API
export const userSettingsApi = {
  async get(): Promise<ApiResponse<UserSettings>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          return await this.create({});
        }
        throw handleApiError(error, 'fetch user settings');
      }
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch user settings');
    }
  },

  async create(settings: Partial<Omit<UserSettingsInsert, 'user_id'>>): Promise<ApiResponse<UserSettings>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('user_settings')
        .insert([{ ...settings, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create user settings');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create user settings');
    }
  },

  async update(updates: Partial<Omit<UserSettingsInsert, 'user_id'>>): Promise<ApiResponse<UserSettings>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update user settings');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update user settings');
    }
  },
};

// Profile API
export const profileApi = {
  async get(): Promise<ApiResponse<Profile>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw handleApiError(error, 'fetch profile');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch profile');
    }
  },

  async update(updates: Partial<Omit<Tables['profiles']['Insert'], 'user_id'>>): Promise<ApiResponse<Profile>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update profile');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update profile');
    }
  },

  async updateStudyStreak(increment: boolean = true): Promise<ApiResponse<Profile>> {
    try {
      const user = await getCurrentUser();
      
      const { data: profile } = await this.get();
      if (!profile.data) throw new ApiError('Profile not found', 404);
      
      const newStreak = increment 
        ? profile.data.study_streak + 1 
        : Math.max(0, profile.data.study_streak - 1);
      
      return await this.update({ study_streak: newStreak });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update study streak');
    }
  },
};

// Achievements API
export const achievementsApi = {
  async getAll(): Promise<ApiResponse<Achievement[]>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false });
      
      if (error) throw handleApiError(error, 'fetch achievements');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch achievements');
    }
  },

  async create(achievement: Omit<Tables['achievements']['Insert'], 'user_id'>): Promise<ApiResponse<Achievement>> {
    try {
      const user = await getCurrentUser();
      
      // Check if achievement already exists
      const { data: existing } = await supabase
        .from('achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('achievement_type', achievement.achievement_type)
        .single();
      
      if (existing) {
        throw new ApiError('Achievement already unlocked', 409);
      }
      
      const { data, error } = await supabase
        .from('achievements')
        .insert([{ ...achievement, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create achievement');
      
      // Create notification for new achievement
      await notificationsApi.create({
        title: 'Achievement Unlocked!',
        message: `You've earned "${data.title}" for ${data.points} points!`,
        type: 'success',
        priority: 'normal',
      });
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create achievement');
    }
  },

  async getTotalPoints(): Promise<ApiResponse<number>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('achievements')
        .select('points')
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'fetch total points');
      
      const totalPoints = (data || []).reduce((sum, achievement) => sum + achievement.points, 0);
      
      return { success: true, data: totalPoints };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch total points');
    }
  },
};

// AI Services with Gemini fallback
export const aiApi = {
  async getStudyRecommendations(studentData: any): Promise<ApiResponse<unknown>> {
    try {
      const user = await getCurrentUser();
      
      // Try to use Supabase function first
      try {
        const response = await fetch(getApiUrl('/ai-study-recommendations'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            studyData: studentData.studyData || {},
            subjects: studentData.subjects || [],
            goals: studentData.goals || [],
            timePreferences: studentData.timePreferences || {},
            currentPerformance: studentData.currentPerformance || {},
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            return { success: true, data: result.recommendations };
          }
        }
      } catch (supabaseError) {
        log.warn('Supabase function unavailable, using Gemini fallback:', supabaseError);
      }
      
      // No fallback - only use Supabase edge function
      throw new Error('AI recommendations service is temporarily unavailable. Please ensure the Supabase edge function is deployed and API keys are configured.');
    } catch (error) {
      log.error('Error in getStudyRecommendations:', error);
      throw handleApiError(error, 'fetch AI study recommendations');
    }
  },

  async getStudyAnalytics(): Promise<ApiResponse<unknown>> {
    try {
      const user = await getCurrentUser();
      
      const response = await fetch(getApiUrl('/ai-study-analytics'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new ApiError(`AI analytics service error: ${response.status}`, response.status);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new ApiError(result.error || 'AI analytics service failed', 500);
      }
      
      return { success: true, data: result.analytics };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch AI study analytics');
    }
  },
};