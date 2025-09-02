import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProgressChart } from "@/components/dashboard/ProgressChart";
import { AIAnalytics } from "@/components/analytics/AIAnalytics";
import { MetricsCard } from "@/components/dashboard/MetricsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Target, Brain, Calendar, Award, BookOpen, Zap } from "lucide-react";
import { useStudySessions } from "@/hooks/useStudySessions";
import { useTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useStudyGoals } from "@/hooks/useStudyGoals";

const Analytics = () => {
  const { sessions, getTodaysSessions, getWeekSessions, getTotalStudyTime, getSessionsBySubject } = useStudySessions();
  const { tasks } = useTasks();
  const { profile } = useProfile();
  const { goals } = useStudyGoals();

  // Calculate real metrics
  const weekSessions = getWeekSessions();
  const todaySessions = getTodaysSessions();
  const totalWeeklyTime = getTotalStudyTime(weekSessions);
  const subjectSessions = getSessionsBySubject(weekSessions);

  const completedTasksThisWeek = tasks.filter(task => {
    if (task.status !== 'completed') return false;
    const completedDate = new Date(task.updated_at);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return completedDate >= oneWeekAgo;
  }).length;

  // Convert subject sessions to breakdown format
  const subjectBreakdown = Object.entries(subjectSessions).map(([subject, data]) => {
    const percentage = totalWeeklyTime > 0 ? Math.round((data.duration / totalWeeklyTime) * 100) : 0;
    return {
      subject: subject || "General",
      hours: Math.round(data.duration / 60 * 10) / 10, // Convert minutes to hours
      percentage,
      color: getSubjectColor(subject || "General")
    };
  }).sort((a, b) => b.hours - a.hours);

  // Real achievements based on actual data
  const achievements = [];
  
  if (profile?.study_streak && profile.study_streak >= 7) {
    achievements.push({
      title: "Consistency Master",
      description: `${profile.study_streak}-day study streak`,
      date: "Current",
      icon: Award
    });
  }

  if (totalWeeklyTime >= 360) { // 6+ hours this week
    achievements.push({
      title: "Study Champion",
      description: "Studied for 6+ hours this week",
      date: "This week",
      icon: Clock
    });
  }

  if (completedTasksThisWeek >= 5) {
    achievements.push({
      title: "Task Master",
      description: `Completed ${completedTasksThisWeek} tasks this week`,
      date: "This week",
      icon: Target
    });
  }

  if (goals.length > 0) {
    achievements.push({
      title: "Goal Setter",
      description: "Created study goals",
      date: "Recently",
      icon: Brain
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <AIAnalytics />
        <div className="space-y-6">{/* Existing analytics content below */}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics & Insights</h1>
            <p className="text-muted-foreground">
              Track your progress and discover study patterns
            </p>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <TrendingUp className="h-3 w-3 mr-1" />
            Trending up 23%
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricsCard
            title="Total Study Time"
            value={`${Math.round(totalWeeklyTime / 60 * 10) / 10}h`}
            subtitle="This week"
            icon={Clock}
            variant="focus"
          />
          <MetricsCard
            title="Study Sessions"
            value={weekSessions.length.toString()}
            subtitle="This week"
            icon={Brain}
            variant="gradient"
          />
          <MetricsCard
            title="Tasks Completed"
            value={completedTasksThisWeek.toString()}
            subtitle="This week"
            icon={Target}
            variant="progress"
          />
          <MetricsCard
            title="Study Streak"
            value={profile?.study_streak?.toString() || "0"}
            subtitle="Days in a row"
            icon={Award}
            variant="achievement"
          />
        </div>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="habits">Study Habits</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <ProgressChart />
              </div>
              
              <Card className="study-flow-shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Insights
                  </CardTitle>
                  <CardDescription>
                    Personalized recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {totalWeeklyTime > 0 ? (
                      <>
                        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                          <div className="flex items-start gap-3">
                            <Clock className="h-4 w-4 text-primary mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Study Progress</p>
                              <p className="text-xs text-muted-foreground">
                                You've studied {Math.round(totalWeeklyTime / 60 * 10) / 10} hours this week across {weekSessions.length} sessions.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {profile?.study_streak && profile.study_streak > 0 && (
                          <div className="p-3 bg-focus/5 rounded-lg border border-focus/10">
                            <div className="flex items-start gap-3">
                              <Award className="h-4 w-4 text-focus mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Streak Active</p>
                                <p className="text-xs text-muted-foreground">
                                  Keep up your {profile.study_streak}-day study streak! Consistency is key to success.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {subjectBreakdown.length > 0 && (
                          <div className="p-3 bg-achievement/5 rounded-lg border border-achievement/10">
                            <div className="flex items-start gap-3">
                              <BookOpen className="h-4 w-4 text-achievement mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Top Subject</p>
                                <p className="text-xs text-muted-foreground">
                                  Most time spent on {subjectBreakdown[0].subject} ({subjectBreakdown[0].hours}h this week).
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-3 bg-muted/5 rounded-lg border">
                        <div className="flex items-start gap-3">
                          <Zap className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Get Started</p>
                            <p className="text-xs text-muted-foreground">
                              Start tracking your study sessions to see personalized insights here.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="subjects" className="space-y-6">
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle>Subject Time Distribution</CardTitle>
                <CardDescription>
                  How you've allocated your study time this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectBreakdown.length > 0 ? subjectBreakdown.map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{subject.subject}</span>
                        <span className="text-muted-foreground">{subject.hours}h ({subject.percentage}%)</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${subject.color}`}
                          style={{ width: `${subject.percentage}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No study sessions yet</p>
                      <p className="text-sm">Complete some study sessions to see subject breakdown</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="habits" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="study-flow-shadow-soft">
                <CardHeader>
                  <CardTitle>Study Patterns</CardTitle>
                  <CardDescription>
                    When you study most effectively
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Morning (6-12 PM)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full w-3/4" />
                        </div>
                        <span className="text-xs text-muted-foreground">75%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Afternoon (12-6 PM)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-focus h-2 rounded-full w-1/2" />
                        </div>
                        <span className="text-xs text-muted-foreground">50%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Evening (6-12 AM)</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div className="bg-progress h-2 rounded-full w-2/3" />
                        </div>
                        <span className="text-xs text-muted-foreground">65%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="study-flow-shadow-soft">
                <CardHeader>
                  <CardTitle>Weekly Overview</CardTitle>
                  <CardDescription>
                    Your study consistency this week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                      <div key={day} className="text-center">
                        <div className="text-xs text-muted-foreground mb-2">{day}</div>
                        <div className={`h-8 rounded ${
                          index < 5 ? 'bg-primary' : index === 5 ? 'bg-focus' : 'bg-muted'
                        }`} />
                        <div className="text-xs mt-1">
                          {index < 5 ? '4h' : index === 5 ? '6h' : '0h'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recent Achievements
                </CardTitle>
                <CardDescription>
                  Celebrate your study milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {achievements.length > 0 ? achievements.map((achievement, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                      <div className="h-10 w-10 rounded-lg bg-achievement/10 flex items-center justify-center">
                        <achievement.icon className="h-5 w-5 text-achievement" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{achievement.title}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {achievement.date}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No achievements yet</p>
                      <p className="text-sm">Keep studying to unlock achievements!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;

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