import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DashboardData, Widget } from '@/hooks/useDashboard';
import { CalendarWidget } from '@/components/widgets/CalendarWidget';
import { AITutorWidget } from '@/components/widgets/AITutorWidget';
import { TaskWidget } from '@/components/widgets/TaskWidget';
import { TimerWidget } from '@/components/widgets/TimerWidget';
import { 
  Clock, 
  Target, 
  Flame, 
  Brain, 
  Calendar,
  TrendingUp,
  Activity,
  Trophy,
  MoreVertical,
  Eye,
  EyeOff,
  CheckSquare,
  Timer
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  'study-streak': Flame,
  'ai-sessions': Brain,
  'calendar-preview': Calendar,
  'quick-stats': TrendingUp,
  'recent-activity': Activity,
  'goals-progress': Trophy,
  'tasks': CheckSquare,
  'timer': Timer,
  'ai-tutor': Brain,
} as const;

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
      case 'calendar-preview':
        return <CalendarWidget data={data} />;
      
      case 'ai-tutor':
        return <AITutorWidget />;
      
      case 'tasks':
        return <TaskWidget />;
      
      case 'timer':
        return <TimerWidget />;

      case 'study-hours':
        return (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{data.studyHoursToday}h</div>
            <p className="text-xs text-muted-foreground">
              Today's focus time
            </p>
          </div>
        );

      case 'weekly-goal':
        const weeklyProgress = (data.weeklyGoal.current / data.weeklyGoal.target) * 100;
        return (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{data.weeklyGoal.current}h</div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{data.weeklyGoal.target}h goal</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        );

      case 'study-streak':
        return (
          <div className="space-y-2">
            <div className="text-2xl font-bold flex items-center gap-1">
              {data.studyStreak}
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Day streak
            </p>
          </div>
        );

      case 'ai-sessions':
        return (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{data.aiSessions}</div>
            <p className="text-xs text-muted-foreground">
              AI chats this week
            </p>
          </div>
        );

      case 'goals-progress':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Today's Goals</h4>
            {data.studyGoals.length > 0 ? (
              data.studyGoals.slice(0, 3).map((goal, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="truncate">{goal.title}</span>
                    <span>{Math.round(goal.progress)}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No goals set</p>
            )}
          </div>
        );

      case 'recent-activity':
        return (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Recent Activity</h4>
            {data.recentActivity.length > 0 ? (
              data.recentActivity.slice(0, 3).map((activity, index) => (
                <div key={index} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No recent activity</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-xs text-muted-foreground">
            Widget content not implemented
          </div>
        );
    }
  };

  if (!widget.visible) return null;

  // For special widget types that handle their own Card rendering
  const selfContainedWidgets = ['calendar-preview', 'ai-tutor', 'tasks', 'timer'];
  
  if (selfContainedWidgets.includes(widget.type)) {
    return (
      <div className={cn(
        sizeClasses[widget.size] || 'col-span-1',
        "transition-all duration-200",
        isDragging && "opacity-50 scale-95"
      )}>
        {renderWidgetContent()}
      </div>
    );
  }

  return (
    <Card 
      className={cn(
        sizeClasses[widget.size] || 'col-span-1',
        "transition-all duration-200",
        isDragging && "opacity-50 scale-95"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4" />}
          {widget.title}
        </CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggleVisibility(widget.id)}>
              {widget.visible ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'sm')}>
              Small
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'md')}>
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onUpdateSize(widget.id, 'lg')}>
              Large
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