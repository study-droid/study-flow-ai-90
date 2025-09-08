/**
 * Thinking State Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ThinkingStateService } from '../thinking-state.service';

describe('ThinkingStateService', () => {
  let service: ThinkingStateService;

  beforeEach(() => {
    service = new ThinkingStateService();
  });

  describe('analyzeMessage', () => {
    it('detects question message type correctly', () => {
      const result = service.analyzeMessage('What is machine learning?');
      expect(result.messageType).toBe('question');
    });

    it('detects problem-solving message type correctly', () => {
      const result = service.analyzeMessage('Solve this equation: 2x + 5 = 15');
      expect(result.messageType).toBe('problem-solving');
    });

    it('detects creative message type correctly', () => {
      const result = service.analyzeMessage('Create a story about a robot');
      expect(result.messageType).toBe('creative');
    });

    it('detects explanation message type correctly', () => {
      const result = service.analyzeMessage('Explain how photosynthesis works');
      expect(result.messageType).toBe('explanation');
    });

    it('detects factual message type correctly', () => {
      const result = service.analyzeMessage('Define artificial intelligence');
      expect(result.messageType).toBe('factual');
    });

    it('defaults to conversational for unclear messages', () => {
      const result = service.analyzeMessage('Hello there');
      expect(result.messageType).toBe('conversational');
    });

    it('assesses simple complexity correctly', () => {
      const result = service.analyzeMessage('Hi');
      expect(result.complexity).toBe('simple');
    });

    it('assesses moderate complexity correctly', () => {
      const result = service.analyzeMessage('What is the difference between machine learning and deep learning? Please explain the key concepts and applications.');
      expect(result.complexity).toBe('moderate');
    });

    it('assesses complex complexity correctly', () => {
      const result = service.analyzeMessage('Explain the mathematical foundations of neural networks including backpropagation algorithm and gradient descent optimization with detailed mathematical derivations');
      expect(result.complexity).toBe('complex');
    });

    it('assesses advanced complexity correctly', () => {
      const result = service.analyzeMessage('Derive the complete mathematical proof for the universal approximation theorem in neural networks and explain its implications for deep learning architectures with multiple hidden layers, activation functions, and provide computational complexity analysis with gradient descent optimization algorithms');
      expect(result.complexity).toBe('advanced');
    });

    it('detects subject areas correctly', () => {
      expect(service.analyzeMessage('Calculate the derivative of x^2 using calculus').subject).toBe('mathematics');
      expect(service.analyzeMessage('Explain photosynthesis biology process').subject).toBe('science');
      expect(service.analyzeMessage('Debug this JavaScript programming function').subject).toBe('programming');
      expect(service.analyzeMessage('Write an essay about Shakespeare literature').subject).toBe('language');
      expect(service.analyzeMessage('Tell me about World War II history').subject).toBe('history');
    });
  });

  describe('generateThinkingState', () => {
    const mockContext = {
      messageContent: 'What is machine learning?',
      messageType: 'question' as const,
      complexity: 'moderate' as const,
      subject: 'technology'
    };

    it('generates thinking state for analyzing stage', () => {
      const result = service.generateThinkingState('analyzing', mockContext);
      
      expect(result.stage).toBe('analyzing');
      expect(result.isVisible).toBe(true);
      expect(result.messageType).toBe('question');
      expect(result.complexity).toBe('moderate');
      expect(result.contextualMessage).toContain('question');
      expect(result.estimatedDuration).toBeGreaterThan(0);
      expect(result.animations.colorScheme).toBe('blue');
    });

    it('generates thinking state for reasoning stage', () => {
      const result = service.generateThinkingState('reasoning', mockContext);
      
      expect(result.stage).toBe('reasoning');
      expect(result.animations.colorScheme).toBe('purple');
      expect(result.contextualMessage).toContain('answer');
    });

    it('generates thinking state for responding stage', () => {
      const result = service.generateThinkingState('responding', mockContext);
      
      expect(result.stage).toBe('responding');
      expect(result.animations.colorScheme).toBe('green');
      expect(result.contextualMessage).toContain('response');
    });

    it('adjusts animations based on complexity', () => {
      const simpleContext = { ...mockContext, complexity: 'simple' as const };
      const advancedContext = { ...mockContext, complexity: 'advanced' as const };
      
      const simpleResult = service.generateThinkingState('analyzing', simpleContext);
      const advancedResult = service.generateThinkingState('analyzing', advancedContext);
      
      expect(advancedResult.animations.particleCount).toBeGreaterThan(simpleResult.animations.particleCount);
      expect(advancedResult.animations.pulseIntensity).toBeGreaterThan(simpleResult.animations.pulseIntensity);
    });

    it('provides different messages for different message types', () => {
      const questionContext = { ...mockContext, messageType: 'question' as const };
      const problemContext = { ...mockContext, messageType: 'problem-solving' as const };
      
      const questionResult = service.generateThinkingState('analyzing', questionContext);
      const problemResult = service.generateThinkingState('analyzing', problemContext);
      
      expect(questionResult.contextualMessage).not.toBe(problemResult.contextualMessage);
    });

    it('provides different messages for different complexity levels', () => {
      const simpleContext = { ...mockContext, complexity: 'simple' as const };
      const advancedContext = { ...mockContext, complexity: 'advanced' as const };
      
      const simpleResult = service.generateThinkingState('analyzing', simpleContext);
      const advancedResult = service.generateThinkingState('analyzing', advancedContext);
      
      expect(simpleResult.contextualMessage).not.toBe(advancedResult.contextualMessage);
    });
  });

  describe('updateThinkingProgress', () => {
    const mockState = {
      isVisible: true,
      content: 'Original content',
      stage: 'analyzing' as const,
      progress: 25,
      contextualMessage: 'Original message',
      estimatedDuration: 2000,
      messageType: 'question' as const,
      complexity: 'moderate' as const,
      animations: {
        primaryAnimation: 'pulse-analyze',
        particleCount: 6,
        pulseIntensity: 0.6,
        colorScheme: 'blue'
      }
    };

    it('updates progress correctly', () => {
      const result = service.updateThinkingProgress(mockState, 75);
      expect(result.progress).toBe(75);
    });

    it('clamps progress to valid range', () => {
      const resultHigh = service.updateThinkingProgress(mockState, 150);
      const resultLow = service.updateThinkingProgress(mockState, -10);
      
      expect(resultHigh.progress).toBe(100);
      expect(resultLow.progress).toBe(0);
    });

    it('updates content when additional context is provided', () => {
      const result = service.updateThinkingProgress(mockState, 50, 'New context message');
      expect(result.content).toBe('New context message');
      expect(result.contextualMessage).toBe('New context message');
    });

    it('preserves other state properties', () => {
      const result = service.updateThinkingProgress(mockState, 50);
      expect(result.stage).toBe(mockState.stage);
      expect(result.messageType).toBe(mockState.messageType);
      expect(result.complexity).toBe(mockState.complexity);
      expect(result.animations).toEqual(mockState.animations);
    });
  });

  describe('generateStageTransition', () => {
    const mockContext = {
      messageContent: 'What is machine learning?',
      messageType: 'question' as const,
      complexity: 'moderate' as const,
      subject: 'technology'
    };

    it('generates transition from analyzing to reasoning', () => {
      const result = service.generateStageTransition('analyzing', 'reasoning', mockContext);
      expect(result.progress).toBe(30); // reasoning stage starts at 30%
      expect(result.message).toContain('analysis');
    });

    it('generates transition from reasoning to responding', () => {
      const result = service.generateStageTransition('reasoning', 'responding', mockContext);
      expect(result.progress).toBe(80); // responding stage starts at 80%
      expect(result.message).toContain('response');
    });

    it('generates transition from analyzing to responding', () => {
      const result = service.generateStageTransition('analyzing', 'responding', mockContext);
      expect(result.progress).toBe(80);
      expect(result.message).toContain('response');
    });
  });

  describe('private methods behavior', () => {
    it('calculates estimated duration based on complexity', () => {
      const simpleContext = {
        messageContent: 'Hi',
        messageType: 'conversational' as const,
        complexity: 'simple' as const
      };
      
      const complexContext = {
        messageContent: 'Explain quantum computing algorithms',
        messageType: 'explanation' as const,
        complexity: 'advanced' as const
      };
      
      const simpleState = service.generateThinkingState('analyzing', simpleContext);
      const complexState = service.generateThinkingState('analyzing', complexContext);
      
      expect(complexState.estimatedDuration).toBeGreaterThan(simpleState.estimatedDuration);
    });

    it('generates appropriate progress ranges for different stages', () => {
      const context = {
        messageContent: 'Test message',
        messageType: 'question' as const,
        complexity: 'moderate' as const
      };
      
      const analyzingState = service.generateThinkingState('analyzing', context);
      const reasoningState = service.generateThinkingState('reasoning', context);
      const respondingState = service.generateThinkingState('responding', context);
      
      expect(analyzingState.progress).toBeLessThan(30);
      expect(reasoningState.progress).toBeGreaterThanOrEqual(30);
      expect(reasoningState.progress).toBeLessThan(80);
      expect(respondingState.progress).toBeGreaterThanOrEqual(80);
    });
  });
});