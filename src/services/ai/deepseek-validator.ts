/**
 * DeepSeek Response Validator
 * Validates DeepSeek responses against RequiredResponseStructure with same quality pipeline as other providers
 */

import { logger } from '../logging/logger';
import { 
  RequiredResponseStructureSchema, 
  createSafeDefaults, 
  createErrorResponse,
  validateResponse 
} from '../../types/ai-tutor-schemas';
import type { 
  RequiredResponseStructure, 
  QualityAssessment, 
  ProcessingMetadata,
  ValidationResult,
  EducationalValidation
} from '../../types/ai-tutor';
import type { ProcessedResponse } from '../markdown-response-processor';

export interface DeepSeekValidationResult {
  isValid: boolean;
  processedResponse: RequiredResponseStructure;
  qualityAssessment: QualityAssessment;
  fallbacksUsed: string[];
  warnings: string[];
  validationMetrics: ValidationMetrics;
}

export interface ValidationMetrics {
  processingTime: number;
  contentLength: number;
  markdownElements: number;
  codeBlocks: number;
  validationScore: number;
  educationalScore: number;
}

export interface DeepSeekValidationOptions {
  strictMode?: boolean;
  requireEducationalContent?: boolean;
  minWordCount?: number;
  maxWordCount?: number;
  allowFallbacks?: boolean;
  customValidators?: ValidationFunction[];
}

export type ValidationFunction = (content: string, structure: RequiredResponseStructure) => ValidationResult;

export class DeepSeekValidator {
  private static readonly DEFAULT_OPTIONS: Required<DeepSeekValidationOptions> = {
    strictMode: false,
    requireEducationalContent: true,
    minWordCount: 10,
    maxWordCount: 5000,
    allowFallbacks: true,
    customValidators: []
  };

  /**
   * Main validation method that applies same quality pipeline as other providers
   */
  static validateDeepSeekResponse(
    rawContent: string,
    processedContent?: ProcessedResponse,
    options: DeepSeekValidationOptions = {}
  ): DeepSeekValidationResult {
    const startTime = performance.now();
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    const fallbacksUsed: string[] = [];
    const warnings: string[] = [];

    logger.info('Validating DeepSeek response', 'DeepSeekValidator');

    try {
      // Step 1: Create structured response from processed content
      let structuredResponse: RequiredResponseStructure;
      
      if (processedContent) {
        structuredResponse = this.createStructuredFromProcessed(processedContent, rawContent);
      } else {
        // Fallback: create minimal structure from raw content
        structuredResponse = this.createMinimalStructure(rawContent);
        fallbacksUsed.push('no_processed_content');
        warnings.push('No processed content available, using minimal structure');
      }

      // Step 2: Validate against schema
      const schemaValidation = RequiredResponseStructureSchema.safeParse(structuredResponse);
      
      if (!schemaValidation.success) {
        logger.warn('DeepSeek response failed schema validation', 'DeepSeekValidator', schemaValidation.error);
        
        if (config.allowFallbacks) {
          structuredResponse = this.createFallbackStructure(rawContent, schemaValidation.error.issues);
          fallbacksUsed.push('schema_validation_failed');
          warnings.push('Schema validation failed, using fallback structure');
        } else {
          throw new Error(`Schema validation failed: ${schemaValidation.error.message}`);
        }
      }

      // Step 3: Apply content validation
      const contentValidation = this.validateContent(rawContent, config);
      
      // Step 4: Apply educational validation if required
      let educationalValidation: EducationalValidation | undefined;
      if (config.requireEducationalContent) {
        educationalValidation = this.validateEducationalContent(structuredResponse);
      }

      // Step 5: Generate quality assessment
      const qualityAssessment = this.generateQualityAssessment(
        structuredResponse,
        contentValidation,
        educationalValidation,
        processedContent
      );

      // Step 6: Update processing metadata
      const processingTime = performance.now() - startTime;
      structuredResponse.processingMetadata = {
        ...structuredResponse.processingMetadata,
        processingTime: structuredResponse.processingMetadata.processingTime + processingTime,
        stepsCompleted: [
          ...structuredResponse.processingMetadata.stepsCompleted,
          'deepseek_validation',
          'quality_assessment',
          ...(educationalValidation ? ['educational_validation'] : [])
        ],
        warnings: [...structuredResponse.processingMetadata.warnings, ...warnings]
      };

      // Step 7: Create validation metrics
      const validationMetrics = this.createValidationMetrics(
        rawContent,
        structuredResponse,
        processingTime,
        contentValidation,
        educationalValidation
      );

      return {
        isValid: contentValidation.isValid && (educationalValidation?.isValid ?? true),
        processedResponse: structuredResponse,
        qualityAssessment,
        fallbacksUsed,
        warnings,
        validationMetrics
      };

    } catch (error) {
      logger.error('DeepSeek validation failed', 'DeepSeekValidator', error);
      
      // Return error response with fallback
      const errorResponse = createErrorResponse(
        `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      // Override content with raw content for fallback
      errorResponse.formattedResponse.content = rawContent;
      
      const processingTime = performance.now() - startTime;
      
      return {
        isValid: false,
        processedResponse: errorResponse,
        qualityAssessment: errorResponse.qualityAssessment,
        fallbacksUsed: ['validation_error', ...fallbacksUsed],
        warnings: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`, ...warnings],
        validationMetrics: {
          processingTime,
          contentLength: rawContent.length,
          markdownElements: 0,
          codeBlocks: 0,
          validationScore: 0,
          educationalScore: 0
        }
      };
    }
  }

  /**
   * Create structured response from processed markdown content
   */
  private static createStructuredFromProcessed(
    processedContent: ProcessedResponse,
    rawContent: string
  ): RequiredResponseStructure {
    const { metadata, quality, renderingHints } = processedContent;
    
    return {
      formattedResponse: {
        content: processedContent.content,
        metadata: {
          responseType: this.mapContentTypeToResponseType(metadata.contentType),
          difficulty: this.inferDifficulty(quality, metadata.wordCount),
          estimatedReadTime: metadata.estimatedReadTime
        },
        structure: {
          headers: metadata.headers.map(h => ({
            text: h.text,
            level: h.level,
            hasEmoji: h.hasEmoji
          })),
          sections: [{
            title: this.getSectionTitle(metadata.contentType),
            wordCount: metadata.wordCount,
            hasSubsections: metadata.headers.length > 1
          }],
          codeBlocks: metadata.codeBlocks.map(cb => ({
            language: cb.language || 'text',
            isValid: cb.isValid
          }))
        }
      },
      qualityAssessment: {
        overallScore: quality.overall,
        breakdown: {
          structure: quality.structure,
          consistency: quality.formatting,
          formatting: quality.formatting,
          completeness: quality.completeness,
          educational: Math.min(quality.readability + 10, 100)
        },
        recommendations: processedContent.warnings.length > 0 
          ? processedContent.warnings.slice(0, 3)
          : ['Content processed successfully']
      },
      processingMetadata: {
        processingTime: 0, // Will be updated by caller
        stepsCompleted: ['markdown_processing', 'content_analysis'],
        warnings: processedContent.warnings,
        optimizations: renderingHints.customStyles || []
      }
    };
  }

  /**
   * Create minimal structure from raw content when no processing is available
   */
  private static createMinimalStructure(rawContent: string): RequiredResponseStructure {
    const wordCount = this.countWords(rawContent);
    const hasCodeBlocks = /```/.test(rawContent);
    const hasHeaders = /^#{1,6}\s+/m.test(rawContent);
    
    return {
      formattedResponse: {
        content: rawContent,
        metadata: {
          responseType: hasCodeBlocks ? 'code' : 'explanation',
          difficulty: wordCount > 300 ? 'hard' : wordCount > 100 ? 'medium' : 'easy',
          estimatedReadTime: Math.ceil(wordCount / 200)
        },
        structure: {
          headers: hasHeaders ? [{ text: 'Response', level: 1, hasEmoji: false }] : [],
          sections: [{
            title: 'Content',
            wordCount,
            hasSubsections: hasHeaders
          }],
          codeBlocks: hasCodeBlocks ? [{ language: 'text', isValid: true }] : []
        }
      },
      qualityAssessment: {
        overallScore: 60, // Moderate score for minimal processing
        breakdown: {
          structure: hasHeaders ? 70 : 50,
          consistency: 60,
          formatting: hasCodeBlocks || hasHeaders ? 70 : 50,
          completeness: wordCount > 50 ? 70 : 40,
          educational: wordCount > 100 ? 60 : 40
        },
        recommendations: ['Minimal processing applied - consider enabling full markdown processing']
      },
      processingMetadata: {
        processingTime: 0,
        stepsCompleted: ['minimal_structure_creation'],
        warnings: ['No markdown processing performed'],
        optimizations: []
      }
    };
  }

  /**
   * Create fallback structure when validation fails
   */
  private static createFallbackStructure(
    rawContent: string,
    validationIssues: any[]
  ): RequiredResponseStructure {
    const fallback = createSafeDefaults();
    
    // Use raw content
    fallback.formattedResponse.content = rawContent;
    
    // Add validation warnings
    fallback.processingMetadata.warnings = [
      'Validation failed, using fallback structure',
      ...validationIssues.map(issue => `${issue.path?.join('.') || 'root'}: ${issue.message}`)
    ];
    
    // Lower quality scores due to validation failure
    fallback.qualityAssessment.overallScore = 40;
    Object.keys(fallback.qualityAssessment.breakdown).forEach(key => {
      fallback.qualityAssessment.breakdown[key] = Math.min(
        fallback.qualityAssessment.breakdown[key], 
        50
      );
    });
    
    return fallback;
  }

  /**
   * Validate content against basic quality criteria
   */
  private static validateContent(
    content: string,
    options: Required<DeepSeekValidationOptions>
  ): ValidationResult {
    const errors: string[] = [];
    let score = 100;

    // Check word count
    const wordCount = this.countWords(content);
    if (wordCount < options.minWordCount) {
      errors.push(`Content too short: ${wordCount} words (minimum: ${options.minWordCount})`);
      score -= 20;
    }
    if (wordCount > options.maxWordCount) {
      errors.push(`Content too long: ${wordCount} words (maximum: ${options.maxWordCount})`);
      score -= 10;
    }

    // Check for empty or placeholder content
    if (content.trim().length === 0) {
      errors.push('Content is empty');
      score = 0;
    }

    // Check for common error patterns
    const errorPatterns = [
      /I apologize.*error/i,
      /unable to.*provide/i,
      /something went wrong/i,
      /\[error\]/i,
      /\[placeholder\]/i
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(content)) {
        errors.push('Content appears to contain error messages');
        score -= 30;
        break;
      }
    }

    // Check for incomplete content
    const incompletePatterns = [
      /\.\.\.$/, // Trailing ellipsis
      /\[incomplete\]/gi,
      /\[loading\]/gi,
      /\[processing\]/gi
    ];

    for (const pattern of incompletePatterns) {
      if (pattern.test(content)) {
        errors.push('Content appears to be incomplete');
        score -= 15;
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      score: Math.max(0, score),
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate educational content quality
   */
  private static validateEducationalContent(
    structure: RequiredResponseStructure
  ): EducationalValidation {
    const failedChecks: string[] = [];
    let score = 100;

    const content = structure.formattedResponse.content;
    const wordCount = this.countWords(content);

    // Check minimum educational content length
    if (wordCount < 50) {
      failedChecks.push('Content too short for educational value');
      score -= 25;
    }

    // Check for educational indicators
    const educationalPatterns = [
      /\b(explain|understand|learn|concept|example|because|therefore|however|moreover)\b/gi,
      /\b(step|process|method|approach|technique|strategy)\b/gi,
      /\b(important|key|essential|fundamental|basic|advanced)\b/gi
    ];

    let educationalIndicators = 0;
    for (const pattern of educationalPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        educationalIndicators += matches.length;
      }
    }

    if (educationalIndicators < 3) {
      failedChecks.push('Insufficient educational language and structure');
      score -= 20;
    }

    // Check for examples or illustrations
    const hasExamples = /\b(example|for instance|such as|like|consider)\b/gi.test(content);
    if (!hasExamples && wordCount > 100) {
      failedChecks.push('No examples or illustrations provided');
      score -= 15;
    }

    // Check for structure (headers, lists, etc.)
    const hasStructure = structure.formattedResponse.structure.headers.length > 0 ||
                        /^[-*+]\s+/m.test(content) ||
                        /^\d+\.\s+/m.test(content);
    
    if (!hasStructure && wordCount > 150) {
      failedChecks.push('Content lacks clear structure');
      score -= 10;
    }

    return {
      isValid: failedChecks.length === 0,
      score: Math.max(0, score),
      failedChecks: failedChecks.length > 0 ? failedChecks : undefined
    };
  }

  /**
   * Generate comprehensive quality assessment
   */
  private static generateQualityAssessment(
    structure: RequiredResponseStructure,
    contentValidation: ValidationResult,
    educationalValidation?: EducationalValidation,
    processedContent?: ProcessedResponse
  ): QualityAssessment {
    // Start with existing quality assessment
    const baseQuality = structure.qualityAssessment;
    
    // Adjust scores based on validation results
    const adjustedBreakdown = { ...baseQuality.breakdown };
    
    // Apply content validation impact
    if (!contentValidation.isValid) {
      const penalty = (100 - contentValidation.score) * 0.3; // 30% impact
      Object.keys(adjustedBreakdown).forEach(key => {
        adjustedBreakdown[key] = Math.max(0, adjustedBreakdown[key] - penalty);
      });
    }

    // Apply educational validation impact
    if (educationalValidation && !educationalValidation.isValid) {
      const penalty = (100 - educationalValidation.score) * 0.2; // 20% impact
      adjustedBreakdown.educational = Math.max(0, adjustedBreakdown.educational - penalty);
    }

    // Calculate overall score
    const overallScore = Math.round(
      Object.values(adjustedBreakdown).reduce((sum, score) => sum + score, 0) / 
      Object.keys(adjustedBreakdown).length
    );

    // Generate recommendations
    const recommendations = [...baseQuality.recommendations];
    
    if (contentValidation.errors) {
      recommendations.push(...contentValidation.errors.slice(0, 2));
    }
    
    if (educationalValidation?.failedChecks) {
      recommendations.push(...educationalValidation.failedChecks.slice(0, 2));
    }

    return {
      overallScore,
      breakdown: adjustedBreakdown,
      recommendations: recommendations.slice(0, 5) // Limit to 5 recommendations
    };
  }

  /**
   * Create validation metrics for monitoring
   */
  private static createValidationMetrics(
    rawContent: string,
    structure: RequiredResponseStructure,
    processingTime: number,
    contentValidation: ValidationResult,
    educationalValidation?: EducationalValidation
  ): ValidationMetrics {
    const markdownElements = this.countMarkdownElements(rawContent);
    const codeBlocks = (rawContent.match(/```/g) || []).length / 2; // Pairs of ```
    
    return {
      processingTime,
      contentLength: rawContent.length,
      markdownElements,
      codeBlocks,
      validationScore: contentValidation.score,
      educationalScore: educationalValidation?.score || 100
    };
  }

  // Helper methods
  private static countWords(content: string): number {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private static countMarkdownElements(content: string): number {
    const patterns = [
      /^#{1,6}\s+/gm, // Headers
      /\*\*[^*]+\*\*/g, // Bold
      /\*[^*]+\*/g, // Italic
      /`[^`]+`/g, // Inline code
      /```[\s\S]*?```/g, // Code blocks
      /\[[^\]]*\]\([^)]*\)/g, // Links
      /^[-*+]\s+/gm, // Lists
      /^\d+\.\s+/gm // Numbered lists
    ];

    return patterns.reduce((count, pattern) => {
      const matches = content.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  private static mapContentTypeToResponseType(contentType: string): 'explanation' | 'code' | 'reasoning' | 'structured' {
    switch (contentType) {
      case 'code': return 'code';
      case 'explanation': return 'explanation';
      case 'mixed': return 'structured';
      case 'list': return 'structured';
      case 'table': return 'structured';
      default: return 'explanation';
    }
  }

  private static inferDifficulty(quality: any, wordCount: number): 'easy' | 'medium' | 'hard' {
    if (wordCount > 500 || (quality.structure && quality.structure < 60) || (quality.readability && quality.readability < 60)) {
      return 'hard';
    } else if (wordCount > 200 || (quality.structure && quality.structure < 80)) {
      return 'medium';
    } else {
      return 'easy';
    }
  }

  private static getSectionTitle(contentType: string): string {
    switch (contentType) {
      case 'code': return 'Code Response';
      case 'explanation': return 'Explanation';
      case 'mixed': return 'Response Content';
      case 'list': return 'List Content';
      case 'table': return 'Tabular Data';
      default: return 'Response';
    }
  }
}

/**
 * Convenience function for validating DeepSeek responses
 */
export function validateDeepSeekResponse(
  rawContent: string,
  processedContent?: ProcessedResponse,
  options?: DeepSeekValidationOptions
): DeepSeekValidationResult {
  return DeepSeekValidator.validateDeepSeekResponse(rawContent, processedContent, options);
}

/**
 * Quick validation check for DeepSeek responses
 */
export function isValidDeepSeekResponse(
  rawContent: string,
  options?: DeepSeekValidationOptions
): boolean {
  const result = DeepSeekValidator.validateDeepSeekResponse(rawContent, undefined, options);
  return result.isValid;
}

/**
 * Get quality metrics from DeepSeek response
 */
export function getDeepSeekQualityMetrics(
  rawContent: string,
  processedContent?: ProcessedResponse
): QualityAssessment {
  const result = DeepSeekValidator.validateDeepSeekResponse(rawContent, processedContent);
  return result.qualityAssessment;
}

export default DeepSeekValidator;