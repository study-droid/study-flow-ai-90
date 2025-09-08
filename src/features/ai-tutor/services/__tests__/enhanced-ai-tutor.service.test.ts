/**
 * Enhanced AI Tutor Service Tests
 * Tests for the new multi-provider AI tutor service with intelligent routing
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { aiTutorService } from '../ai-tutor.service';
import type { ChatEvent } from '../../types';

// Mock the unified AI service and router
vi.mock('@/services/ai/unified-ai-service', () => ({
  unifiedAIService: {
    streamMessage: vi.fn(),
    getServiceHealth: vi.fn(() => ({
      overall: 'healthy',
      providers: [],
      lastCheck: new Date(),
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0
      }
    })),
    resetServices: vi.fn()
  }
}));

vi.mock('@/services/ai/ai-provider-router', () => ({
  aiProviderRouter: {
    getAvailableProviders: vi.fn(() => [
      {
        id: 'deepseek',
        name: 'DeepSeek',
        type: 'direct-api',
        capabilities: [{ type: 'text-generation' }],
        priority: 1
      }
    ]),
    getAllProviderHealth: vi.fn(() => [
      {
        id: 'deepseek',
        status: 'online',
        responseTime: 100,
        errorRate: 0,
        lastSuccess: new Date()
      }
    ]),
    selectProvider: vi.fn(() => ({
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'direct-api'
    })),
    getProvider: vi.fn(() => ({
      id: 'deepseek',
      name: 'DeepSeek',
      type: 'direct-api'
    })),
    isProviderAvailable: vi.fn(() => true),
    setFallbackChain: vi.fn(),
    updateProviderHealth: vi.fn()
  }
}));

vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('Enhanced AI Tutor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any intervals
    aiTutorService.destroy();
  });

  describe('Service Initialization', () => {
    it('should initialize with provider routing', () => {
      expect(aiTutorService).toBeDefined();
      expect(aiTutorService.getAvailableProviders).toBeDefined();
      expect(aiTutorService.getServiceHealth).toBeDefined();
    });

    it('should have available providers', () => {
      const providers = aiTutorService.getAvailableProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].id).toBe('deepseek');
      expect(providers[0].name).toBe('DeepSeek');
    });
  });

  describe('Service Health Monitoring', () => {
    it('should return service health status', () => {
      const health = aiTutorService.getServiceHealth();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('providers');
      expect(health).toHaveProperty('lastCheck');
      expect(health).toHaveProperty('metrics');
      
      expect(health.providers).toHaveLength(1);
      expect(health.providers[0].id).toBe('deepseek');
      expect(health.providers[0].status).toBe('online');
    });

    it('should allow provider switching', () => {
      const result = aiTutorService.switchProvider('deepseek');
      expect(result).toBe(true);
    });

    it('should reject switching to unavailable provider', async () => {
      const { aiProviderRouter } = await import('@/services/ai/ai-provider-router');
      vi.mocked(aiProviderRouter.getProvider).mockReturnValueOnce(null);
      
      const result = aiTutorService.switchProvider('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should create new sessions', () => {
      const session = aiTutorService.createSession('Test Session');
      
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('title');
      expect(session).toHaveProperty('messages');
      expect(session).toHaveProperty('isActive');
      expect(session.title).toBe('Test Session');
      expect(session.messages).toHaveLength(0);
      expect(session.isActive).toBe(true);
    });

    it('should create messages', () => {
      const sessionId = 'test-session';
      const message = aiTutorService.createMessage('user', 'Hello', sessionId);
      
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('sessionId');
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
      expect(message.sessionId).toBe(sessionId);
    });

    it('should generate session titles', () => {
      const title = aiTutorService.generateSessionTitle('This is a test message');
      expect(title).toBe('This is a test message');
      
      const longTitle = aiTutorService.generateSessionTitle('This is a very long message that should be truncated because it exceeds the maximum length');
      expect(longTitle).toHaveLength(53); // 50 chars + '...'
      expect(longTitle.endsWith('...')).toBe(true);
    });
  });

  describe('Service Reset', () => {
    it('should reset services', async () => {
      const { unifiedAIService } = await import('@/services/ai/unified-ai-service');
      
      aiTutorService.resetServices();
      
      expect(unifiedAIService.resetServices).toHaveBeenCalled();
    });
  });

  describe('Export Functionality', () => {
    it('should export sessions in different formats', () => {
      const session = aiTutorService.createSession('Test Session');
      session.messages = [
        aiTutorService.createMessage('user', 'Hello', session.id),
        aiTutorService.createMessage('assistant', 'Hi there!', session.id)
      ];

      const jsonExport = aiTutorService.exportSession(session, 'json');
      expect(() => JSON.parse(jsonExport)).not.toThrow();

      const txtExport = aiTutorService.exportSession(session, 'txt');
      expect(txtExport).toContain('Test Session');
      expect(txtExport).toContain('[USER]: Hello');
      expect(txtExport).toContain('[ASSISTANT]: Hi there!');

      const mdExport = aiTutorService.exportSession(session, 'md');
      expect(mdExport).toContain('# Test Session');
      expect(mdExport).toContain('**You**');
      expect(mdExport).toContain('**AI Tutor**');
    });
  });

  describe('Search Functionality', () => {
    it('should search sessions', () => {
      const sessions = [
        {
          ...aiTutorService.createSession('Math Help'),
          messages: [aiTutorService.createMessage('user', 'Help with algebra', 'session1')]
        },
        {
          ...aiTutorService.createSession('Science Questions'),
          messages: [aiTutorService.createMessage('user', 'Physics problem', 'session2')]
        }
      ];

      const mathResults = aiTutorService.searchSessions(sessions, 'math');
      expect(mathResults).toHaveLength(1);
      expect(mathResults[0].title).toBe('Math Help');

      const algebraResults = aiTutorService.searchSessions(sessions, 'algebra');
      expect(algebraResults).toHaveLength(1);
      expect(algebraResults[0].title).toBe('Math Help');

      const noResults = aiTutorService.searchSessions(sessions, 'chemistry');
      expect(noResults).toHaveLength(0);
    });
  });

  describe('Session Statistics', () => {
    it('should calculate session stats', () => {
      const session = aiTutorService.createSession('Test Session');
      session.messages = [
        { ...aiTutorService.createMessage('user', 'Hello', session.id), metadata: { tokens: 10 } },
        { ...aiTutorService.createMessage('assistant', 'Hi there!', session.id), metadata: { tokens: 15 } },
        { ...aiTutorService.createMessage('user', 'How are you?', session.id), metadata: { tokens: 8 } }
      ];

      const stats = aiTutorService.getSessionStats(session);
      
      expect(stats.messageCount).toBe(3);
      expect(stats.userMessages).toBe(2);
      expect(stats.assistantMessages).toBe(1);
      expect(stats.totalTokens).toBe(33);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
    });
  });
});