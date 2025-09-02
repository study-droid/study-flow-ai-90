import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StudySession {
  id: string;
  user_id: string;
  session_type: string;
  subject: string | null;
  duration_minutes: number;
  notes: string | null;
  focus_score: number;
  interruptions: number;
  study_plan_id: string | null;
  task_id: string | null;
  created_at: string;
  completed_at: string;
  updated_at?: string | null;
}

export interface StudySessionFormData {
  session_type: string;
  subject?: string;
  duration_minutes: number;
  notes?: string;
  study_plan_id?: string;
  task_id?: string;
}

export const useStudySessions = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: unknown) {
      toast({
        title: 'Error loading study sessions',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (data: StudySessionFormData) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data: newSession, error } = await supabase
        .from('study_sessions')
        .insert([{
          ...data,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [newSession, ...prev]);
      toast({
        title: 'Success',
        description: 'Study session recorded successfully',
      });

      return { success: true };
    } catch (error: unknown) {
      toast({
        title: 'Error recording session',
        description: error.message,
        variant: 'destructive',
      });
      return { error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updateSession = async (id: string, data: Partial<StudySessionFormData>) => {
    try {
      setSubmitting(true);
      const { data: updatedSession, error } = await supabase
        .from('study_sessions')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => prev.map(session => 
        session.id === id ? { ...session, ...updatedSession } : session
      ));

      toast({
        title: 'Success',
        description: 'Study session updated successfully',
      });

      return { success: true };
    } catch (error: unknown) {
      toast({
        title: 'Error updating session',
        description: error.message,
        variant: 'destructive',
      });
      return { error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== id));
      toast({
        title: 'Success',
        description: 'Study session deleted successfully',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error deleting session',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getTodaysSessions = () => {
    const today = new Date().toDateString();
    return sessions.filter(session => 
      new Date(session.completed_at).toDateString() === today
    );
  };

  const getWeekSessions = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessions.filter(session => 
      new Date(session.completed_at) >= weekAgo
    );
  };

  const getTotalStudyTime = (sessionList: StudySession[] = sessions) => {
    return sessionList.reduce((total, session) => total + session.duration_minutes, 0);
  };

  const getSessionsBySubject = (sessionList: StudySession[] = sessions) => {
    const subjectMap = new Map<string, { count: number; duration: number }>();
    
    sessionList.forEach(session => {
      const subject = session.subject || 'Uncategorized';
      const existing = subjectMap.get(subject) || { count: 0, duration: 0 };
      subjectMap.set(subject, {
        count: existing.count + 1,
        duration: existing.duration + session.duration_minutes,
      });
    });

    return Array.from(subjectMap.entries()).map(([subject, data]) => ({
      subject,
      ...data,
    }));
  };

  const getAverageFocusScore = (sessionList: StudySession[] = sessions) => {
    if (sessionList.length === 0) return 0;
    
    const sessionsWithScore = sessionList.filter(session => 
      session.focus_score !== null && session.focus_score !== undefined
    );
    
    if (sessionsWithScore.length === 0) return 0;
    
    const totalScore = sessionsWithScore.reduce((total, session) => total + session.focus_score, 0);
    return Math.round(totalScore / sessionsWithScore.length);
  };

  const getTodaysFocusScore = () => {
    const todaysSessions = getTodaysSessions();
    return getAverageFocusScore(todaysSessions);
  };

  const getStudyStreak = () => {
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    );

    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.completed_at);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === currentDate.getTime()) {
        streak = 1;
        currentDate.setDate(currentDate.getDate() - 1);
        break;
      }
    }

    // Continue counting consecutive days
    for (const session of sortedSessions) {
      const sessionDate = new Date(session.completed_at);
      sessionDate.setHours(0, 0, 0, 0);

      if (sessionDate.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (sessionDate.getTime() < currentDate.getTime()) {
        break;
      }
    }

    return streak;
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    submitting,
    createSession,
    updateSession,
    deleteSession,
    getTodaysSessions,
    getWeekSessions,
    getTotalStudyTime,
    getSessionsBySubject,
    getStudyStreak,
    getAverageFocusScore,
    getTodaysFocusScore,
    refetch: fetchSessions,
  };
};