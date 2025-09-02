/**
 * Production-ready API service layer
 * Centralized API functions with error handling, caching, and type safety
 */

import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { log, getApiUrl } from '@/lib/config';
import { z } from 'zod';
import { 
  studySessionSchema, 
  taskSchema, 
  flashcardSchema, 
  subjectSchema,
  validateData,
  validatePartialData,
  schemas
} from '@/lib/validation-schemas';
import { securityMiddleware, detectAnomalousActivity } from '@/lib/security-middleware';

// Type aliases for better readability
type Tables = Database['public']['Tables'];
type StudySession = Tables['study_sessions']['Row'];
type StudySessionInsert = Tables['study_sessions']['Insert'];
type Task = Tables['tasks']['Row'];
type TaskInsert = Tables['tasks']['Insert'];
type Flashcard = Tables['flashcards']['Row'];
type FlashcardInsert = Tables['flashcards']['Insert'];
type Subject = Tables['subjects']['Row'];
type SubjectInsert = Tables['subjects']['Insert'];
type StudyGoal = Tables['study_goals']['Row'];
type StudyGoalInsert = Tables['study_goals']['Insert'];
type TimetableEntry = Tables['timetable_entries']['Row'];
type TimetableEntryInsert = Tables['timetable_entries']['Insert'];
type NotificationRow = Tables['notifications']['Row'];
type NotificationInsert = Tables['notifications']['Insert'];
type UserSettings = Tables['user_settings']['Row'];
type UserSettingsInsert = Tables['user_settings']['Insert'];
type Profile = Tables['profiles']['Row'];

// API Response types
interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count?: number;
  hasMore?: boolean;
  page?: number;
}

// Error handling utility
class ApiError extends Error {
  constructor(message: string, public statusCode?: number, public originalError?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

const handleApiError = (error: unknown, operation: string): ApiError => {
  log.error(`API Error in ${operation}:`, error);
  
  const errorObj = error as Record<string, unknown>;
  
  if (errorObj?.code === '23505') {
    return new ApiError('A record with this information already exists', 409, error);
  }
  
  if (errorObj?.code === '42501') {
    return new ApiError('You do not have permission to perform this action', 403, error);
  }
  
  if (errorObj?.code === 'PGRST116') {
    return new ApiError('The requested resource was not found', 404, error);
  }
  
  // Handle schema cache issues
  if (typeof errorObj?.message === 'string' && errorObj.message.includes('schema cache')) {
    return new ApiError('Database schema is updating. Please try again in a moment.', 503, error);
  }
  
  const message = typeof errorObj?.message === 'string' ? errorObj.message : `Failed to ${operation}`;
  const status = typeof errorObj?.status === 'number' ? errorObj.status : 500;
  
  return new ApiError(message, status, error);
};

// Rate limiting utility
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const checkRateLimit = (key: string, maxRequests = 60, windowMs = 60000): boolean => {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
};

// Authentication utilities
const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw new ApiError('Authentication required', 401, error);
  if (!user) throw new ApiError('User not found', 401);
  return user;
};

// Study Sessions API
export const studySessionsApi = {
  async getAll(options: { 
    page?: number; 
    limit?: number; 
    startDate?: string; 
    endDate?: string;
    sessionType?: string;
  } = {}): Promise<PaginatedResponse<StudySession>> {
    try {
      const user = await getCurrentUser();
      const { page = 1, limit = 50, startDate, endDate, sessionType } = options;
      
      if (!checkRateLimit(`sessions_${user.id}`, 100)) {
        throw new ApiError('Rate limit exceeded', 429);
      }

      let query = supabase
        .from('study_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (startDate) {
        query = query.gte('completed_at', startDate);
      }
      if (endDate) {
        query = query.lte('completed_at', endDate);
      }
      if (sessionType) {
        query = query.eq('session_type', sessionType);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw handleApiError(error, 'fetch study sessions');
      
      return {
        success: true,
        data: data || [],
        count: count || 0,
        hasMore: (count || 0) > page * limit,
        page,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch study sessions');
    }
  },

  async create(session: Omit<StudySessionInsert, 'user_id'>): Promise<ApiResponse<StudySession>> {
    try {
      const user = await getCurrentUser();
      
      // Security and validation middleware
      const securityCheck = securityMiddleware(user.id, 'create_session', session, {
        validateSchema: studySessionSchema.omit({ user_id: true }),
        rateLimit: { requests: 30, windowMs: 60000 },
        auditLog: true,
        sanitizeInput: true
      });

      if (!securityCheck.allowed) {
        throw new ApiError(securityCheck.error || 'Security validation failed', 403);
      }

      const validatedSession = securityCheck.sanitizedData;

      // Anomaly detection
      const activityCheck = detectAnomalousActivity(user.id, {
        operation: 'create_session',
        requestSize: JSON.stringify(session).length,
        timestamp: Date.now()
      });

      if (activityCheck.suspicious) {
        log.warn(`Suspicious activity detected for user ${user.id}: ${activityCheck.reasons.join(', ')}`);
        // Continue but log the activity - don't block legitimate usage
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{ ...validatedSession, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create study session');
      
      // Update user's total study time
      await supabase.rpc('increment_study_time', { 
        user_id: user.id, 
        minutes: validatedSession.duration_minutes 
      });
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create study session');
    }
  },

  async update(id: string, updates: Partial<StudySessionInsert>): Promise<ApiResponse<StudySession>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update study session');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update study session');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete study session');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete study session');
    }
  },

  async getAnalytics(days = 30): Promise<ApiResponse<{
    totalSessions: number;
    totalMinutes: number;
    averageSessionLength: number;
    sessionsByType: Record<string, number>;
    dailyStats: Array<{ date: string; sessions: number; minutes: number }>;
  }>> {
    try {
      const user = await getCurrentUser();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString());
      
      if (error) throw handleApiError(error, 'fetch session analytics');
      
      const sessions = data || [];
      const totalSessions = sessions.length;
      const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
      const averageSessionLength = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
      
      const sessionsByType = sessions.reduce((acc, session) => {
        acc[session.session_type] = (acc[session.session_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dailyStats = Object.entries(
        sessions.reduce((acc, session) => {
          const date = new Date(session.completed_at).toDateString();
          if (!acc[date]) {
            acc[date] = { sessions: 0, minutes: 0 };
          }
          acc[date].sessions++;
          acc[date].minutes += session.duration_minutes;
          return acc;
        }, {} as Record<string, { sessions: number; minutes: number }>)
      ).map(([date, stats]) => ({ 
        date, 
        sessions: stats.sessions,
        minutes: stats.minutes 
      }));
      
      return {
        success: true,
        data: {
          totalSessions,
          totalMinutes,
          averageSessionLength,
          sessionsByType,
          dailyStats,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch session analytics');
    }
  },
};

// Tasks API
export const tasksApi = {
  async getAll(options: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    subject?: string;
    dueBefore?: string;
  } = {}): Promise<PaginatedResponse<Task>> {
    try {
      const user = await getCurrentUser();
      const { page = 1, limit = 50, status, priority, subject, dueBefore } = options;
      
      if (!checkRateLimit(`tasks_${user.id}`, 100)) {
        throw new ApiError('Rate limit exceeded', 429);
      }

      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);
      if (priority) query = query.eq('priority', priority);
      if (subject) query = query.eq('subject', subject);
      if (dueBefore) query = query.lte('due_date', dueBefore);

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw handleApiError(error, 'fetch tasks');
      
      return {
        success: true,
        data: data || [],
        count: count || 0,
        hasMore: (count || 0) > page * limit,
        page,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch tasks');
    }
  },

  async create(task: Omit<TaskInsert, 'user_id'>): Promise<ApiResponse<Task>> {
    try {
      const user = await getCurrentUser();
      
      if (!checkRateLimit(`create_task_${user.id}`, 50)) {
        throw new ApiError('Rate limit exceeded', 429);
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...task, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create task');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create task');
    }
  },

  async update(id: string, updates: Partial<TaskInsert>): Promise<ApiResponse<Task>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update task');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update task');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete task');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete task');
    }
  },

  async bulkUpdate(updates: Array<{ id: string; updates: Partial<TaskInsert> }>): Promise<ApiResponse<Task[]>> {
    try {
      const user = await getCurrentUser();
      
      if (updates.length > 50) {
        throw new ApiError('Cannot update more than 50 tasks at once', 400);
      }
      
      const promises = updates.map(({ id, updates: taskUpdates }) =>
        supabase
          .from('tasks')
          .update(taskUpdates)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single()
      );
      
      const results = await Promise.allSettled(promises);
      const data: Task[] = [];
      const errors: string[] = [];
      
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value.data) {
          data.push(result.value.data);
        } else if (result.status === 'rejected') {
          errors.push(result.reason.message);
        }
      });
      
      if (errors.length > 0 && data.length === 0) {
        throw new ApiError(`Bulk update failed: ${errors.join(', ')}`, 400);
      }
      
      return { success: true, data, error: errors.length > 0 ? errors.join(', ') : undefined };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'bulk update tasks');
    }
  },
};

// Flashcards API
export const flashcardsApi = {
  async getAll(options: {
    page?: number;
    limit?: number;
    subject?: string;
    difficulty?: string;
    dueForReview?: boolean;
  } = {}): Promise<PaginatedResponse<Flashcard>> {
    try {
      const user = await getCurrentUser();
      const { page = 1, limit = 50, subject, difficulty, dueForReview } = options;
      
      if (!checkRateLimit(`flashcards_${user.id}`, 100)) {
        throw new ApiError('Rate limit exceeded', 429);
      }

      let query = supabase
        .from('flashcards')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (subject) query = query.eq('subject', subject);
      if (difficulty) query = query.eq('difficulty', difficulty);
      if (dueForReview) {
        query = query.lte('next_review_date', new Date().toISOString());
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      
      if (error) throw handleApiError(error, 'fetch flashcards');
      
      return {
        success: true,
        data: data || [],
        count: count || 0,
        hasMore: (count || 0) > page * limit,
        page,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch flashcards');
    }
  },

  async create(flashcard: Omit<FlashcardInsert, 'user_id'>): Promise<ApiResponse<Flashcard>> {
    try {
      const user = await getCurrentUser();
      
      if (!checkRateLimit(`create_flashcard_${user.id}`, 100)) {
        throw new ApiError('Rate limit exceeded', 429);
      }

      const { data, error } = await supabase
        .from('flashcards')
        .insert([{ ...flashcard, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create flashcard');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create flashcard');
    }
  },

  async update(id: string, updates: Partial<FlashcardInsert>): Promise<ApiResponse<Flashcard>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('flashcards')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update flashcard');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update flashcard');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      const { error } = await supabase
        .from('flashcards')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete flashcard');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete flashcard');
    }
  },

  async reviewFlashcard(id: string, quality: number): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      if (quality < 0 || quality > 5) {
        throw new ApiError('Quality must be between 0 and 5', 400);
      }
      
      const { error } = await supabase.rpc('update_spaced_repetition', {
        p_flashcard_id: id,
        p_user_id: user.id,
        p_quality: quality,
      });
      
      if (error) throw handleApiError(error, 'review flashcard');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'review flashcard');
    }
  },

  async getDueForReview(): Promise<ApiResponse<Flashcard[]>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('flashcards')
        .select('*')
        .eq('user_id', user.id)
        .lte('next_review_date', new Date().toISOString())
        .order('next_review_date', { ascending: true })
        .limit(20);
      
      if (error) throw handleApiError(error, 'fetch due flashcards');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch due flashcards');
    }
  },
};

// Subjects API  
export const subjectsApi = {
  async getAll(): Promise<ApiResponse<Subject[]>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw handleApiError(error, 'fetch subjects');
      
      return { success: true, data: data || [] };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'fetch subjects');
    }
  },

  async create(subject: Omit<SubjectInsert, 'user_id'>): Promise<ApiResponse<Subject>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('subjects')
        .insert([{ ...subject, user_id: user.id }])
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'create subject');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'create subject');
    }
  },

  async update(id: string, updates: Partial<SubjectInsert>): Promise<ApiResponse<Subject>> {
    try {
      const user = await getCurrentUser();
      
      const { data, error } = await supabase
        .from('subjects')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw handleApiError(error, 'update subject');
      
      return { success: true, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'update subject');
    }
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      const user = await getCurrentUser();
      
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);
      
      if (error) throw handleApiError(error, 'delete subject');
      
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw handleApiError(error, 'delete subject');
    }
  },
};

// Continue in next part due to length...
export { ApiError };