import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/config';
import { logger } from '@/services/logging/logger';

export interface StudyGoal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  unit: string;
  deadline: string | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface StudyGoalFormData {
  title: string;
  description?: string;
  target_value: number;
  unit: string;
  deadline: string;
}

export const useStudyGoals = () => {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchGoals = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        log.debug('No authenticated user found');
        setGoals([]);
        return;
      }

      const { data, error } = await supabase
        .from('study_goals')
        .select('*')
        .order('deadline', { ascending: true });

      if (error) {
        logger.error('Supabase query error:', error, 'UseStudyGoals');
        
        // Provide more specific error messages
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          throw new Error('Study goals table not found. Please ensure database migrations have been run.');
        } else if (error.message.includes('permission') || error.message.includes('RLS')) {
          throw new Error('Permission denied. Please check Row Level Security policies.');
        } else {
          throw error;
        }
      }
      
      setGoals((data || []) as StudyGoal[]);
    } catch (error: unknown) {
      logger.error('Error fetching study goals:', error, 'UseStudyGoals');
      toast({
        title: 'Error loading study goals',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (data: StudyGoalFormData) => {
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      const { data: newGoal, error } = await supabase
        .from('study_goals')
        .insert([{
          ...data,
          user_id: user.id,
          current_value: 0,
          status: 'active',
        }])
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => [...prev, newGoal as StudyGoal]);
      toast({
        title: 'Success',
        description: 'Study goal created successfully',
      });

      return { success: true };
    } catch (error: unknown) {
      toast({
        title: 'Error creating goal',
        description: error.message,
        variant: 'destructive',
      });
      return { error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updateGoal = async (id: string, data: Partial<StudyGoalFormData & { current_value?: number; status?: string }>) => {
    try {
      setSubmitting(true);
      const { data: updatedGoal, error } = await supabase
        .from('study_goals')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setGoals(prev => prev.map(goal => 
        goal.id === id ? { ...goal, ...updatedGoal } as StudyGoal : goal
      ));

      toast({
        title: 'Success',
        description: 'Study goal updated successfully',
      });

      return { success: true };
    } catch (error: unknown) {
      toast({
        title: 'Error updating goal',
        description: error.message,
        variant: 'destructive',
      });
      return { error: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.filter(goal => goal.id !== id));
      toast({
        title: 'Success',
        description: 'Study goal deleted successfully',
      });
    } catch (error: unknown) {
      toast({
        title: 'Error deleting goal',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getActiveGoals = () => goals.filter(goal => goal.status === 'active');
  
  const getCompletedGoals = () => goals.filter(goal => goal.status === 'completed');
  
  const getOverdueGoals = () => {
    const now = new Date();
    return goals.filter(goal => 
      goal.status === 'active' && goal.deadline && new Date(goal.deadline) < now
    );
  };

  const getGoalProgress = (goal: StudyGoal) => {
    return Math.min((goal.current_value / goal.target_value) * 100, 100);
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  return {
    goals,
    loading,
    submitting,
    createGoal,
    updateGoal,
    deleteGoal,
    getActiveGoals,
    getCompletedGoals,
    getOverdueGoals,
    getGoalProgress,
    refetch: fetchGoals,
  };
};