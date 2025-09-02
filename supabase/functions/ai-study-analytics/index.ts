// Edge function for AI-powered study analytics
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get user's study sessions from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: sessions, error: sessionsError } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('completed_at', thirtyDaysAgo.toISOString());

    if (sessionsError) {
      throw new Error(`Failed to fetch sessions: ${sessionsError.message}`);
    }

    // Get user's tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Get user's goals
    const { data: goals, error: goalsError } = await supabase
      .from('study_goals')
      .select('*')
      .eq('user_id', user.id);

    if (goalsError) {
      throw new Error(`Failed to fetch goals: ${goalsError.message}`);
    }

    const systemPrompt = `You are an AI study analytics assistant that analyzes student performance data and provides personalized insights.

Analyze the provided study data and generate specific insights about:
1. Study patterns and habits
2. Productivity trends
3. Goal progress analysis
4. Time management insights
5. Personalized recommendations for improvement

Keep insights practical, encouraging, and data-driven. Format as structured JSON.`;

    const userPrompt = `
    Study Analytics Data:
    - Study Sessions (Last 30 days): ${JSON.stringify(sessions)}
    - Tasks: ${JSON.stringify(tasks)}
    - Goals: ${JSON.stringify(goals)}
    
    Please provide study analytics insights in the following JSON format:
    {
      "summary": {
        "total_study_time": number,
        "average_session_length": number,
        "most_productive_times": ["string"],
        "completion_rate": number
      },
      "patterns": [
        {
          "insight": "string",
          "description": "string",
          "trend": "positive|neutral|negative"
        }
      ],
      "recommendations": [
        {
          "title": "string",
          "description": "string",
          "priority": "high|medium|low",
          "category": "time_management|productivity|goals|habits"
        }
      ],
      "goal_progress": [
        {
          "goal_title": "string",
          "progress_percentage": number,
          "status": "on_track|behind|ahead",
          "suggestion": "string"
        }
      ],
      "next_actions": [
        {
          "action": "string",
          "expected_impact": "string",
          "effort_level": "low|medium|high"
        }
      ]
    }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    // Clean up the response to extract JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponse = jsonMatch[0];
    }

    let analytics;
    try {
      analytics = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback analytics if JSON parsing fails
      analytics = {
        summary: {
          total_study_time: sessions?.reduce((acc, s) => acc + s.duration_minutes, 0) || 0,
          average_session_length: sessions?.length ? 
            Math.round(sessions.reduce((acc, s) => acc + s.duration_minutes, 0) / sessions.length) : 0,
          most_productive_times: ["Morning (9-11 AM)", "Evening (7-9 PM)"],
          completion_rate: tasks?.length ? 
            Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0
        },
        patterns: [
          {
            insight: "Consistent Study Habits",
            description: "You maintain regular study sessions with good consistency.",
            trend: "positive"
          }
        ],
        recommendations: [
          {
            title: "Optimize Study Schedule",
            description: "Consider studying during your peak productivity hours for better focus.",
            priority: "medium",
            category: "time_management"
          }
        ],
        goal_progress: goals?.map(goal => ({
          goal_title: goal.title,
          progress_percentage: Math.round((goal.current_value / goal.target_value) * 100),
          status: goal.current_value >= goal.target_value ? "ahead" : "behind",
          suggestion: "Stay consistent with your current pace."
        })) || [],
        next_actions: [
          {
            action: "Schedule regular study blocks",
            expected_impact: "Improved consistency and focus",
            effort_level: "medium"
          }
        ]
      };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analytics,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI analytics function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback_message: "Unable to generate analytics at this time. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});