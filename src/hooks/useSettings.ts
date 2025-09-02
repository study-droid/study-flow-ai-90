import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { log } from '@/lib/config';
import { getErrorMessage } from '@/types/errors';
import { logger } from '@/services/logging/logger';

export interface UserSettings {
  id: string;
  user_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  dark_mode: boolean;
  timezone: string;
  language: string;
  session_reminders: boolean;
  break_reminders: boolean;
  daily_goal_reminders: boolean;
  week_start_day: number;
  pomodoro_work_duration: number;
  pomodoro_short_break: number;
  pomodoro_long_break: number;
  pomodoro_sessions_until_long_break: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateSettingsData {
  notifications_enabled?: boolean;
  email_notifications?: boolean;
  dark_mode?: boolean;
  timezone?: string;
  language?: string;
  session_reminders?: boolean;
  break_reminders?: boolean;
  daily_goal_reminders?: boolean;
  week_start_day?: number;
  pomodoro_work_duration?: number;
  pomodoro_short_break?: number;
  pomodoro_long_break?: number;
  pomodoro_sessions_until_long_break?: number;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings as UserSettings);
      } else {
        setSettings(data as UserSettings);
      }
    } catch (error) {
      log.error('Error fetching settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: UpdateSettingsData) => {
    if (!user || !settings) return;

    try {
      setUpdating(true);
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data as UserSettings);
      toast({
        title: 'Success',
        description: 'Settings updated successfully',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      log.error('Error updating settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
      return { error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const resetSettings = async () => {
    if (!user) return;

    try {
      setUpdating(true);
      
      // Delete ALL user data from all tables (based on actual database schema)
      const deleteResults = [];
      const tablesToDelete = [
        'tasks',
        'study_sessions', 
        'flashcards',
        'spaced_repetition_data',
        'study_goals',
        'subjects',
        'achievements',
        'notifications',
        'timetable_entries',
        'audit_logs',
        // AI-related tables
        'ai_tutor_sessions',
        'ai_tutor_messages',
        'rate_limits',
        'api_usage_logs',
        // Additional tables that may exist
        'materials',
        'assignments', 
        'study_hours',
        'api_vault',
        'vault_logs',
        'api_key_usage',
        'api_key_logs',
        'api_key_rotations',
        // Core user tables (handled separately but included in count)
        'user_settings',
        'profiles'
      ];

      // Delete from each table individually with proper error handling
      for (const tableName of tablesToDelete) {
        // Skip user_settings and profiles as we handle them separately
        if (tableName === 'user_settings' || tableName === 'profiles') {
          continue;
        }
        
        try {
          const result = await supabase
            .from(tableName)
            .delete()
            .eq('user_id', user.id);
          
          deleteResults.push({
            table: tableName,
            success: !result.error,
            error: result.error?.message,
            count: result.count || 0
          });
          
          if (result.error) {
            logger.warn(`Failed to delete from ${tableName}:`, result.error.message, 'UseSettings');
          } else {
            
          }
        } catch (err) {
          logger.warn(`Table ${tableName} might not exist:`, err, 'UseSettings');
          deleteResults.push({
            table: tableName,
            success: false,
            error: `Table might not exist: ${err}`,
            count: 0
          });
        }
      }

      // Log the results for debugging

      // Delete user_settings completely instead of resetting
      // This ensures a clean slate without schema issues
      const userSettingsDeleteResult = await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', user.id);

      deleteResults.push({
        table: 'user_settings',
        success: !userSettingsDeleteResult.error,
        error: userSettingsDeleteResult.error?.message,
        count: userSettingsDeleteResult.count || 0
      });

      if (userSettingsDeleteResult.error) {
        logger.warn('Could not delete user_settings:', userSettingsDeleteResult.error, 'UseSettings');
      } else {
        
      }

      // Delete the profile completely to ensure complete reset
      const profileDeleteResult = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.id);

      deleteResults.push({
        table: 'profiles',
        success: !profileDeleteResult.error,
        error: profileDeleteResult.error?.message,
        count: profileDeleteResult.count || 0
      });

      if (profileDeleteResult.error) {
        logger.error('Profile deletion error:', profileDeleteResult.error, 'UseSettings');
      } else {
        
      }

      // Clear the settings state since everything has been deleted
      setSettings(null);
      
      // Check how many operations succeeded
      const successfulDeletes = deleteResults.filter(r => r.success).length;
      const totalTables = deleteResults.length;
      
      toast({
        title: 'Complete Account Reset',
        description: `All data deleted from ${successfulDeletes}/${totalTables} tables + profile. Redirecting to sign-in...`,
      });

      // Sign out the user and redirect to auth page since profile is deleted
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          window.location.href = '/auth';
        } catch (error) {
          logger.error('Sign out error:', error, 'UseSettings');
          // Force redirect even if sign out fails
          window.location.href = '/auth';
        }
      }, 2000);

      return { success: true, deleteResults };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      log.error('Error resetting all data:', error);
      logger.error('Full reset error:', error, 'UseSettings');
      toast({
        title: 'Reset Failed',
        description: `Error: ${errorMessage}. Check console for details.`,
        variant: 'destructive',
      });
      return { error: errorMessage };
    } finally {
      setUpdating(false);
    }
  };

  const exportData = async (format: 'json' | 'csv' | 'pdf' = 'json') => {
    if (!user) return;

    try {
      // Export user data including all study information
      const [profileRes, tasksRes, sessionsRes, goalsRes, flashcardsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id),
        supabase.from('tasks').select('*').eq('user_id', user.id),
        supabase.from('study_sessions').select('*').eq('user_id', user.id),
        supabase.from('study_goals').select('*').eq('user_id', user.id),
        // Handle potential schema cache issues with flashcards
        supabase.from('flashcards').select('*').eq('user_id', user.id).then(res => {
          if (res.error && res.error.message?.includes('schema cache')) {
            logger.warn('Flashcards schema cache issue:', res.error.message, 'UseSettings');
            return { data: [], error: null };
          }
          return res;
        }),
      ]);

      const exportData = {
        user_id: user.id,
        email: user.email,
        exported_at: new Date().toISOString(),
        profile: profileRes.data?.[0] || null,
        tasks: tasksRes.data || [],
        study_sessions: sessionsRes.data || [],
        goals: goalsRes.data || [],
        flashcards: flashcardsRes.data || [],
        settings: settings,
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `study-flow-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast({
        title: 'Success',
        description: 'Data exported successfully',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      log.error('Error exporting data:', error);
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive',
      });
      return { error: errorMessage };
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  return {
    settings,
    loading,
    updating,
    updateSettings,
    resetSettings,
    exportData,
    refetch: fetchSettings,
  };
};