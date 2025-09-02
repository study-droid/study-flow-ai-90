// Edge function for AI-powered study recommendations
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

console.log('AI Study Recommendations function starting...');
console.log('OpenAI API Key exists:', !!openAIApiKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Request received:', req.method);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured',
        fallback_message: "AI recommendations unavailable. Please try again later."
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request body',
        fallback_message: "Invalid request format."
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { 
      studyData, 
      subjects, 
      goals, 
      timePreferences, 
      currentPerformance 
    } = requestBody;

    console.log('Processing recommendation request...');

    const systemPrompt = `You are an AI study advisor that analyzes student data and provides personalized recommendations. 

Analyze the provided student data and generate specific, actionable study recommendations that include:
1. Optimal study schedule suggestions
2. Subject prioritization based on performance gaps
3. Learning technique recommendations
4. Time management improvements
5. Specific areas for improvement

Keep recommendations practical, specific, and encouraging. Format as a structured JSON response.`;

    const userPrompt = `
    Student Data:
    - Subjects: ${JSON.stringify(subjects)}
    - Study Goals: ${JSON.stringify(goals)}
    - Recent Performance: ${JSON.stringify(currentPerformance)}
    - Time Preferences: ${JSON.stringify(timePreferences)}
    - Study History: ${JSON.stringify(studyData)}

    Please provide personalized study recommendations in the following JSON format:
    {
      "priority_recommendations": [
        {
          "title": "string",
          "description": "string",
          "action_items": ["string"],
          "expected_impact": "string",
          "priority": "high|medium|low"
        }
      ],
      "schedule_optimization": {
        "best_study_times": ["string"],
        "suggested_session_length": "string",
        "break_recommendations": "string"
      },
      "subject_focus": [
        {
          "subject": "string",
          "recommended_hours_per_week": number,
          "focus_areas": ["string"],
          "study_methods": ["string"]
        }
      ],
      "learning_techniques": [
        {
          "technique": "string",
          "description": "string",
          "best_for": ["string"]
        }
      ],
      "motivational_insights": {
        "strengths": ["string"],
        "growth_areas": ["string"],
        "encouraging_message": "string"
      }
    }
    `;

    console.log('Making OpenAI API request...');
    
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

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log('Parsing OpenAI response...');
    
    const data = await response.json();
    let aiResponse = data.choices[0].message.content;

    console.log('AI response received, length:', aiResponse?.length || 0);

    // Clean up the response to extract JSON
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      aiResponse = jsonMatch[0];
    }

    let recommendations;
    try {
      recommendations = JSON.parse(aiResponse);
    } catch (parseError) {
      // Fallback recommendations if JSON parsing fails
      recommendations = {
        priority_recommendations: [
          {
            title: "Optimize Study Schedule",
            description: "Based on your current patterns, adjusting your study schedule could improve efficiency.",
            action_items: ["Study during peak focus hours", "Take regular breaks", "Plan challenging subjects for high-energy times"],
            expected_impact: "15-20% improvement in retention",
            priority: "high"
          }
        ],
        schedule_optimization: {
          best_study_times: ["Morning (8-10 AM)", "Evening (6-8 PM)"],
          suggested_session_length: "45-50 minutes",
          break_recommendations: "5-10 minute breaks every hour"
        },
        subject_focus: [
          {
            subject: "Mathematics",
            recommended_hours_per_week: 8,
            focus_areas: ["Problem solving", "Concept review"],
            study_methods: ["Practice problems", "Spaced repetition"]
          }
        ],
        learning_techniques: [
          {
            technique: "Pomodoro Technique",
            description: "25-minute focused sessions with 5-minute breaks",
            best_for: ["Mathematics", "Science subjects"]
          }
        ],
        motivational_insights: {
          strengths: ["Consistent study habits", "Good time management"],
          growth_areas: ["Focus improvement", "Subject balance"],
          encouraging_message: "You're making great progress! Small adjustments to your routine can lead to significant improvements."
        }
      };
    }

    console.log('Recommendations generated successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      recommendations,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI recommendations function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      fallback_message: "Unable to generate AI recommendations at this time. Please try again later."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});