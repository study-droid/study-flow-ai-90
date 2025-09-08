/**
 * Tests for DeepSeek Streaming Processor
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  DeepSeekStreamingProcessor,
  createDeepSeekStreamingProcessor,
  processDeepSeekStream,
  type StreamingChunk,
  type StreamingCallbacks
} from '../deepseek-streaming-processor';

// Mock dependencies
vi.mock('../../markdown-response-processor', () => ({
  MarkdownResponseProcessor: {
    processResponse: vi.fn(() => ({
      content: 'Processed content',
      metadata: {
        contentType: 'explanation',
        wordCount: 50,
        estimatedReadTime: 1,
        headers: [],
        codeBlocks: [],
        isComplete: true,
        hasMarkdown: true
      },
      quality: {
        overall: 85,
        structure: 80,
        formatting: 90,
        completeness: 85,
        readability: 80
      },
      renderingHints: {
        shouldUseStreaming: false,
        preferredRenderer: 'markdown',
        customStyles: []
      },
      warnings: []
    }))
  }
}));

vi.mock('../deepseek-validator', () => ({
  validateDeepSeekResponse: vi.fn(() => ({
    isValid: true,
    processedResponse: {
      formattedResponse: {
        content: 'Validated content',
        metadata: { responseType: 'explanation', difficulty: 'medium', estimatedReadTime: 1 },
        structure: { headers: [], sections: [], codeBlocks: [] }
      },
      qualityAssessment: {
        overallScore: 85,
        breakdown: { structure: 80, consistency: 85, formatting: 90, completeness: 85, educational: 80 },
        recommendations: []
      },
      processingMetadata: {
        processingTime: 100,
        stepsCompleted: ['validation'],
        warnings: [],
        optimizations: []
      }
    },
    qualityAssessment: {
      overallScore: 85,
      breakdown: { structure: 80, consistency: 85, formatting: 90, completeness: 85, educational: 80 },
      recommendations: []
    },
    fallbacksUsed: [],
    warnings: [],
    validationMetrics: {
      processingTime: 100,
      contentLength: 50,
      markdownElements: 5,
      codeBlocks: 1,
      validationScore: 85,
      educationalScore: 80
    }
  }))
}));

vi.mock('../../logging/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('DeepSeekStreamingProcessor', () => {
  let processor: DeepSeekStreamingProcessor;
  let mockCallbacks: StreamingCallbacks;

  beforeEach(() => {
    mockCallbacks = {
      onChunk: vi.fn(),
      onProcessed: vi.fn(),
      onValidated: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn(),
      onStateChange: vi.fn()
    };

    processor = new DeepSeekStreamingProcessor({
      processIncrementally: true,
      validationThreshold: 10,
      processingInterval: 50
    }, mockCallbacks);
  });

  afterEach(() => {
    processor.dispose();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const defaultProcessor = new DeepSeekStreamingProcessor();
      expect(defaultProcessor).toBeDefined();
      expect(defaultProcessor.getState().accumulatedContent).toBe('');
      defaultProcessor.dispose();
    });

    it('should initialize with custom options', () => {
      const customProcessor = new DeepSeekStreamingProcessor({
        validationThreshold: 100,
        enableDebouncing: false
      });
      expect(customProcessor).toBeDefined();
      customProcessor.dispose();
    });
  });

  describe('Chunk Processing', () => {
    it('should process single chunk', async () => {
      const chunk: StreamingChunk = {
        content: 'Hello world',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      expect(mockCallbacks.onChunk).toHaveBeenCalledWith(chunk, expect.any(Object));
      expect(processor.getState().accumulatedContent).toBe('Hello world');
    });

    it('should process multiple chunks', async () => {
      const chunks: StreamingChunk[] = [
        {
          content: 'Hello ',
          isComplete: false,
          timestamp: Date.now(),
          chunkIndex: 0
        },
        {
          content: 'world!',
          isComplete: true,
          timestamp: Date.now() + 100,
          chunkIndex: 1
        }
      ];

      for (const chunk of chunks) {
        await processor.processChunk(chunk);
      }

      expect(processor.getState().accumulatedContent).toBe('Hello world!');
      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });

    it('should handle processing errors gracefully', async () => {
      // Mock markdown processor to throw error
      const { MarkdownResponseProcessor } = require('../../markdown-response-processor');
      MarkdownResponseProcessor.processResponse.mockImplementationOnce(() => {
        throw new Error('Processing failed');
      });

      const chunk: StreamingChunk = {
        content: 'Test content that will fail processing',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      expect(mockCallbacks.onError).toHaveBeenCalled();
      expect(processor.getState().errors.length).toBeGreaterThan(0);
    });
  });

  describe('Content Processing', () => {
    it('should process markdown incrementally', async () => {
      const chunk: StreamingChunk = {
        content: '# Hello\n\nThis is **bold** text.',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      // Should trigger processing due to sufficient content
      expect(mockCallbacks.onProcessed).toHaveBeenCalled();
    });

    it('should validate content when threshold is met', async () => {
      const chunk: StreamingChunk = {
        content: 'This is enough content to trigger validation process',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      expect(mockCallbacks.onValidated).toHaveBeenCalled();
    });

    it('should finalize processing on completion', async () => {
      const chunk: StreamingChunk = {
        content: 'Final content',
        isComplete: true,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      expect(mockCallbacks.onComplete).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track processing state correctly', async () => {
      const chunk: StreamingChunk = {
        content: 'Test content',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      const state = processor.getState();
      expect(state.accumulatedContent).toBe('Test content');
      expect(state.chunkCount).toBe(1);
    });

    it('should provide metrics', async () => {
      const chunk: StreamingChunk = {
        content: 'Test content for metrics',
        isComplete: true,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await processor.processChunk(chunk);

      const metrics = processor.getMetrics();
      expect(metrics.totalChunks).toBe(1);
      expect(metrics.contentLength).toBe(chunk.content.length);
      expect(metrics.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should reset state correctly', () => {
      processor.reset();

      const state = processor.getState();
      expect(state.accumulatedContent).toBe('');
      expect(state.chunkCount).toBe(0);
      expect(state.errors).toEqual([]);
      expect(state.warnings).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should retry on errors when enabled', async () => {
      const retryProcessor = new DeepSeekStreamingProcessor({
        retryOnError: true,
        maxRetries: 2
      }, mockCallbacks);

      // Mock to fail first time, succeed second time
      const { MarkdownResponseProcessor } = require('../../markdown-response-processor');
      MarkdownResponseProcessor.processResponse
        .mockImplementationOnce(() => { throw new Error('First failure'); })
        .mockImplementationOnce(() => ({
          content: 'Success',
          metadata: { contentType: 'explanation', wordCount: 1, estimatedReadTime: 1, headers: [], codeBlocks: [], isComplete: true, hasMarkdown: false },
          quality: { overall: 50, structure: 50, formatting: 50, completeness: 50, readability: 50 },
          renderingHints: { shouldUseStreaming: false, preferredRenderer: 'text', customStyles: [] },
          warnings: []
        }));

      const chunk: StreamingChunk = {
        content: 'Content that will initially fail',
        isComplete: false,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await retryProcessor.processChunk(chunk);

      // Should eventually succeed after retry
      expect(mockCallbacks.onProcessed).toHaveBeenCalled();
      
      retryProcessor.dispose();
    });

    it('should use fallback when processing fails', async () => {
      const fallbackProcessor = new DeepSeekStreamingProcessor({
        fallbackToRaw: true,
        retryOnError: false
      }, mockCallbacks);

      // Mock to always fail
      const { MarkdownResponseProcessor } = require('../../markdown-response-processor');
      MarkdownResponseProcessor.processResponse.mockImplementation(() => {
        throw new Error('Always fails');
      });

      const chunk: StreamingChunk = {
        content: 'Content for fallback test',
        isComplete: true,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      await fallbackProcessor.processChunk(chunk);

      const state = fallbackProcessor.getState();
      expect(state.processedContent).toBeDefined();
      expect(state.processedContent?.content).toBe('Content for fallback test');
      
      fallbackProcessor.dispose();
    });
  });

  describe('Convenience Functions', () => {
    it('should create processor with convenience function', () => {
      const convenienceProcessor = createDeepSeekStreamingProcessor();
      expect(convenienceProcessor).toBeInstanceOf(DeepSeekStreamingProcessor);
      convenienceProcessor.dispose();
    });

    it('should process complete stream', async () => {
      const chunks: StreamingChunk[] = [
        { content: 'Hello ', isComplete: false, timestamp: Date.now(), chunkIndex: 0 },
        { content: 'world!', isComplete: true, timestamp: Date.now() + 100, chunkIndex: 1 }
      ];

      const result = await processDeepSeekStream(chunks);
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', async () => {
      const largeContent = 'A'.repeat(10000);
      const chunk: StreamingChunk = {
        content: largeContent,
        isComplete: true,
        timestamp: Date.now(),
        chunkIndex: 0
      };

      const startTime = performance.now();
      await processor.processChunk(chunk);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(processor.getState().accumulatedContent).toBe(largeContent);
    });

    it('should handle rapid chunk processing', async () => {
      const chunks: StreamingChunk[] = [];
      for (let i = 0; i < 100; i++) {
        chunks.push({
          content: `Chunk ${i} `,
          isComplete: i === 99,
          timestamp: Date.now() + i,
          chunkIndex: i
        });
      }

      const startTime = performance.now();
      for (const chunk of chunks) {
        await processor.processChunk(chunk);
      }
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(processor.getState().chunkCount).toBe(100);
    });
  });
});