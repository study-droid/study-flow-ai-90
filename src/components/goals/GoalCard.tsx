import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Target, Calendar, MoreHorizontal, CheckCircle, Pause, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { StudyGoal, useStudyGoals } from '@/hooks/useStudyGoals';

interface GoalCardProps {
  goal: StudyGoal;
}

export const GoalCard = ({ goal }: GoalCardProps) => {
  const { updateGoal, deleteGoal, getGoalProgress } = useStudyGoals();
  
  const progress = getGoalProgress(goal);
  const isOverdue = isPast(new Date(goal.deadline)) && goal.status === 'active';
  const isCompleted = goal.status === 'completed' || progress >= 100;
  
  const handleStatusChange = async (status: string) => {
    await updateGoal(goal.id, { status });
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this goal?')) {
      await deleteGoal(goal.id);
    }
  };

  const getStatusColor = () => {
    if (isCompleted) return 'bg-green-500';
    if (isOverdue) return 'bg-red-500';
    if (goal.status === 'paused') return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (isOverdue) return 'Overdue';
    if (goal.status === 'paused') return 'Paused';
    return 'Active';
  };

  return (
    <Card className="study-flow-shadow-soft hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`h-3 w-3 rounded-full flex-shrink-0 ${getStatusColor()}`} />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base sm:text-lg line-clamp-2" title={goal.title}>
                {goal.title}
              </h3>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2" title={goal.description}>
                  {goal.description}
                </p>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {goal.status === 'active' && !isCompleted && (
                <>
                  <DropdownMenuItem onClick={() => handleStatusChange('completed')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange('paused')}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Goal
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === 'paused' && (
                <DropdownMenuItem onClick={() => handleStatusChange('active')}>
                  <Target className="h-4 w-4 mr-2" />
                  Resume Goal
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {goal.current_value} / {goal.target_value} {goal.unit}
            </span>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span className="truncate" title={
                isPast(new Date(goal.deadline)) 
                  ? `Deadline was ${formatDistanceToNow(new Date(goal.deadline))} ago`
                  : `Due ${formatDistanceToNow(new Date(goal.deadline))} from now`
              }>
                {isPast(new Date(goal.deadline)) 
                  ? `Deadline was ${formatDistanceToNow(new Date(goal.deadline))} ago`
                  : `Due ${formatDistanceToNow(new Date(goal.deadline))} from now`
                }
              </span>
            </div>
            
            <Badge variant="outline" className={isCompleted ? 'text-green-600' : isOverdue ? 'text-red-600' : ''}>
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};