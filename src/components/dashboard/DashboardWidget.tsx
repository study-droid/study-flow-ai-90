import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Widget, DashboardData } from "@/hooks/useDashboard";
import { 
  Clock, 
  Target, 
  Award, 
  Brain, 
  Calendar,
  TrendingUp,
  BookOpen,
  MoreVertical,
  Eye,
  EyeOff,
  Move,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardWidgetProps {
  widget: Widget;
  data: DashboardData;
  onToggleVisibility: (widgetId: string) => void;
  onUpdateSize: (widgetId: string, size: Widget['size']) => void;
  isDragging?: boolean;
}

const widgetIcons = {
  'study-hours': Clock,
  'weekly-goal': Target,
  'study-streak': Award,
  'ai-sessions': Brain,
  'calendar-preview': Calendar,
  'quick-stats': TrendingUp,
  'recent-activity': BookOpen,
  'goals-progress': Target,
};

const sizeClasses = {
  sm: 'col-span-1',
  md: 'col-span-1 md:col-span-2',
  lg: 'col-span-2 md:col-span-3',
  xl: 'col-span-1 md:col-span-2 lg:col-span-4',
};

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widget,
  data,
  onToggleVisibility,
  onUpdateSize,
  isDragging = false,
}) => {
  const Icon = widgetIcons[widget.type];

  const renderWidgetContent = () => {
    switch (widget.type) {
      case 'study-hours':
        const dailyGoal = 4; // Could be from user settings
        const progressPercentage = (data.studyHoursToday / dailyGoal) * 100;
        return (
          <>
            <div className="text-2xl font-bold">{data.studyHoursToday}h</div>
            <Progress value={progressPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.max(0, dailyGoal - data.studyHoursToday)}h remaining to reach daily goal
            </p>
          </>
        );

      case 'weekly-goal':
        const weeklyProgress = (data.weeklyGoal.current / data.weeklyGoal.target) * 100;
        return (
          <>
            <div className="text-2xl font-bold">{data.weeklyGoal.current}/{data.weeklyGoal.target}h</div>
            <Progress value={weeklyProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {weeklyProgress >= 90 ? "Almost there! Keep going! 🧸" : "Great progress this week!"}
            </p>
          </>
        );

      case 'study-streak':
        return (
          <>
            <div className="text-2xl font-bold">{data.studyStreak} days</div>
            <p className="text-xs text-muted-foreground">
              {data.studyStreak > 5 ? "Amazing streak! Teddy is proud! 🏆" : "Keep building your streak!"}
            </p>
          </>
        );

      case 'ai-sessions':
        return (
          <>
            <div className="text-2xl font-bold">{data.aiSessions}</div>
            <p className="text-xs text-muted-foreground">
              Questions answered this week
            </p>
          </>
        );

      case 'goals-progress':
        return (
          <div className="space-y-4">
            {data.studyGoals.length > 0 ? (
              data.studyGoals.map((goal, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{goal.title}</span>
                    <Badge variant={goal.progress >= 100 ? "default" : goal.progress >= 75 ? "secondary" : "outline"}>
                      {goal.progress >= 100 ? "Completed" : goal.progress >= 75 ? "In Progress" : "Pending"}
                    </Badge>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(goal.progress)}% complete
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No goals set yet. Create your first study goal!</p>
            )}
          </div>
        );

      case 'recent-activity':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.recentActivity.length > 0 ? (
              data.recentActivity.slice(0, 4).map((activity, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="font-medium text-sm">🧸 {activity.description}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))
            ) : (
              <div className="col-span-full p-3 border rounded-lg text-center">
                <p className="text-sm text-muted-foreground">Start studying to see your activity! 🧸</p>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Widget content coming soon!</p>
          </div>
        );
    }
  };

  if (!widget.visible) return null;

  return (
    <Card className={`${sizeClasses[widget.size]} ${isDragging ? 'opacity-50' : ''} hover:shadow-lg transition-shadow`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {widget.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleVisibility(widget.id)}>
              {widget.visible ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {widget.visible ? 'Hide' : 'Show'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'sm')}>
              <Move className="h-4 w-4 mr-2" />
              Small
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'md')}>
              <Move className="h-4 w-4 mr-2" />
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'lg')}>
              <Move className="h-4 w-4 mr-2" />
              Large
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'xl')}>
              <Move className="h-4 w-4 mr-2" />
              Extra Large
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        {renderWidgetContent()}
      </CardContent>
    </Card>
  );
};