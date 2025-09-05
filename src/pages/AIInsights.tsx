import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  Award,
  BarChart3,
  LineChart,
  PieChart,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { aiProxyClient } from '@/services/ai-proxy-client';
import { cn } from '@/lib/utils';

interface StudyInsight {
  subject: string;
  totalSessions: number;
  averageScore: number;
  timeSpent: number;
  improvement: number;
  recommendations: string[];
}

interface AIAnalysis {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  predictedScore: number;
  confidenceLevel: number;
}

export default function AIInsights() {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<StudyInsight[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');
  const { toast } = useToast();

  useEffect(() => {
    loadInsights();
  }, [timeRange]);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load study sessions and performance data
      const { data: sessions, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', getTimeRangeDate(timeRange))
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process sessions into insights
      const processedInsights = processSessionsToInsights(sessions || []);
      setInsights(processedInsights);

      // Get AI analysis for the first subject
      if (processedInsights.length > 0 && !selectedSubject) {
        setSelectedSubject(processedInsights[0].subject);
        await getAIAnalysis(processedInsights[0]);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to load study insights',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDate = (range: 'week' | 'month' | 'all'): string => {
    const date = new Date();
    switch (range) {
      case 'week':
        date.setDate(date.getDate() - 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() - 1);
        break;
      case 'all':
        date.setFullYear(date.getFullYear() - 10);
        break;
    }
    return date.toISOString();
  };

  const processSessionsToInsights = (sessions: any[]): StudyInsight[] => {
    const subjectMap = new Map<string, any>();

    sessions.forEach(session => {
      const subject = session.subject || 'General';
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, {
          subject,
          totalSessions: 0,
          scores: [],
          timeSpent: 0,
          improvements: []
        });
      }

      const data = subjectMap.get(subject);
      data.totalSessions++;
      data.timeSpent += session.duration || 0;
      if (session.score) data.scores.push(session.score);
    });

    return Array.from(subjectMap.values()).map(data => ({
      subject: data.subject,
      totalSessions: data.totalSessions,
      averageScore: data.scores.length > 0 
        ? data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length 
        : 0,
      timeSpent: data.timeSpent,
      improvement: calculateImprovement(data.scores),
      recommendations: generateRecommendations(data)
    }));
  };

  const calculateImprovement = (scores: number[]): number => {
    if (scores.length < 2) return 0;
    const recent = scores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
    const older = scores.slice(0, 5).reduce((a, b) => a + b, 0) / Math.min(5, scores.length);
    return ((recent - older) / older) * 100;
  };

  const generateRecommendations = (data: any): string[] => {
    const recommendations = [];
    
    if (data.totalSessions < 5) {
      recommendations.push('Increase study frequency for better retention');
    }
    if (data.averageScore < 70) {
      recommendations.push('Focus on fundamental concepts');
    }
    if (data.timeSpent < 3600) {
      recommendations.push('Dedicate more time to practice');
    }
    
    return recommendations;
  };

  const getAIAnalysis = async (insight: StudyInsight) => {
    try {
      setLoading(true);
      
      const prompt = `Analyze the following study performance data and provide insights:
        Subject: ${insight.subject}
        Total Sessions: ${insight.totalSessions}
        Average Score: ${insight.averageScore.toFixed(1)}%
        Time Spent: ${(insight.timeSpent / 3600).toFixed(1)} hours
        Improvement Rate: ${insight.improvement.toFixed(1)}%
        
        Please provide:
        1. Three key strengths
        2. Three areas for improvement
        3. Three specific actionable suggestions
        4. Predicted score if current trend continues
        5. Confidence level in the analysis (0-100%)`;

      const response = await aiProxyClient.sendRequest({
        provider: 'ai-tutor',
        prompt,
        temperature: 0.7,
        max_tokens: 1000
      });

      if (response.data) {
        const analysis = parseAIResponse(response.data.content);
        setAiAnalysis(analysis);
      }
    } catch (error) {
      console.error('Error getting AI analysis:', error);
      toast({
        title: 'AI Analysis Error',
        description: 'Failed to get AI insights. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const parseAIResponse = (content: string): AIAnalysis => {
    // Simple parsing logic - can be enhanced with better NLP
    const lines = content.split('\n').filter(line => line.trim());
    
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const suggestions: string[] = [];
    let predictedScore = 75;
    let confidenceLevel = 80;

    let currentSection = '';
    lines.forEach(line => {
      if (line.toLowerCase().includes('strength')) {
        currentSection = 'strengths';
      } else if (line.toLowerCase().includes('improvement') || line.toLowerCase().includes('weakness')) {
        currentSection = 'weaknesses';
      } else if (line.toLowerCase().includes('suggestion') || line.toLowerCase().includes('recommend')) {
        currentSection = 'suggestions';
      } else if (line.toLowerCase().includes('predicted') || line.toLowerCase().includes('score')) {
        const match = line.match(/\d+/);
        if (match) predictedScore = parseInt(match[0]);
      } else if (line.toLowerCase().includes('confidence')) {
        const match = line.match(/\d+/);
        if (match) confidenceLevel = parseInt(match[0]);
      } else if (line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().match(/^\d+\./)) {
        const item = line.replace(/^[-•\d.]\s*/, '').trim();
        if (currentSection === 'strengths' && strengths.length < 3) {
          strengths.push(item);
        } else if (currentSection === 'weaknesses' && weaknesses.length < 3) {
          weaknesses.push(item);
        } else if (currentSection === 'suggestions' && suggestions.length < 3) {
          suggestions.push(item);
        }
      }
    });

    // Fallback values if parsing doesn't find enough items
    if (strengths.length === 0) strengths.push('Consistent study pattern', 'Good engagement', 'Regular practice');
    if (weaknesses.length === 0) weaknesses.push('Room for improvement in scores', 'More practice needed', 'Focus on difficult topics');
    if (suggestions.length === 0) suggestions.push('Increase study frequency', 'Review mistakes regularly', 'Use spaced repetition');

    return {
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      suggestions: suggestions.slice(0, 3),
      predictedScore,
      confidenceLevel
    };
  };

  const refreshAnalysis = () => {
    if (selectedSubject) {
      const insight = insights.find(i => i.subject === selectedSubject);
      if (insight) {
        getAIAnalysis(insight);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              AI Insights
            </h1>
            <p className="text-muted-foreground mt-2">
              Personalized learning analytics powered by AI
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadInsights}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Time Range Selector */}
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="week">This Week</TabsTrigger>
            <TabsTrigger value="month">This Month</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Insights Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {insights.map((insight) => (
            <Card 
              key={insight.subject}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedSubject === insight.subject && "ring-2 ring-primary"
              )}
              onClick={() => {
                setSelectedSubject(insight.subject);
                getAIAnalysis(insight);
              }}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {insight.subject}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Sessions</span>
                    <span className="text-sm font-bold">{insight.totalSessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Avg Score</span>
                    <span className="text-sm font-bold">{insight.averageScore.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Time</span>
                    <span className="text-sm font-bold">{(insight.timeSpent / 3600).toFixed(1)}h</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Trend</span>
                    <span className={cn(
                      "text-sm font-bold",
                      insight.improvement > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {insight.improvement > 0 ? "+" : ""}{insight.improvement.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Analysis Section */}
        {aiAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Analysis for {selectedSubject}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshAnalysis}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </Button>
              </CardTitle>
              <CardDescription>
                Personalized insights based on your learning patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Strengths */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-green-600" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.weaknesses.map((weakness, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-orange-600 mt-1">•</span>
                        <span className="text-sm">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Suggestions */}
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Actionable Suggestions
                  </h3>
                  <ul className="space-y-2">
                    {aiAnalysis.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">{i + 1}.</span>
                        <span className="text-sm">{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Predictions */}
                <div className="md:col-span-2">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>Predicted Score:</strong> {aiAnalysis.predictedScore}% 
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Confidence: {aiAnalysis.confidenceLevel}%
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {insights.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Start studying to see your AI-powered insights and recommendations here.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}