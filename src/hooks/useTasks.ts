import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/config';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  subject: string | null;
  subject_id?: string | null;
  assignment_type?: 'homework' | 'project' | 'lab' | 'essay' | 'presentation' | 'research' | 'other' | null;
  points?: number | null;
  attachments?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date: string | null;
  estimated_time: number | null;
  actual_time: number;
  study_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setTasks([]);
      setLoading(false);
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTasks((data || []) as Task[]);
    } catch (error) {
      toast({
        title: "Error loading tasks",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'actual_time'>) => {
    if (!user) return;

    try {
      // Prepare the insert data
      const insertData = {
        ...taskData,
        user_id: user.id,
        actual_time: 0,
      };

      // First attempt: try with subject column
      let { data, error } = await supabase
        .from('tasks')
        .insert([insertData])
        .select()
        .single();

      // If error is about missing subject column, retry without it
      if (error && error.message?.includes("subject") && error.message?.includes("schema cache")) {
        log.warn('Subject column not found in database, creating task without subject');
        
        // Remove subject from insert data and try again
        const { subject, ...dataWithoutSubject } = insertData;
        
        const fallbackResult = await supabase
          .from('tasks')
          .insert([dataWithoutSubject])
          .select()
          .single();
          
        data = fallbackResult.data;
        error = fallbackResult.error;
        
        if (!error && subject) {
          // Show warning to user about missing subject column
          toast({
            title: "Database Update Needed",
            description: "Task created successfully, but subject couldn't be saved. Please contact support to update the database schema.",
            variant: "destructive",
          });
        }
      }

      if (error) {
        throw error;
      }

      setTasks(prev => [data as Task, ...prev]);
      const isAssignment = taskData.subject_id != null;
      toast({
        title: isAssignment ? "Assignment created" : "Task created",
        description: isAssignment ? "Your assignment has been successfully created." : "Your task has been successfully created.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      // Provide specific error message for subject column issue
      let errorMessage = error.message;
      if (error.message?.includes("subject") && error.message?.includes("schema cache")) {
        errorMessage = "Database schema needs to be updated. Please check MANUAL_DB_FIX.md for instructions.";
      }
      
      toast({
        title: "Error creating task",
        description: errorMessage,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setTasks(prev => prev.map(task => task.id === taskId ? data as Task : task));
      toast({
        title: "Task updated",
        description: "Your task has been successfully updated.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast({
        title: "Task deleted",
        description: "Your task has been successfully deleted.",
      });

      return { error: null };
    } catch (error: unknown) {
      toast({
        title: "Error deleting task",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    return updateTask(taskId, { status: newStatus });
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    refetch: fetchTasks,
  };
};