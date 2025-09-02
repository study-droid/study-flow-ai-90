import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Lightbulb, 
  Clock, 
  Target, 
  TrendingUp,
  BookOpen,
  Star,
  Zap,
  RefreshCw,
  ChevronRight,
  Calendar,
  Users,
  Award,
  AlertCircle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { studySessionsApi, subjectsApi } from '@/lib/api';
import { aiApi as extendedAiApi, studyGoalsApi } from '@/lib/api-extended';
import { log } from '@/lib/config';
import { aiProxyClient } from '@/services/ai-proxy-client';

interface AIRecommendation {
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
  priority: 'high' | 'medium' | 'low';
}

interface SubjectFocus {
  subject: string;
  recommended_hours_per_week: number;
  focus_areas: string[];
  study_methods: string[];
}

interface LearningTechnique {
  technique: string;
  description: string;
  best_for: string[];
}

interface AIRecommendations {
  priority_recommendations: AIRecommendation[];
  schedule_optimization: {
    best_study_times: string[];
    suggested_session_length: string;
    break_recommendations: string;
  };
  subject_focus: SubjectFocus[];
  learning_techniques: LearningTechnique[];
  motivational_insights: {
    strengths: string[];
    growth_areas: string[];
    encouraging_message: string;
  };
}

export const AIStudyRecommendations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);

  const generateRecommendations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch real user data from APIs
      const [sessionsResponse, goalsResponse, subjectsResponse] = await Promise.all([
        studySessionsApi.getAnalytics(30),
        studyGoalsApi.getAll(),
        subjectsApi.getAll()
      ]);

      // Build student data from real API responses
      const studyData = sessionsResponse.success && sessionsResponse.data ? {
        totalHours: Math.round(sessionsResponse.data.totalMinutes / 60 * 10) / 10,
        sessionsCompleted: sessionsResponse.data.totalSessions,
        averageSessionLength: sessionsResponse.data.averageSessionLength,
        focusScore: 85, // Could be calculated from focus_score fields
        streakDays: 7 // This would come from profile data
      } : {
        totalHours: 0,
        sessionsCompleted: 0,
        averageSessionLength: 0,
        focusScore: 0,
        streakDays: 0
      };

      const subjects = subjectsResponse.success && subjectsResponse.data ? 
        subjectsResponse.data.map(subject => ({
          name: subject.name,
          hours: 0, // This would need to be calculated from sessions
          performance: 85 // This would be calculated from various metrics
        })) : [];

      const goals = goalsResponse.success && goalsResponse.data ?
        goalsResponse.data.map(goal => ({
          subject: goal.title,
          target_hours: goal.target_value,
          current_hours: goal.current_value
        })) : [];

      const studentData = {
        studyData,
        subjects,
        goals,
        timePreferences: {
          preferredStudyTimes: ['morning', 'evening'],
          sessionLength: 45,
          breakPreference: 'short'
        },
        currentPerformance: {
          overall_efficiency: 87,
          focus_quality: 85,
          consistency_score: 78
        }
      };

      // Generate recommendations using the secure AI proxy
      const recommendationPrompt = `Based on the following student data, generate personalized study recommendations.
        
        Student Data: ${JSON.stringify(studentData, null, 2)}
        
        Please provide a JSON response with study recommendations including priority_recommendations, schedule_optimization, subject_focus, learning_techniques, and motivational_insights.`;

      const response = await aiProxyClient.sendGeminiMessage([
        { role: 'user', content: recommendationPrompt }
      ]);

      if (response.error) {
        throw new Error(response.error);
      }

      // Parse the AI response
      try {
        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          
          // Validate and provide defaults for required fields
          const validatedRecommendations = {
            priority_recommendations: parsedData.priority_recommendations || [],
            schedule_optimization: parsedData.schedule_optimization || {
              best_study_times: ["9:00-11:00 AM"],
              suggested_session_length: "45-50 minutes",
              break_recommendations: "5-10 minute breaks"
            },
            subject_focus: parsedData.subject_focus || [],
            learning_techniques: parsedData.learning_techniques || [],
            motivational_insights: parsedData.motivational_insights || {
              strengths: ["Consistent effort", "Good time management"],
              growth_areas: ["Focus improvement", "Study techniques"],
              encouraging_message: "Keep up the great work! Small improvements lead to big results."
            }
          };
          
          setRecommendations(validatedRecommendations);
          toast({
            title: "AI Recommendations Generated",
            description: "Personalized study insights are ready!",
          });
        } else {
          throw new Error('Invalid response format');
        }
      } catch (parseError) {
        throw new Error('Failed to parse AI recommendations');
      }
    } catch (error) {
      log.error('Error generating recommendations:', error);
      
      // Show more specific error messages
      let errorMessage = error.message || "Failed to generate recommendations. Please try again.";
      
      // Check for specific error types
      if (error.message?.includes('not configured')) {
        errorMessage = "AI service API key not configured in Supabase. Please check the environment variables.";
      } else if (error.message?.includes('API key')) {
        errorMessage = "Invalid API key configuration. Please verify the GEMINI_API_KEY in Supabase settings.";
      } else if (error.message?.includes('temporarily unavailable')) {
        errorMessage = "AI service is temporarily unavailable. This usually means the GEMINI_API_KEY is not set in Supabase environment variables.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Fallback recommendations
      setRecommendations({
        priority_recommendations: [
          {
            title: "Optimize Your Study Sessions",
            description: "Schedule your most challenging subjects during your peak focus hours.",
            action_items: [
              "Identify your peak focus times",
              "Schedule difficult subjects accordingly",
              "Use lighter review for low-energy periods"
            ],
            expected_impact: "15-20% improvement in comprehension",
            priority: "high"
          },
          {
            title: "Balance Subject Distribution",
            description: "Ensure all subjects receive adequate attention based on your goals.",
            action_items: [
              "Review time allocation per subject",
              "Use active recall techniques",
              "Consider joining study groups"
            ],
            expected_impact: "Improved Physics performance by 10-15%",
            priority: "medium"
          }
        ],
        schedule_optimization: {
          best_study_times: ["8:00-10:00 AM", "6:00-8:00 PM"],
          suggested_session_length: "45-50 minutes",
          break_recommendations: "5-10 minute breaks with light movement"
        },
        subject_focus: [
          {
            subject: "Priority Subject",
            recommended_hours_per_week: 10,
            focus_areas: ["Core concepts", "Practice problems", "Application"],
            study_methods: ["Active recall", "Spaced repetition", "Practice tests"]
          },
          {
            subject: "Secondary Subject",
            recommended_hours_per_week: 8,
            focus_areas: ["Fundamentals", "Problem solving", "Review"],
            study_methods: ["Concept mapping", "Group study", "Self-testing"]
          }
        ],
        learning_techniques: [
          {
            technique: "Feynman Technique",
            description: "Explain concepts in simple terms to identify knowledge gaps",
            best_for: ["Conceptual subjects", "Technical topics", "Complex theories"]
          },
          {
            technique: "Pomodoro with Active Recall",
            description: "25-minute focused sessions followed by quiz-style review",
            best_for: ["Memorization-heavy subjects", "Detailed content", "Facts and figures"]
          }
        ],
        motivational_insights: {
          strengths: ["Consistent daily practice", "Strong focus sessions", "Good time management"],
          growth_areas: ["Subject balance", "Break optimization", "Review strategies"],
          encouraging_message: "You're building excellent study habits! Small adjustments to your routine will amplify your already strong foundation."
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user && !recommendations) {
      generateRecommendations();
    }
  }, [user, recommendations, generateRecommendations]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertCircle;
      case 'medium': return Clock;
      case 'low': return CheckCircle;
      default: return Target;
    }
  };

  if (!recommendations && !isLoading) {
    return (
      <Card className="study-flow-shadow-soft">
        <CardContent className="pt-12 pb-12">
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto text-primary/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">Generate AI Recommendations</h3>
            <p className="text-muted-foreground mb-6">
              Get personalized study insights powered by AI analysis of your learning patterns
            </p>
            <Button onClick={generateRecommendations} className="bg-gradient-to-r from-primary to-primary-glow">
              <Brain className="h-4 w-4 mr-2" />
              Generate Recommendations
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" role="main" aria-label="AI Study Recommendations">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            AI Study Recommendations
          </h1>
          <p className="text-muted-foreground mt-2">
            Personalized insights to optimize your learning journey
          </p>
        </div>
        
        <Button 
          onClick={generateRecommendations}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? 'Generating...' : 'Refresh Recommendations'}
        </Button>
      </div>

      {isLoading ? (
        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Analyzing Your Study Data</h3>
              <p className="text-muted-foreground">
                Our AI is processing your learning patterns to generate personalized recommendations...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : recommendations && (
        <div className="space-y-6">
          {/* Motivational Insights */}
          <Card className="study-flow-shadow-soft bg-gradient-to-r from-primary/5 to-primary-glow/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Star className="h-5 w-5" />
                Your Learning Journey
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-green-700 mb-2">Your Strengths</h4>
                  <div className="flex flex-wrap gap-2">
                    {(recommendations.motivational_insights?.strengths || []).map((strength, index) => (
                      <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-blue-700 mb-2">Growth Opportunities</h4>
                  <div className="flex flex-wrap gap-2">
                    {(recommendations.motivational_insights?.growth_areas || []).map((area, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground italic">
                    💡 {recommendations.motivational_insights?.encouraging_message || "Keep up the great work!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Recommendations */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                Priority Recommendations
              </CardTitle>
              <CardDescription>
                AI-generated suggestions based on your study patterns and goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(recommendations.priority_recommendations || []).map((rec, index) => {
                  const PriorityIcon = getPriorityIcon(rec.priority);
                  const isSelected = selectedRecommendation === index;
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "p-4 rounded-lg border-2 cursor-pointer transition-all duration-200",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                        "animate-fade-in"
                      )}
                      onClick={() => setSelectedRecommendation(isSelected ? null : index)}
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "h-10 w-10 rounded-lg flex items-center justify-center",
                            rec.priority === 'high' && "bg-red-100 text-red-600",
                            rec.priority === 'medium' && "bg-yellow-100 text-yellow-600",
                            rec.priority === 'low' && "bg-green-100 text-green-600"
                          )}>
                            <PriorityIcon className="h-5 w-5" />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{rec.title}</h3>
                            <Badge className={cn("text-xs", getPriorityColor(rec.priority))}>
                              {rec.priority} priority
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {rec.description}
                          </p>
                          
                          {isSelected && (
                            <div className="space-y-3 animate-slide-in-up">
                              <div>
                                <h4 className="text-sm font-medium mb-2">Action Items:</h4>
                                <ul className="space-y-1">
                                  {rec.action_items.map((item, itemIndex) => (
                                    <li key={itemIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <ChevronRight className="h-3 w-3 text-primary" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div className="pt-2 border-t">
                                <p className="text-sm">
                                  <span className="font-medium text-green-600">Expected Impact:</span> {rec.expected_impact}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <ChevronRight className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          isSelected && "rotate-90"
                        )} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Schedule Optimization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Schedule Optimization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Optimal Study Times</h4>
                  <div className="space-y-2">
                    {(recommendations.schedule_optimization?.best_study_times || []).map((time, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 mr-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h4 className="font-medium mb-2">Session Length</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendations.schedule_optimization?.suggested_session_length || '45-50 minutes'}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Break Strategy</h4>
                  <p className="text-sm text-muted-foreground">
                    {recommendations.schedule_optimization?.break_recommendations || '5-10 minute breaks'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="study-flow-shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  Learning Techniques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(recommendations.learning_techniques || []).map((technique, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/30">
                      <h4 className="font-medium mb-1">{technique.technique}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {technique.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {technique.best_for.map((subject, subIndex) => (
                          <Badge key={subIndex} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Subject Focus */}
          <Card className="study-flow-shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Subject Focus Plan
              </CardTitle>
              <CardDescription>
                Recommended time allocation and study methods for each subject
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(recommendations.subject_focus || []).map((subject, index) => (
                  <div key={index} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{subject.subject}</h3>
                      <Badge variant="outline">
                        {subject.recommended_hours_per_week}h/week
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-1">Focus Areas</h4>
                        <div className="flex flex-wrap gap-1">
                          {subject.focus_areas.map((area, areaIndex) => (
                            <Badge key={areaIndex} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">Study Methods</h4>
                        <ul className="space-y-1">
                          {subject.study_methods.map((method, methodIndex) => (
                            <li key={methodIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <ArrowRight className="h-3 w-3 text-primary" />
                              {method}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
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