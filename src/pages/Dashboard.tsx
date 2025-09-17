import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  BookOpen, 
  Target,
  Play,
  Brain,
  Timer,
  Settings,
  LogOut,
  Award
} from "lucide-react";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [studyTime] = useState(2.5); // hours studied today
  const [dailyGoal] = useState(4); // daily goal in hours

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Welcome to Study Teddy 🧸</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Please sign in to access your dashboard</p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = (studyTime / dailyGoal) * 100;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">Welcome back! 🧸</h1>
            <p className="text-muted-foreground">
              Ready to learn something amazing today with Teddy?
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/study')} className="gap-2">
              <Play className="h-4 w-4" />
              Start Study
            </Button>
            <Button onClick={signOut} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/calendar')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calendar</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                View your study schedule
              </p>
              <Button className="w-full mt-2" variant="outline" size="sm" onClick={() => navigate('/calendar')}>
                Open Calendar
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/study')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Session</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Start a focused study session
              </p>
              <Button className="w-full mt-2" size="sm" onClick={() => navigate('/study')}>
                Start Study
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/tutor')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Tutor</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Get help from your AI tutor
              </p>
              <Button className="w-full mt-2" variant="outline" size="sm" onClick={() => navigate('/tutor')}>
                Chat with Teddy
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/pomodoro')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pomodoro</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Use the Pomodoro technique
              </p>
              <Button className="w-full mt-2" variant="outline" size="sm" onClick={() => navigate('/pomodoro')}>
                Start Timer
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Hours Today</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studyTime}h</div>
              <Progress value={progressPercentage} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                {dailyGoal - studyTime}h remaining to reach daily goal
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Weekly Goal</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">18/20h</div>
              <Progress value={90} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Almost there! Keep going! 🧸
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7 days</div>
              <p className="text-xs text-muted-foreground">
                Amazing streak! Teddy is proud! 🏆
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Sessions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12</div>
              <p className="text-xs text-muted-foreground">
                Questions answered this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Today's Goals */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Today's Study Goals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complete Math Chapter 5</span>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">75% complete - Almost done!</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Physics Lab Report</span>
                  <Badge variant="outline">Pending</Badge>
                </div>
                <Progress value={25} className="h-2" />
                <p className="text-xs text-muted-foreground">25% complete - Great start!</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">History Essay Draft</span>
                  <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
                </div>
                <Progress value={100} className="h-2" />
                <p className="text-xs text-muted-foreground">🎉 Completed yesterday! Well done!</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  View your progress and insights
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate('/analytics')}>
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Customize your experience
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
                  Open Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recent Activity with Teddy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">🧸 Math Session</p>
                <p className="text-xs text-muted-foreground">Completed algebra practice</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">🎯 Goal Achieved</p>
                <p className="text-xs text-muted-foreground">History essay finished</p>
                <p className="text-xs text-muted-foreground">Yesterday</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">💡 AI Help</p>
                <p className="text-xs text-muted-foreground">Physics concepts explained</p>
                <p className="text-xs text-muted-foreground">3 hours ago</p>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="font-medium text-sm">🍅 Pomodoro</p>
                <p className="text-xs text-muted-foreground">45-minute focus session</p>
                <p className="text-xs text-muted-foreground">This morning</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;