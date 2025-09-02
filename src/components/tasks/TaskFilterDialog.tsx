import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Filter, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useSubjects } from '@/hooks/useSubjects';

export interface TaskFilters {
  priority: 'all' | 'low' | 'medium' | 'high';
  status: 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue';
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  subjects: string[];
  hasDeadline: boolean | null;
  assignmentType: 'all' | 'homework' | 'project' | 'lab' | 'essay' | 'presentation' | 'research' | 'other';
}

interface TaskFilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  showAssignmentFilters?: boolean;
}

export const TaskFilterDialog = ({ 
  open, 
  onOpenChange, 
  filters, 
  onFiltersChange,
  showAssignmentFilters = false 
}: TaskFilterDialogProps) => {
  const { subjects } = useSubjects();
  const [localFilters, setLocalFilters] = useState<TaskFilters>(filters);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const handleResetFilters = () => {
    const defaultFilters: TaskFilters = {
      priority: 'all',
      status: 'all',
      dateRange: {
        from: undefined,
        to: undefined,
      },
      subjects: [],
      hasDeadline: null,
      assignmentType: 'all',
    };
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = () => {
    let count = 0;
    if (localFilters.priority !== 'all') count++;
    if (localFilters.status !== 'all') count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.subjects.length > 0) count++;
    if (localFilters.hasDeadline !== null) count++;
    if (localFilters.assignmentType !== 'all') count++;
    return count;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Tasks
            {activeFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount()} active
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Apply filters to narrow down your task list
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Priority Filter */}
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select 
              value={localFilters.priority} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, priority: value as TaskFilters['priority'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
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

          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={localFilters.status} 
              onValueChange={(value) => setLocalFilters(prev => ({ ...prev, status: value as TaskFilters['status'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignment Type Filter (only for assignments) */}
          {showAssignmentFilters && (
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select 
                value={localFilters.assignmentType} 
                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, assignmentType: value as TaskFilters['assignmentType'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
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
          )}

          {/* Subject Filter (only for assignments) */}
          {showAssignmentFilters && subjects.length > 0 && (
            <div className="space-y-2">
              <Label>Subjects</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                {subjects.map(subject => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={subject.id}
                      checked={localFilters.subjects.includes(subject.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setLocalFilters(prev => ({ 
                            ...prev, 
                            subjects: [...prev.subjects, subject.id] 
                          }));
                        } else {
                          setLocalFilters(prev => ({ 
                            ...prev, 
                            subjects: prev.subjects.filter(s => s !== subject.id) 
                          }));
                        }
                      }}
                    />
                    <label 
                      htmlFor={subject.id} 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                    >
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: subject.color || '#3b82f6' }}
                      />
                      {subject.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Due Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !localFilters.dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateRange.from ? format(localFilters.dateRange.from, "PP") : "From"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateRange.from}
                    onSelect={(date) => {
                      setLocalFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, from: date } 
                      }));
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !localFilters.dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateRange.to ? format(localFilters.dateRange.to, "PP") : "To"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateRange.to}
                    onSelect={(date) => {
                      setLocalFilters(prev => ({ 
                        ...prev, 
                        dateRange: { ...prev.dateRange, to: date } 
                      }));
                      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                    }}
                    disabled={(date) => 
                      localFilters.dateRange.from ? date < localFilters.dateRange.from : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Has Deadline Filter */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="has-deadline"
              checked={localFilters.hasDeadline === true}
              onCheckedChange={(checked) => {
                setLocalFilters(prev => ({ 
                  ...prev, 
                  hasDeadline: checked === true ? true : null 
                }));
              }}
            />
            <label 
              htmlFor="has-deadline" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Only show tasks with deadlines
            </label>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handleResetFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleApplyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};