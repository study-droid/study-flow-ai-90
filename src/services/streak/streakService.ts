/**
 * Streak Service
 * Handles daily login tracking and streak management
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalLoginDays: number;
  isNewDay: boolean;
}

export interface LoginHistory {
  date: string;
  hasLogin: boolean;
}

class StreakService {
  private static instance: StreakService;
  private lastCheckTime: Date | null = null;
  private checkInterval = 60000; // Check every minute

  private constructor() {}

  public static getInstance(): StreakService {
    if (!StreakService.instance) {
      StreakService.instance = new StreakService();
    }
    return StreakService.instance;
  }

  /**
   * Record daily login and update streak
   * This should be called when user signs in or when app loads
   */
  async recordDailyLogin(userId?: string): Promise<StreakData | null> {
    try {
      // Get current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          logger.debug('No user logged in', 'StreakService');
          return null;
        }
        userId = user.id;
      }

      // Call the database function to record login
      const { data, error } = await supabase
        .rpc('record_daily_login', { p_user_id: userId });

      if (error) {
        logger.error('Error recording daily login', 'StreakService', error);
        throw error;
      }

      logger.info('Daily login recorded', 'StreakService', data);

      // Update the profile to trigger any UI updates
      if (data?.is_new_day) {
        // Emit custom event for streak update
        window.dispatchEvent(new CustomEvent('streak-updated', { 
          detail: { 
            currentStreak: data.current_streak,
            longestStreak: data.longest_streak 
          } 
        }));
      }

      return {
        currentStreak: data?.current_streak || 0,
        longestStreak: data?.longest_streak || 0,
        lastLoginDate: data?.last_login || null,
        totalLoginDays: 0, // Will be fetched separately if needed
        isNewDay: data?.is_new_day || false
      };
    } catch (error) {
      logger.error('Failed to record daily login', 'StreakService', error);
      return null;
    }
  }

  /**
   * Get user's login history for the last N days
   */
  async getLoginHistory(days: number = 30, userId?: string): Promise<LoginHistory[]> {
    try {
      // Get current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        userId = user.id;
      }

      const { data, error } = await supabase
        .rpc('get_login_history', { 
          p_user_id: userId,
          p_days: days 
        });

      if (error) throw error;

      return data?.map(item => ({
        date: item.login_date,
        hasLogin: item.has_login
      })) || [];
    } catch (error) {
      logger.error('Failed to get login history', 'StreakService', error);
      return [];
    }
  }

  /**
   * Get current streak data from profile
   */
  async getCurrentStreak(userId?: string): Promise<StreakData | null> {
    try {
      // Get current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        userId = user.id;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak, last_login_date, total_login_days, study_streak')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        currentStreak: data?.current_streak || data?.study_streak || 0,
        longestStreak: data?.longest_streak || 0,
        lastLoginDate: data?.last_login_date || null,
        totalLoginDays: data?.total_login_days || 0,
        isNewDay: false
      };
    } catch (error) {
      logger.error('Failed to get current streak', 'StreakService', error);
      return null;
    }
  }

  /**
   * Recalculate user's streaks (for maintenance)
   */
  async recalculateStreaks(userId?: string): Promise<boolean> {
    try {
      // Get current user if not provided
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;
        userId = user.id;
      }

      const { error } = await supabase
        .rpc('recalculate_user_streaks', { p_user_id: userId });

      if (error) throw error;

      logger.info('Streaks recalculated', 'StreakService');
      return true;
    } catch (error) {
      logger.error('Failed to recalculate streaks', 'StreakService', error);
      return false;
    }
  }

  /**
   * Start automatic daily login tracking
   * Checks periodically if it's a new day and records login
   */
  startAutoTracking(): void {
    // Check immediately on start
    this.recordDailyLogin();

    // Set up periodic checking
    setInterval(async () => {
      const now = new Date();
      
      // Only check once per minute and if date has changed
      if (!this.lastCheckTime || 
          now.getDate() !== this.lastCheckTime.getDate()) {
        
        this.lastCheckTime = now;
        await this.recordDailyLogin();
      }
    }, this.checkInterval);
  }

  /**
   * Check if user has logged in today
   */
  async hasLoggedInToday(userId?: string): Promise<boolean> {
    try {
      const streak = await this.getCurrentStreak(userId);
      if (!streak) return false;

      const today = new Date().toISOString().split('T')[0];
      const lastLogin = streak.lastLoginDate;

      return lastLogin === today;
    } catch (error) {
      logger.error('Failed to check today login', 'StreakService', error);
      return false;
    }
  }

  /**
   * Get streak status message
   */
  getStreakMessage(streak: number): string {
    if (streak === 0) return "Start your streak today!";
    if (streak === 1) return "Great start! Keep it up!";
    if (streak < 7) return `${streak} days strong! Keep going!`;
    if (streak < 30) return `Amazing ${streak}-day streak! 🔥`;
    if (streak < 100) return `Incredible ${streak}-day streak! You're on fire! 🔥`;
    return `Legendary ${streak}-day streak! You're unstoppable! 🏆`;
  }

  /**
   * Check if streak is at risk (hasn't logged in today)
   */
  async isStreakAtRisk(userId?: string): Promise<boolean> {
    const hasLogged = await this.hasLoggedInToday(userId);
    const streak = await this.getCurrentStreak(userId);
    
    // Streak is at risk if they have a streak but haven't logged in today
    return !hasLogged && (streak?.currentStreak || 0) > 0;
  }
}

// Export singleton instance
export const streakService = StreakService.getInstance();