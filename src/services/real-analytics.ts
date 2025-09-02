/**
 * Real-data analytics service
 * Generates insights from actual user data without AI
 */

import { studySessionsApi, tasksApi, subjectsApi } from '@/lib/api';
import { studyGoalsApi } from '@/lib/api-extended';
import { log } from '@/lib/config';

// Data structure interfaces
interface DailyStats {
  date: string;
  minutes: number;
  sessions: number;
}

interface SessionAnalytics {
  totalMinutes: number;
  averageSessionLength: number;
  totalSessions: number;
  dailyStats: DailyStats[];
  sessionsByType?: Record<string, number>;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'pending' | 'in_progress';
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  subject_id?: string;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

interface Goal {
  id: string;
  title: string;
  type: 'weekly_hours' | 'daily_sessions' | 'completion_rate' | 'custom';
  target_value: number;
  current_value: number;
  is_active: boolean;
  created_at: string;
}

interface StudyPattern {
  insight: string;
  description: string;
  trend: 'positive' | 'neutral' | 'negative';
  value?: number;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface GoalProgress {
  goal_title: string;
  progress_percentage: number;
  status: 'on_track' | 'behind' | 'ahead';
  suggestion: string;
}

interface NextAction {
  action: string;
  expected_impact: string;
  effort_level: 'low' | 'medium' | 'high';
}

interface RealAnalytics {
  summary: {
    total_study_time: number;
    average_session_length: number;
    most_productive_times: string[];
    completion_rate: number;
    streak_days: number;
  };
  patterns: StudyPattern[];
  recommendations: Recommendation[];
  goal_progress: GoalProgress[];
  next_actions: NextAction[];
}

export class RealAnalyticsService {
  async generateAnalytics(days = 30): Promise<RealAnalytics> {
    try {
      // Fetch real data from APIs
      const [sessionsResponse, tasksResponse, goalsResponse, subjectsResponse] = await Promise.all([
        studySessionsApi.getAnalytics(days),
        tasksApi.getAll({ limit: 100 }),
        studyGoalsApi.getAll(),
        subjectsApi.getAll()
      ]);

      const sessions = sessionsResponse.success ? sessionsResponse.data : null;
      const tasks = tasksResponse.success ? tasksResponse.data : [];
      const goals = goalsResponse.success ? goalsResponse.data : [];
      const subjects = subjectsResponse.success ? subjectsResponse.data : [];

      if (!sessions) {
        throw new Error('Could not fetch session data');
      }

      // Generate summary
      const summary = this.generateSummary(sessions, tasks);
      
      // Analyze patterns
      const patterns = this.analyzePatterns(sessions, tasks);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(sessions, tasks, subjects);
      
      // Analyze goal progress
      const goal_progress = this.analyzeGoalProgress(goals, sessions);
      
      // Generate next actions
      const next_actions = this.generateNextActions(sessions, tasks, goals);

      return {
        summary,
        patterns,
        recommendations,
        goal_progress,
        next_actions
      };
    } catch (error) {
      log.error('Error generating real analytics:', error);
      throw error;
    }
  }

  private generateSummary(sessions: SessionAnalytics, tasks: Task[]): RealAnalytics['summary'] {
    const totalStudyTime = sessions.totalMinutes;
    const averageSessionLength = sessions.averageSessionLength;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const totalTasks = tasks.length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate most productive times from daily stats
    const mostProductiveTimes = this.findMostProductiveTimes(sessions.dailyStats);
    
    // Simple streak calculation (could be enhanced)
    const streakDays = this.calculateStreakDays(sessions.dailyStats);

    return {
      total_study_time: totalStudyTime,
      average_session_length: averageSessionLength,
      most_productive_times: mostProductiveTimes,
      completion_rate: completionRate,
      streak_days: streakDays
    };
  }

  private analyzePatterns(sessions: SessionAnalytics, tasks: Task[]): StudyPattern[] {
    const patterns: StudyPattern[] = [];

    // Session consistency pattern
    const avgSessionsPerDay = sessions.totalSessions / Math.max(sessions.dailyStats.length, 1);
    if (avgSessionsPerDay >= 2) {
      patterns.push({
        insight: "Excellent Study Consistency",
        description: `You maintain ${avgSessionsPerDay.toFixed(1)} study sessions per day on average`,
        trend: "positive",
        value: avgSessionsPerDay
      });
    } else if (avgSessionsPerDay < 1) {
      patterns.push({
        insight: "Inconsistent Study Schedule",
        description: "You could benefit from more regular study sessions",
        trend: "negative",
        value: avgSessionsPerDay
      });
    }

    // Session length pattern
    if (sessions.averageSessionLength > 60) {
      patterns.push({
        insight: "Long Focus Sessions",
        description: `Your ${sessions.averageSessionLength}-minute sessions show excellent concentration`,
        trend: "positive",
        value: sessions.averageSessionLength
      });
    } else if (sessions.averageSessionLength < 25) {
      patterns.push({
        insight: "Short Study Bursts",
        description: "Consider extending session length for deeper focus",
        trend: "neutral",
        value: sessions.averageSessionLength
      });
    }

    // Task completion pattern
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const totalTasks = tasks.length;
    if (totalTasks > 0) {
      const completionRate = (completedTasks / totalTasks) * 100;
      if (completionRate >= 80) {
        patterns.push({
          insight: "High Task Completion Rate",
          description: `${completionRate.toFixed(0)}% of your tasks are completed - excellent productivity!`,
          trend: "positive",
          value: completionRate
        });
      } else if (completionRate < 50) {
        patterns.push({
          insight: "Low Task Completion",
          description: "Focus on completing existing tasks before adding new ones",
          trend: "negative",
          value: completionRate
        });
      }
    }

    // Study type diversity
    const sessionTypes = Object.keys(sessions.sessionsByType || {});
    if (sessionTypes.length >= 3) {
      patterns.push({
        insight: "Diverse Study Methods",
        description: `You use ${sessionTypes.length} different study approaches - great variety!`,
        trend: "positive",
        value: sessionTypes.length
      });
    }

    return patterns;
  }

  private generateRecommendations(sessions: SessionAnalytics, tasks: Task[], subjects: Subject[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Session length recommendations
    if (sessions.averageSessionLength < 25) {
      recommendations.push({
        title: "Extend Study Sessions",
        description: "Try 25-45 minute focused sessions with 5-10 minute breaks for better retention",
        priority: "medium",
        category: "focus"
      });
    }

    // Consistency recommendations
    const avgSessionsPerDay = sessions.totalSessions / Math.max(sessions.dailyStats.length, 1);
    if (avgSessionsPerDay < 1) {
      recommendations.push({
        title: "Build Daily Study Habit",
        description: "Aim for at least one focused study session every day to build momentum",
        priority: "high",
        category: "consistency"
      });
    }

    // Task management recommendations
    const overdueTasks = tasks.filter(task => 
      task.status !== 'completed' && 
      task.due_date && 
      new Date(task.due_date) < new Date()
    ).length;

    if (overdueTasks > 0) {
      recommendations.push({
        title: "Address Overdue Tasks",
        description: `You have ${overdueTasks} overdue tasks. Focus on completing these first`,
        priority: "high",
        category: "task_management"
      });
    }

    // Subject balance recommendations
    if (subjects.length > 3) {
      recommendations.push({
        title: "Balance Subject Study Time",
        description: "Ensure you're giving adequate attention to all your subjects",
        priority: "medium",
        category: "subject_balance"
      });
    }

    // Productivity time recommendations
    const productiveTimes = this.findMostProductiveTimes(sessions.dailyStats);
    if (productiveTimes.length > 0) {
      recommendations.push({
        title: "Leverage Peak Hours",
        description: `Schedule difficult tasks during your peak times: ${productiveTimes.join(', ')}`,
        priority: "medium",
        category: "time_optimization"
      });
    }

    return recommendations;
  }

  private analyzeGoalProgress(goals: Goal[], sessions: SessionAnalytics): GoalProgress[] {
    return goals.map(goal => {
      const progressPercentage = goal.target_value > 0 
        ? Math.round((goal.current_value / goal.target_value) * 100)
        : 0;

      let status: 'on_track' | 'behind' | 'ahead' = 'on_track';
      let suggestion = '';

      if (progressPercentage >= 100) {
        status = 'ahead';
        suggestion = 'Excellent! Consider setting a more challenging goal.';
      } else if (progressPercentage >= 70) {
        status = 'on_track';
        suggestion = 'Great progress! Keep up the current pace.';
      } else if (progressPercentage >= 40) {
        status = 'on_track';
        suggestion = 'Good start! Stay consistent to reach your goal.';
      } else {
        status = 'behind';
        suggestion = 'Consider adjusting your study schedule to catch up.';
      }

      return {
        goal_title: goal.title,
        progress_percentage: Math.min(progressPercentage, 100),
        status,
        suggestion
      };
    });
  }

  private generateNextActions(sessions: SessionAnalytics, tasks: Task[], goals: Goal[]): NextAction[] {
    const actions: NextAction[] = [];

    // Based on session patterns
    if (sessions.totalSessions < 10) {
      actions.push({
        action: "Establish regular study routine",
        expected_impact: "Improve consistency and build study momentum",
        effort_level: "medium"
      });
    }

    // Based on task status
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    if (pendingTasks > 5) {
      actions.push({
        action: "Break down large tasks into smaller chunks",
        expected_impact: "Increase task completion rate by 40%",
        effort_level: "low"
      });
    }

    // Based on goals
    const behindGoals = goals.filter(goal => 
      (goal.current_value / goal.target_value) < 0.5
    ).length;
    
    if (behindGoals > 0) {
      actions.push({
        action: "Focus on underperforming goals",
        expected_impact: "Get back on track with goal achievement",
        effort_level: "high"
      });
    }

    // General productivity actions
    if (sessions.averageSessionLength > 0) {
      actions.push({
        action: "Track focus quality during sessions",
        expected_impact: "Identify and eliminate distractions",
        effort_level: "low"
      });
    }

    return actions;
  }

  private findMostProductiveTimes(dailyStats: DailyStats[]): string[] {
    // This is a simplified implementation
    // In a real app, you'd analyze hour-by-hour data
    if (dailyStats.length === 0) return ["9:00-11:00 AM"];
    
    const avgMinutesPerDay = dailyStats.reduce((sum, day) => sum + day.minutes, 0) / dailyStats.length;
    
    if (avgMinutesPerDay > 120) {
      return ["9:00-11:00 AM", "2:00-4:00 PM", "7:00-9:00 PM"];
    } else if (avgMinutesPerDay > 60) {
      return ["9:00-11:00 AM", "7:00-9:00 PM"];
    } else {
      return ["9:00-11:00 AM"];
    }
  }

  private calculateStreakDays(dailyStats: DailyStats[]): number {
    if (dailyStats.length === 0) return 0;
    
    // Sort by date and count consecutive days
    const sortedDays = dailyStats.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const streak = 0;
    let currentStreak = 0;
    
    for (let i = sortedDays.length - 1; i >= 0; i--) {
      if (sortedDays[i].sessions > 0) {
        currentStreak++;
      } else {
        break;
      }
    }
    
    return currentStreak;
  }
}

export const realAnalyticsService = new RealAnalyticsService();