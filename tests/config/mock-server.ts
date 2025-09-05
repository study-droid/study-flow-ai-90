/**
 * Mock Server Configuration
 * Sets up MSW (Mock Service Worker) for intercepting AI service calls during testing
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { Server } from 'msw/node';

// Mock server instance
let server: Server | null = null;

/**
 * Mock AI response data
 */
const mockResponses = {
  aiTutor: {
    streaming: [
      { delta: 'Hello! I\'m here to help you with your studies. ' },
      { delta: 'What topic would you like to explore today? ' },
      { delta: 'I can help explain concepts, answer questions, or provide study guidance.' },
    ],
    complete: {
      content: 'Hello! I\'m here to help you with your studies. What topic would you like to explore today? I can help explain concepts, answer questions, or provide study guidance.',
      metadata: {
        model: 'deepseek-chat',
        usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
        finish_reason: 'stop',
      }
    }
  },
  recommendations: {
    study: [
      {
        id: 'rec-1',
        type: 'study_technique',
        title: 'Pomodoro Technique',
        description: 'Break your study sessions into 25-minute focused intervals',
        priority: 'high',
        estimated_time: 25,
        subject_relevance: ['Mathematics', 'Computer Science'],
      },
      {
        id: 'rec-2',
        type: 'review_session',
        title: 'Review Previous Chapter',
        description: 'Revisit Chapter 1 concepts before moving forward',
        priority: 'medium',
        estimated_time: 15,
        subject_relevance: ['Mathematics'],
      },
    ],
    insights: {
      performance_trend: 'improving',
      focus_areas: ['Mathematics fundamentals', 'Time management'],
      next_milestone: 'Complete Chapter 2 by Friday',
      study_streak: 7,
      total_study_time: '12.5 hours this week',
    }
  },
  tableGeneration: {
    analysis: {
      topic: 'Study Schedule',
      structure: 'weekly_planner',
      columns: ['Day', 'Subject', 'Time', 'Type', 'Priority'],
      estimated_rows: 14,
    },
    data: [
      ['Monday', 'Mathematics', '9:00 AM - 10:30 AM', 'Lecture', 'High'],
      ['Monday', 'Computer Science', '2:00 PM - 3:30 PM', 'Lab', 'High'],
      ['Tuesday', 'Mathematics', '10:00 AM - 11:00 AM', 'Review', 'Medium'],
      ['Wednesday', 'Computer Science', '1:00 PM - 2:30 PM', 'Project Work', 'High'],
      ['Thursday', 'Mathematics', '9:00 AM - 10:30 AM', 'Practice', 'Medium'],
      ['Friday', 'Computer Science', '3:00 PM - 4:00 PM', 'Study Group', 'Low'],
    ]
  },
  deepSeekQuote: {
    quote: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
    context: "motivation",
    relevance_score: 0.95,
  }
};

/**
 * Request handlers for different AI endpoints
 */
const handlers = [
  // DeepSeek AI Professional (AI Tutor)
  http.post('*/functions/v1/deepseek-ai-professional', async ({ request }) => {
    const body = await request.json() as any;
    const isStreaming = body.stream === true;

    if (isStreaming) {
      // Simulate streaming response
      const stream = new ReadableStream({
        start(controller) {
          mockResponses.aiTutor.streaming.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              if (index === mockResponses.aiTutor.streaming.length - 1) {
                controller.enqueue('data: [DONE]\n\n');
                controller.close();
              }
            }, index * 100);
          });
        },
      });

      return new HttpResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return HttpResponse.json(mockResponses.aiTutor.complete);
  }),

  // DeepSeek Chat
  http.post('*/functions/v1/deepseek-chat', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      content: 'This is a mock chat response for testing purposes.',
      metadata: {
        model: 'deepseek-chat',
        usage: { prompt_tokens: 30, completion_tokens: 15, total_tokens: 45 },
        finish_reason: 'stop',
      }
    });
  }),

  // DeepSeek Structured (Table Generation)
  http.post('*/functions/v1/deepseek-structured', async ({ request }) => {
    const body = await request.json() as any;
    
    return HttpResponse.json({
      analysis: mockResponses.tableGeneration.analysis,
      data: mockResponses.tableGeneration.data,
      metadata: {
        model: 'deepseek-chat',
        processing_time: 1200,
        confidence_score: 0.92,
      }
    });
  }),

  // DeepSeek Quote
  http.post('*/functions/v1/deepseek-quote', async ({ request }) => {
    return HttpResponse.json(mockResponses.deepSeekQuote);
  }),

  // Study Recommendations
  http.get('*/api/recommendations/study', () => {
    return HttpResponse.json(mockResponses.recommendations.study);
  }),

  // Study Insights
  http.get('*/api/insights', () => {
    return HttpResponse.json(mockResponses.recommendations.insights);
  }),

  // Unified AI Service
  http.post('*/api/ai/chat', async ({ request }) => {
    const body = await request.json() as any;
    const isStreaming = body.stream === true;

    if (isStreaming) {
      const stream = new ReadableStream({
        start(controller) {
          mockResponses.aiTutor.streaming.forEach((chunk, index) => {
            setTimeout(() => {
              controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
              if (index === mockResponses.aiTutor.streaming.length - 1) {
                controller.enqueue('data: [DONE]\n\n');
                controller.close();
              }
            }, index * 150);
          });
        },
      });

      return new HttpResponse(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return HttpResponse.json({
      message: 'Mock AI response from unified service',
      timestamp: new Date().toISOString(),
      model: 'deepseek-chat',
    });
  }),

  // Handle any other AI-related requests
  http.post('*/api/ai/*', () => {
    return HttpResponse.json({
      success: true,
      message: 'Mock AI service response',
      timestamp: new Date().toISOString(),
    });
  }),
];

/**
 * Initialize and start the mock server
 */
export async function initializeMockServer() {
  try {
    if (server) {
      console.log('📡 Mock server already running');
      return server;
    }

    server = setupServer(...handlers);
    
    // Start the server
    server.listen({
      onUnhandledRequest: 'warn',
    });

    console.log('✅ Mock server initialized successfully');
    console.log('📡 Intercepting AI service calls...');

    // Log active handlers
    console.log('🔧 Active mock handlers:');
    handlers.forEach((handler) => {
      console.log(`   - ${handler.info.method} ${handler.info.path}`);
    });

    return server;

  } catch (error) {
    console.error('❌ Failed to initialize mock server:', error);
    throw error;
  }
}

/**
 * Stop the mock server
 */
export async function stopMockServer() {
  try {
    if (server) {
      server.close();
      server = null;
      console.log('✅ Mock server stopped');
    } else {
      console.log('📡 Mock server was not running');
    }
  } catch (error) {
    console.error('❌ Failed to stop mock server:', error);
    throw error;
  }
}

/**
 * Reset mock server handlers (useful between tests)
 */
export function resetMockServer() {
  if (server) {
    server.resetHandlers();
    console.log('🔄 Mock server handlers reset');
  }
}

/**
 * Add custom handlers for specific tests
 */
export function addMockHandlers(...newHandlers: any[]) {
  if (server) {
    server.use(...newHandlers);
    console.log(`➕ Added ${newHandlers.length} custom mock handlers`);
  }
}

/**
 * Update mock responses for dynamic testing
 */
export function updateMockResponses(updates: Partial<typeof mockResponses>) {
  Object.assign(mockResponses, updates);
  console.log('🔄 Mock responses updated');
}

/**
 * Get current mock server instance
 */
export function getMockServer(): Server | null {
  return server;
}

/**
 * Mock response utilities for tests
 */
export const mockUtils = {
  // Simulate network delays
  withDelay: (handler: any, delay: number = 1000) => {
    return http.post(handler.info.path, async (info) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return handler.resolver(info);
    });
  },

  // Simulate errors
  withError: (path: string, status: number = 500, message: string = 'Mock server error') => {
    return http.post(path, () => {
      return HttpResponse.json(
        { error: message, timestamp: new Date().toISOString() },
        { status }
      );
    });
  },

  // Simulate rate limiting
  withRateLimit: (path: string) => {
    return http.post(path, () => {
      return HttpResponse.json(
        { error: 'Rate limit exceeded', retry_after: 60 },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    });
  },
};

export { mockResponses };