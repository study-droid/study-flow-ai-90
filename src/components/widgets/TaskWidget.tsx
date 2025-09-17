import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Plus, Clock } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'completed';
  due_date?: string | null;
  estimated_duration?: number | null;
}

export const TaskWidget: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setTasks((data || []).map(item => ({
        ...item,
        priority: (item.priority as 'low' | 'medium' | 'high') || 'medium',
        status: (item.status as 'todo' | 'in_progress' | 'completed') || 'todo'
      })));
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const createTask = async () => {
    if (!user || !newTask.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newTask,
          user_id: user.id,
          status: 'todo',
          priority: 'medium'
        });

      if (error) throw error;
      
      setNewTask('');
      loadTasks();
      toast.success('Task created successfully!');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;
      loadTasks();
      toast.success(`Task ${newStatus === 'completed' ? 'completed' : 'reopened'}!`);
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <CheckSquare className="h-4 w-4" />
          Tasks
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {tasks.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          <Input
            placeholder="Add a new task..."
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createTask()}
            className="text-xs h-8"
          />
          <Button 
            size="sm" 
            onClick={createTask}
            disabled={isLoading || !newTask.trim()}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="flex items-start gap-2 p-2 rounded-lg bg-accent/30">
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTask(task.id, task.status)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium truncate">{task.title}</p>
                    <Badge 
                      variant={getPriorityColor(task.priority)} 
                      className="text-xs px-1"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4">
              <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No tasks yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};