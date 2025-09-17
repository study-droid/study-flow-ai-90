import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, Calendar, MoreVertical, Edit, Trash2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTasks';

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleStatus: (taskId: string) => void;
  loading?: boolean;
}

export const TaskList = ({ tasks, onEdit, onDelete, onToggleStatus, loading }: TaskListProps) => {
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-progress';
      case 'in_progress': return 'text-focus';
      case 'overdue': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'overdue': return AlertCircle;
      default: return Circle;
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed') return false;
    return isBefore(new Date(task.due_date), startOfDay(new Date()));
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = startOfDay(new Date());
    const taskDate = startOfDay(date);

    if (taskDate.getTime() === today.getTime()) {
      return 'Due today';
    } else if (isAfter(taskDate, today)) {
      return `Due ${format(date, 'MMM d')}`;
    } else {
      return `Overdue ${format(date, 'MMM d')}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-6 bg-muted rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">No tasks found</h3>
              <p className="text-sm text-muted-foreground">
                Create your first task to get started with your study plan.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tasks.map((task) => {
          const StatusIcon = getStatusIcon(task.status);
          const taskIsOverdue = isOverdue(task);
          const actualStatus = taskIsOverdue ? 'overdue' : task.status;

          return (
            <Card key={task.id} className="study-flow-shadow-soft hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={task.status === 'completed'}
                    onCheckedChange={() => onToggleStatus(task.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className={cn(
                          "font-semibold text-sm sm:text-base line-clamp-2",
                          task.status === 'completed' && 'line-through text-muted-foreground'
                        )} title={task.title}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2" title={task.description}>
                            {task.description}
                          </p>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(task)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => setDeleteTaskId(task.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {task.subject && (
                        <Badge variant="outline" className="text-xs flex-shrink-0" title={task.subject}>
                          <span className="truncate max-w-20">{task.subject}</span>
                        </Badge>
                      )}
                      
                      <Badge variant={getPriorityColor(task.priority)} className="text-xs flex-shrink-0">
                        {task.priority} priority
                      </Badge>

                      <div className={cn(
                        "flex items-center gap-1 text-xs flex-shrink-0",
                        getStatusColor(actualStatus)
                      )}>
                        <StatusIcon className="h-3 w-3" />
                        <span className="whitespace-nowrap">{actualStatus.replace('_', ' ')}</span>
                      </div>

                      {task.due_date && (
                        <div className={cn(
                          "flex items-center gap-1 text-xs flex-shrink-0",
                          taskIsOverdue ? 'text-destructive' : 'text-muted-foreground'
                        )}>
                          <Calendar className="h-3 w-3" />
                          <span className="whitespace-nowrap">{formatDueDate(task.due_date)}</span>
                        </div>
                      )}

                      {task.estimated_time && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock className="h-3 w-3" />
                          <span className="whitespace-nowrap">{task.estimated_time}m</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTaskId} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTaskId) {
                  onDelete(deleteTaskId);
                  setDeleteTaskId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};