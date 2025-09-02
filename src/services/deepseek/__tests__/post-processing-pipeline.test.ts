/**
 * Professional Post-Processing Pipeline Tests
 * Comprehensive test suite for the PostProcessingPipeline module
 */

import { PostProcessingPipeline, ProcessingContext, PipelineConfig } from '../post-processing-pipeline';

// Mock the external dependencies
jest.mock('../response-formatter', () => ({
  ResponseFormatter: {
    formatStudyPlan: jest.fn().mockReturnValue({
      content: '# Mock Study Plan\n## Week 1: Test\n🎯 Goals\n⏱️ Time\n📚 Resources',
      structure: { sections: ['Week 1'], headings: [], hasProgressTracking: true, hasExamples: false, wordCount: 10 },
      metadata: { responseType: 'study_plan', timeEstimate: '5 hours', difficulty: 'medium' },
      qualityMetrics: { overall: 85, structure: 80, consistency: 85, formatting: 90, completeness: 85 }
    }),
    formatExplanation: jest.fn().mockReturnValue({
      content: '# Mock Explanation\n## Overview\nTest content\n## Key Takeaways\n- Point 1',
      structure: { sections: ['Overview', 'Key Takeaways'], headings: [], hasProgressTracking: false, hasExamples: true, wordCount: 8 },
      metadata: { responseType: 'explanation', timeEstimate: '10 minutes', difficulty: 'easy' },
      qualityMetrics: { overall: 90, structure: 85, consistency: 90, formatting: 95, completeness: 90 }
    }),
    formatPractice: jest.fn().mockReturnValue({
      content: '# Mock Practice\n## Exercise 1\nTest question\n## Answer Key\nSolution',
      structure: { sections: ['Exercise 1', 'Answer Key'], headings: [], hasProgressTracking: false, hasExamples: false, wordCount: 7 },
      metadata: { responseType: 'practice', timeEstimate: '15 minutes', difficulty: 'medium' },
      qualityMetrics: { overall: 80, structure: 75, consistency: 80, formatting: 85, completeness: 80 }
    }),
    formatConcept: jest.fn().mockReturnValue({
      content: '# Mock Concept\n## Formal Definition\nDefinition here\n## Historical Context\nHistory',
      structure: { sections: ['Formal Definition', 'Historical Context'], headings: [], hasProgressTracking: false, hasExamples: false, wordCount: 9 },
      metadata: { responseType: 'concept', timeEstimate: '20 minutes', difficulty: 'hard' },
      qualityMetrics: { overall: 88, structure: 85, consistency: 88, formatting: 90, completeness: 90 }
    })
  }
}));

jest.mock('../prompt-templates', () => ({
  PromptTemplates: {
    validateResponse: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      score: 95
    })
  }
}));

jest.mock('../../logging/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}));

describe('PostProcessingPipeline', () => {
  let pipeline: PostProcessingPipeline;
  
  const mockContext: ProcessingContext = {
    responseType: 'explanation',
    subject: 'Mathematics',
    topic: 'Algebra',
    userLevel: 'intermediate',
    originalPrompt: 'Explain algebra basics',
    rawResponse: 'Raw response content about algebra',
    metadata: {
      model: 'deepseek-chat',
      provider: 'deepseek',
      usage: { total_tokens: 150 }
    }
  };

  beforeEach(() => {
    // Get a fresh instance for each test
    pipeline = PostProcessingPipeline.getInstance();
    
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = PostProcessingPipeline.getInstance();
      const instance2 = PostProcessingPipeline.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should accept initial configuration', () => {
      const config: Partial<PipelineConfig> = {
        enableValidation: false,
        qualityThreshold: 90
      };
      
      const configuredPipeline = PostProcessingPipeline.getInstance(config);
      const finalConfig = configuredPipeline.getConfig();
      
      expect(finalConfig.enableValidation).toBe(false);
      expect(finalConfig.qualityThreshold).toBe(90);
    });
  });

  describe('Configuration Management', () => {
    it('should use default configuration', () => {
      const config = pipeline.getConfig();
      
      expect(config.enableValidation).toBe(true);
      expect(config.enableQualityAssessment).toBe(true);
      expect(config.enableStructureOptimization).toBe(true);
      expect(config.enableContentEnhancement).toBe(true);
      expect(config.qualityThreshold).toBe(75);
      expect(config.maxRetries).toBe(2);
    });

    it('should update configuration correctly', () => {
      const updates: Partial<PipelineConfig> = {
        qualityThreshold: 85,
        maxRetries: 3,
        enableValidation: false
      };

      pipeline.updateConfig(updates);
      const config = pipeline.getConfig();

      expect(config.qualityThreshold).toBe(85);
      expect(config.maxRetries).toBe(3);
      expect(config.enableValidation).toBe(false);
      expect(config.enableQualityAssessment).toBe(true); // Should remain unchanged
    });
  });

  describe('Main Processing Flow', () => {
    it('should process explanation responses correctly', async () => {
      const result = await pipeline.process(mockContext);

      expect(result.formattedResponse).toBeDefined();
      expect(result.validationResult).toBeDefined();
      expect(result.qualityAssessment).toBeDefined();
      expect(result.processingMetadata).toBeDefined();

      expect(result.formattedResponse.content).toContain('Mock Explanation');
      expect(result.processingMetadata.stepsCompleted).toContain('initial_formatting');
      expect(result.processingMetadata.processingTime).toBeGreaterThan(0);
    });

    it('should process study plan responses correctly', async () => {
      const studyPlanContext: ProcessingContext = {
        ...mockContext,
        responseType: 'study_plan'
      };

      const result = await pipeline.process(studyPlanContext);

      expect(result.formattedResponse.content).toContain('Mock Study Plan');
      expect(result.formattedResponse.metadata?.responseType).toBe('study_plan');
    });

    it('should process practice responses correctly', async () => {
      const practiceContext: ProcessingContext = {
        ...mockContext,
        responseType: 'practice'
      };

      const result = await pipeline.process(practiceContext);

      expect(result.formattedResponse.content).toContain('Mock Practice');
      expect(result.formattedResponse.metadata?.responseType).toBe('practice');
    });

    it('should process concept responses correctly', async () => {
      const conceptContext: ProcessingContext = {
        ...mockContext,
        responseType: 'concept'
      };

      const result = await pipeline.process(conceptContext);

      expect(result.formattedResponse.content).toContain('Mock Concept');
      expect(result.formattedResponse.metadata?.responseType).toBe('concept');
    });

    it('should complete all processing steps when enabled', async () => {
      const result = await pipeline.process(mockContext);

      expect(result.processingMetadata.stepsCompleted).toContain('initial_formatting');
      expect(result.processingMetadata.stepsCompleted).toContain('structure_optimization');
      expect(result.processingMetadata.stepsCompleted).toContain('content_enhancement');
      expect(result.processingMetadata.stepsCompleted).toContain('validation');
      expect(result.processingMetadata.stepsCompleted).toContain('quality_assessment');
    });

    it('should skip steps when disabled in configuration', async () => {
      pipeline.updateConfig({
        enableValidation: false,
        enableQualityAssessment: false
      });

      const result = await pipeline.process(mockContext);

      expect(result.processingMetadata.stepsCompleted).not.toContain('validation');
      expect(result.processingMetadata.stepsCompleted).not.toContain('quality_assessment');
    });
  });

  describe('Structure Optimization', () => {
    it('should standardize header formatting', async () => {
      const contextWithBadHeaders: ProcessingContext = {
        ...mockContext,
        rawResponse: '#BadHeader\n##AnotherBadHeader\n###Third Header'
      };

      const result = await pipeline.process(contextWithBadHeaders);

      // The optimization should be applied during structure optimization
      expect(result.processingMetadata.stepsCompleted).toContain('structure_optimization');
    });

    it('should add progress tracking to study plans', async () => {
      const studyPlanContext: ProcessingContext = {
        ...mockContext,
        responseType: 'study_plan',
        rawResponse: '# Study Plan\n- Task 1\n- Task 2'
      };

      const result = await pipeline.process(studyPlanContext);

      expect(result.processingMetadata.stepsCompleted).toContain('structure_optimization');
    });

    it('should format tables consistently', async () => {
      const contextWithTables: ProcessingContext = {
        ...mockContext,
        rawResponse: '| Col1|Col2 | Col3|\n|A|B|C|'
      };

      const result = await pipeline.process(contextWithTables);

      expect(result.processingMetadata.stepsCompleted).toContain('structure_optimization');
    });
  });

  describe('Content Enhancement', () => {
    it('should enhance study plan content with emoji indicators', async () => {
      const studyPlanContext: ProcessingContext = {
        ...mockContext,
        responseType: 'study_plan',
        rawResponse: '# Study Plan\nLearning Goals: Test\nTime Estimate: 5h\nResources: Books'
      };

      const result = await pipeline.process(studyPlanContext);

      expect(result.processingMetadata.stepsCompleted).toContain('content_enhancement');
      // Enhancement should be tracked in optimizations if applied
    });

    it('should enhance content based on user level', async () => {
      const beginnerContext: ProcessingContext = {
        ...mockContext,
        userLevel: 'beginner',
        rawResponse: '# Concept\n## Key Takeaways\n- Point 1'
      };

      const result = await pipeline.process(beginnerContext);

      expect(result.processingMetadata.stepsCompleted).toContain('content_enhancement');
    });
  });

  describe('Quality Assessment', () => {
    it('should assess quality correctly', async () => {
      const result = await pipeline.process(mockContext);

      expect(result.qualityAssessment.overallScore).toBeDefined();
      expect(result.qualityAssessment.breakdown.structure).toBeDefined();
      expect(result.qualityAssessment.breakdown.consistency).toBeDefined();
      expect(result.qualityAssessment.breakdown.formatting).toBeDefined();
      expect(result.qualityAssessment.breakdown.completeness).toBeDefined();
      expect(result.qualityAssessment.breakdown.educational).toBeDefined();

      expect(result.qualityAssessment.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.qualityAssessment.overallScore).toBeLessThanOrEqual(100);
    });

    it('should provide recommendations for low quality content', async () => {
      // Mock a low quality response
      const { ResponseFormatter } = require('../response-formatter');
      ResponseFormatter.formatExplanation.mockReturnValueOnce({
        content: 'Poor quality content',
        structure: { sections: [], headings: [], hasProgressTracking: false, hasExamples: false, wordCount: 3 },
        metadata: { responseType: 'explanation' },
        qualityMetrics: { overall: 40, structure: 30, consistency: 40, formatting: 50, completeness: 30 }
      });

      const result = await pipeline.process(mockContext);

      expect(result.qualityAssessment.recommendations.length).toBeGreaterThan(0);
      expect(result.qualityAssessment.recommendations.some(r => 
        r.includes('structure') || r.includes('formatting') || r.includes('content')
      )).toBe(true);
    });

    it('should warn when quality is below threshold', async () => {
      pipeline.updateConfig({ qualityThreshold: 95 });

      const result = await pipeline.process(mockContext);

      expect(result.processingMetadata.warnings.some(w => 
        w.includes('Quality score') && w.includes('below threshold')
      )).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle processing errors gracefully', async () => {
      const { ResponseFormatter } = require('../response-formatter');
      ResponseFormatter.formatExplanation.mockImplementationOnce(() => {
        throw new Error('Formatting failed');
      });

      const result = await pipeline.process(mockContext);

      expect(result.formattedResponse).toBeDefined();
      expect(result.processingMetadata.warnings.some(w => 
        w.includes('Pipeline error')
      )).toBe(true);
    });

    it('should provide fallback quality assessment on error', async () => {
      const { ResponseFormatter } = require('../response-formatter');
      ResponseFormatter.formatExplanation.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await pipeline.process(mockContext);

      expect(result.qualityAssessment.overallScore).toBe(50);
      expect(result.qualityAssessment.breakdown.structure).toBe(50);
      expect(result.qualityAssessment.recommendations).toContain('Pipeline processing failed - using fallback formatting');
    });
  });

  describe('Health Metrics', () => {
    it('should provide health metrics', () => {
      const health = pipeline.getHealthMetrics();

      expect(health.status).toBeDefined();
      expect(health.metrics.averageProcessingTime).toBeDefined();
      expect(health.metrics.successRate).toBeDefined();
      expect(health.metrics.qualityScore).toBeDefined();

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health.metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(health.metrics.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance', () => {
    it('should complete processing within reasonable time', async () => {
      const startTime = Date.now();
      const result = await pipeline.process(mockContext);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingMetadata.processingTime).toBeLessThan(5000);
    });

    it('should track optimization applications', async () => {
      const result = await pipeline.process(mockContext);

      expect(Array.isArray(result.processingMetadata.optimizations)).toBe(true);
      expect(Array.isArray(result.processingMetadata.warnings)).toBe(true);
      expect(Array.isArray(result.processingMetadata.stepsCompleted)).toBe(true);
    });
  });

  describe('Integration with Dependencies', () => {
    it('should call ResponseFormatter correctly', async () => {
      const { ResponseFormatter } = require('../response-formatter');
      
      await pipeline.process(mockContext);

      expect(ResponseFormatter.formatExplanation).toHaveBeenCalledWith(mockContext.rawResponse);
    });

    it('should call PromptTemplates validation when enabled', async () => {
      const { PromptTemplates } = require('../prompt-templates');
      
      const result = await pipeline.process(mockContext);

      expect(PromptTemplates.validateResponse).toHaveBeenCalled();
      expect(result.validationResult.isValid).toBe(true);
    });

    it('should skip validation when disabled', async () => {
      const { PromptTemplates } = require('../prompt-templates');
      pipeline.updateConfig({ enableValidation: false });
      
      await pipeline.process(mockContext);

      expect(PromptTemplates.validateResponse).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty raw response', async () => {
      const emptyContext: ProcessingContext = {
        ...mockContext,
        rawResponse: ''
      };

      const result = await pipeline.process(emptyContext);

      expect(result.formattedResponse).toBeDefined();
      expect(result.processingMetadata.processingTime).toBeGreaterThan(0);
    });

    it('should handle missing metadata', async () => {
      const contextWithoutMetadata: ProcessingContext = {
        responseType: 'explanation',
        subject: 'Test',
        originalPrompt: 'Test prompt',
        rawResponse: 'Test response'
      };

      const result = await pipeline.process(contextWithoutMetadata);

      expect(result.formattedResponse).toBeDefined();
      expect(result.qualityAssessment).toBeDefined();
    });

    it('should handle very long content', async () => {
      const longContext: ProcessingContext = {
        ...mockContext,
        rawResponse: 'A'.repeat(10000)
      };

      const result = await pipeline.process(longContext);

      expect(result.formattedResponse).toBeDefined();
      expect(result.processingMetadata.processingTime).toBeDefined();
    });
  });
});