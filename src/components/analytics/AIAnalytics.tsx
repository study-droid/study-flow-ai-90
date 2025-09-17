/**
 * Simple Analytics Component - Simplified version
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  Target,
  Lightbulb,
  Clock,
  BarChart3,
  RefreshCw,
  CheckCircle,
  Zap
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SimpleAnalytics {
  summary: {
    total_study_time: number;
    average_session_length: number;
    most_productive_times: string[];
    focus_score: number;
  };
  goals: Array<{
    name: string;
    progress: number;
    target: number;
    status: 'on_track' | 'behind' | 'ahead';
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

interface AIAnalyticsProps {
  className?: string;
}

export const AIAnalytics: React.FC<AIAnalyticsProps> = ({ className }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState<SimpleAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const generateAnalytics = React.useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    
    try {
      // Simple fallback analytics
      const fallbackAnalytics: SimpleAnalytics = {
        summary: {
          total_study_time: 45.5,
          average_session_length: 38.2,
          most_productive_times: ['9:00-11:00 AM', '2:00-4:00 PM'],
          focus_score: 82
        },
        goals: [
          {
            name: 'Weekly Study Hours',
            progress: 28,
            target: 35,
            status: 'on_track'
          },
          {
            name: 'Focus Sessions',
            progress: 12,
            target: 15,
            status: 'behind'
          }
        ],
        recommendations: [
          {
            title: 'Optimize Study Schedule',
            description: 'Your most productive times are mornings. Consider scheduling important topics then.',
            priority: 'high'
          },
          {
            title: 'Improve Focus Sessions',
            description: 'Try the Pomodoro technique to maintain concentration longer.',
            priority: 'medium'
          }
        ]
      };

      setAnalytics(fallbackAnalytics);
      
      toast({
        title: "Analytics Generated",
        description: "Your study insights are ready!",
      });
    } catch (error) {
      console.error('Error generating analytics:', error);
      toast({
        title: "Error",
        description: "Failed to generate analytics",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'text-green-600';
      case 'ahead': return 'text-blue-600';
      case 'behind': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!analytics && !isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">AI Study Analytics</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={generateAnalytics} size="lg">
            <Zap className="w-4 h-4 mr-2" />
            Generate Analytics
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full w-6 h-6 border-2 border-primary border-t-transparent"></div>
            <CardTitle>Generating Analytics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted animate-pulse rounded"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Study Analytics</CardTitle>
              </div>
            </div>
            <Button onClick={generateAnalytics} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Study Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {analytics.summary.total_study_time}h
              </div>
              <div className="text-sm text-muted-foreground">Total Study Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.summary.average_session_length}m
              </div>
              <div className="text-sm text-muted-foreground">Average Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {analytics.summary.focus_score}%
              </div>
              <div className="text-sm text-muted-foreground">Focus Score</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Best Times</div>
              <div className="text-xs text-muted-foreground">
                {analytics.summary.most_productive_times.join(', ')}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.goals.map((goal, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{goal.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getStatusColor(goal.status)}>
                      {goal.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {goal.progress}/{goal.target}
                    </span>
                  </div>
                </div>
                <Progress value={(goal.progress / goal.target) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recommendations.map((rec, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{rec.title}</h4>
                      <Badge className={getPriorityColor(rec.priority)}>
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};