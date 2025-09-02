import { useState, useEffect } from 'react';
import { streakService, StreakData } from '@/services/streak/streakService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Flame } from 'lucide-react';

export const useStreak = () => {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewDay, setIsNewDay] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Record daily login and fetch streak data
  const recordLogin = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Record the daily login
      const data = await streakService.recordDailyLogin(user.id);
      
      if (data) {
        setStreakData(data);
        setIsNewDay(data.isNewDay);
        
        // Show congratulations toast for milestone streaks
        if (data.isNewDay) {
          showStreakToast(data.currentStreak);
        }
      } else {
        // If recording failed, just get current streak
        const currentData = await streakService.getCurrentStreak(user.id);
        setStreakData(currentData);
      }
    } catch (error) {
      console.error('Error recording login:', error);
      // Try to at least get current streak data
      const currentData = await streakService.getCurrentStreak(user.id);
      setStreakData(currentData);
    } finally {
      setLoading(false);
    }
  };

  // Show congratulatory toast for streak milestones
  const showStreakToast = (streak: number) => {
    // Special milestones
    const milestones = [1, 3, 7, 14, 30, 50, 100, 365];
    
    if (milestones.includes(streak)) {
      let message = '';
      let title = `${streak} Day Streak! 🎉`;
      
      switch (streak) {
        case 1:
          message = "Welcome back! Your learning journey continues.";
          break;
        case 3:
          message = "You're building momentum! Keep it up!";
          title = "3 Day Streak! 🔥";
          break;
        case 7:
          message = "One week of consistent learning! You're doing amazing!";
          title = "Week Streak Achieved! 🏆";
          break;
        case 14:
          message = "Two weeks strong! You're developing a powerful habit.";
          title = "Fortnight Champion! 💪";
          break;
        case 30:
          message = "One month of dedication! You're unstoppable!";
          title = "Monthly Master! 🌟";
          break;
        case 50:
          message = "50 days! Your commitment is inspiring!";
          title = "Half-Century Hero! 🚀";
          break;
        case 100:
          message = "100 days! You're a learning legend!";
          title = "Century Achiever! 👑";
          break;
        case 365:
          message = "One full year! You've achieved something incredible!";
          title = "Year-Long Champion! 🎊";
          break;
        default:
          message = `Keep up the amazing work!`;
      }
      
      toast({
        title,
        description: message,
        duration: 5000,
        className: "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0",
      });
    } else if (streak > 1) {
      // Regular streak continuation
      toast({
        title: `${streak} Day Streak!`,
        description: streakService.getStreakMessage(streak),
        duration: 3000,
      });
    }
  };

  // Check if streak is at risk
  const checkStreakRisk = async () => {
    if (!user) return;
    
    const atRisk = await streakService.isStreakAtRisk(user.id);
    if (atRisk) {
      toast({
        title: "Don't lose your streak! 🔥",
        description: "Log in tomorrow to keep your streak alive!",
        variant: "default",
        duration: 5000,
      });
    }
  };

  // Get login history
  const getLoginHistory = async (days: number = 30) => {
    if (!user) return [];
    return await streakService.getLoginHistory(days, user.id);
  };

  // Recalculate streaks (admin function)
  const recalculateStreaks = async () => {
    if (!user) return false;
    
    const success = await streakService.recalculateStreaks(user.id);
    if (success) {
      await recordLogin(); // Refresh data after recalculation
      toast({
        title: "Streaks Recalculated",
        description: "Your streak data has been updated.",
      });
    }
    return success;
  };

  // Effect to record login on mount and user change
  useEffect(() => {
    if (user) {
      recordLogin();
      
      // Start auto-tracking
      streakService.startAutoTracking();
      
      // Check if streak is at risk (near end of day)
      const now = new Date();
      const hoursLeft = 24 - now.getHours();
      if (hoursLeft <= 3) { // If less than 3 hours left in the day
        checkStreakRisk();
      }
    } else {
      setStreakData(null);
      setLoading(false);
    }
  }, [user]);

  // Listen for streak updates from other components
  useEffect(() => {
    const handleStreakUpdate = (event: CustomEvent) => {
      const { currentStreak, longestStreak } = event.detail;
      setStreakData(prev => prev ? {
        ...prev,
        currentStreak,
        longestStreak
      } : null);
    };

    window.addEventListener('streak-updated', handleStreakUpdate as EventListener);
    return () => {
      window.removeEventListener('streak-updated', handleStreakUpdate as EventListener);
    };
  }, []);

  return {
    currentStreak: streakData?.currentStreak || 0,
    longestStreak: streakData?.longestStreak || 0,
    lastLoginDate: streakData?.lastLoginDate || null,
    totalLoginDays: streakData?.totalLoginDays || 0,
    isNewDay,
    loading,
    recordLogin,
    getLoginHistory,
    recalculateStreaks,
    checkStreakRisk,
    streakMessage: streakService.getStreakMessage(streakData?.currentStreak || 0)
  };
};