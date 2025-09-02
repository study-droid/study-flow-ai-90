import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { UpcomingTasks } from "@/components/dashboard/UpcomingTasks";
import { FocusSession } from "@/components/dashboard/FocusSession";
import { SpacedRepetition } from "@/components/features/SpacedRepetition";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTasks } from "@/hooks/useTasks";
import { useStudySessions } from "@/hooks/useStudySessions";
import {
  BookOpen,
  Clock,
  Target,
  Trophy,
  TrendingUp,
  Calendar,
  Brain,
  Users,
  Zap,
  Star,
  ChevronRight,
  Plus,
  Timer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { startOfWeek, isWithinInterval, endOfWeek } from "date-fns";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tasks } = useTasks();
  const { getTodaysSessions, getTotalStudyTime, getStudyStreak, getTodaysFocusScore } = useStudySessions();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Student';
  
  // Get this week's tasks
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday as start of week
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  const thisWeekTasks = tasks.filter(task => {
    const taskDate = task.created_at ? new Date(task.created_at) : null;
    if (!taskDate) return false;
    return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
  });
  
  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completedTasksThisWeek = thisWeekTasks.filter(t => t.status === 'completed').length;
  const totalTasksThisWeek = thisWeekTasks.length;
  
  const studyStreak = getStudyStreak();
  const todaysSessions = getTodaysSessions();
  const todayStudyTime = getTotalStudyTime(todaysSessions);
  const todaysFocusScore = getTodaysFocusScore();
  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 animate-slide-up">
        {/* Welcome Section */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 sm:gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-3">
                Welcome back, <span className="study-flow-gradient bg-clip-text text-transparent">{displayName}!</span>
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                Ready to crush your study goals today? You have {pendingTasks} tasks pending.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="bg-achievement/10 text-achievement border-achievement/20 flex items-center gap-2 text-xs sm:text-sm">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 animate-golden-glow" />
                <span>{studyStreak}-day streak</span>
              </Badge>
              <Button 
                variant="default" 
                size="default"
                className="w-full sm:w-auto hover:scale-105 transition-transform duration-300 bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg"
                onClick={() => navigate('/study')}
              >
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                <span className="text-sm sm:text-base">Start Study Session</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          <MetricsCard
            title="Study Hours Today"
            value={`${Math.floor(todayStudyTime / 60)}h ${todayStudyTime % 60}m`}
            subtitle="Keep going strong!"
            icon={Timer}
            variant="focus"
          />
          <MetricsCard
            title="Tasks Completed"
            value={totalTasksThisWeek > 0 ? `${completedTasksThisWeek}/${totalTasksThisWeek}` : '0/0'}
            subtitle="This week"
            icon={Target}
            variant="progress"
          />
          <MetricsCard
            title="Study Streak"
            value={studyStreak.toString()}
            subtitle="Days in a row"
            icon={Trophy}
            variant="achievement"
          />
          <MetricsCard
            title="Focus Score"
            value={todaysFocusScore > 0 ? `${todaysFocusScore}%` : 'No data'}
            subtitle={todaysFocusScore > 0 ? "Today's Average" : "Complete a study session"}
            icon={Brain}
            variant="gradient"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Column - Progress & Tasks */}
          <div className="xl:col-span-2 space-y-3 sm:space-y-4 lg:space-y-6">
            <ProgressChart />
            <UpcomingTasks />
            
            {/* Recent Activity */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.slice(0, 4).map((task) => {
                    const createdDate = new Date(task.created_at);
                    const now = new Date();
                    const diffMs = now.getTime() - createdDate.getTime();
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    
                    let timeAgo = '';
                    if (diffHours < 1) {
                      timeAgo = 'Just now';
                    } else if (diffHours < 24) {
                      timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                    } else if (diffDays === 1) {
                      timeAgo = 'Yesterday';
                    } else {
                      timeAgo = `${diffDays} days ago`;
                    }
                    
                    return (
                      <div key={task.id} className="flex items-center gap-4 pb-3 border-b last:border-b-0">
                        <div className={`h-2 w-2 rounded-full ${
                          task.status === "completed" ? "bg-progress" :
                          task.status === "in_progress" ? "bg-focus" :
                          "bg-primary"
                        }`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {task.status === 'completed' ? 'Completed' : 
                             task.status === 'in_progress' ? 'Started' : 'Created'}: {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No recent activity. Create your first task to get started!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Column - Focus Session & Spaced Repetition - Responsive */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <FocusSession />
            <SpacedRepetition />
          </div>

          {/* Right Column - Calendar & Quick Actions - Responsive */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            
            {/* Calendar Widget */}
            <CalendarWidget />
            
            {/* Quick Actions */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* New Task Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-primary/10 hover:border-primary transition-all"
                  onClick={() => navigate('/tasks')}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    <span className="font-medium">New Task</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Start Focus Session Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-focus/10 hover:border-focus transition-all"
                  onClick={() => navigate('/study')}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-focus" />
                    <span className="font-medium">Start Focus Session</span>
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Study Plan Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => navigate('/subjects')}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Study Plan
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Schedule Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-primary/10 hover:border-primary/50 transition-all"
                  onClick={() => navigate('/timetable')}
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Schedule
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                {/* Achievements Button */}
                <Button 
                  variant="outline" 
                  className="w-full justify-between hover:bg-achievement/10 hover:border-achievement/50 transition-all"
                  onClick={() => navigate('/achievements')}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-achievement" />
                    Achievements
                  </div>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
