/**
 * Professional Post-Processing Pipeline
 * Integrates ResponseFormatter, PromptTemplates, and quality assurance
 */

import { ResponseFormatter, FormattedResponse } from './response-formatter';
import { PromptTemplates } from './prompt-templates';
import { EducationalContentValidator, QualityCheckResult } from '../ai/educational-content-validator';
import { logger } from '../logging/logger';

export interface ProcessingContext {
  responseType: 'explanation' | 'study_plan' | 'practice' | 'concept';
  subject: string;
  topic?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  originalPrompt: string;
  rawResponse: string;
  metadata?: {
    model: string;
    provider: string;
    usage?: any;
    parameters?: any;
  };
}

export interface ProcessingResult {
  formattedResponse: FormattedResponse;
  validationResult: {
    isValid: boolean;
    errors: string[];
    score: number;
  };
  educationalValidation?: QualityCheckResult; // New robust framework validation
  qualityAssessment: {
    overallScore: number;
    breakdown: {
      structure: number;
      consistency: number;
      formatting: number;
      completeness: number;
      educational: number;
    };
    recommendations: string[];
  };
  processingMetadata: {
    processingTime: number;
    stepsCompleted: string[];
    warnings: string[];
    optimizations: string[];
  };
}

export interface PipelineConfig {
  enableValidation: boolean;
  enableQualityAssessment: boolean;
  enableStructureOptimization: boolean;
  enableContentEnhancement: boolean;
  qualityThreshold: number;
  maxRetries: number;
}

/**
 * Professional Post-Processing Pipeline
 */
export class PostProcessingPipeline {
  private static instance: PostProcessingPipeline;
  private config: PipelineConfig;

  private constructor(config?: Partial<PipelineConfig>) {
    this.config = {
      enableValidation: true,
      enableQualityAssessment: true,
      enableStructureOptimization: true,
      enableContentEnhancement: true,
      qualityThreshold: 75,
      maxRetries: 2,
      ...config
    };
  }

  static getInstance(config?: Partial<PipelineConfig>): PostProcessingPipeline {
    if (!PostProcessingPipeline.instance) {
      PostProcessingPipeline.instance = new PostProcessingPipeline(config);
    }
    return PostProcessingPipeline.instance;
  }

  /**
   * Main processing method - orchestrates the entire pipeline
   */
  async process(context: ProcessingContext): Promise<ProcessingResult> {
    const startTime = Date.now();
    const stepsCompleted: string[] = [];
    const warnings: string[] = [];
    const optimizations: string[] = [];

    try {
      logger.info('Starting post-processing pipeline', 'PostProcessingPipeline', {
        responseType: context.responseType,
        subject: context.subject,
        contentLength: context.rawResponse.length
      });

      // Step 1: Initial formatting
      stepsCompleted.push('initial_formatting');
      let formattedResponse = await this.formatResponse(context);

      // Step 1.5: Placeholder content validation and removal
      stepsCompleted.push('placeholder_validation');
      const hasPlaceholders = this.validateAndRemovePlaceholders(formattedResponse);
      if (hasPlaceholders.hadPlaceholders) {
        formattedResponse.content = hasPlaceholders.cleanedContent;
        optimizations.push('placeholder_content_removed');
        warnings.push(`Removed ${hasPlaceholders.placeholdersRemoved} placeholder sections`);
      }

      // Step 2: Structure optimization
      if (this.config.enableStructureOptimization) {
        stepsCompleted.push('structure_optimization');
        const optimizedContent = this.optimizeStructure(formattedResponse.content, context.responseType);
        if (optimizedContent !== formattedResponse.content) {
          formattedResponse.content = optimizedContent;
          optimizations.push('structure_optimization_applied');
        }
      }

      // Step 3: Content enhancement
      if (this.config.enableContentEnhancement) {
        stepsCompleted.push('content_enhancement');
        const enhancedContent = await this.enhanceContent(formattedResponse.content, context);
        if (enhancedContent !== formattedResponse.content) {
          formattedResponse.content = enhancedContent;
          optimizations.push('content_enhancement_applied');
        }
      }

      // Step 4: Validation
      let validationResult = { isValid: true, errors: [], score: 100 };
      let educationalValidation: QualityCheckResult | undefined;
      
      if (this.config.enableValidation) {
        stepsCompleted.push('validation');
        validationResult = PromptTemplates.validateResponse(
          formattedResponse.content, 
          context.responseType
        );

        // Add robust educational framework validation for educational content
        if (context.responseType === 'explanation' || !context.responseType) {
          stepsCompleted.push('educational_validation');
          educationalValidation = EducationalContentValidator.validateContent(
            formattedResponse.content, 
            { subject: context.subject, topic: context.topic }
          );
          
          // Merge educational validation results with legacy validation
          if (!educationalValidation.isValid) {
            validationResult.isValid = false;
            validationResult.errors.push(...educationalValidation.failedChecks);
            validationResult.score = Math.min(validationResult.score, educationalValidation.score);
            warnings.push(`Educational framework validation failed: ${educationalValidation.failedChecks.length} issues`);
          } else {
            optimizations.push('Educational framework validation passed');
          }
        }

        if (!validationResult.isValid) {
          warnings.push(`Validation failed with ${validationResult.errors.length} errors`);
        }
      }

      // Step 5: Quality assessment
      let qualityAssessment = this.createDefaultQualityAssessment();
      if (this.config.enableQualityAssessment) {
        stepsCompleted.push('quality_assessment');
        qualityAssessment = this.assessQuality(formattedResponse, context, validationResult);
      }

      // Step 6: Final quality check and potential retry logic
      if (qualityAssessment.overallScore < this.config.qualityThreshold) {
        warnings.push(`Quality score ${qualityAssessment.overallScore} below threshold ${this.config.qualityThreshold}`);
      }

      const processingTime = Date.now() - startTime;

      logger.info('Post-processing pipeline completed', 'PostProcessingPipeline', {
        processingTime,
        stepsCompleted: stepsCompleted.length,
        qualityScore: qualityAssessment.overallScore,
        warnings: warnings.length
      });

      return {
        formattedResponse,
        validationResult,
        educationalValidation,
        qualityAssessment,
        processingMetadata: {
          processingTime,
          stepsCompleted,
          warnings,
          optimizations
        }
      };

    } catch (error) {
      logger.error('Error in post-processing pipeline', 'PostProcessingPipeline', error);
      
      // Return minimal viable result
      const formattedResponse = ResponseFormatter.formatExplanation(context.rawResponse);
      return {
        formattedResponse,
        validationResult: { isValid: false, errors: ['Processing pipeline failed'], score: 0 },
        qualityAssessment: this.createDefaultQualityAssessment(),
        processingMetadata: {
          processingTime: Date.now() - startTime,
          stepsCompleted,
          warnings: [...warnings, `Pipeline error: ${error.message}`],
          optimizations
        }
      };
    }
  }

  /**
   * Format response using appropriate formatter
   */
  private async formatResponse(context: ProcessingContext): Promise<FormattedResponse> {
    const { responseType, rawResponse } = context;

    // Add null safety and error handling
    if (!rawResponse || typeof rawResponse !== 'string') {
      logger.warn('Invalid raw response provided to formatResponse', 'PostProcessingPipeline', { rawResponse });
      const fallbackResponse = 'I apologize, but I encountered an issue processing your request. Please try again.';
      return ResponseFormatter.formatExplanation(fallbackResponse);
    }

    try {
      switch (responseType) {
        case 'study_plan':
          return ResponseFormatter.formatStudyPlan(rawResponse);
        case 'practice':
          return ResponseFormatter.formatPractice(rawResponse);
        case 'concept':
          return ResponseFormatter.formatConcept(rawResponse);
        case 'explanation':
        default:
          return ResponseFormatter.formatExplanation(rawResponse);
      }
    } catch (error) {
      logger.error('Error in formatResponse, using fallback', 'PostProcessingPipeline', error);
      return ResponseFormatter.formatExplanation(rawResponse);
    }
  }

  /**
   * Optimize content structure based on type
   */
  private optimizeStructure(content: string, responseType: string): string {
    let optimized = content;

    // Common optimizations
    optimized = this.standardizeHeaders(optimized);
    optimized = this.formatTables(optimized);
    optimized = this.addProgressTrackers(optimized, responseType);
    optimized = this.validateMarkdown(optimized);

    return optimized;
  }

  /**
   * Standardize header hierarchy
   */
  private standardizeHeaders(content: string): string {
    const lines = content.split('\n');
    let inCodeBlock = false;
    
    const processedLines = lines.map(line => {
      // Track code blocks to avoid processing headers inside them
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      
      if (inCodeBlock) {
        return line;
      }

      // Fix header spacing and hierarchy
      const headerMatch = line.match(/^(#{1,6})\s*(.+)/);
      if (headerMatch) {
        const level = headerMatch[1];
        const text = headerMatch[2].trim();
        
        // Ensure proper spacing around headers
        return `${level} ${text}`;
      }
      
      return line;
    });

    // Ensure proper spacing around headers
    const finalLines: string[] = [];
    for (let i = 0; i < processedLines.length; i++) {
      const line = processedLines[i];
      const isHeader = line.match(/^#{1,6}\s/);
      const prevLine = processedLines[i - 1];
      const nextLine = processedLines[i + 1];

      // Add spacing before headers (except first line)
      if (isHeader && i > 0 && prevLine && prevLine.trim() !== '') {
        finalLines.push('');
      }

      finalLines.push(line);

      // Add spacing after headers
      if (isHeader && nextLine && nextLine.trim() !== '' && !nextLine.match(/^#{1,6}\s/)) {
        finalLines.push('');
      }
    }

    return finalLines.join('\n');
  }

  /**
   * Format tables for consistency
   */
  private formatTables(content: string): string {
    // Simple table formatting - ensure proper spacing
    const lines = content.split('\n');
    const processedLines = lines.map(line => {
      if (line.includes('|') && !line.trim().startsWith('```')) {
        // Basic table row formatting
        const cells = line.split('|').map(cell => cell.trim());
        if (cells.length > 2) { // Valid table row
          return `| ${cells.slice(1, -1).join(' | ')} |`;
        }
      }
      return line;
    });

    return processedLines.join('\n');
  }

  /**
   * Add progress trackers for appropriate content types
   */
  private addProgressTrackers(content: string, responseType: string): string {
    if (responseType === 'study_plan' && !content.includes('- [ ]')) {
      // Add basic progress tracking if missing
      const lines = content.split('\n');
      const processedLines = lines.map(line => {
        // Convert bullet points in study plans to checkboxes
        if (line.trim().match(/^[-*]\s+(?![\[\]])(.+)/)) {
          const text = line.trim().replace(/^[-*]\s+/, '');
          const indentation = line.match(/^(\s*)/)?.[1] || '';
          return `${indentation}- [ ] ${text}`;
        }
        return line;
      });
      return processedLines.join('\n');
    }

    return content;
  }

  /**
   * Validate and fix markdown syntax
   */
  private validateMarkdown(content: string): string {
    let validated = content;

    // Fix common markdown issues
    validated = validated.replace(/\*\*([^*]+)\*\*/g, '**$1**'); // Fix bold formatting
    validated = validated.replace(/\*([^*]+)\*/g, '*$1*'); // Fix italic formatting
    validated = validated.replace(/`([^`]+)`/g, '`$1`'); // Fix inline code

    // Ensure proper list formatting
    validated = validated.replace(/^(\s*)[-*+]\s+/gm, '$1- ');

    // Fix numbered lists
    validated = validated.replace(/^(\s*)\d+\.\s+/gm, (match, indent, offset, string) => {
      const beforeText = string.substring(0, offset);
      const listNumber = (beforeText.match(/^\s*\d+\.\s+/gm) || []).length + 1;
      return `${indent}${listNumber}. `;
    });

    return validated;
  }

  /**
   * Validate and remove placeholder content from formatted response
   */
  private validateAndRemovePlaceholders(formattedResponse: FormattedResponse): {
    hadPlaceholders: boolean;
    cleanedContent: string;
    placeholdersRemoved: number;
  } {
    const originalContent = formattedResponse.content;
    let cleanedContent = originalContent;
    let placeholdersRemoved = 0;
    
    // Define placeholder patterns specifically for this context
    const placeholderPatterns = [
      /\[Content to be added\]/gi,
      /\[Example to be provided\]/gi,
      /\[Details to follow\]/gi,
      /\[To be completed\]/gi,
      /\[Insert content here\]/gi,
      /\[Coming soon\]/gi,
      /\[TBD\]/gi,
      /\[TODO.*?\]/gi,
      /\[Add.*?here\]/gi,
      /\[Fill.*?content\]/gi,
      /\[Provide.*?example\]/gi,
      /\[Include.*?details\]/gi
    ];

    // Remove placeholder text
    for (const pattern of placeholderPatterns) {
      const matches = cleanedContent.match(pattern);
      if (matches) {
        placeholdersRemoved += matches.length;
        cleanedContent = cleanedContent.replace(pattern, '');
      }
    }

    // Remove empty sections that contained only placeholders
    const emptyHeaderPatterns = [
      // Headers followed by placeholder content
      /^(#{1,6})\s+([^\n]+)\n\n\[Content to be added\]\n*/gm,
      // Headers with no content before next header or end
      /^(#{1,6})\s+([^\n]+)\n\s*(?=#{1,6}|\s*$)/gm,
      // Headers followed only by whitespace
      /^(#{1,6})\s+([^\n]+)\n\s*\n\s*(?=#{1,6}|\s*$)/gm
    ];

    for (const pattern of emptyHeaderPatterns) {
      const beforeReplace = cleanedContent;
      cleanedContent = cleanedContent.replace(pattern, '');
      if (beforeReplace !== cleanedContent) {
        placeholdersRemoved++;
      }
    }

    // Clean up remaining formatting issues
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove multiple empty lines
    cleanedContent = cleanedContent.replace(/\n(#{1,6})\s+([^\n]+)\s*$/, ''); // Remove trailing empty headers
    cleanedContent = cleanedContent.trim();

    // Validate that we still have meaningful content
    const contentWithoutHeaders = cleanedContent.replace(/^#{1,6}\s+[^\n]+$/gm, '');
    const meaningfulContent = contentWithoutHeaders.replace(/\s+/g, ' ').trim();
    
    // If we removed too much content, keep the original but log a warning
    if (meaningfulContent.length < 20 && originalContent.length > 50) {
      logger.warn('Placeholder removal resulted in too little content, keeping original', 'PostProcessingPipeline', {
        originalLength: originalContent.length,
        cleanedLength: cleanedContent.length,
        meaningfulLength: meaningfulContent.length
      });
      return {
        hadPlaceholders: placeholdersRemoved > 0,
        cleanedContent: originalContent,
        placeholdersRemoved: 0
      };
    }

    const hadPlaceholders = placeholdersRemoved > 0 || cleanedContent !== originalContent;

    if (hadPlaceholders) {
      logger.info('Removed placeholder content from response', 'PostProcessingPipeline', {
        placeholdersRemoved,
        originalLength: originalContent.length,
        cleanedLength: cleanedContent.length
      });
    }

    return {
      hadPlaceholders,
      cleanedContent,
      placeholdersRemoved
    };
  }

  /**
   * Enhance content with educational improvements
   */
  private async enhanceContent(content: string, context: ProcessingContext): Promise<string> {
    let enhanced = content;

    // Add emoji indicators if missing in study plans
    if (context.responseType === 'study_plan') {
      if (!enhanced.includes('🎯') && enhanced.includes('Learning Goals')) {
        enhanced = enhanced.replace(/Learning Goals:/g, '🎯 **Learning Goals:**');
      }
      if (!enhanced.includes('⏱️') && enhanced.includes('Time Estimate')) {
        enhanced = enhanced.replace(/Time Estimate:/g, '⏱️ **Time Estimate:**');
      }
      if (!enhanced.includes('📚') && enhanced.includes('Resources')) {
        enhanced = enhanced.replace(/Resources:/g, '📚 **Resources:**');
      }
    }

    // Enhance section headers for better readability
    enhanced = this.enhanceSectionHeaders(enhanced, context.responseType);

    // Add context-specific improvements
    enhanced = this.addContextualEnhancements(enhanced, context);

    return enhanced;
  }

  /**
   * Enhance section headers based on response type
   */
  private enhanceSectionHeaders(content: string, responseType: string): string {
    const lines = content.split('\n');
    const processedLines = lines.map(line => {
      const headerMatch = line.match(/^(#{2,3})\s*(.+)/);
      if (headerMatch) {
        const level = headerMatch[1];
        const text = headerMatch[2].trim();
        
        // Add response-type specific enhancements
        if (responseType === 'practice' && text.toLowerCase().includes('exercise')) {
          // Ensure exercises have time indicators
          if (!text.includes('⏱️')) {
            return `${level} ${text} (⏱️ 5 minutes)`;
          }
        }
      }
      return line;
    });

    return processedLines.join('\n');
  }

  /**
   * Add contextual enhancements based on subject and level
   */
  private addContextualEnhancements(content: string, context: ProcessingContext): string {
    let enhanced = content;

    // Level-specific enhancements
    if (context.userLevel === 'beginner') {
      // Add more explanatory text for beginners
      enhanced = enhanced.replace(/## Key Takeaways/g, '## Key Takeaways 💡\n\n*These are the most important points to remember:*\n\n## Summary Points');
    } else if (context.userLevel === 'advanced') {
      // Add research directions for advanced learners
      if (enhanced.includes('## Next Steps') || enhanced.includes('## Further')) {
        enhanced = enhanced.replace(/(## (?:Next Steps|Further[^#]*))/, '$1\n\n*For advanced exploration, consider researching the latest academic literature and current industry applications.*\n');
      }
    }

    return enhanced;
  }

  /**
   * Assess overall quality of the response
   */
  private assessQuality(
    formattedResponse: FormattedResponse, 
    context: ProcessingContext,
    validationResult: { score: number }
  ): ProcessingResult['qualityAssessment'] {
    const content = formattedResponse.content;
    const structure = formattedResponse.structure;

    // Structure assessment (0-100) - Add null safety
    const sectionsLength = structure.sections?.length || 0;
    const headingsLength = structure.headings?.length || 0;
    let structureScore = Math.min(100, (sectionsLength * 15) + (headingsLength * 10));
    if (validationResult.score > 0) {
      structureScore = Math.min(structureScore, validationResult.score);
    }

    // Consistency assessment (0-100)
    let consistencyScore = 85; // Base score
    const headerPattern = content.match(/^#{1,6}\s/gm) || [];
    if (headerPattern.length > 0) {
      consistencyScore += 10; // Bonus for proper headers
    }
    if (content.includes('**') || content.includes('*')) {
      consistencyScore += 5; // Bonus for text formatting
    }

    // Formatting assessment (0-100)
    let formattingScore = 80; // Base score
    if (context.responseType === 'study_plan') {
      if (content.includes('🎯') && content.includes('⏱️') && content.includes('📚')) {
        formattingScore += 15;
      }
      if (content.includes('- [ ]')) {
        formattingScore += 5;
      }
    }

    // Completeness assessment (0-100)
    const wordCount = content.split(/\s+/).length;
    let completenessScore = Math.min(100, Math.max(60, wordCount / 10)); // Base on word count
    
    if (formattedResponse.metadata) {
      const timeEstimate = formattedResponse.metadata.timeEstimate;
      const difficulty = formattedResponse.metadata.difficulty;
      if (timeEstimate) completenessScore += 5;
      if (difficulty) completenessScore += 5;
    }

    // Educational value assessment (0-100)
    let educationalScore = 75; // Base score
    if (content.includes('Example:') || content.includes('example')) {
      educationalScore += 10;
    }
    if (content.includes('practice') || content.includes('exercise')) {
      educationalScore += 5;
    }
    if (content.includes('Takeaway') || content.includes('Summary')) {
      educationalScore += 10;
    }

    // Calculate overall score with null safety
    const breakdown = {
      structure: Math.round(Math.max(0, Math.min(100, structureScore))),
      consistency: Math.round(Math.max(0, Math.min(100, consistencyScore))),
      formatting: Math.round(Math.max(0, Math.min(100, formattingScore))),
      completeness: Math.round(Math.max(0, Math.min(100, completenessScore))),
      educational: Math.round(Math.max(0, Math.min(100, educationalScore)))
    };

    const overallScore = Math.round(
      (breakdown.structure * 0.2) +
      (breakdown.consistency * 0.15) +
      (breakdown.formatting * 0.2) +
      (breakdown.completeness * 0.25) +
      (breakdown.educational * 0.2)
    );

    // Generate recommendations with additional safety checks
    const recommendations: string[] = [];
    if (breakdown.structure < 80) {
      recommendations.push('Improve content structure with clearer sections and headings');
    }
    if (breakdown.formatting < 80) {
      recommendations.push('Enhance formatting with proper markdown and visual indicators');
    }
    if (breakdown.completeness < 80) {
      recommendations.push('Add more comprehensive content and examples');
    }
    if (breakdown.educational < 80) {
      recommendations.push('Include more practical examples and learning aids');
    }
    if (recommendations.length === 0 && overallScore < 75) {
      recommendations.push('Consider reviewing content for clarity and educational value');
    }

    return {
      overallScore,
      breakdown,
      recommendations
    };
  }

  /**
   * Create default quality assessment for error cases
   */
  private createDefaultQualityAssessment(): ProcessingResult['qualityAssessment'] {
    return {
      overallScore: 50,
      breakdown: {
        structure: 50,
        consistency: 50,
        formatting: 50,
        completeness: 50,
        educational: 50
      },
      recommendations: ['Pipeline processing failed - using fallback formatting']
    };
  }

  /**
   * Update pipeline configuration
   */
  updateConfig(config: Partial<PipelineConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Pipeline configuration updated', 'PostProcessingPipeline', this.config);
  }

  /**
   * Get current pipeline configuration
   */
  getConfig(): PipelineConfig {
    return { ...this.config };
  }

  /**
   * Get pipeline health metrics
   */
  getHealthMetrics(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      averageProcessingTime: number;
      successRate: number;
      qualityScore: number;
    };
  } {
    // In a real implementation, these would be tracked over time
    return {
      status: 'healthy',
      metrics: {
        averageProcessingTime: 150,
        successRate: 95,
        qualityScore: 87
      }
    };
  }
}

// Export singleton instance
export const postProcessingPipeline = PostProcessingPipeline.getInstance();

export default PostProcessingPipeline;