import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAITutor } from "@/hooks/useAITutor";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Clock, Target, Award, Book, Calendar, Brain, Download, RefreshCw } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

interface AnalyticsData {
  weeklyData: Array<{ day: string; hours: number; goal: number }>;
  subjectData: Array<{ name: string; hours: number; color: string }>;
  progressData: Array<{ week: string; progress: number }>;
  totalStudyHours: number;
  averageDaily: number;
  goalAchievement: number;
  studyStreak: number;
}

const Analytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendMessage } = useAITutor();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    weeklyData: [],
    subjectData: [],
    progressData: [],
    totalStudyHours: 0,
    averageDaily: 0,
    goalAchievement: 0,
    studyStreak: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalyticsData();
    }
  }, [user]);

  const loadAnalyticsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get current week
      const now = new Date();
      const weekStart = startOfWeek(now);
      const weekEnd = endOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // Fetch study sessions data
      const { data: sessions } = await supabase
        .from('study_sessions')
        .select('*, subjects(name)')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', format(weekStart, 'yyyy-MM-dd'))
        .lte('created_at', format(weekEnd, 'yyyy-MM-dd'));

      // Fetch study streak
      const { data: streakData } = await supabase
        .from('study_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fetch analytics data
      const { data: analytics } = await supabase
        .from('study_analytics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', format(monthStart, 'yyyy-MM-dd'))
        .lte('date', format(monthEnd, 'yyyy-MM-dd'));

      // Process weekly data
      const weeklyData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
        const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
        const dayData = analytics?.find(a => new Date(a.date).getDay() === (dayIndex + 1) % 7);
        return {
          day,
          hours: dayData ? (dayData.total_study_time || 0) / 60 : 0,
          goal: 3, // Default goal
        };
      });

      // Process subject data
      const subjectMap = new Map();
      sessions?.forEach(session => {
        const subjectName = session.subjects?.name || 'Other';
        const hours = (session.duration || 0) / 60;
        subjectMap.set(subjectName, (subjectMap.get(subjectName) || 0) + hours);
      });

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
      const subjectData = Array.from(subjectMap.entries()).map(([name, hours], index) => ({
        name,
        hours: Math.round(hours * 10) / 10,
        color: colors[index % colors.length],
      }));

      // Calculate metrics
      const totalStudyHours = weeklyData.reduce((sum, day) => sum + day.hours, 0);
      const averageDaily = totalStudyHours / 7;
      const goalAchievement = (weeklyData.filter(day => day.hours >= day.goal).length / 7) * 100;

      // Generate progress data (mock for now)
      const progressData = [
        { week: "Week 1", progress: 85 },
        { week: "Week 2", progress: 92 },
        { week: "Week 3", progress: 78 },
        { week: "Week 4", progress: 95 },
      ];

      setAnalyticsData({
        weeklyData,
        subjectData,
        progressData,
        totalStudyHours: Math.round(totalStudyHours * 10) / 10,
        averageDaily: Math.round(averageDaily * 10) / 10,
        goalAchievement: Math.round(goalAchievement),
        studyStreak: streakData?.current_streak || 0,
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const requestAIInsights = async () => {
    const { weeklyData, subjectData, totalStudyHours, studyStreak } = analyticsData;
    
    const context = `
      Weekly study data: ${weeklyData.map(d => `${d.day}: ${d.hours}h`).join(', ')}
      Subject distribution: ${subjectData.map(s => `${s.name}: ${s.hours}h`).join(', ')}
      Total weekly hours: ${totalStudyHours}h
      Current streak: ${studyStreak} days
    `;

    await sendMessage(
      `Please analyze my study analytics and provide personalized insights: ${context}. What patterns do you see? How can I improve my study efficiency and achieve better learning outcomes?`,
      { subject: 'Study Analytics', difficulty: 'intermediate' }
    );

    toast({
      title: "AI Insights Requested",
      description: "Teddy is analyzing your data! Check the AI Tutor tab for personalized insights. 🧸",
    });
  };

  const exportData = async () => {
    const dataToExport = {
      analytics: analyticsData,
      exportDate: new Date().toISOString(),
      userId: user?.id,
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `study-teddy-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Analytics data exported successfully! 📊",
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Study Analytics 📊</h1>
            <p className="text-muted-foreground">See how well you're doing with Teddy's insights!</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={requestAIInsights} className="gap-2">
              <Brain className="h-4 w-4" />
              Get AI Insights
            </Button>
            <Button variant="outline" onClick={loadAnalyticsData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportData} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.totalStudyHours}h</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Average</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.averageDaily}h</div>
              <p className="text-xs text-muted-foreground">Per day</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Goal Achievement</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.goalAchievement}%</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.studyStreak} days</div>
              <p className="text-xs text-muted-foreground">Keep it up! 🧸</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Progress */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Study Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="goal" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Subject Distribution */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Subject Time Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.subjectData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData.subjectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey="hours"
                      >
                        {analyticsData.subjectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {analyticsData.subjectData.map((subject) => (
                      <Badge key={subject.name} variant="secondary" className="gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.name}: {subject.hours}h
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Book className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No study data yet</p>
                  <p className="text-sm">Start studying to see your progress!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Progress Over Time */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Progress Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.progressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analyticsData.studyStreak >= 5 && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                  <div className="text-2xl">🏆</div>
                  <div>
                    <p className="font-medium">Study Streak Champion</p>
                    <p className="text-sm text-muted-foreground">{analyticsData.studyStreak} days in a row</p>
                  </div>
                </div>
              )}
              
              {analyticsData.totalStudyHours >= 10 && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="text-2xl">📚</div>
                  <div>
                    <p className="font-medium">Study Master</p>
                    <p className="text-sm text-muted-foreground">{analyticsData.totalStudyHours}h this week</p>
                  </div>
                </div>
              )}
              
              {analyticsData.goalAchievement >= 80 && (
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="text-2xl">⭐</div>
                  <div>
                    <p className="font-medium">Goal Crusher</p>
                    <p className="text-sm text-muted-foreground">{analyticsData.goalAchievement}% weekly goal achieved</p>
                  </div>
                </div>
              )}
              
              {analyticsData.studyStreak < 5 && analyticsData.totalStudyHours < 10 && analyticsData.goalAchievement < 80 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Keep studying to unlock achievements!</p>
                  <p className="text-sm">Teddy believes in you! 🧸</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;