import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type StudySession = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  duration: number | null;
  planned_duration: number | null;
  status: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled' | null;
  type: 'focus' | 'review' | 'practice' | 'reading' | 'writing' | 'problem_solving' | 'memorization' | 'ai_tutoring' | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  focus_score: number | null;
  pomodoro_count: number | null;
  break_duration: number | null;
  distractions: number | null;
  completed: boolean | null;
  created_at: string;
  updated_at: string;
};

export const useStudySessions = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: "Error",
        description: "Failed to load study sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (sessionData: {
    title: string;
    description?: string;
    subject_id?: string;
    duration?: number;
    planned_duration?: number;
    status?: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
    type?: 'focus' | 'review' | 'practice' | 'reading' | 'writing' | 'problem_solving' | 'memorization' | 'ai_tutoring';
    notes?: string;
    pomodoro_count?: number;
    break_duration?: number;
    distractions?: number;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .insert([{
          title: sessionData.title,
          description: sessionData.description || null,
          subject_id: sessionData.subject_id || null,
          duration: sessionData.duration || 0,
          planned_duration: sessionData.planned_duration || null,
          status: sessionData.status || 'planned',
          type: sessionData.type || 'focus',
          notes: sessionData.notes || null,
          pomodoro_count: sessionData.pomodoro_count || 0,
          break_duration: sessionData.break_duration || 0,
          distractions: sessionData.distractions || 0,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Study session created!",
      });

      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create study session",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateSession = async (id: string, updates: {
    title?: string;
    description?: string;
    subject_id?: string;
    duration?: number;
    planned_duration?: number;
    status?: 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';
    type?: 'focus' | 'review' | 'practice' | 'reading' | 'writing' | 'problem_solving' | 'memorization' | 'ai_tutoring';
    started_at?: string;
    completed_at?: string;
    notes?: string;
    focus_score?: number;
    pomodoro_count?: number;
    break_duration?: number;
    distractions?: number;
    completed?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setSessions(prev => prev.map(session => session.id === id ? data : session));
      if (currentSession?.id === id) {
        setCurrentSession(data);
      }

      return data;
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: "Error",
        description: "Failed to update study session",
        variant: "destructive",
      });
      return null;
    }
  };

  const startSession = async (id: string) => {
    const session = await updateSession(id, {
      status: 'active',
      started_at: new Date().toISOString(),
    });
    if (session) {
      setCurrentSession(session);
    }
    return session;
  };

  const pauseSession = async (id: string) => {
    return await updateSession(id, { status: 'paused' });
  };

  const completeSession = async (id: string, finalDuration: number, notes?: string) => {
    const session = await updateSession(id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration: finalDuration,
      notes,
    });
    if (currentSession?.id === id) {
      setCurrentSession(null);
    }
    return session;
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== id));
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }

      toast({
        title: "Success",
        description: "Study session deleted",
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: "Error",
        description: "Failed to delete study session",
        variant: "destructive",
      });
    }
  };

  return {
    sessions,
    currentSession,
    loading,
    createSession,
    updateSession,
    startSession,
    pauseSession,
    completeSession,
    deleteSession,
    refreshSessions: fetchSessions,
  };
};