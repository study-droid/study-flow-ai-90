import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, BookOpen, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSubjects } from '@/hooks/useSubjects';
import { useToast } from '@/hooks/use-toast';

// Assignment data interface for form submission
interface AssignmentFormData {
  title: string;
  description?: string;
  subject_id: string;
  subject?: string;
  assignment_type: 'homework' | 'project' | 'lab' | 'essay' | 'presentation' | 'research' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string | null;
  estimated_time?: number | null;
  points?: number | null;
  attachments?: string;
}

// Assignment submission result interface
interface AssignmentSubmissionResult {
  data: AssignmentFormData | null;
  error: Error | null;
}

interface AssignmentFormProps {
  onSubmit: (assignmentData: AssignmentFormData) => Promise<AssignmentSubmissionResult>;
  onCancel: () => void;
  initialData?: Partial<AssignmentFormData>;
  isLoading?: boolean;
}

export const AssignmentForm = ({ onSubmit, onCancel, initialData, isLoading }: AssignmentFormProps) => {
  const { subjects } = useSubjects();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<AssignmentFormData & { due_date?: Date }>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    subject_id: initialData?.subject_id || '',
    subject: initialData?.subject || '',
    assignment_type: initialData?.assignment_type || 'homework',
    priority: initialData?.priority || 'medium',
    status: initialData?.status || 'pending',
    due_date: initialData?.due_date ? new Date(initialData.due_date) : undefined,
    estimated_time: initialData?.estimated_time || null,
    points: initialData?.points || null,
    attachments: initialData?.attachments || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject_id) {
      toast({
        title: "Subject Required",
        description: "Please select a subject for this assignment",
        variant: "destructive",
      });
      return;
    }
    
    const assignmentData: AssignmentFormData = {
      title: formData.title,
      description: formData.description,
      subject_id: formData.subject_id,
      subject: formData.subject,
      assignment_type: formData.assignment_type,
      priority: formData.priority,
      status: formData.status,
      due_date: formData.due_date?.toISOString() || null,
      estimated_time: formData.estimated_time,
      points: formData.points,
      attachments: formData.attachments,
    };

    await onSubmit(assignmentData);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-focus/10 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <CardTitle className="text-2xl">
            {initialData?.id ? 'Edit Assignment' : 'Create New Assignment'}
          </CardTitle>
        </div>
        <CardDescription>
          {initialData?.id 
            ? 'Update your assignment details and requirements' 
            : 'Add a new assignment with subject, due date, and other details'}
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title and Subject Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-1">
                Assignment Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Chapter 5 Problem Set"
                required
                className="border-2 focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={formData.subject_id} 
                onValueChange={(value) => {
                  const selectedSubject = subjects.find(s => s.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    subject_id: value,
                    subject: selectedSubject?.name || ''
                  }));
                }}
                required
              >
                <SelectTrigger className="border-2">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length > 0 ? (
                    subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: subject.color || '#3b82f6' }}
                          />
                          {subject.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No subjects available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignment Type and Priority */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="type">Assignment Type</Label>
              <Select 
                value={formData.assignment_type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignment_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="homework">Homework</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="lab">Lab Report</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="research">Research Paper</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      Low Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                      Medium Priority
                    </span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      High Priority
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Points/Grade Weight</Label>
              <Input
                id="points"
                type="number"
                value={formData.points || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, points: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="e.g., 100"
                min="0"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description & Requirements</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the assignment requirements, instructions, and any important notes..."
              rows={4}
              className="border-2 focus:border-primary"
            />
          </div>

          {/* Due Date and Time */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Due Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, "PPP") : "Select due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, due_date: date }));
                      // Auto-close the popover after selection
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimated_time" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Estimated Time (minutes)
              </Label>
              <Input
                id="estimated_time"
                type="number"
                value={formData.estimated_time || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_time: e.target.value ? parseInt(e.target.value) : null }))}
                placeholder="e.g., 120"
                min="0"
              />
            </div>
          </div>

          {/* Attachments/Resources */}
          <div className="space-y-2">
            <Label htmlFor="attachments">Resources & Links</Label>
            <Textarea
              id="attachments"
              value={formData.attachments || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, attachments: e.target.value }))}
              placeholder="Add any relevant links, resources, or file references..."
              rows={2}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'pending' | 'in_progress' | 'completed' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg"
            >
              {isLoading ? 'Saving...' : (initialData?.id ? 'Update Assignment' : 'Create Assignment')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};