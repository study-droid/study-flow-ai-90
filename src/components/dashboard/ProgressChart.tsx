import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Calendar, Target } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { useStudyGoals } from "@/hooks/useStudyGoals";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";

interface Subject {
  name: string;
  progress: number;
  color: string;
  tasks: {
    completed: number;
    total: number;
  };
  nextDeadline?: string;
}

export const ProgressChart = () => {
  const { tasks } = useTasks();
  const { goals, getGoalProgress } = useStudyGoals();
  const { profile } = useProfile();

  // Group tasks by subject and calculate progress
  const subjectData = tasks.reduce((acc, task) => {
    const subject = task.subject || "General";
    if (!acc[subject]) {
      acc[subject] = {
        name: subject,
        progress: 0,
        color: getSubjectColor(subject),
        tasks: { completed: 0, total: 0 },
        nextDeadline: undefined as string | undefined
      };
    }
    
    acc[subject].tasks.total++;
    if (task.status === 'completed') {
      acc[subject].tasks.completed++;
    }
    
    // Check for upcoming deadlines
    if (task.due_date && task.status !== 'completed') {
      const deadline = new Date(task.due_date);
      const now = new Date();
      const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 7 && (!acc[subject].nextDeadline || daysUntil < parseInt(acc[subject].nextDeadline!.split(' ')[3]))) {
        if (daysUntil === 0) {
          acc[subject].nextDeadline = "Due today";
        } else if (daysUntil === 1) {
          acc[subject].nextDeadline = "Due tomorrow";
        } else if (daysUntil > 0) {
          acc[subject].nextDeadline = `Due in ${daysUntil} days`;
        }
      }
    }
    
    return acc;
  }, {} as Record<string, Subject>);

  // Calculate progress for each subject
  Object.values(subjectData).forEach(subject => {
    subject.progress = subject.tasks.total > 0 
      ? Math.round((subject.tasks.completed / subject.tasks.total) * 100)
      : 0;
  });

  const subjects = Object.values(subjectData);
  
  const overallProgress = subjects.length > 0 
    ? Math.round(subjects.reduce((acc, subject) => acc + subject.progress, 0) / subjects.length)
    : 0;

  // Calculate weekly goal progress from profile
  const weeklyGoalProgress = profile?.preferred_session_length 
    ? Math.min(Math.round((profile.total_study_time / (profile.preferred_session_length * 7)) * 100), 100)
    : 0;

  return (
    <Card className="study-flow-shadow-soft">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-progress" />
              Subject Progress
            </CardTitle>
            <CardDescription>
              Your learning progress across all subjects
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
            <p className="text-sm text-muted-foreground">Overall</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {subjects.length > 0 ? subjects.map((subject, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${subject.color}`} />
                  <span className="font-medium">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {subject.tasks.completed}/{subject.tasks.total} tasks
                  </Badge>
                  <span className="text-sm font-medium">{subject.progress}%</span>
                </div>
              </div>
              
              <Progress value={subject.progress} className="h-2" />
              
              {subject.nextDeadline && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {subject.nextDeadline}
                </div>
              )}
            </div>
          )) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No tasks created yet</p>
              <p className="text-sm">Start by creating some tasks to track your progress</p>
            </div>
          )}
          
          {profile && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-achievement" />
                  <span className="font-medium">Study Progress</span>
                </div>
                <span className="text-achievement font-medium">
                  {Math.round(profile.total_study_time / 60)} hours total
                </span>
              </div>
              <Progress value={weeklyGoalProgress} className="mt-2 h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Current streak: {profile.study_streak} days
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to assign colors to subjects
function getSubjectColor(subject: string): string {
  const colors = [
    "bg-primary", "bg-focus", "bg-progress", "bg-achievement", 
    "bg-warning", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500"
  ];
  
  // Simple hash function to consistently assign colors
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = ((hash << 5) - hash + subject.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length];
}