import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { log } from '@/lib/config';

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'personal' | 'career' | 'health' | 'skill';
  priority: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  deadline?: Date;
  milestones: Milestone[];
  createdAt: Date;
  updatedAt: Date;
  user_id?: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: Date;
}

export const useGoals = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch goals from database
  const fetchGoals = async () => {
    if (!user) {
      // Return empty when no user instead of mock data
      setGoals([]);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        log.warn('Goals table error:', error.message);
        // Return empty array if database fetch fails
        setGoals([]);
        setLoading(false);
        toast({
          title: "Failed to load goals",
          description: "We couldn't load your goals. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Transform database records to Goal format
      const transformedGoals: Goal[] = (data || []).map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description || '',
        category: goal.category || 'personal',
        priority: goal.priority || 'medium',
        status: goal.status || 'not_started',
        progress: goal.progress || 0,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
        milestones: goal.milestones || [],
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
        user_id: goal.user_id
      }));

      setGoals(transformedGoals);
    } catch (error) {
      log.error('Error fetching goals:', error);
      // Return empty array if database fetch fails
      setGoals([]);
      toast({
        title: "Error loading goals",
        description: "Please refresh the page to try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new goal
  const createGoal = async (goal: Partial<Goal>) => {
    if (!user) return;

    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      title: goal.title || 'New Goal',
      description: goal.description || '',
      category: goal.category || 'personal',
      priority: goal.priority || 'medium',
      status: goal.status || 'not_started',
      progress: goal.progress || 0,
      deadline: goal.deadline,
      milestones: goal.milestones || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user_id: user.id
    };

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{
          ...newGoal,
          deadline: newGoal.deadline?.toISOString(),
          created_at: newGoal.createdAt.toISOString(),
          updated_at: newGoal.updatedAt.toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      setGoals([...goals, newGoal]);
      return newGoal;
    } catch (error) {
      log.error('Error creating goal:', error);
      // Add to local state even if database fails
      setGoals([...goals, newGoal]);
      return newGoal;
    }
  };

  // Update an existing goal
  const updateGoal = async (updatedGoal: Goal) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          title: updatedGoal.title,
          description: updatedGoal.description,
          category: updatedGoal.category,
          priority: updatedGoal.priority,
          status: updatedGoal.status,
          progress: updatedGoal.progress,
          deadline: updatedGoal.deadline?.toISOString(),
          milestones: updatedGoal.milestones,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedGoal.id);

      if (error) throw error;

      setGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    } catch (error) {
      log.error('Error updating goal:', error);
      // Update local state even if database fails
      setGoals(goals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    }
  };

  // Delete a goal
  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      setGoals(goals.filter(g => g.id !== goalId));
    } catch (error) {
      log.error('Error deleting goal:', error);
      // Remove from local state even if database fails
      setGoals(goals.filter(g => g.id !== goalId));
    }
  };

  // Get goals by status
  const getGoalsByStatus = (status: Goal['status']) => {
    return goals.filter(g => g.status === status);
  };

  // Get goals by category
  const getGoalsByCategory = (category: Goal['category']) => {
    return goals.filter(g => g.category === category);
  };

  // Calculate overall progress
  const getOverallProgress = () => {
    if (goals.length === 0) return 0;
    const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0);
    return Math.round(totalProgress / goals.length);
  };

  // Get upcoming deadlines
  const getUpcomingDeadlines = (days: number = 7) => {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return goals.filter(goal => {
      if (!goal.deadline) return false;
      return goal.deadline >= now && goal.deadline <= futureDate;
    }).sort((a, b) => {
      if (!a.deadline || !b.deadline) return 0;
      return a.deadline.getTime() - b.deadline.getTime();
    });
  };

  // Initial fetch
  useEffect(() => {
    fetchGoals();
  }, [user]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('goals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    deleteGoal,
    getGoalsByStatus,
    getGoalsByCategory,
    getOverallProgress,
    getUpcomingDeadlines,
    refreshGoals: fetchGoals
  };
};

// Mock data removed - using real database only