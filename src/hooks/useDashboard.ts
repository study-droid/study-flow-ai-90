import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Widget {
  id: string;
  type: 'study-hours' | 'weekly-goal' | 'study-streak' | 'ai-sessions' | 'calendar-preview' | 'quick-stats' | 'recent-activity' | 'goals-progress' | 'tasks' | 'timer' | 'ai-tutor';
  title: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  position: { x: number; y: number };
  visible: boolean;
  data?: any;
}

export interface DashboardData {
  studyHoursToday: number;
  weeklyGoal: { current: number; target: number };
  studyStreak: number;
  aiSessions: number;
  upcomingEvents: Array<{ title: string; time: string }>;
  recentActivity: Array<{ type: string; description: string; time: string }>;
  studyGoals: Array<{ title: string; progress: number; status: string }>;
}

const defaultWidgets: Widget[] = [
  {
    id: 'study-hours',
    type: 'study-hours',
    title: 'Study Hours Today',
    size: 'md',
    position: { x: 0, y: 0 },
    visible: true,
  },
  {
    id: 'weekly-goal',
    type: 'weekly-goal',
    title: 'Weekly Goal',
    size: 'md',
    position: { x: 1, y: 0 },
    visible: true,
  },
  {
    id: 'study-streak',
    type: 'study-streak',
    title: 'Study Streak',
    size: 'md',
    position: { x: 2, y: 0 },
    visible: true,
  },
  {
    id: 'ai-sessions',
    type: 'ai-sessions',
    title: 'AI Sessions',
    size: 'md',
    position: { x: 3, y: 0 },
    visible: true,
  },
  {
    id: 'calendar-preview',
    type: 'calendar-preview',
    title: 'Calendar',
    size: 'lg',
    position: { x: 0, y: 1 },
    visible: true,
  },
  {
    id: 'ai-tutor',
    type: 'ai-tutor',
    title: 'AI Tutor',
    size: 'lg',
    position: { x: 1, y: 1 },
    visible: true,
  },
  {
    id: 'tasks',
    type: 'tasks',
    title: 'Tasks',
    size: 'lg',
    position: { x: 0, y: 2 },
    visible: true,
  },
  {
    id: 'timer',
    type: 'timer',
    title: 'Quick Timer',
    size: 'md',
    position: { x: 1, y: 2 },
    visible: true,
  },
  {
    id: 'goals-progress',
    type: 'goals-progress',
    title: "Today's Goals",
    size: 'lg',
    position: { x: 2, y: 1 },
    visible: true,
  },
  {
    id: 'recent-activity',
    type: 'recent-activity',
    title: 'Recent Activity',
    size: 'xl',
    position: { x: 0, y: 3 },
    visible: true,
  },
];

export const useDashboard = () => {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    studyHoursToday: 0,
    weeklyGoal: { current: 0, target: 20 },
    studyStreak: 0,
    aiSessions: 0,
    upcomingEvents: [],
    recentActivity: [],
    studyGoals: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadWidgetLayout();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Fetch study hours today
      const { data: todaySessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', today);

      const studyHoursToday = (todaySessions || []).reduce((total, session) => total + (session.duration || 0), 0) / 60;

      // Fetch weekly study progress
      const { data: weekSessions } = await supabase
        .from('study_sessions')
        .select('duration')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', weekStartStr);

      const weeklyProgress = (weekSessions || []).reduce((total, session) => total + (session.duration || 0), 0) / 60;

      // Fetch study streak
      const { data: streakData } = await supabase
        .from('study_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch AI sessions count
      const { data: aiSessionsData } = await supabase
        .from('ai_tutor_sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', weekStartStr);

      // Fetch recent activity
      const { data: recentSessions } = await supabase
        .from('study_sessions')
        .select('title, created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch study goals
      const { data: studyGoals } = await supabase
        .from('study_goals')
        .select('title, current_value, target_value, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(3);

      setDashboardData({
        studyHoursToday: Math.round(studyHoursToday * 10) / 10,
        weeklyGoal: { current: Math.round(weeklyProgress * 10) / 10, target: 20 },
        studyStreak: streakData?.current_streak || 0,
        aiSessions: aiSessionsData?.length || 0,
        upcomingEvents: [],
        recentActivity: recentSessions?.map(session => ({
          type: 'study',
          description: session.title || 'Study Session',
          time: new Date(session.created_at).toLocaleDateString(),
        })) || [],
        studyGoals: studyGoals?.map(goal => ({
          title: goal.title,
          progress: goal.target_value > 0 ? ((goal.current_value || 0) / goal.target_value) * 100 : 0,
          status: goal.status || 'active',
        })) || [],
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWidgetLayout = async () => {
    if (!user) return;

    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settings && (settings as any).dashboard_layout) {
        setWidgets((settings as any).dashboard_layout);
      }
    } catch (error) {
      console.error('Error loading widget layout:', error);
    }
  };

  const saveWidgetLayout = async (newWidgets: Widget[]) => {
    if (!user) return;

    try {
      await supabase
        .from('user_settings')
        .update({ dashboard_layout: newWidgets } as any)
        .eq('user_id', user.id);
      
      setWidgets(newWidgets);
    } catch (error) {
      console.error('Error saving widget layout:', error);
    }
  };

  const toggleWidget = (widgetId: string) => {
    const newWidgets = widgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    );
    saveWidgetLayout(newWidgets);
  };

  const updateWidgetPosition = (widgetId: string, position: { x: number; y: number }) => {
    const newWidgets = widgets.map(widget =>
      widget.id === widgetId ? { ...widget, position } : widget
    );
    saveWidgetLayout(newWidgets);
  };

  const updateWidgetSize = (widgetId: string, size: Widget['size']) => {
    const newWidgets = widgets.map(widget =>
      widget.id === widgetId ? { ...widget, size } : widget
    );
    saveWidgetLayout(newWidgets);
  };

  const resetToDefault = () => {
    saveWidgetLayout(defaultWidgets);
  };

  return {
    widgets,
    dashboardData,
    loading,
    toggleWidget,
    updateWidgetPosition,
    updateWidgetSize,
    resetToDefault,
    refreshData: loadDashboardData,
  };
};