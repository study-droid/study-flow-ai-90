import { useState, useEffect } from 'react';
import { studySessionsApi } from '@/lib/api';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { log } from '@/lib/config';

export interface FocusSession {
  id?: string;
  user_id: string;
  session_type: string;
  subject?: string | null;
  duration_minutes: number;
  completed_at: string;
  notes?: string | null;
  focus_score?: number | null;
  interruptions?: number | null;
  created_at?: string;
  updated_at?: string;
  study_plan_id?: string | null;
  task_id?: string | null;
}

export interface FocusSessionStats {
  totalSessions: number;
  totalFocusTime: number;
  averageFocusScore: number;
  currentStreak: number;
  bestStreak: number;
  sessionsToday: number;
  focusTimeToday: number;
}

export const useFocusSessions = () => {
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSessions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await studySessionsApi.getAll();
      
      if (response.success && response.data) {
        setSessions(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch sessions');
      }
    } catch (error) {
      log.error('Error fetching focus sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load focus sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: Omit<FocusSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;

    try {
      setSubmitting(true);
      const response = await studySessionsApi.create(sessionData);
      
      if (response.success && response.data) {
        setSessions(prev => [response.data!, ...prev]);
        toast({
          title: "Session Completed!",
          description: `${sessionData.duration_minutes} minute ${sessionData.session_type} session logged successfully.`,
        });
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create session');
      }
    } catch (error) {
      log.error('Error creating focus session:', error);
      toast({
        title: "Error",
        description: "Failed to save focus session",
        variant: "destructive",
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const updateSession = async (id: string, updates: Partial<FocusSession>) => {
    if (!user) return null;

    try {
      setSubmitting(true);
      const response = await studySessionsApi.update(id, updates);
      
      if (response.success && response.data) {
        setSessions(prev => prev.map(session => 
          session.id === id ? { ...session, ...response.data } : session
        ));
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update session');
      }
    } catch (error) {
      log.error('Error updating focus session:', error);
      toast({
        title: "Error",
        description: "Failed to update focus session",
        variant: "destructive",
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!user) return false;

    try {
      setSubmitting(true);
      const response = await studySessionsApi.delete(id);
      
      if (response.success) {
        setSessions(prev => prev.filter(session => session.id !== id));
        toast({
          title: "Session Deleted",
          description: "Focus session removed successfully.",
        });
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete session');
      }
    } catch (error) {
      log.error('Error deleting focus session:', error);
      toast({
        title: "Error",
        description: "Failed to delete focus session",
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const getSessionStats = (): FocusSessionStats => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = sessions.filter(session => 
      new Date(session.completed_at) >= today
    );

    const focusSessions = sessions.filter(session => 
      session.session_type === 'focus' || session.session_type === 'deep-work' || session.session_type === 'pomodoro'
    );

    const totalFocusTime = focusSessions.reduce((sum, session) => sum + session.duration_minutes, 0);
    const focusTimeToday = todaySessions
      .filter(session => session.session_type === 'focus' || session.session_type === 'deep-work' || session.session_type === 'pomodoro')
      .reduce((sum, session) => sum + session.duration_minutes, 0);

    const averageFocusScore = focusSessions.length > 0 
      ? focusSessions.reduce((sum, session) => sum + (session.focus_score || 0), 0) / focusSessions.length
      : 0;

    // Calculate current streak (consecutive days with at least one focus session)
    let currentStreak = 0;
    const checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayHasSessions = sessions.some(session => {
        const sessionDate = new Date(session.completed_at);
        return sessionDate >= dayStart && sessionDate < dayEnd &&
               (session.session_type === 'focus' || session.session_type === 'deep-work' || session.session_type === 'pomodoro');
      });

      if (dayHasSessions) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return {
      totalSessions: focusSessions.length,
      totalFocusTime,
      averageFocusScore,
      currentStreak,
      bestStreak: currentStreak, // This could be calculated more accurately by analyzing historical data
      sessionsToday: todaySessions.filter(s => s.session_type === 'focus' || s.session_type === 'deep-work' || s.session_type === 'pomodoro').length,
      focusTimeToday,
    };
  };

  const getTodaysSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return sessions.filter(session => 
      new Date(session.completed_at) >= today
    );
  };

  const getWeekSessions = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return sessions.filter(session => 
      new Date(session.completed_at) >= weekAgo
    );
  };

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  return {
    sessions,
    loading,
    submitting,
    createSession,
    updateSession,
    deleteSession,
    getSessionStats,
    getTodaysSessions,
    getWeekSessions,
    refetch: fetchSessions,
  };
};