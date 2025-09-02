/**
 * Analytics Service
 * Fetches and processes real analytics data from the database
 */

import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } from 'date-fns';
import { logger } from '@/services/logging/logger';

// Database entity interfaces
interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  subject_id?: string;
  focus_score?: number;
  notes?: string;
  created_at: string;
}

interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high';
  subject_id?: string;
  created_at: string;
}

interface Subject {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

interface FlashcardAttempt {
  id: string;
  user_id: string;
  flashcard_id: string;
  is_correct: boolean;
  time_spent?: number;
  attempted_at: string;
}

interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  type: 'weekly_hours' | 'daily_sessions' | 'completion_rate' | 'custom';
  target_value: number;
  current_value: number;
  is_active: boolean;
  due_date?: string;
  created_at: string;
}

export interface AnalyticsData {
  studyMetrics: StudyMetrics;
  studyHoursData: ChartData[];
  subjectData: SubjectChartData[];
  focusPatternData: FocusPattern[];
  performanceData: PerformanceData[];
  completionRate: number;
  productivityScore: number;
}

export interface StudyMetrics {
  totalHours: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  weeklyGoalProgress: number;
  focusScore: number;
  streakDays: number;
}

export interface ChartData {
  name: string;
  value: number;
  sessions?: number;
  efficiency?: number;
  focus?: number;
}

export interface SubjectChartData {
  name: string;
  value: number;
  color?: string;
}

export interface FocusPattern {
  hour: number;
  focus: number;
  sessions: number;
}

export interface PerformanceData {
  subject: string;
  current: number;
  target: number;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  
  private constructor() {}
  
  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }
  
  /**
   * Fetch comprehensive analytics data
   */
  async fetchAnalytics(
    userId: string,
    timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<AnalyticsData> {
    const dateRange = this.getDateRange(timeRange);
    
    // Fetch all required data in parallel
    const [
      studySessions,
      tasks,
      subjects,
      flashcards,
      goals
    ] = await Promise.all([
      this.fetchStudySessions(userId, dateRange),
      this.fetchTasks(userId, dateRange),
      this.fetchSubjects(userId),
      this.fetchFlashcardStats(userId, dateRange),
      this.fetchGoals(userId)
    ]);
    
    // Process the data
    const studyMetrics = this.calculateStudyMetrics(studySessions, goals);
    const studyHoursData = this.calculateDailyStudyHours(studySessions, timeRange);
    const subjectData = this.calculateSubjectDistribution(studySessions, subjects);
    const focusPatternData = this.calculateFocusPatterns(studySessions);
    const performanceData = this.calculatePerformanceMetrics(
      studySessions,
      tasks,
      flashcards
    );
    const completionRate = this.calculateCompletionRate(tasks);
    const productivityScore = this.calculateProductivityScore(
      studyMetrics,
      completionRate
    );
    
    return {
      studyMetrics,
      studyHoursData,
      subjectData,
      focusPatternData,
      performanceData,
      completionRate,
      productivityScore
    };
  }
  
  /**
   * Get date range based on time period
   */
  private getDateRange(timeRange: string): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    
    switch (timeRange) {
      case 'week':
        start = startOfWeek(now);
        break;
      case 'month':
        start = startOfMonth(now);
        break;
      case 'quarter':
        start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = startOfMonth(now);
    }
    
    return { start, end: now };
  }
  
  /**
   * Fetch study sessions from database
   */
  private async fetchStudySessions(
    userId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const { data, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('start_time', dateRange.start.toISOString())
      .lte('end_time', dateRange.end.toISOString())
      .order('start_time', { ascending: false });
    
    if (error) {
      logger.error('Error fetching study sessions:', error, 'AnalyticsService');
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Fetch tasks from database
   */
  private async fetchTasks(
    userId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString());
    
    if (error) {
      logger.error('Error fetching tasks:', error, 'AnalyticsService');
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Fetch user's subjects
   */
  private async fetchSubjects(userId: string) {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      logger.error('Error fetching subjects:', error, 'AnalyticsService');
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Fetch flashcard statistics
   */
  private async fetchFlashcardStats(
    userId: string,
    dateRange: { start: Date; end: Date }
  ) {
    const { data, error } = await supabase
      .from('flashcard_attempts')
      .select('*')
      .eq('user_id', userId)
      .gte('attempted_at', dateRange.start.toISOString())
      .lte('attempted_at', dateRange.end.toISOString());
    
    if (error) {
      logger.error('Error fetching flashcard stats:', error, 'AnalyticsService');
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Fetch user goals
   */
  private async fetchGoals(userId: string) {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (error) {
      logger.error('Error fetching goals:', error, 'AnalyticsService');
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Calculate study metrics
   */
  private calculateStudyMetrics(studySessions: StudySession[], goals: Goal[]): StudyMetrics {
    const totalMinutes = studySessions.reduce((sum, session) => {
      const start = new Date(session.start_time);
      const end = session.end_time ? new Date(session.end_time) : new Date();
      return sum + (end.getTime() - start.getTime()) / 60000;
    }, 0);
    
    const totalHours = totalMinutes / 60;
    const sessionsCompleted = studySessions.filter(s => s.end_time).length;
    const averageSessionLength = sessionsCompleted > 0 
      ? totalMinutes / sessionsCompleted 
      : 0;
    
    // Calculate weekly goal progress
    const weeklyGoal = goals.find(g => g.type === 'weekly_hours')?.target || 20;
    const weekStart = startOfWeek(new Date());
    const weekSessions = studySessions.filter(s => 
      new Date(s.start_time) >= weekStart
    );
    const weekMinutes = weekSessions.reduce((sum, session) => {
      const start = new Date(session.start_time);
      const end = session.end_time ? new Date(session.end_time) : new Date();
      return sum + (end.getTime() - start.getTime()) / 60000;
    }, 0);
    const weeklyGoalProgress = Math.min(100, (weekMinutes / 60 / weeklyGoal) * 100);
    
    // Calculate focus score (based on session completion and duration)
    const focusScore = this.calculateFocusScore(studySessions);
    
    // Calculate streak days
    const streakDays = this.calculateStreakDays(studySessions);
    
    return {
      totalHours: Math.round(totalHours * 10) / 10,
      sessionsCompleted,
      averageSessionLength: Math.round(averageSessionLength),
      weeklyGoalProgress: Math.round(weeklyGoalProgress),
      focusScore: Math.round(focusScore),
      streakDays
    };
  }
  
  /**
   * Calculate daily study hours
   */
  private calculateDailyStudyHours(
    studySessions: StudySession[],
    timeRange: string
  ): ChartData[] {
    const days = timeRange === 'week' ? 7 : 30;
    const data: ChartData[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayName = timeRange === 'week' 
        ? format(date, 'EEE')
        : format(date, 'MMM d');
      
      const daySessions = studySessions.filter(session => {
        const sessionDate = new Date(session.start_time);
        return sessionDate.toDateString() === date.toDateString();
      });
      
      const dayMinutes = daySessions.reduce((sum, session) => {
        const start = new Date(session.start_time);
        const end = session.end_time ? new Date(session.end_time) : start;
        return sum + (end.getTime() - start.getTime()) / 60000;
      }, 0);
      
      const efficiency = daySessions.length > 0
        ? daySessions.filter(s => s.end_time).length / daySessions.length * 100
        : 0;
      
      data.push({
        name: dayName,
        value: Math.round(dayMinutes / 60 * 10) / 10,
        sessions: daySessions.length,
        efficiency: Math.round(efficiency),
        focus: Math.round(this.calculateFocusScore(daySessions))
      });
    }
    
    return data;
  }
  
  /**
   * Calculate subject distribution
   */
  private calculateSubjectDistribution(
    studySessions: StudySession[],
    subjects: Subject[]
  ): SubjectChartData[] {
    const subjectMap = new Map<string, number>();
    
    studySessions.forEach(session => {
      if (session.subject_id) {
        const current = subjectMap.get(session.subject_id) || 0;
        const start = new Date(session.start_time);
        const end = session.end_time ? new Date(session.end_time) : new Date();
        const minutes = (end.getTime() - start.getTime()) / 60000;
        subjectMap.set(session.subject_id, current + minutes);
      }
    });
    
    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];
    
    return Array.from(subjectMap.entries()).map(([subjectId, minutes], index) => {
      const subject = subjects.find(s => s.id === subjectId);
      return {
        name: subject?.name || 'Unknown',
        value: Math.round(minutes / 60 * 10) / 10,
        color: colors[index % colors.length]
      };
    }).sort((a, b) => b.value - a.value);
  }
  
  /**
   * Calculate focus patterns by hour
   */
  private calculateFocusPatterns(studySessions: StudySession[]): FocusPattern[] {
    const hourMap = new Map<number, { focus: number; count: number }>();
    
    studySessions.forEach(session => {
      const hour = new Date(session.start_time).getHours();
      const current = hourMap.get(hour) || { focus: 0, count: 0 };
      
      const focusScore = session.focus_score || 
        (session.end_time ? 85 : 50); // Completed sessions have higher focus
      
      hourMap.set(hour, {
        focus: current.focus + focusScore,
        count: current.count + 1
      });
    });
    
    const patterns: FocusPattern[] = [];
    for (let hour = 0; hour < 24; hour++) {
      const data = hourMap.get(hour);
      patterns.push({
        hour,
        focus: data ? Math.round(data.focus / data.count) : 0,
        sessions: data?.count || 0
      });
    }
    
    return patterns;
  }
  
  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(
    studySessions: StudySession[],
    tasks: Task[],
    flashcards: FlashcardAttempt[]
  ): PerformanceData[] {
    const totalSessions = studySessions.length;
    const completedSessions = studySessions.filter(s => s.end_time).length;
    const focusScore = this.calculateFocusScore(studySessions);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const consistency = this.calculateConsistency(studySessions);
    
    const totalFlashcards = flashcards.length;
    const correctFlashcards = flashcards.filter(f => f.is_correct).length;
    const retention = totalFlashcards > 0 
      ? (correctFlashcards / totalFlashcards) * 100 
      : 0;
    
    const efficiency = totalSessions > 0 
      ? (completedSessions / totalSessions) * 100 
      : 0;
    
    // Calculate average session speed (cards per minute)
    const speed = this.calculateStudySpeed(flashcards);
    
    // Calculate accuracy
    const accuracy = retention; // Same as retention for flashcards
    
    return [
      { subject: 'Focus', current: Math.round(focusScore), target: 100 },
      { subject: 'Consistency', current: Math.round(consistency), target: 100 },
      { subject: 'Efficiency', current: Math.round(efficiency), target: 100 },
      { subject: 'Retention', current: Math.round(retention), target: 100 },
      { subject: 'Speed', current: Math.round(speed), target: 100 },
      { subject: 'Accuracy', current: Math.round(accuracy), target: 100 }
    ];
  }
  
  /**
   * Calculate focus score
   */
  private calculateFocusScore(studySessions: StudySession[]): number {
    if (studySessions.length === 0) return 0;
    
    let totalScore = 0;
    studySessions.forEach(session => {
      if (session.focus_score) {
        totalScore += session.focus_score;
      } else {
        // Calculate based on session completion and duration
        const start = new Date(session.start_time);
        const end = session.end_time ? new Date(session.end_time) : new Date();
        const duration = (end.getTime() - start.getTime()) / 60000;
        
        if (session.end_time) {
          // Completed session
          if (duration >= 25 && duration <= 50) {
            totalScore += 90; // Optimal session length
          } else if (duration < 25) {
            totalScore += 70; // Too short
          } else {
            totalScore += 80; // Too long
          }
        } else {
          totalScore += 50; // Incomplete session
        }
      }
    });
    
    return totalScore / studySessions.length;
  }
  
  /**
   * Calculate streak days
   */
  private calculateStreakDays(studySessions: StudySession[]): number {
    if (studySessions.length === 0) return 0;
    
    const dates = new Set<string>();
    studySessions.forEach(session => {
      dates.add(new Date(session.start_time).toDateString());
    });
    
    let streak = 0;
    let currentDate = new Date();
    
    while (dates.has(currentDate.toDateString())) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }
    
    return streak;
  }
  
  /**
   * Calculate study consistency
   */
  private calculateConsistency(studySessions: StudySession[]): number {
    const last30Days = subDays(new Date(), 30);
    const daysWithStudy = new Set<string>();
    
    studySessions.forEach(session => {
      const sessionDate = new Date(session.start_time);
      if (sessionDate >= last30Days) {
        daysWithStudy.add(sessionDate.toDateString());
      }
    });
    
    return (daysWithStudy.size / 30) * 100;
  }
  
  /**
   * Calculate study speed
   */
  private calculateStudySpeed(flashcards: FlashcardAttempt[]): number {
    if (flashcards.length === 0) return 0;
    
    const totalTime = flashcards.reduce((sum, card) => {
      return sum + (card.time_spent || 30); // Default 30 seconds per card
    }, 0);
    
    const cardsPerMinute = (flashcards.length / (totalTime / 60));
    // Normalize to 0-100 scale (2 cards per minute = 100)
    return Math.min(100, cardsPerMinute * 50);
  }
  
  /**
   * Calculate completion rate
   */
  private calculateCompletionRate(tasks: Task[]): number {
    if (tasks.length === 0) return 100;
    
    const completed = tasks.filter(t => t.completed).length;
    return (completed / tasks.length) * 100;
  }
  
  /**
   * Calculate productivity score
   */
  private calculateProductivityScore(
    metrics: StudyMetrics,
    completionRate: number
  ): number {
    const weights = {
      studyHours: 0.3,
      focusScore: 0.25,
      consistency: 0.2,
      completion: 0.15,
      streak: 0.1
    };
    
    // Normalize values to 0-100
    const normalizedHours = Math.min(100, (metrics.totalHours / 40) * 100);
    const normalizedStreak = Math.min(100, (metrics.streakDays / 30) * 100);
    
    const score = 
      normalizedHours * weights.studyHours +
      metrics.focusScore * weights.focusScore +
      metrics.weeklyGoalProgress * weights.consistency +
      completionRate * weights.completion +
      normalizedStreak * weights.streak;
    
    return Math.round(score);
  }
}

export const analyticsService = AnalyticsService.getInstance();