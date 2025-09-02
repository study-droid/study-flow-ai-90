import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/useTasks";
import { Clock, Calendar, CheckCircle2, ArrowRight, Plus, ListTodo } from "lucide-react";
import { format, isToday, isTomorrow, isThisWeek } from "date-fns";
import { useNavigate } from "react-router-dom";

export const UpcomingTasks = () => {
  const { tasks, loading, toggleTaskStatus } = useTasks();
  const navigate = useNavigate();

  const upcomingTasks = tasks
    .filter(task => task.status !== 'completed')
    .filter(task => {
      if (!task.due_date) return true;
      const dueDate = new Date(task.due_date);
      return isToday(dueDate) || isTomorrow(dueDate) || isThisWeek(dueDate);
    })
    .slice(0, 5);

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return 'No due date';
    const date = new Date(dueDate);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border border-border/50 shadow-xl hover:shadow-2xl transition-all duration-500 rounded-xl border-t-4 border-t-progress">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      <CardHeader className="relative p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-progress animate-pulse" />
          Upcoming Tasks
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm mt-1">
          Focus on your most important tasks coming up
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : upcomingTasks.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-muted/5">
            <div className="relative inline-block mb-4">
              <ListTodo className="h-16 w-16 text-muted-foreground/30" />
              <Plus className="h-6 w-6 text-primary absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-lg" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">No tasks created yet</p>
            <p className="text-xs text-muted-foreground/70 mb-4">Start by creating your first task</p>
            <Button 
              onClick={() => navigate('/tasks')}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all duration-300"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={() => toggleTaskStatus(task.id)}
                  className="mt-0.5 min-w-[20px] min-h-[20px]"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <h4 className={`font-medium text-sm leading-relaxed break-words ${
                      task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                    }`}>
                      {task.title}
                    </h4>
                    <Badge 
                      variant={task.priority === "high" ? "destructive" : 
                              task.priority === "medium" ? "default" : "secondary"}
                      className="text-xs flex-shrink-0 self-start"
                    >
                      {task.priority}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {task.subject && <span className="font-medium">{task.subject}</span>}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDueDate(task.due_date)}
                    </div>
                    {task.estimated_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {task.estimated_time}m
                      </div>
                    )}
                  </div>

                  {task.status === 'completed' && (
                    <div className="flex items-center gap-2 text-xs text-progress">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <Button 
              variant="ghost" 
              className="w-full hover:bg-primary/10 transition-all duration-300" 
              size="sm"
              onClick={() => navigate('/tasks')}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              View All Tasks
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};