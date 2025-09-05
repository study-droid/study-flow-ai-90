/**
 * Tests for AI Tutor Zod Schemas
 * Comprehensive validation testing for type safety and defaults
 */

import { describe, it, expect } from 'vitest';
import {
  RequestSchema,
  UserPreferencesSchema,
  ResponseStructureSchema,
  QualityAssessmentSchema,
  ProcessingMetadataSchema,
  RequiredResponseStructureSchema,
  PipelineContextSchema,
  validateWithDefaults
} from '../../types/ai-tutor-schemas';

describe('AI Tutor Zod Schemas', () => {
  describe('RequestSchema', () => {
    it('should validate a complete request', () => {
      const validRequest = {
        task: 'Explain photosynthesis',
        responseType: 'explanation',
        educational: {
          subject: 'biology',
          difficulty: 'intermediate',
          targetAudience: 'high-school'
        },
        context: 'Student is preparing for exam'
      };

      const result = RequestSchema.parse(validRequest);
      expect(result.task).toBe('Explain photosynthesis');
      expect(result.responseType).toBe('explanation');
      expect(result.educational.subject).toBe('biology');
    });

    it('should apply defaults for missing optional fields', () => {
      const minimalRequest = {
        task: 'Simple question'
      };

      const result = RequestSchema.parse(minimalRequest);
      expect(result.responseType).toBe('structured');
      expect(result.educational.difficulty).toBe('intermediate');
      expect(result.educational.targetAudience).toBe('general');
    });

    it('should validate response types', () => {
      const validTypes = ['explanation', 'study_plan', 'practice', 'concept_analysis', 'structured', 'chat'];
      
      validTypes.forEach(type => {
        const request = { task: 'test', responseType: type };
        expect(() => RequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should reject invalid response types', () => {
      const invalidRequest = {
        task: 'test',
        responseType: 'invalid_type'
      };

      expect(() => RequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate difficulty levels', () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      
      validDifficulties.forEach(difficulty => {
        const request = {
          task: 'test',
          educational: { difficulty }
        };
        expect(() => RequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should reject invalid difficulty levels', () => {
      const invalidRequest = {
        task: 'test',
        educational: { difficulty: 'expert' }
      };

      expect(() => RequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate target audiences', () => {
      const validAudiences = ['elementary', 'middle-school', 'high-school', 'undergraduate', 'graduate', 'professional', 'general'];
      
      validAudiences.forEach(audience => {
        const request = {
          task: 'test',
          educational: { targetAudience: audience }
        };
        expect(() => RequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should require non-empty task', () => {
      const emptyTaskRequest = { task: '' };
      expect(() => RequestSchema.parse(emptyTaskRequest)).toThrow();

      const whitespaceTaskRequest = { task: '   ' };
      expect(() => RequestSchema.parse(whitespaceTaskRequest)).toThrow();
    });
  });

  describe('UserPreferencesSchema', () => {
    it('should validate complete user preferences', () => {
      const validPrefs = {
        request: {
          requestComplexity: 'medium',
          responseFormat: 'structured',
          includeExamples: true,
          includeCodeBlocks: false
        },
        response: {
          preferredLength: 'medium',
          includeMetrics: true,
          showProcessingSteps: false
        }
      };

      const result = UserPreferencesSchema.parse(validPrefs);
      expect(result.request.requestComplexity).toBe('medium');
      expect(result.response.preferredLength).toBe('medium');
    });

    it('should apply defaults for missing preferences', () => {
      const minimalPrefs = {};

      const result = UserPreferencesSchema.parse(minimalPrefs);
      expect(result.request.requestComplexity).toBe('medium');
      expect(result.request.responseFormat).toBe('structured');
      expect(result.request.includeExamples).toBe(true);
      expect(result.response.preferredLength).toBe('medium');
      expect(result.response.includeMetrics).toBe(false);
    });

    it('should validate complexity levels', () => {
      const validComplexities = ['low', 'medium', 'high'];
      
      validComplexities.forEach(complexity => {
        const prefs = { request: { requestComplexity: complexity } };
        expect(() => UserPreferencesSchema.parse(prefs)).not.toThrow();
      });
    });

    it('should validate response formats', () => {
      const validFormats = ['structured', 'conversational', 'bullet-points', 'step-by-step'];
      
      validFormats.forEach(format => {
        const prefs = { request: { responseFormat: format } };
        expect(() => UserPreferencesSchema.parse(prefs)).not.toThrow();
      });
    });

    it('should validate length preferences', () => {
      const validLengths = ['short', 'medium', 'long', 'comprehensive'];
      
      validLengths.forEach(length => {
        const prefs = { response: { preferredLength: length } };
        expect(() => UserPreferencesSchema.parse(prefs)).not.toThrow();
      });
    });
  });

  describe('ResponseStructureSchema', () => {
    it('should validate complete response structure', () => {
      const validStructure = {
        sections: [
          {
            title: 'Introduction',
            content: 'Basic overview',
            subsections: [
              { title: 'Sub 1', content: 'Sub content' }
            ]
          }
        ],
        keyPoints: ['Point 1', 'Point 2'],
        examples: ['Example 1', 'Example 2'],
        codeBlocks: [
          { language: 'javascript', code: 'console.log("hello");' }
        ],
        conclusion: 'Summary of key concepts'
      };

      const result = ResponseStructureSchema.parse(validStructure);
      expect(result.sections).toHaveLength(1);
      expect(result.keyPoints).toHaveLength(2);
      expect(result.codeBlocks[0].language).toBe('javascript');
    });

    it('should handle empty arrays and optional fields', () => {
      const minimalStructure = {
        sections: [],
        keyPoints: [],
        examples: [],
        codeBlocks: []
      };

      const result = ResponseStructureSchema.parse(minimalStructure);
      expect(result.sections).toEqual([]);
      expect(result.keyPoints).toEqual([]);
      expect(result.conclusion).toBe('');
    });

    it('should validate nested subsections', () => {
      const nestedStructure = {
        sections: [
          {
            title: 'Main Section',
            content: 'Main content',
            subsections: [
              {
                title: 'Nested 1',
                content: 'Nested content 1',
                subsections: [
                  { title: 'Deep Nested', content: 'Deep content' }
                ]
              }
            ]
          }
        ],
        keyPoints: [],
        examples: [],
        codeBlocks: []
      };

      expect(() => ResponseStructureSchema.parse(nestedStructure)).not.toThrow();
    });

    it('should validate code blocks', () => {
      const structureWithCode = {
        sections: [],
        keyPoints: [],
        examples: [],
        codeBlocks: [
          { language: 'python', code: 'print("hello")' },
          { language: '', code: 'generic code' }, // Language can be empty
          { code: 'code without language' } // Language is optional
        ]
      };

      const result = ResponseStructureSchema.parse(structureWithCode);
      expect(result.codeBlocks).toHaveLength(3);
      expect(result.codeBlocks[0].language).toBe('python');
      expect(result.codeBlocks[1].language).toBe('');
      expect(result.codeBlocks[2].language).toBe('');
    });
  });

  describe('QualityAssessmentSchema', () => {
    it('should validate quality scores within range', () => {
      const validQuality = {
        overall: 0.85,
        accuracy: 0.9,
        completeness: 0.8,
        clarity: 0.87,
        educational: 0.92,
        structure: 0.75,
        engagement: 0.88
      };

      const result = QualityAssessmentSchema.parse(validQuality);
      expect(result.overall).toBe(0.85);
      expect(result.accuracy).toBe(0.9);
    });

    it('should reject scores outside valid range', () => {
      const invalidQuality = {
        overall: 1.5, // > 1.0
        accuracy: -0.1, // < 0.0
        completeness: 0.5,
        clarity: 0.5,
        educational: 0.5,
        structure: 0.5,
        engagement: 0.5
      };

      expect(() => QualityAssessmentSchema.parse(invalidQuality)).toThrow();
    });

    it('should handle edge case scores', () => {
      const edgeCaseQuality = {
        overall: 0.0, // Minimum
        accuracy: 1.0, // Maximum
        completeness: 0.5,
        clarity: 0.5,
        educational: 0.5,
        structure: 0.5,
        engagement: 0.5
      };

      expect(() => QualityAssessmentSchema.parse(edgeCaseQuality)).not.toThrow();
    });
  });

  describe('ProcessingMetadataSchema', () => {
    it('should validate complete processing metadata', () => {
      const validMetadata = {
        processingTime: 1250.5,
        stepsCompleted: ['validation', 'processing', 'formatting'],
        warnings: ['Cache miss', 'Rate limit approaching'],
        optimizations: ['early_exit', 'cached_lookup']
      };

      const result = ProcessingMetadataSchema.parse(validMetadata);
      expect(result.processingTime).toBe(1250.5);
      expect(result.stepsCompleted).toHaveLength(3);
      expect(result.warnings).toHaveLength(2);
    });

    it('should handle empty arrays and minimal data', () => {
      const minimalMetadata = {
        processingTime: 0,
        stepsCompleted: [],
        warnings: [],
        optimizations: []
      };

      expect(() => ProcessingMetadataSchema.parse(minimalMetadata)).not.toThrow();
    });

    it('should require non-negative processing time', () => {
      const invalidMetadata = {
        processingTime: -100,
        stepsCompleted: [],
        warnings: [],
        optimizations: []
      };

      expect(() => ProcessingMetadataSchema.parse(invalidMetadata)).toThrow();
    });
  });

  describe('RequiredResponseStructureSchema', () => {
    it('should validate complete required response', () => {
      const validResponse = {
        formattedResponse: {
          content: '# Title\n\nContent here',
          structure: {
            sections: [],
            keyPoints: [],
            examples: [],
            codeBlocks: [],
            conclusion: 'Summary'
          }
        },
        qualityAssessment: {
          overall: 0.8,
          accuracy: 0.9,
          completeness: 0.7,
          clarity: 0.85,
          educational: 0.88,
          structure: 0.75,
          engagement: 0.82
        },
        processingMetadata: {
          processingTime: 1000,
          stepsCompleted: ['step1', 'step2'],
          warnings: [],
          optimizations: []
        }
      };

      const result = RequiredResponseStructureSchema.parse(validResponse);
      expect(result.formattedResponse.content).toBe('# Title\n\nContent here');
      expect(result.qualityAssessment.overall).toBe(0.8);
      expect(result.processingMetadata.processingTime).toBe(1000);
    });

    it('should require non-empty content', () => {
      const invalidResponse = {
        formattedResponse: {
          content: '', // Empty content should fail
          structure: {
            sections: [],
            keyPoints: [],
            examples: [],
            codeBlocks: []
          }
        },
        qualityAssessment: {
          overall: 0.8,
          accuracy: 0.8,
          completeness: 0.8,
          clarity: 0.8,
          educational: 0.8,
          structure: 0.8,
          engagement: 0.8
        },
        processingMetadata: {
          processingTime: 1000,
          stepsCompleted: [],
          warnings: [],
          optimizations: []
        }
      };

      expect(() => RequiredResponseStructureSchema.parse(invalidResponse)).toThrow();
    });
  });

  describe('PipelineContextSchema', () => {
    it('should validate complete pipeline context', () => {
      const validContext = {
        request: {
          task: 'Test task',
          responseType: 'explanation'
        },
        userPrefs: {
          request: { requestComplexity: 'medium' },
          response: { preferredLength: 'medium' }
        },
        structured: {
          formattedResponse: {
            content: 'Test content',
            structure: {
              sections: [],
              keyPoints: [],
              examples: [],
              codeBlocks: []
            }
          },
          qualityAssessment: {
            overall: 0.8,
            accuracy: 0.8,
            completeness: 0.8,
            clarity: 0.8,
            educational: 0.8,
            structure: 0.8,
            engagement: 0.8
          },
          processingMetadata: {
            processingTime: 1000,
            stepsCompleted: [],
            warnings: [],
            optimizations: []
          }
        },
        cached: false,
        cacheKey: 'test-cache-key',
        processingMetadata: {
          processingTime: 1000,
          stepsCompleted: [],
          warnings: [],
          optimizations: []
        }
      };

      expect(() => PipelineContextSchema.parse(validContext)).not.toThrow();
    });

    it('should handle minimal context', () => {
      const minimalContext = {
        request: {
          task: 'Minimal task'
        }
      };

      const result = PipelineContextSchema.parse(minimalContext);
      expect(result.request.task).toBe('Minimal task');
      expect(result.cached).toBe(false);
    });
  });

  describe('validateWithDefaults utility', () => {
    it('should validate and apply defaults', () => {
      const input = {
        task: 'Test question'
      };

      const result = validateWithDefaults(RequestSchema, input);
      expect(result.task).toBe('Test question');
      expect(result.responseType).toBe('structured');
      expect(result.educational.difficulty).toBe('intermediate');
    });

    it('should preserve explicit values over defaults', () => {
      const input = {
        task: 'Test question',
        responseType: 'explanation',
        educational: {
          difficulty: 'advanced'
        }
      };

      const result = validateWithDefaults(RequestSchema, input);
      expect(result.responseType).toBe('explanation');
      expect(result.educational.difficulty).toBe('advanced');
      expect(result.educational.targetAudience).toBe('general'); // Default applied
    });

    it('should throw on validation errors', () => {
      const invalidInput = {
        task: '', // Empty task should fail
        responseType: 'invalid_type'
      };

      expect(() => validateWithDefaults(RequestSchema, invalidInput)).toThrow();
    });
  });

  describe('Schema Edge Cases', () => {
    it('should handle unicode and special characters in strings', () => {
      const unicodeRequest = {
        task: 'Explain 数学 and émissions',
        context: 'Context with special chars: @#$%^&*()',
        educational: {
          subject: 'Mathématiques'
        }
      };

      expect(() => RequestSchema.parse(unicodeRequest)).not.toThrow();
    });

    it('should handle very long strings appropriately', () => {
      const longContent = 'A'.repeat(50000);
      const responseWithLongContent = {
        formattedResponse: {
          content: longContent,
          structure: {
            sections: [],
            keyPoints: [],
            examples: [],
            codeBlocks: []
          }
        },
        qualityAssessment: {
          overall: 0.8,
          accuracy: 0.8,
          completeness: 0.8,
          clarity: 0.8,
          educational: 0.8,
          structure: 0.8,
          engagement: 0.8
        },
        processingMetadata: {
          processingTime: 1000,
          stepsCompleted: [],
          warnings: [],
          optimizations: []
        }
      };

      expect(() => RequiredResponseStructureSchema.parse(responseWithLongContent)).not.toThrow();
    });

    it('should handle floating point precision in quality scores', () => {
      const preciseQuality = {
        overall: 0.8571428571428571,
        accuracy: 0.9999999999999999,
        completeness: 0.0000000000000001,
        clarity: 0.3333333333333333,
        educational: 0.6666666666666666,
        structure: 0.1234567890123456,
        engagement: 0.9876543210987654
      };

      expect(() => QualityAssessmentSchema.parse(preciseQuality)).not.toThrow();
    });
  });
});