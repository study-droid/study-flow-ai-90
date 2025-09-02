import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Professional DeepSeek AI Handler for StudyFlow
// Specialized for educational content with enhanced processing

interface ProfessionalAIRequest {
  messages: Array<{ role: string; content: string }>;
  sessionId?: string;
  subject?: string;
  intentType?: 'greeting' | 'question' | 'request' | 'casual' | 'educational';
  intentConfidence?: number;
  responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
  temperature?: number;
  max_tokens?: number;
  enableProfessionalProcessing?: boolean;
}

interface ProfessionalResponse {
  content: string;
  metadata: {
    provider: string;
    model: string;
    processing_type: 'professional' | 'standard';
    response_type: string;
    quality_score?: number;
    intent_type?: string;
    intent_confidence?: number;
    cached: boolean;
    optimized: boolean;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timestamp: string;
}

// Enhanced CORS headers for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Cache-Control': 'no-cache',
};

// Production DeepSeek configuration
const DEEPSEEK_CONFIG = {
  apiUrl: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  fallbackModel: 'deepseek-reasoner',
  maxRetries: 3,
  timeout: 30000,
  defaultTemperature: 0.7,
  maxTokens: 2000,
};

// Professional prompt templates for educational content
const EDUCATIONAL_SYSTEM_PROMPTS = {
  explanation: `You are a professional AI tutor specializing in clear, comprehensive explanations. 
  Structure your responses with:
  1. Core concept summary
  2. Detailed explanation with examples
  3. Key takeaways
  4. Related concepts to explore
  
  Keep explanations engaging, accurate, and age-appropriate.`,
  
  study_plan: `You are an expert study planner creating personalized learning paths.
  Structure study plans with:
  1. Learning objectives
  2. Daily/weekly breakdown
  3. Recommended resources
  4. Progress milestones
  5. Assessment strategies
  
  Adapt to the student's level and available time.`,
  
  practice: `You are a practice question generator focused on skill reinforcement.
  Create questions that:
  1. Test understanding at appropriate difficulty
  2. Include clear explanations
  3. Provide hints when helpful
  4. Connect to real-world applications
  
  Ensure questions are fair and educational.`,
  
  concept: `You are a concept clarification expert breaking down complex topics.
  Present concepts with:
  1. Simple definition
  2. Visual or analogical explanation
  3. Common misconceptions addressed
  4. Prerequisites and connections
  
  Make difficult topics accessible and memorable.`
};

serve(async (req) => {
  console.log('DeepSeek Professional AI - Request:', req.method, new URL(req.url).pathname);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed', message: 'Only POST requests are accepted' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // Parse and validate request
    const requestBody: ProfessionalAIRequest = await req.json();
    const {
      messages,
      sessionId,
      subject,
      intentType = 'educational',
      intentConfidence = 0.8,
      responseType = 'explanation',
      temperature = DEEPSEEK_CONFIG.defaultTemperature,
      max_tokens = DEEPSEEK_CONFIG.maxTokens,
      enableProfessionalProcessing = true
    } = requestBody;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          message: 'Messages array is required and must not be empty'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Processing professional request - Type: ${responseType}, Intent: ${intentType}, Subject: ${subject || 'general'}`);

    // Get API key
    const apiKey = await getDeepSeekApiKey();
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Service unavailable',
          message: 'DeepSeek API key not configured'
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Enhance messages with professional system prompt
    const enhancedMessages = await enhanceMessagesForEducation(
      messages, 
      responseType, 
      subject,
      intentType
    );

    // Call DeepSeek API with professional configuration
    const response = await callDeepSeekProfessional(
      apiKey,
      enhancedMessages,
      temperature,
      max_tokens
    );

    // Process response professionally if enabled
    let processedResponse = response;
    let qualityScore = 85; // Default quality score
    
    if (enableProfessionalProcessing) {
      processedResponse = await postProcessResponse(response, responseType, intentType);
      qualityScore = calculateQualityScore(processedResponse.content, responseType);
    }

    // Create professional response object
    const professionalResponse: ProfessionalResponse = {
      content: processedResponse.content,
      metadata: {
        provider: 'deepseek',
        model: DEEPSEEK_CONFIG.model,
        processing_type: enableProfessionalProcessing ? 'professional' : 'standard',
        response_type: responseType,
        quality_score: qualityScore,
        intent_type: intentType,
        intent_confidence: intentConfidence,
        cached: false,
        optimized: true
      },
      usage: processedResponse.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      },
      timestamp: new Date().toISOString()
    };

    return new Response(
      JSON.stringify(professionalResponse),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in DeepSeek Professional AI:', error);
    
    // Determine appropriate error response
    let statusCode = 500;
    let userMessage = 'AI service temporarily unavailable';
    
    if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
      statusCode = 429;
      userMessage = 'API quota exceeded. Please try again in a moment.';
    } else if (error.message?.includes('timeout')) {
      statusCode = 408;
      userMessage = 'Request timeout. Please try again.';
    } else if (error.message?.includes('invalid') || error.message?.includes('bad request')) {
      statusCode = 400;
      userMessage = 'Invalid request format. Please check your input.';
    }

    return new Response(
      JSON.stringify({
        error: userMessage,
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID()
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Enhanced API key retrieval with multiple fallbacks
async function getDeepSeekApiKey(): Promise<string | null> {
  // Try environment variables in order of preference
  const keyPriority = [
    'DEEPSEEK_API_KEY',
    'VITE_DEEPSEEK_API_KEY',
    'DEEPSEEK_KEY'
  ];
  
  for (const keyName of keyPriority) {
    const key = Deno.env.get(keyName);
    if (key && key !== 'your_key_here' && !key.includes('REPLACE') && key.length > 10) {
      console.log(`Using DeepSeek API key from ${keyName}`);
      return key;
    }
  }
  
  // Fallback key for immediate deployment
  const fallbackKey = 'sk-e4f1da719783415d84e3eee0e669b829';
  if (fallbackKey) {
    console.log('Using fallback DeepSeek API key');
    return fallbackKey;
  }
  
  console.error('No valid DeepSeek API key found');
  return null;
}

// Enhance messages with educational context and professional prompts
async function enhanceMessagesForEducation(
  messages: Array<{ role: string; content: string }>,
  responseType: string,
  subject?: string,
  intentType?: string
): Promise<Array<{ role: string; content: string }>> {
  const systemPrompt = EDUCATIONAL_SYSTEM_PROMPTS[responseType] || EDUCATIONAL_SYSTEM_PROMPTS.explanation;
  
  // Add context for subject if provided
  const subjectContext = subject ? `Subject context: ${subject}\n` : '';
  const intentContext = intentType ? `Intent type: ${intentType}\n` : '';
  
  const enhancedSystemPrompt = `${systemPrompt}

${subjectContext}${intentContext}
Remember to:
- Use clear, educational language
- Provide practical examples
- Encourage further learning
- Maintain academic integrity
- Be supportive and encouraging`;

  // Insert system prompt at the beginning
  return [
    { role: 'system', content: enhancedSystemPrompt },
    ...messages
  ];
}

// Professional DeepSeek API call with enhanced error handling
async function callDeepSeekProfessional(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number
): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEEPSEEK_CONFIG.timeout);
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= DEEPSEEK_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`DeepSeek API call attempt ${attempt}/${DEEPSEEK_CONFIG.maxRetries}`);
      
      const response = await fetch(DEEPSEEK_CONFIG.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'StudyFlow-Professional/1.0'
        },
        body: JSON.stringify({
          model: DEEPSEEK_CONFIG.model,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens,
          stream: false,
          top_p: 0.95,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response generated from DeepSeek API');
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };

    } catch (error) {
      lastError = error;
      console.error(`DeepSeek API attempt ${attempt} failed:`, error.message);
      
      if (attempt === DEEPSEEK_CONFIG.maxRetries) {
        break;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  clearTimeout(timeoutId);
  throw lastError || new Error('DeepSeek API call failed after all retries');
}

// Post-process response for educational quality
async function postProcessResponse(
  response: any,
  responseType: string,
  intentType: string
): Promise<any> {
  let content = response.content;
  
  // Apply educational formatting based on response type
  switch (responseType) {
    case 'explanation':
      content = formatExplanationResponse(content);
      break;
    case 'study_plan':
      content = formatStudyPlanResponse(content);
      break;
    case 'practice':
      content = formatPracticeResponse(content);
      break;
    case 'concept':
      content = formatConceptResponse(content);
      break;
  }
  
  // Add educational enhancements
  if (intentType === 'educational') {
    content = addEducationalEnhancements(content);
  }
  
  return {
    ...response,
    content: content
  };
}

// Format explanation responses with structure
function formatExplanationResponse(content: string): string {
  // Ensure proper structure for explanations
  if (!content.includes('## ') && !content.includes('### ')) {
    // Add basic structure if missing
    const sections = content.split('\n\n');
    if (sections.length > 1) {
      return `## Explanation\n\n${sections[0]}\n\n## Details\n\n${sections.slice(1).join('\n\n')}`;
    }
  }
  return content;
}

// Format study plan responses
function formatStudyPlanResponse(content: string): string {
  // Ensure study plan has proper formatting
  if (!content.includes('Week') && !content.includes('Day') && !content.includes('##')) {
    return `## Study Plan\n\n${content}\n\n---\n*Remember to adjust the pace based on your understanding and available time.*`;
  }
  return content;
}

// Format practice responses
function formatPracticeResponse(content: string): string {
  // Ensure practice questions are well-formatted
  if (!content.includes('Question:') && !content.includes('Answer:')) {
    return `## Practice Question\n\n${content}\n\n---\n*Take your time to think through the answer before checking the solution.*`;
  }
  return content;
}

// Format concept explanations
function formatConceptResponse(content: string): string {
  // Ensure concept explanations are structured
  if (!content.includes('##') && content.length > 200) {
    const parts = content.split('. ');
    if (parts.length >= 3) {
      return `## Definition\n\n${parts[0]}.\n\n## Explanation\n\n${parts.slice(1).join('. ')}`;
    }
  }
  return content;
}

// Add educational enhancements
function addEducationalEnhancements(content: string): string {
  // Add encouraging footer for educational content
  if (!content.includes('Keep learning') && !content.includes('Next steps')) {
    content += '\n\n---\n*Keep practicing and don\'t hesitate to ask if you need clarification on any part!*';
  }
  return content;
}

// Calculate quality score based on content analysis
function calculateQualityScore(content: string, responseType: string): number {
  let score = 70; // Base score
  
  // Length appropriateness (10 points)
  const length = content.length;
  if (length > 100 && length < 3000) score += 10;
  else if (length >= 50) score += 5;
  
  // Structure quality (10 points)
  const hasHeaders = content.includes('##') || content.includes('###');
  const hasList = content.includes('1.') || content.includes('-') || content.includes('•');
  if (hasHeaders) score += 5;
  if (hasList) score += 5;
  
  // Educational value (10 points)
  const educationalKeywords = ['understand', 'learn', 'example', 'practice', 'concept', 'explanation'];
  const keywordCount = educationalKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword)
  ).length;
  score += Math.min(keywordCount * 2, 10);
  
  // Response type specific bonuses (5 points)
  switch (responseType) {
    case 'study_plan':
      if (content.includes('Week') || content.includes('Day')) score += 5;
      break;
    case 'practice':
      if (content.includes('Question') || content.includes('Answer')) score += 5;
      break;
    case 'explanation':
      if (content.includes('because') || content.includes('therefore')) score += 5;
      break;
  }
  
  return Math.min(score, 100);
}