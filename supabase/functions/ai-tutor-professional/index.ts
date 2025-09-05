/**
 * AI Tutor Professional Edge Function
 * Modern edge function using the new ai_tutor architecture
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Types for the new architecture
interface AITutorRequest {
  message: string;
  context: {
    subject?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    sessionId?: string;
    userId?: string;
    history?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
      timestamp: number;
    }>;
  };
  options?: {
    stream?: boolean;
    mode?: 'reasoning' | 'chat' | 'structured';
    priority?: 'low' | 'normal' | 'high';
    temperature?: number;
    maxTokens?: number;
  };
}

interface AITutorResponse {
  content: string;
  metadata: {
    model: string;
    processingTime: number;
    enhancementsApplied: string[];
    cacheHit: boolean;
    responseType: string;
    requestId: string;
    timestamp: string;
  };
  quality?: {
    overall: number;
    breakdown: Array<{
      name: string;
      value: number;
    }>;
    recommendations: Array<{
      criterion: string;
      issue: string;
      suggestion: string;
      priority: string;
    }>;
    confidence: number;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Enhanced OpenAI client for DeepSeek API
 */
class DeepSeekClient {
  private apiKey: string;
  private baseURL: string;

  constructor() {
    this.apiKey = Deno.env.get('DEEPSEEK_API_KEY') || '';
    this.baseURL = 'https://api.deepseek.com/v1';
    
    if (!this.apiKey) {
      throw new Error('DEEPSEEK_API_KEY environment variable is required');
    }
  }

  async chatCompletion(request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }): Promise<any> {
    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.max_tokens || 2000,
        stream: request.stream || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${error}`);
    }

    return response.json();
  }
}

/**
 * Simple prompt optimizer for educational content
 */
function optimizePrompt(message: string, context: AITutorRequest['context']): string {
  const systemPrompt = generateSystemPrompt(context);
  const optimizedMessage = enhanceUserMessage(message, context);
  
  return `${systemPrompt}\n\nUser: ${optimizedMessage}`;
}

function generateSystemPrompt(context: AITutorRequest['context']): string {
  const base = 'You are an expert educational AI tutor.';
  
  const contextual = context.subject 
    ? `You specialize in ${context.subject}.`
    : '';
  
  const difficultyInstruction = context.difficulty
    ? `Adjust your explanations for ${context.difficulty} level understanding.`
    : '';

  const instructions = `
    Provide clear, structured responses that:
    - Use appropriate academic language
    - Include concrete examples when helpful
    - Highlight key concepts
    - Encourage critical thinking
    - Build upon previous knowledge
  `;

  return `${base} ${contextual} ${difficultyInstruction} ${instructions}`.trim();
}

function enhanceUserMessage(message: string, context: AITutorRequest['context']): string {
  const enhancements: string[] = [];
  
  if (context.subject) {
    enhancements.push(`Context: This is a ${context.subject} question.`);
  }
  
  if (context.difficulty) {
    enhancements.push(`Level: ${context.difficulty}`);
  }
  
  // Detect question type
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('explain') || lowerMessage.includes('what is')) {
    enhancements.push('Please provide a structured explanation with examples.');
  } else if (lowerMessage.includes('solve') || lowerMessage.includes('calculate')) {
    enhancements.push('Please show step-by-step solution process.');
  }

  return enhancements.length > 0
    ? `${message}\n\n[${enhancements.join(' ')}]`
    : message;
}

/**
 * Quality assessment for responses
 */
function assessQuality(content: string, request: AITutorRequest): AITutorResponse['quality'] {
  const criteria = [
    assessAccuracy(content, request),
    assessCompleteness(content, request),
    assessClarity(content, request),
    assessEducationalValue(content, request),
  ];

  const overall = criteria.reduce((sum, c) => sum + c.value, 0) / criteria.length;

  return {
    overall,
    breakdown: criteria,
    recommendations: criteria
      .filter(c => c.value < 0.7)
      .map(c => ({
        criterion: c.name,
        issue: `${c.name} score below threshold`,
        suggestion: getSuggestion(c.name),
        priority: c.value < 0.5 ? 'high' : 'medium',
      })),
    confidence: Math.max(0, 1 - (Math.max(...criteria.map(c => c.value)) - Math.min(...criteria.map(c => c.value)))),
  };
}

function assessAccuracy(content: string, request: AITutorRequest) {
  // Simple accuracy assessment
  const hasFactual = /according to|research shows|studies indicate/i.test(content);
  const noErrors = !/their are|there are(?!\s)/gi.test(content); // Simple grammar check
  const relevant = hasWordOverlap(content, request.message, 0.3);
  
  const score = [hasFactual, noErrors, relevant].filter(Boolean).length / 3;
  return { name: 'accuracy', value: score };
}

function assessCompleteness(content: string, request: AITutorRequest) {
  const answersQuestion = detectAnswerType(content, request.message);
  const adequateLength = content.length >= 100 && content.length <= 3000;
  const providesNextSteps = /next|further|practice|try|consider/i.test(content);
  
  const score = [answersQuestion, adequateLength, providesNextSteps].filter(Boolean).length / 3;
  return { name: 'completeness', value: score };
}

function assessClarity(content: string, request: AITutorRequest) {
  const words = content.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const simpleLanguage = avgWordLength <= 8; // Reasonable average
  const hasTransitions = /first|then|however|therefore|because/i.test(content);
  const hasExamples = /example|instance|such as/i.test(content);
  
  const score = [simpleLanguage, hasTransitions, hasExamples].filter(Boolean).length / 3;
  return { name: 'clarity', value: score };
}

function assessEducationalValue(content: string, request: AITutorRequest) {
  const hasObjectives = /learn|understand|master/i.test(content);
  const hasExamples = /example|instance|demonstrate/i.test(content);
  const encouragesThinking = /why|how|what if|consider|analyze/i.test(content);
  
  const score = [hasObjectives, hasExamples, encouragesThinking].filter(Boolean).length / 3;
  return { name: 'educationalValue', value: score };
}

function hasWordOverlap(text1: string, text2: string, threshold: number): boolean {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  const overlap = words1.filter(word => words2.includes(word) && word.length > 3).length;
  return overlap / words2.length >= threshold;
}

function detectAnswerType(content: string, question: string): boolean {
  const questionType = question.toLowerCase();
  const answerContent = content.toLowerCase();
  
  if (questionType.includes('what') && answerContent.includes('is')) return true;
  if (questionType.includes('how') && answerContent.includes('step')) return true;
  if (questionType.includes('why') && answerContent.includes('because')) return true;
  
  return true; // Default to true for other cases
}

function getSuggestion(criterion: string): string {
  const suggestions = {
    accuracy: 'Verify facts and ensure contextual relevance',
    completeness: 'Add more detail and cover additional aspects',
    clarity: 'Simplify language and improve structure',
    educationalValue: 'Include examples and encourage critical thinking',
  };
  
  return suggestions[criterion as keyof typeof suggestions] || 'Review and improve this aspect';
}

/**
 * Main handler function
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const startTime = Date.now();
    const body: AITutorRequest = await req.json();
    
    // Validate request
    if (!body.message || typeof body.message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required and must be a string' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize DeepSeek client
    const client = new DeepSeekClient();

    // Prepare messages for AI
    const messages: Array<{ role: string; content: string }> = [];
    
    // Add system prompt
    messages.push({
      role: 'system',
      content: generateSystemPrompt(body.context || {}),
    });

    // Add history if provided
    if (body.context?.history) {
      messages.push(...body.context.history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })));
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: enhanceUserMessage(body.message, body.context || {}),
    });

    // Call DeepSeek API
    const model = body.options?.mode === 'reasoning' ? 'deepseek-reasoner' : 'deepseek-chat';
    const aiResponse = await client.chatCompletion({
      model,
      messages,
      temperature: body.options?.temperature || 0.7,
      max_tokens: body.options?.maxTokens || 2000,
      stream: false,
    });

    const processingTime = Date.now() - startTime;
    const content = aiResponse.choices[0]?.message?.content || '';

    // Assess quality
    const quality = assessQuality(content, body);

    // Build response
    const response: AITutorResponse = {
      content,
      metadata: {
        model: aiResponse.model,
        processingTime,
        enhancementsApplied: ['prompt_optimization', 'educational_formatting'],
        cacheHit: false,
        responseType: 'conversation',
        requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      },
      quality,
      usage: aiResponse.usage ? {
        promptTokens: aiResponse.usage.prompt_tokens,
        completionTokens: aiResponse.usage.completion_tokens,
        totalTokens: aiResponse.usage.total_tokens,
      } : undefined,
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('AI Tutor Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});