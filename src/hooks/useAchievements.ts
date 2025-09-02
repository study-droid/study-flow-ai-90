import { useState, useEffect } from 'react';
import { useStudySessions } from './useStudySessions';
import { useTasks } from './useTasks';
import { useGoals } from './useGoals';
import { useProfile } from './useProfile';
import { useFocusSessions } from './useFocusSessions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/services/logging/logger';
import { 
  BookOpen, 
  Flame, 
  Trophy, 
  Star, 
  Award, 
  Medal, 
  Crown,
  CheckCircle
} from 'lucide-react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  progress: number;
  maxProgress: number;
  completed: boolean;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  completedAt?: Date;
}

export interface Streak {
  name: string;
  current: number;
  best: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface AchievementData {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const useAchievements = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { sessions = [], getTotalStudyTime, getTodaysStudyTime } = useStudySessions();
  const { tasks = [], completedTasks = [] } = useTasks();
  const { goals = [] } = useGoals();
  const { sessions: focusSessions = [] } = useFocusSessions();
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([
    {
      name: 'Study Streak',
      current: 0,
      best: 0,
      icon: Flame,
      color: 'text-orange-500'
    },
    {
      name: 'Task Completion',
      current: 0,
      best: 0,
      icon: CheckCircle,
      color: 'text-green-500'
    },
    {
      name: 'Pomodoro Streak',
      current: 0,
      best: 0,
      icon: Trophy,
      color: 'text-purple-500'
    }
  ]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [level, setLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userAchievementData, setUserAchievementData] = useState<AchievementData[]>([]);

  // Define achievement templates
  const achievementTemplates: Achievement[] = [
    {
      id: 'first-study',
      title: 'Getting Started',
      description: 'Complete your first study session',
      icon: BookOpen,
      color: 'text-blue-500',
      progress: 0,
      maxProgress: 1,
      completed: false,
      points: 100,
      rarity: 'common'
    },
    {
      id: 'study-streak-3',
      title: 'Consistency Builder',
      description: 'Study for 3 days in a row',
      icon: Flame,
      color: 'text-orange-500',
      progress: 0,
      maxProgress: 3,
      completed: false,
      points: 300,
      rarity: 'common'
    },
    {
      id: 'pomodoro-master',
      title: 'Pomodoro Master',
      description: 'Complete 25 Pomodoro sessions',
      icon: Trophy,
      color: 'text-purple-500',
      progress: 0,
      maxProgress: 25,
      completed: false,
      points: 500,
      rarity: 'rare'
    },
    {
      id: 'early-bird',
      title: 'Early Bird',
      description: 'Study before 7 AM for 5 days',
      icon: Star,
      color: 'text-yellow-500',
      progress: 0,
      maxProgress: 5,
      completed: false,
      points: 400,
      rarity: 'rare'
    },
    {
      id: 'night-owl',
      title: 'Night Owl',
      description: 'Study after 10 PM for 7 days',
      icon: Award,
      color: 'text-indigo-500',
      progress: 0,
      maxProgress: 7,
      completed: false,
      points: 350,
      rarity: 'rare'
    },
    {
      id: 'marathon-session',
      title: 'Marathon Runner',
      description: 'Complete a 4-hour study session',
      icon: Medal,
      color: 'text-green-500',
      progress: 0,
      maxProgress: 4,
      completed: false,
      points: 800,
      rarity: 'epic'
    },
    {
      id: 'perfectionist',
      title: 'Perfectionist',
      description: 'Complete 100% of tasks in a week',
      icon: Crown,
      color: 'text-pink-500',
      progress: 0,
      maxProgress: 7,
      completed: false,
      points: 1000,
      rarity: 'legendary'
    },
    {
      id: 'task-master',
      title: 'Task Master',
      description: 'Complete 50 tasks',
      icon: CheckCircle,
      color: 'text-green-500',
      progress: 0,
      maxProgress: 50,
      completed: false,
      points: 600,
      rarity: 'rare'
    }
  ];

  // Load user's achievement data from database
  useEffect(() => {
    if (!user) return;
    
    const loadAchievementData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          // Table might not exist, that's okay for new users
          
          setUserAchievementData([]);
        } else {
          setUserAchievementData(data || []);
        }
      } catch (error) {
        logger.error('Error loading achievements:', error, 'UseAchievements');
      } finally {
        setLoading(false);
      }
    };

    loadAchievementData();
  }, [user]);

  // Calculate achievement progress based on real data
  useEffect(() => {
    if (!sessions || !tasks || !profile) return;

    const updatedAchievements = achievementTemplates.map(template => {
      // Find saved progress for this achievement
      const savedData = userAchievementData.find(a => a.achievement_id === template.id);
      
      let progress = savedData?.progress || 0;
      let completed = savedData?.completed || false;
      
      // Calculate real-time progress based on achievement type
      switch (template.id) {
        case 'first-study':
          progress = sessions.length > 0 ? 1 : 0;
          completed = progress >= template.maxProgress;
          break;
          
        case 'study-streak-3':
          progress = profile.study_streak || 0;
          completed = progress >= template.maxProgress;
          break;
          
        case 'pomodoro-master':
          // Count actual Pomodoro sessions from focus timer (25-minute sessions)
          const pomodoroFocusSessions = focusSessions.filter(s => s?.duration_minutes === 25).length;
          // Also count study sessions that are 25 minutes (classic Pomodoro)
          const pomodoroStudySessions = sessions.filter(s => s?.duration === 25).length;
          progress = Math.max(pomodoroFocusSessions, pomodoroStudySessions);
          completed = progress >= template.maxProgress;
          break;
          
        case 'early-bird':
          // Count sessions started before 7 AM
          progress = sessions.filter(s => {
            const hour = new Date(s.start_time).getHours();
            return hour < 7;
          }).length;
          completed = progress >= template.maxProgress;
          break;
          
        case 'night-owl':
          // Count sessions started after 10 PM
          progress = sessions.filter(s => {
            const hour = new Date(s.start_time).getHours();
            return hour >= 22;
          }).length;
          completed = progress >= template.maxProgress;
          break;
          
        case 'marathon-session':
          // Find longest session in hours
          const longestSession = Math.max(...sessions.map(s => s.duration / 60), 0);
          progress = Math.min(longestSession, template.maxProgress);
          completed = progress >= template.maxProgress;
          break;
          
        case 'task-master':
          progress = completedTasks.length;
          completed = progress >= template.maxProgress;
          break;
          
        case 'perfectionist':
          // This would need weekly task completion tracking
          // For now, set to 0
          progress = 0;
          completed = false;
          break;
      }

      return {
        ...template,
        progress: Math.min(progress, template.maxProgress),
        completed,
        completedAt: savedData?.completed_at ? new Date(savedData.completed_at) : undefined
      };
    });

    setAchievements(updatedAchievements);

    // Calculate total points
    const points = updatedAchievements
      .filter(a => a.completed)
      .reduce((sum, a) => sum + a.points, 0);
    setTotalPoints(points);
    setLevel(Math.floor(points / 1000) + 1);
  }, [sessions, tasks, profile, userAchievementData]);

  // Calculate streaks based on real data
  useEffect(() => {
    if (!profile || !tasks) return;

    const updatedStreaks: Streak[] = [
      {
        name: 'Study Streak',
        current: profile.study_streak || 0,
        best: profile.study_streak || 0, // Would need to track best separately
        icon: Flame,
        color: 'text-orange-500'
      },
      {
        name: 'Task Completion',
        current: calculateTaskStreak(),
        best: calculateTaskStreak(), // Would need to track best separately
        icon: CheckCircle,
        color: 'text-green-500'
      },
      {
        name: 'Pomodoro Streak',
        current: calculatePomodoroStreak(),
        best: calculatePomodoroStreak(), // Would need to track best separately
        icon: Trophy,
        color: 'text-purple-500'
      }
    ];

    setStreaks(updatedStreaks);
  }, [profile, tasks, sessions, focusSessions]);

  // Helper function to calculate task completion streak
  const calculateTaskStreak = () => {
    if (!tasks || tasks.length === 0) return 0;
    
    // Sort tasks by completion date
    const sortedTasks = [...completedTasks].sort((a, b) => 
      new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    );

    if (sortedTasks.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check consecutive days with completed tasks
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const dayTasks = sortedTasks.filter(t => {
        const taskDate = new Date(t.completed_at || 0);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === currentDate.getTime();
      });

      if (dayTasks.length > 0) {
        streak++;
      } else if (i > 0) { // Allow today to be empty
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  // Helper function to calculate Pomodoro streak
  const calculatePomodoroStreak = () => {
    if (!focusSessions || focusSessions.length === 0) return 0;
    
    // Filter only Pomodoro sessions (25 minutes) and sort by date
    const pomodoroSessions = focusSessions.filter(s => s?.duration_minutes === 25);
    if (pomodoroSessions.length === 0) return 0;
    
    const sortedSessions = [...pomodoroSessions].sort((a, b) => 
      new Date(b.completed_at || 0).getTime() - new Date(a.completed_at || 0).getTime()
    );

    if (sortedSessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check consecutive days with Pomodoro sessions
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const daySessions = sortedSessions.filter(s => {
        const sessionDate = new Date(s.completed_at || 0);
        const sessionDay = new Date(sessionDate);
        sessionDay.setHours(0, 0, 0, 0);
        return sessionDay.getTime() === currentDate.getTime();
      });

      if (daySessions.length > 0) {
        streak++;
      } else if (i > 0) { // Allow today to be empty
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  // Helper function to calculate early rising streak
  const calculateEarlyRisingStreak = () => {
    if (!sessions || sessions.length === 0) return 0;

    // Sort sessions by date
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    );

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check consecutive days with early morning sessions
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const daySessions = sortedSessions.filter(s => {
        const sessionDate = new Date(s.start_time);
        const sessionDay = new Date(sessionDate);
        sessionDay.setHours(0, 0, 0, 0);
        return sessionDay.getTime() === currentDate.getTime() && sessionDate.getHours() < 7;
      });

      if (daySessions.length > 0) {
        streak++;
      } else if (i > 0) { // Allow today to be empty
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  };

  // Save achievement progress to database
  const saveAchievementProgress = async (achievementId: string, progress: number, completed: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('achievements')
        .upsert({
          user_id: user.id,
          achievement_id: achievementId,
          progress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_id'
        });

      if (error) {
        logger.error('Error saving achievement progress:', error, 'UseAchievements');
      }
    } catch (error) {
      logger.error('Error saving achievement:', error, 'UseAchievements');
    }
  };

  return {
    achievements,
    streaks,
    totalPoints,
    level,
    loading,
    saveAchievementProgress
  };
};