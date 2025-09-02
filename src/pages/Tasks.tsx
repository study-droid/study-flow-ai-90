import { useState } from 'react';
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TaskForm } from "@/components/tasks/TaskForm";
import { AssignmentForm } from "@/components/tasks/AssignmentForm";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskFilterDialog, type TaskFilters } from "@/components/tasks/TaskFilterDialog";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useSubjects } from "@/hooks/useSubjects";
import { Plus, Filter, Calendar, Clock, Target, CheckCircle2, AlertCircle, BookOpen, ClipboardList } from "lucide-react";

const Tasks = () => {
  const { tasks, loading, createTask, updateTask, deleteTask, toggleTaskStatus } = useTasks();
  const { subjects } = useSubjects();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignmentFormOpen, setIsAssignmentFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Task | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    priority: 'all',
    status: 'all',
    dateRange: {
      from: undefined,
      to: undefined,
    },
    subjects: [],
    hasDeadline: null,
    assignmentType: 'all',
  });

  // Apply filters to tasks
  const applyFilters = (taskList: Task[]) => {
    return taskList.filter(task => {
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      
      // Status filter
      if (filters.status !== 'all') {
        if (filters.status === 'overdue') {
          const isOverdue = task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();
          if (!isOverdue) return false;
        } else if (task.status !== filters.status) {
          return false;
        }
      }
      
      // Date range filter
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        if (filters.dateRange.from && dueDate < filters.dateRange.from) {
          return false;
        }
        if (filters.dateRange.to && dueDate > filters.dateRange.to) {
          return false;
        }
      }
      
      // Has deadline filter
      if (filters.hasDeadline === true && !task.due_date) {
        return false;
      }
      
      // Subject filter (for assignments)
      if (filters.subjects.length > 0 && task.subject_id) {
        if (!filters.subjects.includes(task.subject_id)) {
          return false;
        }
      }
      
      // Assignment type filter
      if (filters.assignmentType !== 'all' && task.assignment_type) {
        if (task.assignment_type !== filters.assignmentType) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Separate regular tasks from assignments
  const allRegularTasks = tasks.filter(t => !t.subject_id);
  const allAssignments = tasks.filter(t => t.subject_id);
  
  // Apply filters
  const regularTasks = applyFilters(allRegularTasks);
  const assignments = applyFilters(allAssignments);
  
  // Regular tasks filtering
  const completedTasks = regularTasks.filter(t => t.status === 'completed');
  const inProgressTasks = regularTasks.filter(t => t.status === 'in_progress');
  const pendingTasks = regularTasks.filter(t => t.status === 'pending');
  const overdueTasks = regularTasks.filter(t => {
    if (t.status === 'completed' || !t.due_date) return false;
    return new Date(t.due_date) < new Date();
  });
  
  // Assignments filtering
  const pendingAssignments = assignments.filter(t => t.status === 'pending');
  const completedAssignments = assignments.filter(t => t.status === 'completed');

  const taskStats = [
    { label: "Total Tasks", value: regularTasks.length.toString(), icon: Target, color: "text-primary" },
    { label: "Completed", value: completedTasks.length.toString(), icon: CheckCircle2, color: "text-progress" },
    { label: "In Progress", value: inProgressTasks.length.toString(), icon: Clock, color: "text-focus" },
    { label: "Overdue", value: overdueTasks.length.toString(), icon: AlertCircle, color: "text-warning" },
  ];

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'actual_time'>) => {
    setFormLoading(true);
    const result = await createTask(taskData);
    setFormLoading(false);
    
    if (!result.error) {
      setIsFormOpen(false);
    }
    
    return result;
  };

  const handleUpdateTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'actual_time'>) => {
    if (!editingTask) return;
    
    setFormLoading(true);
    const result = await updateTask(editingTask.id, taskData);
    setFormLoading(false);
    
    if (!result.error) {
      setEditingTask(null);
      setIsFormOpen(false);
    }
    
    return result;
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTask(null);
    setIsCreatingAssignment(false);
  };

  const handleAssignmentFormClose = () => {
    setIsAssignmentFormOpen(false);
    setEditingAssignment(null);
  };

  const handleCreateAssignment = async (assignmentData: any) => {
    setFormLoading(true);
    // Ensure subject_id is set for assignments
    const dataWithSubject = {
      ...assignmentData,
      subject_id: assignmentData.subject_id,
    };
    const result = await createTask(dataWithSubject);
    setFormLoading(false);
    
    if (!result.error) {
      setIsAssignmentFormOpen(false);
    }
    
    return result;
  };

  const handleUpdateAssignment = async (assignmentData: any) => {
    if (!editingAssignment) return;
    
    setFormLoading(true);
    const result = await updateTask(editingAssignment.id, assignmentData);
    setFormLoading(false);
    
    if (!result.error) {
      setEditingAssignment(null);
      setIsAssignmentFormOpen(false);
    }
    
    return result;
  };

  const handleEditAssignment = (assignment: Task) => {
    setEditingAssignment(assignment);
    setIsAssignmentFormOpen(true);
  };

  const getFilteredTasks = (filter: string) => {
    switch (filter) {
      case 'pending': return pendingTasks;
      case 'progress': return inProgressTasks;
      case 'completed': return completedTasks;
      default: return regularTasks;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks & Assignments</h1>
            <p className="text-muted-foreground">
              Manage your study tasks and track your progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {Object.values(filters).some(v => v !== 'all' && v !== null && (Array.isArray(v) ? v.length > 0 : v)) && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsAssignmentFormOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
            <Button variant="gradient" onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Task Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {taskStats.map((stat, index) => (
            <Card key={index} className="study-flow-shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Tabs - Tasks and Assignments */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Tasks
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Assignments
            </TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All Tasks</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              {['all', 'pending', 'progress', 'completed'].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-6">
                  <TaskList
                    tasks={getFilteredTasks(tab)}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onToggleStatus={toggleTaskStatus}
                    loading={loading}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
          
          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            {/* Assignment Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="study-flow-shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{assignments.length}</div>
                      <p className="text-sm text-muted-foreground">Total Assignments</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="study-flow-shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{pendingAssignments.length}</div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="study-flow-shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-progress/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-progress" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{completedAssignments.length}</div>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Assignments by Subject */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Assignments by Subject
                </CardTitle>
                <CardDescription>
                  View and manage assignments organized by subject
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {subjects.length > 0 ? (
                  subjects.map(subject => {
                    const subjectAssignments = assignments.filter(a => a.subject_id === subject.id);
                    if (subjectAssignments.length === 0) return null;
                    
                    return (
                      <div key={subject.id} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: subject.color || '#3b82f6' }}
                            />
                            <h3 className="font-medium">{subject.name}</h3>
                            <Badge variant="secondary">
                              {subjectAssignments.length} assignment{subjectAssignments.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="pl-5 space-y-2">
                          {subjectAssignments.map(assignment => (
                            <div 
                              key={assignment.id} 
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => handleEditAssignment(assignment)}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={assignment.status === 'completed'}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleTaskStatus(assignment.id);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                <div>
                                  <p className={`font-medium ${assignment.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                    {assignment.title}
                                  </p>
                                  {assignment.due_date && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                      <Calendar className="h-3 w-3" />
                                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                {assignment.priority && (
                                  <Badge 
                                    variant={assignment.priority === 'high' ? 'destructive' : assignment.priority === 'medium' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {assignment.priority}
                                  </Badge>
                                )}
                                <Badge 
                                  variant={assignment.status === 'completed' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {assignment.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      No subjects found. Create subjects first to organize assignments.
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => window.location.href = '/subjects'}
                    >
                      Go to Subjects
                    </Button>
                  </div>
                )}
                
                {subjects.length > 0 && assignments.length === 0 && (
                  <div className="text-center py-8">
                    <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      No assignments yet. Create a task and assign it to a subject.
                    </p>
                    <Button 
                      variant="gradient" 
                      className="mt-4"
                      onClick={() => setIsAssignmentFormOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Assignment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Task Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col">
            <TaskForm
              onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
              onCancel={handleFormClose}
              initialData={editingTask || undefined}
              isLoading={formLoading}
              isAssignment={false}
            />
          </DialogContent>
        </Dialog>

        {/* Assignment Form Dialog */}
        <Dialog open={isAssignmentFormOpen} onOpenChange={handleAssignmentFormClose}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto flex flex-col">
            <AssignmentForm
              onSubmit={editingAssignment ? handleUpdateAssignment : handleCreateAssignment}
              onCancel={handleAssignmentFormClose}
              initialData={editingAssignment || undefined}
              isLoading={formLoading}
            />
          </DialogContent>
        </Dialog>

        {/* Filter Dialog */}
        <TaskFilterDialog
          open={isFilterOpen}
          onOpenChange={setIsFilterOpen}
          filters={filters}
          onFiltersChange={setFilters}
          showAssignmentFilters={activeTab === 'assignments'}
        />
      </div>
    </DashboardLayout>
  );
};

export default Tasks;