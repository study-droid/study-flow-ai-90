import React, { useState, useEffect } from 'react';
import { log } from '@/lib/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Target,
  Lightbulb,
  Clock,
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { realAnalyticsService } from '@/services/real-analytics';

interface StudyAnalytics {
  summary: {
    total_study_time: number;
    average_session_length: number;
    most_productive_times: string[];
    completion_rate: number;
    streak_days: number;
  };
  patterns: Array<{
    insight: string;
    description: string;
    trend: 'positive' | 'neutral' | 'negative';
    value?: number;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: string;
  }>;
  goal_progress: Array<{
    goal_title: string;
    progress_percentage: number;
    status: 'on_track' | 'behind' | 'ahead';
    suggestion: string;
  }>;
  next_actions: Array<{
    action: string;
    expected_impact: string;
    effort_level: 'low' | 'medium' | 'high';
  }>;
}

export const AIAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateAnalytics = React.useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Generate analytics from real user data
      const analyticsData = await realAnalyticsService.generateAnalytics(30);
      
      setAnalytics(analyticsData);
      toast({
        title: "Analytics Generated",
        description: "Your study insights are ready!",
      });

    } catch (error) {
      log.error('Error generating analytics:', error);
      
      toast({
        title: "Analytics Error",
        description: "Could not generate analytics from your data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !analytics) {
      generateAnalytics();
    }
  }, [user, analytics, generateAnalytics]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive': return TrendingUp;
      case 'negative': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ahead': return CheckCircle;
      case 'behind': return AlertCircle;
      default: return Target;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-green-600';
      case 'behind': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  if (!analytics && !isLoading) {
    return (
      <Card className="study-flow-shadow-soft">
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-primary/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Generate Study Analytics</h3>
            <p className="text-muted-foreground mb-6">
              Get personalized study insights based on your actual learning data
            </p>
            <Button onClick={generateAnalytics} className="bg-gradient-to-r from-primary to-primary-glow">
              <Brain className="h-4 w-4 mr-2" />
              Generate Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" />
            Study Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights from your actual study data
          </p>
        </div>
        
        <Button 
          onClick={generateAnalytics}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? 'Analyzing...' : 'Refresh Analytics'}
        </Button>
      </div>

      {isLoading ? (
        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Analyzing Your Study Data</h3>
              <p className="text-muted-foreground">
                Processing your learning patterns to generate real-time insights...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : analytics && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="study-flow-shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Study Time</p>
                    <p className="text-2xl font-bold">
                      {Math.floor(analytics.summary.total_study_time / 60)}h {analytics.summary.total_study_time % 60}m
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="study-flow-shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                    <p className="text-2xl font-bold">{analytics.summary.average_session_length}m</p>
                  </div>
                  <Brain className="h-8 w-8 text-focus" />
                </div>
              </CardContent>
            </Card>

            <Card className="study-flow-shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">{analytics.summary.completion_rate}%</p>
                  </div>
                  <Target className="h-8 w-8 text-progress" />
                </div>
              </CardContent>
            </Card>

            <Card className="study-flow-shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Peak Hours</p>
                    <p className="text-xs font-medium">{analytics.summary.most_productive_times[0]}</p>
                  </div>
                  <Zap className="h-8 w-8 text-achievement" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Study Patterns */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Study Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.patterns.map((pattern, index) => {
                  const TrendIcon = getTrendIcon(pattern.trend);
                  return (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                      <TrendIcon className={cn("h-5 w-5 mt-1", getTrendColor(pattern.trend))} />
                      <div className="flex-1">
                        <h4 className="font-medium">{pattern.insight}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{pattern.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Goal Progress */}
          {analytics.goal_progress.length > 0 && (
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Goal Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.goal_progress.map((goal, index) => {
                    const StatusIcon = getStatusIcon(goal.status);
                    return (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={cn("h-4 w-4", getStatusColor(goal.status))} />
                            <h4 className="font-medium">{goal.goal_title}</h4>
                          </div>
                          <span className="text-sm text-muted-foreground">{goal.progress_percentage}%</span>
                        </div>
                        <Progress value={goal.progress_percentage} className="h-2" />
                        <p className="text-sm text-muted-foreground">{goal.suggestion}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Data-Driven Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recommendations.map((rec, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge className={cn("text-xs", getPriorityColor(rec.priority))}>
                        {rec.priority} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {rec.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Actions */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.next_actions.map((action, index) => (
                  <div key={index} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{action.action}</h4>
                      <Badge variant="outline" className="text-xs">
                        {action.effort_level} effort
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{action.expected_impact}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
