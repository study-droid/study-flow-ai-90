import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Task } from '@/hooks/useTasks';
import { useSubjects } from '@/hooks/useSubjects';

// Task submission result interface
interface TaskSubmissionResult {
  data: Task | null;
  error: Error | null;
}

interface TaskFormProps {
  onSubmit: (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'actual_time'>) => Promise<TaskSubmissionResult>;
  onCancel: () => void;
  initialData?: Partial<Task>;
  isLoading?: boolean;
  isAssignment?: boolean;
}

export const TaskForm = ({ onSubmit, onCancel, initialData, isLoading, isAssignment }: TaskFormProps) => {
  const { subjects } = useSubjects();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    subject: initialData?.subject || '',
    subject_id: initialData?.subject_id || null as string | null,
    priority: initialData?.priority || 'medium' as const,
    status: initialData?.status || 'pending' as const,
    due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined as Date | undefined,
    estimated_time: initialData?.estimated_time || null as number | null,
    study_plan_id: initialData?.study_plan_id || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      due_date: formData.due_date?.toISOString() || null,
    };

    await onSubmit(taskData);
  };


  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">{initialData?.id ? (isAssignment ? 'Edit Assignment' : 'Edit Task') : (isAssignment ? 'Create New Assignment' : 'Create New Task')}</CardTitle>
        <CardDescription className="text-sm mt-1">
          {initialData?.id ? (isAssignment ? 'Update your assignment details' : 'Update your task details') : (isAssignment ? 'Add a new assignment to your subject' : 'Add a new task to your study plan')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="title" className="text-sm font-medium">{isAssignment ? 'Assignment Title' : 'Task Title'} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={isAssignment ? "Enter assignment title" : "Enter task title"}
                required
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">Subject {isAssignment && '*'}</Label>
              <Select 
                value={formData.subject_id || ''} 
                onValueChange={(value) => {
                  const selectedSubject = subjects.find(s => s.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    subject_id: value,
                    subject: selectedSubject?.name || ''
                  }));
                }}
                required={isAssignment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task details"
              rows={3}
              className="min-h-[80px] resize-none"
            />
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-sm font-medium">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'pending' | 'in_progress' | 'completed' | 'overdue') => 
                  setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_time" className="text-sm font-medium">Estimated Time (min)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="estimated_time"
                  type="number"
                  value={formData.estimated_time || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_time: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  placeholder="60"
                  className="pl-10 min-h-[44px]"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal min-h-[44px]",
                    !formData.due_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.due_date ? format(formData.due_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.due_date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="w-full sm:w-auto min-h-[44px]">
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={isLoading} className="w-full sm:flex-1 min-h-[44px]">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {initialData?.id ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                initialData?.id ? 'Update Task' : 'Create Task'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};