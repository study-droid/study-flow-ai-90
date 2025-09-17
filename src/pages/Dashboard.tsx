
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Brain,
  Award,
  PlayCircle
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your study progress overview.
          </p>
        </div>
        <Button>
          <PlayCircle className="mr-2 h-4 w-4" />
          Start Study Session
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5</div>
            <p className="text-xs text-muted-foreground">
              +0.5 from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals Completed</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3/5</div>
            <p className="text-xs text-muted-foreground">
              60% completion rate
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
              +3 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7 days</div>
            <p className="text-xs text-muted-foreground">
              Keep it up!
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Goals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Current Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Complete Math Chapter 5</span>
                <Badge variant="secondary">In Progress</Badge>
              </div>
              <Progress value={75} className="h-2" />
              <p className="text-xs text-muted-foreground">75% complete</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Physics Lab Report</span>
                <Badge variant="outline">Pending</Badge>
              </div>
              <Progress value={25} className="h-2" />
              <p className="text-xs text-muted-foreground">25% complete</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">History Essay Draft</span>
                <Badge variant="default">Completed</Badge>
              </div>
              <Progress value={100} className="h-2" />
              <p className="text-xs text-muted-foreground">Completed yesterday</p>
            </div>
          </CardContent>
        </Card>

        {/* Study Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className="w-2 h-8 bg-blue-500 rounded"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Mathematics</p>
                <p className="text-xs text-muted-foreground">9:00 - 10:30 AM</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className="w-2 h-8 bg-green-500 rounded"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Physics Lab</p>
                <p className="text-xs text-muted-foreground">2:00 - 4:00 PM</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <div className="w-2 h-8 bg-purple-500 rounded"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">AI Tutor Session</p>
                <p className="text-xs text-muted-foreground">7:00 - 8:00 PM</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <BookOpen className="mr-2 h-4 w-4" />
              Create Study Session
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Brain className="mr-2 h-4 w-4" />
              Ask AI Tutor
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Target className="mr-2 h-4 w-4" />
              Set New Goal
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Study Time
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">Completed Mathematics Quiz</p>
              <p className="text-xs text-muted-foreground">2 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">AI Tutor helped with Physics</p>
              <p className="text-xs text-muted-foreground">4 hours ago</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Study session: 45 minutes</p>
              <p className="text-xs text-muted-foreground">Yesterday</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Goal achieved: History Essay</p>
              <p className="text-xs text-muted-foreground">2 days ago</p>
            </div>
          </CardContent>
        </Card>

        {/* Study Analytics */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Study Hours</span>
                <span className="font-medium">18.5h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Goals Completed</span>
                <span className="font-medium">12/15</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>AI Sessions</span>
                <span className="font-medium">8</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Efficiency Score</span>
                <Badge variant="secondary">92%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;