import React, { useState, useEffect, useCallback } from 'react';
import { log } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsService } from '@/services/analytics/analytics-service';
import { exportService } from '@/services/export/export-service';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  TrendingUp, 
  Clock, 
  Brain, 
  Target, 
  Calendar,
  BookOpen,
  Zap,
  Award,
  Users,
  Activity,
  Download,
  Share,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudyMetrics {
  totalHours: number;
  sessionsCompleted: number;
  averageSessionLength: number;
  weeklyGoalProgress: number;
  focusScore: number;
  streakDays: number;
}

interface ChartData {
  name: string;
  value: number;
  sessions?: number;
  efficiency?: number;
  focus?: number;
}

interface PerformanceRadarData {
  subject: string;
  current: number;
  target: number;
}

const AdvancedAnalyticsComponent: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<StudyMetrics>({
    totalHours: 0,
    sessionsCompleted: 0,
    averageSessionLength: 0,
    weeklyGoalProgress: 0,
    focusScore: 0,
    streakDays: 0
  });
  const [productivityScore, setProductivityScore] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);

  const [studyHoursData, setStudyHoursData] = useState<ChartData[]>([]);
  const [subjectData, setSubjectData] = useState<ChartData[]>([]);
  const [focusPatternData, setFocusPatternData] = useState<ChartData[]>([]);
  const [performanceRadarData, setPerformanceRadarData] = useState<PerformanceRadarData[]>([]);

  const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await analyticsService.fetchAnalytics(user.id, timeRange);
      
      // Update all state with real data
      setMetrics(data.studyMetrics);
      setStudyHoursData(data.studyHoursData);
      setSubjectData(data.subjectData);
      setFocusPatternData(data.focusPatternData);
      setPerformanceRadarData(data.performanceData);
      setProductivityScore(data.productivityScore);
      setCompletionRate(data.completionRate);
      
      toast({
        title: "Analytics Updated",
        description: "Your analytics data has been refreshed",
      });
    } catch (error) {
      log.error('Failed to fetch analytics:', error);
      toast({
        title: "Failed to Load Analytics",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, timeRange, toast]);
  
  // Load data on mount and when time range changes
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);
  
  const handleRefresh = async () => {
    await fetchAnalyticsData();
  };

  const exportData = () => {
    const analyticsData = {
      studyMetrics: metrics,
      studyHoursData,
      subjectData,
      focusPatternData,
      performanceData: performanceRadarData,
      completionRate,
      productivityScore
    };
    
    // Show export options dialog or default to PDF
    exportService.exportAnalytics(analyticsData, {
      format: 'pdf',
      title: 'Study Flow Analytics Report',
      description: `Analytics for ${timeRange} period`,
      includeTimestamp: true
    });
    
    toast({
      title: "Report Exported",
      description: "Your analytics report has been downloaded",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in" role="main" aria-label="Study Analytics Dashboard">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Advanced Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Deep insights into your study patterns and performance
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex rounded-lg border p-1 bg-muted/30">
            {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="capitalize"
                aria-pressed={timeRange === range}
              >
                {range}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isLoading}
              aria-label="Refresh analytics data"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportData}
              aria-label="Export analytics data"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Hours', value: metrics.totalHours.toFixed(1), icon: Clock, color: 'text-blue-600', suffix: 'h' },
          { label: 'Sessions', value: metrics.sessionsCompleted.toString(), icon: Target, color: 'text-green-600' },
          { label: 'Avg Length', value: metrics.averageSessionLength.toString(), icon: Activity, color: 'text-purple-600', suffix: 'min' },
          { label: 'Weekly Goal', value: `${metrics.weeklyGoalProgress}%`, icon: TrendingUp, color: 'text-orange-600' },
          { label: 'Focus Score', value: `${metrics.focusScore}%`, icon: Brain, color: 'text-pink-600' },
          { label: 'Streak', value: metrics.streakDays.toString(), icon: Award, color: 'text-yellow-600', suffix: 'days' }
        ].map((metric, index) => (
          <Card key={index} className="study-flow-shadow-soft hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("h-10 w-10 rounded-lg bg-muted flex items-center justify-center", metric.color)}>
                  <metric.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-xl font-bold">
                    {metric.value}
                    {metric.suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{metric.suffix}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Study Hours Trend */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-blue-600" />
                  Daily Study Hours
                </CardTitle>
                <CardDescription>
                  Study time and session efficiency over the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={studyHoursData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        dataKey="name" 
                        className="text-xs"
                        aria-label="Days of the week"
                      />
                      <YAxis 
                        className="text-xs"
                        aria-label="Hours studied"
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-card border rounded-lg p-3 shadow-lg">
                                <p className="font-medium">{label}</p>
                                <p className="text-blue-600">
                                  Hours: {payload[0].value}h
                                </p>
                                <p className="text-green-600">
                                  Sessions: {payload[0].payload.sessions}
                                </p>
                                <p className="text-purple-600">
                                  Efficiency: {payload[0].payload.efficiency}%
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        fill="url(#blueGradient)"
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Weekly Progress
                </CardTitle>
                <CardDescription>
                  Goal completion and consistency metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Weekly Goal (40 hours)</span>
                      <span className="font-medium">{metrics.totalHours}h / 40h</span>
                    </div>
                    <Progress value={(metrics.totalHours / 40) * 100} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Session Consistency</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Focus Quality</span>
                      <span className="font-medium">{metrics.focusScore}%</span>
                    </div>
                    <Progress value={metrics.focusScore} className="h-3" />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">92%</div>
                    <div className="text-xs text-muted-foreground">Efficiency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">18</div>
                    <div className="text-xs text-muted-foreground">Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">7</div>
                    <div className="text-xs text-muted-foreground">Streak</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Distribution */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Subject Time Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {subjectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Subject Details */}
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle>Subject Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectData.map((subject, index) => (
                    <div key={subject.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{subject.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{subject.value}h</div>
                          <div className="text-xs text-muted-foreground">{subject.sessions} sessions</div>
                        </div>
                      </div>
                      <Progress 
                        value={(subject.value / Math.max(...subjectData.map(s => s.value))) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-6">
          {/* Focus Patterns */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-pink-600" />
                Daily Focus Patterns
              </CardTitle>
              <CardDescription>
                Your focus quality and study hours throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={focusPatternData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis yAxisId="left" className="text-xs" />
                    <YAxis yAxisId="right" orientation="right" className="text-xs" />
                    <Tooltip />
                    <Bar yAxisId="left" dataKey="value" fill="#8B5CF6" name="Study Hours" />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="focus" 
                      stroke="#EC4899" 
                      strokeWidth={3}
                      name="Focus Quality (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Radar */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Performance Radar
              </CardTitle>
              <CardDescription>
                Current performance vs. targets across key areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={performanceRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" className="text-xs" />
                    <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
                    <Radar
                      name="Current"
                      dataKey="current"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name="Target"
                      dataKey="target"
                      stroke="#10B981"
                      fill="transparent"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const AdvancedAnalytics = React.memo(AdvancedAnalyticsComponent);