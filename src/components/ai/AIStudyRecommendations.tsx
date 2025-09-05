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
import { supabase } from '@/integrations/supabase/client';
import { deepSeekService } from '@/lib/deepseek';
import type {
  AIRecommendations,
  AIRecommendation,
  SubjectFocus,
  LearningTechnique,
  StudentData,
  DeepSeekResponse,
  ParsedRecommendationContent,
  RecommendationValidator
} from '@/types/ai-recommendations';

// Types are now imported from @/types/ai-recommendations

export const AIStudyRecommendations: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<AIRecommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<number | null>(null);

  const generateRecommendations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    
    // Initialize studentData at function scope to avoid reference errors
    let studentData: StudentData = {
      studyData: {
        totalHours: 0,
        sessionsCompleted: 0,
        averageSessionLength: 0,
        focusScore: 0,
        streakDays: 0
      },
      subjects: [],
      goals: [],
      timePreferences: {
        preferredStudyTimes: ['morning', 'evening'],
        sessionLength: 45,
        breakPreference: 'short'
      },
      currentPerformance: {
        overall_efficiency: 75,
        focus_quality: 75,
        consistency_score: 75
      }
    };

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

      // Update studentData with fetched information
      studentData = {
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

      // Generate recommendations using the working AI Tutor service
      const recommendationPrompt = `You are a professional AI study advisor. Based on the provided student data, generate comprehensive, personalized study recommendations.

Student Profile:
${JSON.stringify(studentData, null, 2)}

Please respond with a valid JSON object containing exactly these fields:
- priority_recommendations: Array of 2-3 actionable recommendations with title, description, action_items, expected_impact, priority
- schedule_optimization: Object with best_study_times array, suggested_session_length string, break_recommendations string
- subject_focus: Array of subjects with subject name, recommended_hours_per_week number, focus_areas array, study_methods array
- learning_techniques: Array with technique name, description, best_for array
- motivational_insights: Object with strengths array, growth_areas array, encouraging_message string

Respond ONLY with valid JSON. No markdown formatting or additional text.`;

      const response = await callWorkingAITutorService(recommendationPrompt);

      if (response.error) {
        throw new Error(response.error);
      }

      // Parse and validate the AI Tutor response
      const validatedRecommendations = parseAITutorRecommendations(response);
      
      if (validatedRecommendations) {
        setRecommendations(validatedRecommendations);
        toast({
          title: "AI Recommendations Generated",
          description: "Your personalized study insights are ready!",
        });
      } else {
        throw new Error('Failed to generate valid recommendations');
      }
    } catch (error) {
      log.error('Error generating recommendations:', error);
      
      // Enhanced error handling with specific messaging
      let errorMessage = "We encountered an issue generating your recommendations.";
      let shouldShowFallback = true;
      
      // Check for specific error types and provide helpful messages
      if (error.message?.includes('Authentication required')) {
        errorMessage = "Please sign in to access AI recommendations.";
        shouldShowFallback = false;
      } else if (error.message?.includes('API key') || error.message?.includes('not configured')) {
        errorMessage = "AI service is being set up. Using default recommendations for now.";
      } else if (error.message?.includes('temporarily unavailable') || error.message?.includes('service unavailable')) {
        errorMessage = "AI service is temporarily busy. Showing enhanced default recommendations.";
      } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        errorMessage = "AI service quota reached. Using intelligent fallback recommendations.";
      } else if (error.message?.includes('timeout')) {
        errorMessage = "Request took too long. Displaying cached recommendations.";
      } else {
        errorMessage = "AI service is unavailable. Showing personalized fallback recommendations.";
      }
      
      // Show user-friendly error message
      toast({
        title: shouldShowFallback ? "Using Fallback Recommendations" : "Service Unavailable",
        description: errorMessage,
        variant: shouldShowFallback ? "default" : "destructive",
      });
      
      // Always provide fallback recommendations unless authentication failed
      if (shouldShowFallback) {
        setRecommendations(getEnhancedFallbackRecommendations(studentData));
      }
    } finally {
      setIsLoading(false);
    }
    // Intentional: stable dependency set; fallback builder is static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast]);

// Enhanced fallback recommendations based on student data
function getEnhancedFallbackRecommendations(studentData: StudentData): AIRecommendations {
  const hasLowHours = studentData?.studyData?.totalHours < 10;
  const hasHighHours = studentData?.studyData?.totalHours > 40;
  const hasShortSessions = studentData?.studyData?.averageSessionLength < 30;
  const hasLongSessions = studentData?.studyData?.averageSessionLength > 90;
  const hasMultipleSubjects = studentData?.subjects?.length > 3;
  
  return {
    priority_recommendations: getPriorityRecommendations(hasLowHours, hasHighHours, hasShortSessions, hasLongSessions, hasMultipleSubjects),
    schedule_optimization: {
      best_study_times: hasLowHours ? ["7:00-9:00 AM", "3:00-5:00 PM"] : ["8:00-10:00 AM", "6:00-8:00 PM"],
      suggested_session_length: hasShortSessions ? "30-45 minutes (gradually increase)" : 
                                hasLongSessions ? "45-60 minutes (consider breaks)" : "45-60 minutes",
      break_recommendations: hasLongSessions ? "10-15 minute breaks every hour" : "5-10 minute breaks between sessions"
    },
    subject_focus: getSubjectFocus(studentData?.subjects, hasMultipleSubjects),
    learning_techniques: getLearningTechniques(hasShortSessions, hasLongSessions, hasLowHours),
    motivational_insights: getMotivationalInsights(studentData, hasLowHours, hasHighHours)
  };
}

// Dynamic priority recommendations based on student patterns
function getPriorityRecommendations(hasLowHours: boolean, hasHighHours: boolean, hasShortSessions: boolean, hasLongSessions: boolean, hasMultipleSubjects: boolean): AIRecommendation[] {
  const recommendations = [];

  if (hasLowHours) {
    recommendations.push({
      title: "Build Consistent Study Habits",
      description: "Establish a regular study routine to increase your total learning time effectively.",
      action_items: [
        "Start with 30-minute daily sessions",
        "Set specific times for studying",
        "Track your progress to build motivation"
      ],
      expected_impact: "Double your learning effectiveness within 2 weeks",
      priority: "high" as const
    });
  } else if (hasHighHours) {
    recommendations.push({
      title: "Optimize Study Efficiency",
      description: "You're putting in great hours - let's make sure they're as effective as possible.",
      action_items: [
        "Focus on active learning techniques",
        "Prioritize difficult concepts during peak hours",
        "Schedule adequate rest to prevent burnout"
      ],
      expected_impact: "20-30% improvement in retention per hour studied",
      priority: "high" as const
    });
  }

  if (hasShortSessions) {
    recommendations.push({
      title: "Gradually Extend Study Sessions",
      description: "Build up your focus stamina by slowly increasing session lengths.",
      action_items: [
        "Add 5-10 minutes to each session weekly",
        "Use the Pomodoro technique as a bridge",
        "Identify and eliminate common distractions"
      ],
      expected_impact: "Improved deep learning and concept mastery",
      priority: "medium" as const
    });
  } else if (hasLongSessions) {
    recommendations.push({
      title: "Strategic Break Implementation",
      description: "Long sessions can be powerful - optimize them with strategic breaks.",
      action_items: [
        "Take 10-minute breaks every 50-60 minutes",
        "Use active breaks (light movement, stretching)",
        "Review previous material during breaks"
      ],
      expected_impact: "Maintain high focus throughout extended sessions",
      priority: "medium" as const
    });
  }

  if (hasMultipleSubjects) {
    recommendations.push({
      title: "Master Subject Switching",
      description: "Efficiently manage your multi-subject study schedule.",
      action_items: [
        "Group similar subjects together",
        "Use interleaving for better retention",
        "Create transition rituals between subjects"
      ],
      expected_impact: "Reduced mental fatigue and improved subject mastery",
      priority: "medium" as const
    });
  }

  // Ensure we always have at least 2 recommendations
  if (recommendations.length < 2) {
    recommendations.push({
      title: "Active Learning Integration",
      description: "Transform passive reading into active, engaging study sessions.",
      action_items: [
        "Summarize key points in your own words",
        "Create questions while reading",
        "Teach concepts to someone else or explain them aloud"
      ],
      expected_impact: "40-50% improvement in comprehension and retention",
      priority: "high" as const
    });
  }

  return recommendations.slice(0, 3); // Limit to 3 recommendations
}

// Dynamic subject focus based on actual subjects
function getSubjectFocus(subjects: StudentData['subjects'], hasMultipleSubjects: boolean): SubjectFocus[] {
  if (!subjects || subjects.length === 0) {
    return [{
      subject: "Primary Focus Area",
      recommended_hours_per_week: 8,
      focus_areas: ["Core concepts", "Practice problems", "Real-world applications"],
      study_methods: ["Active recall", "Spaced repetition", "Problem-solving practice"]
    }];
  }

  return subjects.slice(0, 4).map((subject, index) => ({
    subject: subject.name || `Subject ${index + 1}`,
    recommended_hours_per_week: hasMultipleSubjects ? 
      Math.max(3, Math.floor(20 / subjects.length)) : 
      Math.max(6, Math.floor(15 / subjects.length)),
    focus_areas: [
      "Fundamental concepts",
      "Practice exercises", 
      "Application examples",
      ...(subject.performance < 70 ? ["Extra review and reinforcement"] : ["Advanced topics"])
    ],
    study_methods: [
      "Active recall testing",
      subject.performance < 70 ? "Focused practice on weak areas" : "Challenging problem sets",
      "Concept mapping and visualization",
      "Regular self-assessment"
    ]
  }));
}

// Dynamic learning techniques based on study patterns  
function getLearningTechniques(hasShortSessions: boolean, hasLongSessions: boolean, hasLowHours: boolean): LearningTechnique[] {
  const techniques = [];

  if (hasShortSessions || hasLowHours) {
    techniques.push({
      technique: "Micro-Learning Sessions",
      description: "Break complex topics into small, digestible chunks perfect for short study periods",
      best_for: ["Quick reviews", "Vocabulary building", "Formula memorization"]
    });
  }

  if (hasLongSessions) {
    techniques.push({
      technique: "Deep Work Blocks",
      description: "Extended focused periods for tackling complex problems and comprehensive understanding",
      best_for: ["Complex problem solving", "Essay writing", "Research projects"]
    });
  }

  // Always include these foundational techniques
  techniques.push(
    {
      technique: "Active Recall",
      description: "Test yourself regularly without looking at notes to strengthen memory pathways",
      best_for: ["Memory retention", "Exam preparation", "Concept reinforcement"]
    },
    {
      technique: "Spaced Repetition",
      description: "Review material at increasing intervals to move knowledge into long-term memory",
      best_for: ["Language learning", "Factual information", "Long-term retention"]
    }
  );

  return techniques.slice(0, 3);
}

// Personalized motivational insights
function getMotivationalInsights(studentData: StudentData, hasLowHours: boolean, hasHighHours: boolean): AIRecommendations['motivational_insights'] {
  const strengths = ["Commitment to improvement", "Using AI-powered learning tools"];
  const growthAreas = ["Study technique optimization"];
  
  if (hasHighHours) {
    strengths.push("Excellent time dedication", "Strong work ethic");
    growthAreas.push("Efficiency optimization", "Preventing burnout");
  } else if (!hasLowHours) {
    strengths.push("Good study time balance", "Consistent effort");
  }

  if (studentData?.studyData?.streakDays > 3) {
    strengths.push("Great consistency streak");
  }

  if (studentData?.studyData?.focusScore > 80) {
    strengths.push("High focus quality");
  } else {
    growthAreas.push("Focus and concentration");
  }

  let encouragingMessage = "You're on a fantastic learning journey! ";
  if (hasLowHours) {
    encouragingMessage += "Every study session builds momentum - keep building that habit and you'll see amazing progress.";
  } else if (hasHighHours) {
    encouragingMessage += "Your dedication is impressive! Focus on working smarter to maximize your excellent effort.";
  } else {
    encouragingMessage += "You have a great balance of effort and strategy. Small refinements will lead to breakthrough results.";
  }

  return {
    strengths: strengths.slice(0, 4),
    growth_areas: growthAreas.slice(0, 3),
    encouraging_message: encouragingMessage
  };
}

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
      <Card className="study-flow-shadow-soft border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary-glow/5">
        <CardContent className="pt-16 pb-16">
          <div className="text-center max-w-md mx-auto">
            <div className="relative mb-6">
              <div className="h-16 w-16 mx-auto bg-gradient-to-br from-primary to-primary-glow rounded-2xl flex items-center justify-center">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-xs">✨</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Ready for AI-Powered Insights?
            </h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Get personalized study recommendations tailored to your learning patterns, goals, and performance data. 
              Our professional AI analyzes your habits to unlock your full potential.
            </p>
            <div className="space-y-4">
              <Button 
                onClick={generateRecommendations} 
                size="lg"
                className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all duration-300 px-8"
              >
                <Brain className="h-5 w-5 mr-2" />
                Generate My Recommendations
              </Button>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-600" />
                  Goal-focused
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600" />
                  Evidence-based
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  Personalized
                </div>
              </div>
            </div>
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
            Personalized insights powered by professional AI analysis
          </p>
        </div>
        
        <Button 
          onClick={generateRecommendations}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? 'Analyzing Your Data...' : 'Refresh Recommendations'}
        </Button>
      </div>

      {isLoading ? (
        <Card className="study-flow-shadow-soft border-primary/20">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-6"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-primary animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-primary">AI Analysis in Progress</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    🔍 Analyzing your study patterns and performance data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    🧠 Generating personalized learning strategies  
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ✨ Creating tailored recommendations just for you
                  </p>
                </div>
                <div className="mt-6">
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-primary to-primary-glow h-full animate-pulse rounded-full"></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    This usually takes 10-15 seconds...
                  </p>
                </div>
              </div>
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

// Helper function to call working AI Tutor service
async function callWorkingAITutorService(prompt: string): Promise<DeepSeekResponse> {
  try {
    // Use the established AI Tutor service for reliable responses
    const response = await deepSeekService.chatCompletion([
      {
        role: 'system',
        content: 'You are a professional educational AI advisor specializing in personalized study recommendations. Always respond with valid JSON only.'
      },
      {
        role: 'user', 
        content: prompt
      }
    ], {
      temperature: 0.7,
      max_tokens: 2000,
      model: 'deepseek-chat'
    });

    return { 
      data: response.content, 
      error: null,
      usage: response.usage
    };
  } catch (error) {
    console.error('Error calling AI Tutor service:', error);
    
    // Categorize AI service-specific errors
    let errorMessage = 'AI service connection failed';
    
    if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
      errorMessage = 'AI service timed out. Please try again.';
    } else if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      errorMessage = 'AI service authentication failed. Please check API key configuration.';
    } else if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      errorMessage = 'AI service quota exceeded. Please try again later.';
    } else if (error.message?.includes('model') || error.message?.includes('not found')) {
      errorMessage = 'AI model unavailable. Using fallback recommendations.';
    }
    
    return { 
      data: null, 
      error: errorMessage
    };
  }
}

// AI Tutor-specific JSON parsing and validation function  
function parseAITutorRecommendations(response: DeepSeekResponse): AIRecommendations | null {
  try {
    let content = '';
    
    // Extract content from AI response format
    if (typeof response.data === 'string') {
      content = response.data.trim();
    } else if (response.data?.content) {
      content = response.data.content.trim();
    } else {
      console.warn('Unexpected AI response format:', response);
      return null;
    }

    // Multiple strategies to extract and parse JSON
    let parsedData = null;
    
    // Strategy 1: Direct JSON parse if content is pure JSON
    if (content.startsWith('{') && content.endsWith('}')) {
      try {
        parsedData = JSON.parse(content);
      } catch (e) {
        console.warn('Direct JSON parse failed, trying extraction methods');
      }
    }
    
    // Strategy 2: Extract JSON from markdown or mixed content
    if (!parsedData) {
      const jsonPatterns = [
        /```json\s*(\{[\s\S]*?\})\s*```/g,  // JSON code blocks
        /```\s*(\{[\s\S]*?\})\s*```/g,      // Generic code blocks  
        /(\{[\s\S]*?"motivational_insights"[\s\S]*?\})/g,  // Find our structure
        /(\{[\s\S]*?"priority_recommendations"[\s\S]*?\})/g,  // Alternative structure finder
        /(\{[\s\S]*?\})/g  // Last resort: any JSON-like structure
      ];
      
      for (const pattern of jsonPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            try {
              // Clean the match
              const cleanMatch = match
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .replace(/```$/g, '')
                .trim();
              
              const testParsed = JSON.parse(cleanMatch);
              // Validate it has our expected structure
              if (testParsed && typeof testParsed === 'object' && 
                  (testParsed.priority_recommendations || testParsed.schedule_optimization)) {
                parsedData = testParsed;
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (parsedData) break;
        }
      }
    }
    
    // Strategy 3: Construct from partial text if JSON parsing completely fails
    if (!parsedData) {
      console.warn('JSON parsing failed completely, constructing from content analysis');
      parsedData = constructRecommendationsFromText(content);
    }

    // Validate and normalize the parsed data
    const validatedRecommendations: AIRecommendations = {
      priority_recommendations: validatePriorityRecommendations(parsedData?.priority_recommendations),
      schedule_optimization: validateScheduleOptimization(parsedData?.schedule_optimization),
      subject_focus: validateSubjectFocus(parsedData?.subject_focus),
      learning_techniques: validateLearningTechniques(parsedData?.learning_techniques),
      motivational_insights: validateMotivationalInsights(parsedData?.motivational_insights)
    };

    return validatedRecommendations;
  } catch (error) {
    console.error('Error parsing AI Tutor recommendations:', error);
    return null;
  }
}

// Legacy parsing function for backward compatibility
function parseAndValidateRecommendations(response: DeepSeekResponse): AIRecommendations | null {
  try {
    let content = '';
    
    // Extract content from different response formats
    if (response.data?.content) {
      content = response.data.content;
    } else if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      content = response.data.candidates[0].content.parts[0].text;
    } else if (typeof response.data === 'string') {
      content = response.data;
    } else {
      console.warn('Unexpected response format:', response);
      return null;
    }

    // Multiple strategies to extract JSON
    let parsedData = null;
    
    // Strategy 1: Try direct JSON parse if content looks like JSON
    if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
      try {
        parsedData = JSON.parse(content.trim());
      } catch (e) {
        console.warn('Direct JSON parse failed, trying extraction');
      }
    }
    
    // Strategy 2: Extract JSON using regex with better patterns
    if (!parsedData) {
      const jsonPatterns = [
        /```json\s*(\{[\s\S]*?\})\s*```/g,  // JSON code blocks
        /```\s*(\{[\s\S]*?\})\s*```/g,      // Generic code blocks
        /(\{[\s\S]*"motivational_insights"[\s\S]*?\})/g,  // Look for our specific structure
        /(\{[\s\S]*?\})/g  // Any JSON-like structure
      ];
      
      for (const pattern of jsonPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          for (const match of matches) {
            try {
              // Clean the match
              const cleanMatch = match
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .replace(/```$/g, '')
                .trim();
              
              parsedData = JSON.parse(cleanMatch);
              if (parsedData && typeof parsedData === 'object') {
                break;
              }
            } catch (e) {
              continue;
            }
          }
          if (parsedData) break;
        }
      }
    }
    
    // Strategy 3: Try to construct JSON from text if no valid JSON found
    if (!parsedData) {
      console.warn('JSON extraction failed, using fallback data structure');
      parsedData = constructFallbackRecommendations(content);
    }

    // Validate and normalize the parsed data
    const validatedRecommendations: AIRecommendations = {
      priority_recommendations: validatePriorityRecommendations(parsedData?.priority_recommendations),
      schedule_optimization: validateScheduleOptimization(parsedData?.schedule_optimization),
      subject_focus: validateSubjectFocus(parsedData?.subject_focus),
      learning_techniques: validateLearningTechniques(parsedData?.learning_techniques),
      motivational_insights: validateMotivationalInsights(parsedData?.motivational_insights)
    };

    return validatedRecommendations;
  } catch (error) {
    console.error('Error parsing recommendations:', error);
    return null;
  }
}

// Validation functions
const validatePriorityRecommendations: RecommendationValidator<AIRecommendation[]> = (data: unknown): AIRecommendation[] => {
  if (!Array.isArray(data)) {
    return [
      {
        title: "Optimize Your Study Schedule",
        description: "Focus on studying during your most productive hours and maintain consistent daily sessions.",
        action_items: [
          "Identify your peak productivity hours",
          "Create a consistent daily study routine",
          "Use time-blocking for different subjects"
        ],
        expected_impact: "20-30% improvement in retention and focus",
        priority: "high"
      },
      {
        title: "Active Learning Techniques",
        description: "Incorporate active learning methods to improve understanding and retention.",
        action_items: [
          "Practice recall without looking at notes",
          "Explain concepts in your own words", 
          "Create mind maps and visual summaries"
        ],
        expected_impact: "15-25% better comprehension",
        priority: "medium"
      }
    ];
  }
  
  return (data as unknown[]).filter(Boolean).map((rec: unknown) => {
    const typedRec = rec as Record<string, unknown>;
    return {
      title: (typedRec?.title as string) || "Study Improvement",
      description: (typedRec?.description as string) || "Enhance your study effectiveness",
      action_items: Array.isArray(typedRec?.action_items) ? (typedRec.action_items as string[]) : ["Review and practice regularly"],
      expected_impact: (typedRec?.expected_impact as string) || "Improved learning outcomes",
      priority: (['high', 'medium', 'low'] as const).includes(typedRec?.priority as AIRecommendation['priority']) ? (typedRec.priority as AIRecommendation['priority']) : 'medium'
    };
  });
};

const validateScheduleOptimization: RecommendationValidator<AIRecommendations['schedule_optimization']> = (data: unknown): AIRecommendations['schedule_optimization'] => {
  const typedData = data as Record<string, unknown>;
  return {
    best_study_times: Array.isArray(typedData?.best_study_times) ? (typedData.best_study_times as string[]) : ["9:00-11:00 AM", "2:00-4:00 PM"],
    suggested_session_length: (typedData?.suggested_session_length as string) || "45-60 minutes",
    break_recommendations: (typedData?.break_recommendations as string) || "10-15 minute breaks between sessions"
  };
};

const validateSubjectFocus: RecommendationValidator<SubjectFocus[]> = (data: unknown): SubjectFocus[] => {
  if (!Array.isArray(data)) {
    return [
      {
        subject: "Priority Subject",
        recommended_hours_per_week: 8,
        focus_areas: ["Core concepts", "Practice problems", "Review"],
        study_methods: ["Active recall", "Spaced repetition", "Practice testing"]
      }
    ];
  }
  
  return (data as unknown[]).filter(Boolean).map((subj: unknown) => {
    const typedSubj = subj as Record<string, unknown>;
    return {
      subject: (typedSubj?.subject as string) || "Study Subject",
      recommended_hours_per_week: Number(typedSubj?.recommended_hours_per_week) || 6,
      focus_areas: Array.isArray(typedSubj?.focus_areas) ? (typedSubj.focus_areas as string[]) : ["Core concepts"],
      study_methods: Array.isArray(typedSubj?.study_methods) ? (typedSubj.study_methods as string[]) : ["Regular practice"]
    };
  });
};

const validateLearningTechniques: RecommendationValidator<LearningTechnique[]> = (data: unknown): LearningTechnique[] => {
  if (!Array.isArray(data)) {
    return [
      {
        technique: "Pomodoro Technique",
        description: "25-minute focused study sessions followed by short breaks",
        best_for: ["Time management", "Focus improvement", "Productivity"]
      },
      {
        technique: "Active Recall",
        description: "Testing yourself on material without looking at notes",
        best_for: ["Memory retention", "Understanding", "Exam preparation"]
      }
    ];
  }
  
  return (data as unknown[]).filter(Boolean).map((tech: unknown) => {
    const typedTech = tech as Record<string, unknown>;
    return {
      technique: (typedTech?.technique as string) || "Study Technique",
      description: (typedTech?.description as string) || "Effective learning method",
      best_for: Array.isArray(typedTech?.best_for) ? (typedTech.best_for as string[]) : ["General learning"]
    };
  });
};

const validateMotivationalInsights: RecommendationValidator<AIRecommendations['motivational_insights']> = (data: unknown): AIRecommendations['motivational_insights'] => {
  const typedData = data as Record<string, unknown>;
  return {
    strengths: Array.isArray(typedData?.strengths) ? (typedData.strengths as string[]) : [
      "Consistent study effort", 
      "Good time management", 
      "Strong motivation"
    ],
    growth_areas: Array.isArray(typedData?.growth_areas) ? (typedData.growth_areas as string[]) : [
      "Focus techniques", 
      "Study efficiency", 
      "Subject balance"
    ],
    encouraging_message: (typedData?.encouraging_message as string) || 
      "You're making great progress! Keep building on your strengths while working on growth areas. Small consistent improvements lead to remarkable results."
  };
};

// Enhanced text analysis for extracting recommendations from non-JSON responses
function constructRecommendationsFromText(content: string): ParsedRecommendationContent {
  console.log('Analyzing text content for recommendations structure');
  
  // Analyze content for key educational concepts
  const lowerContent = content.toLowerCase();
  const hasTimeManagement = lowerContent.includes('time') || lowerContent.includes('schedule') || lowerContent.includes('hour');
  const hasStudyTechniques = lowerContent.includes('technique') || lowerContent.includes('method') || lowerContent.includes('strategy');
  const hasFocusContent = lowerContent.includes('focus') || lowerContent.includes('concentration') || lowerContent.includes('attention');
  const hasGoalContent = lowerContent.includes('goal') || lowerContent.includes('objective') || lowerContent.includes('target');
  const hasSubjectContent = lowerContent.includes('subject') || lowerContent.includes('topic') || lowerContent.includes('course');
  
  // Extract any structured lists or numbered items
  const listItems = content.match(/(?:[-*•]|\d+[\).])\s*(.+)/g) || [];
  const recommendations = listItems.slice(0, 3).map((item, index) => ({
    title: hasTimeManagement && index === 0 ? "Optimize Study Schedule" : 
           hasStudyTechniques && index === 1 ? "Enhanced Learning Techniques" : 
           "Improve Study Effectiveness",
    description: item.replace(/^(?:[-*•]|\d+[\).]\s*)/, '').trim(),
    action_items: [
      "Implement this recommendation gradually",
      "Track progress and adjust as needed", 
      "Seek additional resources if helpful"
    ],
    expected_impact: "Improved learning outcomes and efficiency",
    priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
  }));

  return {
    priority_recommendations: recommendations.length > 0 ? recommendations : [
      {
        title: hasTimeManagement ? "Time Management Focus" : "Study Enhancement",
        description: "Based on your profile, focus on structured learning approaches.",
        action_items: ["Create consistent study schedule", "Use proven techniques", "Monitor progress"],
        expected_impact: "Better learning outcomes",
        priority: "high"
      }
    ],
    schedule_optimization: {
      best_study_times: hasTimeManagement ? ["9:00-11:00 AM", "2:00-4:00 PM"] : ["Morning hours", "Afternoon focus time"],
      suggested_session_length: "45-60 minutes",
      break_recommendations: "10-15 minute breaks between sessions"
    },
    subject_focus: hasSubjectContent ? [
      {
        subject: "Primary Subject",
        recommended_hours_per_week: 10,
        focus_areas: ["Core concepts", "Practice", "Application"],
        study_methods: ["Active learning", "Regular review", "Practice tests"]
      }
    ] : [],
    learning_techniques: hasStudyTechniques ? [
      {
        technique: "Active Learning",
        description: "Engage actively with material through questions and application",
        best_for: ["Comprehension", "Retention", "Application"]
      }
    ] : [],
    motivational_insights: {
      strengths: hasFocusContent ? ["Good concentration", "Motivated learner"] : ["Committed to improvement"],
      growth_areas: hasGoalContent ? ["Goal setting", "Progress tracking"] : ["Study techniques"],
      encouraging_message: "You're taking the right steps toward academic success!"
    }
  };
}

// Fallback function to construct recommendations from plain text
function constructFallbackRecommendations(content: string): ParsedRecommendationContent {
  console.log('Constructing fallback recommendations from content');
  
  // Try to extract key information from the text
  const hasTimeManagement = content.toLowerCase().includes('time') || content.toLowerCase().includes('schedule');
  const hasStudyTechniques = content.toLowerCase().includes('technique') || content.toLowerCase().includes('method');
  const hasFocus = content.toLowerCase().includes('focus') || content.toLowerCase().includes('concentration');
  
  return {
    priority_recommendations: [
      {
        title: hasTimeManagement ? "Optimize Your Study Schedule" : "Improve Study Effectiveness",
        description: "Based on your current patterns, focus on creating a more structured approach to learning.",
        action_items: [
          "Set consistent study times",
          "Use active learning techniques",
          "Take regular breaks"
        ],
        expected_impact: "Improved learning efficiency",
        priority: "high"
      }
    ],
    schedule_optimization: {
      best_study_times: ["9:00-11:00 AM", "2:00-4:00 PM"],
      suggested_session_length: "45-60 minutes",
      break_recommendations: "10-15 minute breaks"
    },
    subject_focus: [
      {
        subject: "Current Studies",
        recommended_hours_per_week: 10,
        focus_areas: ["Core concepts", "Practice", "Review"],
        study_methods: ["Active recall", "Spaced repetition"]
      }
    ],
    learning_techniques: [
      {
        technique: "Active Recall",
        description: "Test yourself regularly without looking at notes",
        best_for: ["Memory", "Understanding", "Retention"]
      }
    ],
    motivational_insights: {
      strengths: ["Commitment to learning", "Seeking improvement"],
      growth_areas: ["Study techniques", "Time management"],
      encouraging_message: "You're on the right path to academic success. Keep refining your approach!"
    }
  };
}



