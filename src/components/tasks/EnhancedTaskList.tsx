import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { tasksApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { log } from '@/lib/config';
import { 
  Search, 
  Filter,
  SortAsc,
  Calendar,
  Clock,
  User,
  Star,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Target,
  ChevronDown,
  Tag,
  Loader2
} from 'lucide-react';

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  subject?: string;
  estimatedTime?: number;
  tags: string[];
  progress: number;
}

interface TaskFilters {
  status: string;
  priority: string;
  subject: string;
  sortBy: 'dueDate' | 'priority' | 'title' | 'progress';
  dueDateRange: 'all' | 'overdue' | 'today' | 'week' | 'month';
  progressRange: 'all' | '0-25' | '26-50' | '51-75' | '76-100';
}

// API Task response interface
interface ApiTask {
  id: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  due_date?: string | null;
  subject?: string | null;
  estimated_time?: number | null;
}

// Transform API task data to match component interface
const transformTaskData = (apiTask: ApiTask): TaskItem => ({
  id: apiTask.id,
  title: apiTask.title,
  description: apiTask.description || undefined,
  priority: apiTask.priority,
  status: apiTask.status,
  dueDate: apiTask.due_date ? new Date(apiTask.due_date) : undefined,
  subject: apiTask.subject || undefined,
  estimatedTime: apiTask.estimated_time || undefined,
  tags: [], // Could be derived from description or added as a field
  progress: apiTask.status === 'completed' ? 100 : 
           apiTask.status === 'in_progress' ? 50 : 0, // Simple progress calculation
});

export const EnhancedTaskList: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TaskFilters>({
    status: 'all',
    priority: 'all',
    subject: 'all',
    sortBy: 'dueDate',
    dueDateRange: 'all',
    progressRange: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  // Fetch tasks from API
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await tasksApi.getAll();
        
        if (response.success && response.data) {
          const transformedTasks = response.data.map(transformTaskData);
          setTasks(transformedTasks);
        } else {
          throw new Error(response.error || 'Failed to fetch tasks');
        }
      } catch (error) {
        log.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to load tasks",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [toast]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...tasks];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    // Priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    // Subject filter
    if (filters.subject !== 'all') {
      filtered = filtered.filter(task => task.subject === filters.subject);
    }

    // Due date range filter
    if (filters.dueDateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const monthFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(task => {
        if (!task.dueDate) return filters.dueDateRange === 'all';
        
        switch (filters.dueDateRange) {
          case 'overdue':
            return task.dueDate < today;
          case 'today':
            return task.dueDate.toDateString() === today.toDateString();
          case 'week':
            return task.dueDate >= today && task.dueDate <= weekFromNow;
          case 'month':
            return task.dueDate >= today && task.dueDate <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Progress range filter
    if (filters.progressRange !== 'all') {
      filtered = filtered.filter(task => {
        switch (filters.progressRange) {
          case '0-25':
            return task.progress >= 0 && task.progress <= 25;
          case '26-50':
            return task.progress >= 26 && task.progress <= 50;
          case '51-75':
            return task.progress >= 51 && task.progress <= 75;
          case '76-100':
            return task.progress >= 76 && task.progress <= 100;
          default:
            return true;
        }
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        case 'title':
          return a.title.localeCompare(b.title);
        case 'progress':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  }, [tasks, searchQuery, filters]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800';
      case 'low': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20';
      case 'pending': return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950/20';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDaysUntilDue = (dueDate?: Date): string => {
    if (!dueDate) return '';
    
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const updateTaskProgress = (taskId: string, progress: number) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId ? { ...task, progress } : task
    ));
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const newStatus = task.status === 'completed' ? 'pending' : 'completed';
        const newProgress = newStatus === 'completed' ? 100 : task.progress;
        return { ...task, status: newStatus, progress: newProgress };
      }
      return task;
    }));
  };

  const subjects = Array.from(new Set(tasks.map(task => task.subject).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="study-flow-shadow-soft animate-fade-in">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Task Management
              </CardTitle>
              <CardDescription>
                Organize and track your academic tasks efficiently
              </CardDescription>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {tasks.filter(t => t.status === 'pending').length}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="study-flow-shadow-soft">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks, descriptions, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  showFilters && "rotate-180"
                )} />
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg animate-slide-in-up">
                {/* First Row - Basic Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <select
                      value={filters.priority}
                      onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="all">All Priorities</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <select
                      value={filters.subject}
                      onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="all">All Subjects</option>
                      {subjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sort By</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as TaskFilters['sortBy'] }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="dueDate">Due Date</option>
                      <option value="priority">Priority</option>
                      <option value="title">Title</option>
                      <option value="progress">Progress</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <label className="text-sm font-medium">Due Date Range</label>
                    <select
                      value={filters.dueDateRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, dueDateRange: e.target.value as TaskFilters['dueDateRange'] }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="all">All Dates</option>
                      <option value="overdue">Overdue</option>
                      <option value="today">Due Today</option>
                      <option value="week">Due This Week</option>
                      <option value="month">Due This Month</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Progress Range</label>
                    <select
                      value={filters.progressRange}
                      onChange={(e) => setFilters(prev => ({ ...prev, progressRange: e.target.value as TaskFilters['progressRange'] }))}
                      className="w-full mt-1 p-2 border rounded-md bg-background"
                    >
                      <option value="all">All Progress</option>
                      <option value="0-25">0% - 25%</option>
                      <option value="26-50">26% - 50%</option>
                      <option value="51-75">51% - 75%</option>
                      <option value="76-100">76% - 100%</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFilters({
                        status: 'all',
                        priority: 'all',
                        subject: 'all',
                        sortBy: 'dueDate',
                        dueDateRange: 'all',
                        progressRange: 'all'
                      })}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <Card 
            key={task.id} 
            className={cn(
              "study-flow-shadow-soft hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02]",
              "animate-fade-in",
              task.status === 'completed' && "opacity-75"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => toggleTaskStatus(task.id)}
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                          task.status === 'completed'
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-muted-foreground hover:border-primary"
                        )}
                      >
                        {task.status === 'completed' && (
                          <div className="w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                      
                      <h3 className={cn(
                        "text-lg font-semibold transition-all duration-200",
                        task.status === 'completed' && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </h3>
                    </div>
                    
                    {task.description && (
                      <p className="text-muted-foreground text-sm mb-3">
                        {task.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("text-xs", getPriorityColor(task.priority))}>
                      {task.priority}
                    </Badge>
                    
                    <Badge variant="outline" className={cn("text-xs", getStatusColor(task.status))}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                {task.status !== 'completed' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{task.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Tags */}
                {task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, tagIndex) => (
                      <Badge
                        key={tagIndex}
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-4">
                    {task.subject && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {task.subject}
                      </div>
                    )}
                    
                    {task.estimatedTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {Math.floor(task.estimatedTime / 60)}h {task.estimatedTime % 60}m
                      </div>
                    )}
                  </div>
                  
                  {task.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1",
                      getDaysUntilDue(task.dueDate) === 'Overdue' && "text-red-600",
                      getDaysUntilDue(task.dueDate) === 'Due today' && "text-yellow-600"
                    )}>
                      <Calendar className="h-4 w-4" />
                      {getDaysUntilDue(task.dueDate)}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No tasks found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.subject !== 'all'
                  ? "Try adjusting your search or filters"
                  : "Create your first task to get started"}
              </p>
              <Button>
                <Target className="h-4 w-4 mr-2" />
                Add New Task
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};