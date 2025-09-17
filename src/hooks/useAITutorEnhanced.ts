import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface StudyPlan {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in hours
  priority: 'low' | 'medium' | 'high';
  tasks: StudyTask[];
  createdAt: Date;
  dueDate?: Date;
}

export interface StudyTask {
  id: string;
  title: string;
  description: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in minutes
  completed: boolean;
  dueDate?: Date;
  dependencies?: string[]; // task IDs that must be completed first
}

export interface AIRecommendation {
  id: string;
  type: 'study_plan' | 'task_optimization' | 'schedule_adjustment' | 'subject_focus';
  title: string;
  description: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high';
  data: any; // Flexible data for different recommendation types
  createdAt: Date;
  applied: boolean;
}

export const useAITutorEnhanced = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [currentTasks, setCurrentTasks] = useState<StudyTask[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      // Load existing study plans and tasks from database
      const { data: plans } = await supabase
        .from('study_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'completed');

      // Transform database data to our interfaces
      const transformedPlans: StudyPlan[] = plans?.map(plan => ({
        id: plan.id,
        title: plan.title,
        description: plan.description || '',
        subjects: [plan.title], // Simplified for now
        difficulty: 'intermediate' as const,
        estimatedDuration: plan.target_value || 10,
        priority: 'medium' as const,
        tasks: [],
        createdAt: new Date(plan.created_at),
        dueDate: plan.deadline ? new Date(plan.deadline) : undefined,
      })) || [];

      const transformedTasks: StudyTask[] = tasks?.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        subject: task.assignment_type || 'General',
        priority: task.priority as 'low' | 'medium' | 'high' || 'medium',
        estimatedDuration: task.estimated_duration || 60,
        completed: task.status === 'completed',
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
      })) || [];

      setStudyPlans(transformedPlans);
      setCurrentTasks(transformedTasks);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const generatePersonalizedStudyPlan = async (subjects: string[], goals: string[], timeAvailable: number) => {
    if (!user) return null;

    setIsGenerating(true);
    try {
      // Call AI service to generate study plan
      const { data, error } = await supabase.functions.invoke('ai-tutor-professional', {
        body: {
          message: `Create a personalized study plan for me. Subjects: ${subjects.join(', ')}. Goals: ${goals.join(', ')}. Available time: ${timeAvailable} hours per week. Please provide a structured plan with specific tasks, priorities, and time allocations.`,
          context: {
            userId: user.id,
            difficulty: 'intermediate',
            subject: 'Study Planning',
          },
          options: {
            mode: 'structured',
            temperature: 0.7,
            maxTokens: 3000,
          },
        },
      });

      if (error) throw error;

      // Parse AI response and create study plan
      const aiResponse = data.content;
      const newPlan: StudyPlan = {
        id: `plan_${Date.now()}`,
        title: `Personalized Study Plan - ${subjects.join(', ')}`,
        description: aiResponse,
        subjects,
        difficulty: 'intermediate',
        estimatedDuration: timeAvailable,
        priority: 'high',
        tasks: [],
        createdAt: new Date(),
      };

      // Save to database
      await supabase
        .from('study_goals')
        .insert({
          user_id: user.id,
          title: newPlan.title,
          description: newPlan.description,
          target_value: timeAvailable,
          type: 'weekly',
          status: 'active',
        });

      setStudyPlans(prev => [...prev, newPlan]);
      
      toast({
        title: "Study Plan Generated! 🧸",
        description: "Teddy has created a personalized study plan for you!",
      });

      return newPlan;
    } catch (error) {
      console.error('Error generating study plan:', error);
      toast({
        title: "Error",
        description: "Failed to generate study plan. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const optimizeTaskPriorities = async () => {
    if (!user || currentTasks.length === 0) return;

    try {
      const tasksContext = currentTasks.map(task => 
        `${task.title} (${task.subject}, ${task.priority} priority, ${task.estimatedDuration}min, due: ${task.dueDate ? task.dueDate.toDateString() : 'no deadline'})`
      ).join('; ');

      const { data, error } = await supabase.functions.invoke('ai-tutor-professional', {
        body: {
          message: `Please analyze and optimize the priority of these tasks for maximum learning efficiency: ${tasksContext}. Consider deadlines, difficulty, dependencies, and optimal learning sequences. Provide specific recommendations for task ordering and priority adjustments.`,
          context: {
            userId: user.id,
            difficulty: 'intermediate',
            subject: 'Task Management',
          },
          options: {
            mode: 'structured',
            temperature: 0.6,
            maxTokens: 2000,
          },
        },
      });

      if (error) throw error;

      const recommendation: AIRecommendation = {
        id: `rec_${Date.now()}`,
        type: 'task_optimization',
        title: 'Task Priority Optimization',
        description: 'Recommended adjustments to your task priorities for better learning outcomes',
        reasoning: data.content,
        priority: 'high',
        data: { originalTasks: currentTasks },
        createdAt: new Date(),
        applied: false,
      };

      setRecommendations(prev => [...prev, recommendation]);

      toast({
        title: "Task Optimization Complete! 🧸",
        description: "Teddy has analyzed your tasks and provided optimization recommendations.",
      });

      return recommendation;
    } catch (error) {
      console.error('Error optimizing tasks:', error);
      toast({
        title: "Error",
        description: "Failed to optimize tasks. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const createAdaptiveSchedule = async (preferences: {
    preferredStudyTimes: string[];
    breakFrequency: number;
    maxSessionDuration: number;
  }) => {
    if (!user) return null;

    try {
      const tasksForScheduling = currentTasks.filter(task => !task.completed);
      const tasksContext = tasksForScheduling.map(task => 
        `${task.title}: ${task.estimatedDuration}min (${task.priority} priority)`
      ).join('; ');

      const { data, error } = await supabase.functions.invoke('ai-tutor-professional', {
        body: {
          message: `Create an adaptive study schedule for these tasks: ${tasksContext}. 
          Preferences: Study times: ${preferences.preferredStudyTimes.join(', ')}, 
          Break every ${preferences.breakFrequency} minutes, 
          Max session: ${preferences.maxSessionDuration} minutes. 
          Optimize for learning retention and avoid cognitive fatigue.`,
          context: {
            userId: user.id,
            difficulty: 'intermediate',
            subject: 'Schedule Planning',
          },
          options: {
            mode: 'structured',
            temperature: 0.5,
            maxTokens: 2500,
          },
        },
      });

      if (error) throw error;

      const recommendation: AIRecommendation = {
        id: `schedule_${Date.now()}`,
        type: 'schedule_adjustment',
        title: 'Adaptive Study Schedule',
        description: 'Optimized schedule based on your preferences and learning science',
        reasoning: data.content,
        priority: 'high',
        data: { 
          preferences, 
          tasks: tasksForScheduling,
          generatedAt: new Date(),
        },
        createdAt: new Date(),
        applied: false,
      };

      setRecommendations(prev => [...prev, recommendation]);

      toast({
        title: "Adaptive Schedule Created! 🧸",
        description: "Teddy has created an optimized study schedule for you.",
      });

      return recommendation;
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Error",
        description: "Failed to create schedule. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const getSubjectFocusRecommendations = async () => {
    if (!user) return null;

    try {
      // Get recent study analytics
      const { data: analytics } = await supabase
        .from('study_analytics')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(30);

      const analyticsContext = analytics?.map(a => 
        `${a.date}: ${a.total_study_time}min total, ${a.session_count} sessions`
      ).join('; ') || 'No recent study data';

      const { data, error } = await supabase.functions.invoke('ai-tutor-professional', {
        body: {
          message: `Based on my recent study analytics: ${analyticsContext}, and current tasks: ${currentTasks.map(t => `${t.title} (${t.subject})`).join('; ')}, please recommend which subjects I should focus on and how to balance my study time for optimal learning outcomes.`,
          context: {
            userId: user.id,
            difficulty: 'intermediate',
            subject: 'Subject Focus',
          },
          options: {
            mode: 'structured',
            temperature: 0.6,
            maxTokens: 2000,
          },
        },
      });

      if (error) throw error;

      const recommendation: AIRecommendation = {
        id: `focus_${Date.now()}`,
        type: 'subject_focus',
        title: 'Subject Focus Recommendations',
        description: 'Optimized subject focus based on your study patterns and goals',
        reasoning: data.content,
        priority: 'medium',
        data: { 
          analytics: analytics?.slice(0, 7), // Last week
          currentTasks: currentTasks,
        },
        createdAt: new Date(),
        applied: false,
      };

      setRecommendations(prev => [...prev, recommendation]);

      toast({
        title: "Subject Focus Analysis Complete! 🧸",
        description: "Teddy has analyzed your study patterns and provided focus recommendations.",
      });

      return recommendation;
    } catch (error) {
      console.error('Error getting subject recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to analyze subject focus. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const markRecommendationApplied = async (recommendationId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.id === recommendationId 
          ? { ...rec, applied: true }
          : rec
      )
    );

    toast({
      title: "Recommendation Applied! ✅",
      description: "Great job implementing Teddy's suggestion!",
    });
  };

  const clearOldRecommendations = () => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    setRecommendations(prev => 
      prev.filter(rec => rec.createdAt > oneWeekAgo)
    );
  };

  return {
    studyPlans,
    currentTasks,
    recommendations,
    isGenerating,
    generatePersonalizedStudyPlan,
    optimizeTaskPriorities,
    createAdaptiveSchedule,
    getSubjectFocusRecommendations,
    markRecommendationApplied,
    clearOldRecommendations,
    refreshData: loadUserData,
  };
};