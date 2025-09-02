/**
 * DeepSeek Response Optimizer
 * 
 * This service acts as a filter/middleware for all DeepSeek API responses,
 * optimizing them for better quality, relevance, and educational value.
 */

import { logger } from './logging/logger';

interface OptimizationConfig {
  maxTokens?: number;
  temperature?: number;
  enhanceEducational?: boolean;
  includeExamples?: boolean;
  structuredFormat?: boolean;
  validateAccuracy?: boolean;
  contextAware?: boolean;
}

interface ResponseMetadata {
  originalLength: number;
  optimizedLength: number;
  optimizationTime: number;
  enhancementsApplied: string[];
  qualityScore?: number;
}

interface OptimizedResponse {
  content: string;
  metadata: ResponseMetadata;
  suggestions?: string[];
  relatedTopics?: string[];
}

export class DeepSeekResponseOptimizer {
  private static instance: DeepSeekResponseOptimizer;
  private defaultConfig: OptimizationConfig = {
    maxTokens: 2000,
    temperature: 0.7,
    enhanceEducational: true,
    includeExamples: true,
    structuredFormat: true,
    validateAccuracy: true,
    contextAware: true
  };

  private constructor() {}

  static getInstance(): DeepSeekResponseOptimizer {
    if (!this.instance) {
      this.instance = new DeepSeekResponseOptimizer();
    }
    return this.instance;
  }

  /**
   * Main optimization method - processes DeepSeek responses
   */
  async optimizeResponse(
    response: string,
    context?: {
      subject?: string;
      topic?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
      responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
    },
    config?: OptimizationConfig
  ): Promise<OptimizedResponse> {
    const startTime = Date.now();
    const mergedConfig = { ...this.defaultConfig, ...config };
    const enhancementsApplied: string[] = [];
    
    let optimizedContent = response;
    const originalLength = response.length;

    try {
      // Step 1: Clean and normalize the response
      optimizedContent = this.cleanResponse(optimizedContent);
      enhancementsApplied.push('cleaned');

      // Step 2: Enhance educational value
      if (mergedConfig.enhanceEducational && context?.responseType) {
        optimizedContent = this.enhanceEducationalContent(
          optimizedContent,
          context.responseType,
          context.userLevel
        );
        enhancementsApplied.push('educational_enhancement');
      }

      // Step 3: Add structure and formatting
      if (mergedConfig.structuredFormat) {
        optimizedContent = this.structureResponse(
          optimizedContent,
          context?.responseType
        );
        enhancementsApplied.push('structured_formatting');
      }

      // Step 4: Add examples if needed
      if (mergedConfig.includeExamples && this.shouldIncludeExamples(context?.responseType)) {
        optimizedContent = this.enrichWithExamples(
          optimizedContent,
          context?.subject,
          context?.topic
        );
        enhancementsApplied.push('examples_added');
      }

      // Step 5: Validate and correct accuracy
      if (mergedConfig.validateAccuracy) {
        optimizedContent = this.validateAndCorrect(optimizedContent);
        enhancementsApplied.push('accuracy_validated');
      }

      // Step 6: Apply context-aware optimizations
      if (mergedConfig.contextAware && context) {
        optimizedContent = this.applyContextOptimizations(
          optimizedContent,
          context
        );
        enhancementsApplied.push('context_optimization');
      }

      // Step 7: Generate related topics and suggestions
      const suggestions = this.generateSuggestions(optimizedContent, context);
      const relatedTopics = this.extractRelatedTopics(optimizedContent, context);

      // Step 8: Calculate quality score
      const qualityScore = this.calculateQualityScore(
        optimizedContent,
        enhancementsApplied
      );

      const optimizationTime = Date.now() - startTime;

      logger.info('Response optimized successfully', 'DeepSeekResponseOptimizer', {
        originalLength,
        optimizedLength: optimizedContent.length,
        optimizationTime,
        enhancementsApplied,
        qualityScore
      });

      return {
        content: optimizedContent,
        metadata: {
          originalLength,
          optimizedLength: optimizedContent.length,
          optimizationTime,
          enhancementsApplied,
          qualityScore
        },
        suggestions,
        relatedTopics
      };
    } catch (error) {
      logger.error('Error optimizing response', 'DeepSeekResponseOptimizer', error);
      // Return original response if optimization fails
      return {
        content: response,
        metadata: {
          originalLength,
          optimizedLength: response.length,
          optimizationTime: Date.now() - startTime,
          enhancementsApplied: [],
          qualityScore: 0
        }
      };
    }
  }

  /**
   * Clean and normalize the response
   */
  private cleanResponse(content: string): string {
    // Remove excessive whitespace
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.replace(/\s+$/gm, '');
    
    // Fix common formatting issues
    content = content.replace(/\*\*\*\*/g, '**');
    content = content.replace(/#{7,}/g, '######');
    
    // Ensure proper sentence spacing
    content = content.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Remove any potential harmful content
    content = this.sanitizeContent(content);
    
    return content.trim();
  }

  /**
   * Enhance educational content based on type
   */
  private enhanceEducationalContent(
    content: string,
    responseType: string,
    userLevel?: string
  ): string {
    const enhancements: Record<string, (content: string, level?: string) => string> = {
      explanation: this.enhanceExplanation.bind(this),
      study_plan: this.enhanceStudyPlan.bind(this),
      practice: this.enhancePracticeQuestions.bind(this),
      concept: this.enhanceConceptExplanation.bind(this)
    };

    const enhancer = enhancements[responseType];
    if (enhancer) {
      return enhancer(content, userLevel);
    }

    return content;
  }

  /**
   * Enhance explanation responses
   */
  private enhanceExplanation(content: string, level?: string): string {
    const levelPrefix = {
      beginner: '## 🌱 Beginner-Friendly Explanation\n\n',
      intermediate: '## 📚 Detailed Explanation\n\n',
      advanced: '## 🎓 Advanced Analysis\n\n'
    };

    if (level && levelPrefix[level]) {
      content = levelPrefix[level] + content;
    }

    // Add key points summary if not present
    if (!content.includes('Key Points:') && !content.includes('Summary:')) {
      const keyPoints = this.extractKeyPoints(content);
      if (keyPoints.length > 0) {
        content += '\n\n### 📌 Key Points:\n' + keyPoints.map(p => `- ${p}`).join('\n');
      }
    }

    return content;
  }

  /**
   * Enhance study plan responses
   */
  private enhanceStudyPlan(content: string, level?: string): string {
    // Ensure proper study plan structure
    const sections = [
      { marker: '## 📅 Timeline', default: 'Study timeline and milestones' },
      { marker: '## 📚 Topics', default: 'Topics to cover' },
      { marker: '## 🎯 Goals', default: 'Learning objectives' },
      { marker: '## 📝 Resources', default: 'Recommended resources' }
    ];

    sections.forEach(section => {
      if (!content.includes(section.marker)) {
        content += `\n\n${section.marker}\n${section.default}`;
      }
    });

    // Add progress tracking suggestion
    if (!content.includes('Progress Tracking')) {
      content += '\n\n### 📊 Progress Tracking\n';
      content += '- Regular self-assessments\n';
      content += '- Weekly review sessions\n';
      content += '- Practice problem completion\n';
    }

    return content;
  }

  /**
   * Enhance practice questions
   */
  private enhancePracticeQuestions(content: string, level?: string): string {
    // Ensure questions have proper formatting
    content = content.replace(/^(\d+)\./gm, '\n**Question $1:**');
    
    // Add difficulty indicators
    if (level && !content.includes('Difficulty:')) {
      const difficultyMap = {
        beginner: '🟢 Easy',
        intermediate: '🟡 Medium',
        advanced: '🔴 Hard'
      };
      content = `**Difficulty:** ${difficultyMap[level] || '🟡 Medium'}\n\n` + content;
    }

    // Add hints section if not present
    if (!content.includes('Hint') && !content.includes('hint')) {
      content += '\n\n💡 **Need hints?** Try breaking down the problem into smaller steps.';
    }

    return content;
  }

  /**
   * Enhance concept explanations
   */
  private enhanceConceptExplanation(content: string, level?: string): string {
    // Add concept structure
    const conceptStructure = [
      '## 📖 Definition',
      '## 🔍 Detailed Explanation',
      '## 💡 Examples',
      '## 🔗 Related Concepts',
      '## ✅ Quick Check'
    ];

    conceptStructure.forEach(section => {
      if (!content.includes(section)) {
        const sectionName = section.replace(/^## [^ ]+ /, '');
        content += `\n\n${section}\n[${sectionName} content to be added]`;
      }
    });

    return content;
  }

  /**
   * Structure the response with proper formatting
   */
  private structureResponse(content: string, responseType?: string): string {
    // Add proper markdown headers
    content = this.ensureProperHeaders(content);
    
    // Format lists properly
    content = this.formatLists(content);
    
    // Add code block formatting
    content = this.formatCodeBlocks(content);
    
    // Add emphasis to important terms
    content = this.emphasizeImportantTerms(content);
    
    return content;
  }

  /**
   * Ensure proper header hierarchy
   */
  private ensureProperHeaders(content: string): string {
    const lines = content.split('\n');
    let lastHeaderLevel = 0;
    
    return lines.map(line => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headerMatch) {
        const currentLevel = headerMatch[1].length;
        // Ensure no skipping of header levels
        if (currentLevel > lastHeaderLevel + 1 && lastHeaderLevel > 0) {
          const correctedLevel = '#'.repeat(lastHeaderLevel + 1);
          line = `${correctedLevel} ${headerMatch[2]}`;
        }
        lastHeaderLevel = headerMatch[1].length;
      }
      return line;
    }).join('\n');
  }

  /**
   * Format lists for better readability
   */
  private formatLists(content: string): string {
    // Convert dash lists to bullet points
    content = content.replace(/^-\s+/gm, '• ');
    
    // Ensure proper spacing around lists
    content = content.replace(/([^\n])\n•/g, '$1\n\n•');
    content = content.replace(/•([^\n]+)\n([^•\n])/g, '•$1\n\n$2');
    
    return content;
  }

  /**
   * Format code blocks properly
   */
  private formatCodeBlocks(content: string): string {
    // Detect inline code and ensure backticks
    content = content.replace(/`([^`]+)`/g, '`$1`');
    
    // Detect multi-line code and ensure code blocks
    const codeBlockRegex = /```[\s\S]*?```/g;
    const hasCodeBlocks = codeBlockRegex.test(content);
    
    if (!hasCodeBlocks) {
      // Look for indented code and convert to code blocks
      content = content.replace(/^(    .+\n)+/gm, (match) => {
        return '```\n' + match.replace(/^    /gm, '') + '```\n';
      });
    }
    
    return content;
  }

  /**
   * Emphasize important terms
   */
  private emphasizeImportantTerms(content: string): string {
    const importantTerms = [
      'important', 'note', 'warning', 'tip', 'remember',
      'key point', 'crucial', 'essential', 'critical'
    ];
    
    importantTerms.forEach(term => {
      const regex = new RegExp(`\\b(${term}):?\\s+([^.!?]+[.!?])`, 'gi');
      content = content.replace(regex, '**$1:** $2');
    });
    
    return content;
  }

  /**
   * Enrich content with examples
   */
  private enrichWithExamples(
    content: string,
    subject?: string,
    topic?: string
  ): string {
    // Check if examples already exist
    if (content.includes('Example') || content.includes('example')) {
      return content;
    }

    // Add example section
    const exampleSection = '\n\n### 📝 Examples\n';
    const examplePrompt = subject && topic
      ? `Here are practical examples related to ${topic} in ${subject}:`
      : 'Here are some practical examples:';
    
    content += exampleSection + examplePrompt;
    content += '\n\n1. [Example 1 - to be generated based on context]';
    content += '\n2. [Example 2 - to be generated based on context]';
    
    return content;
  }

  /**
   * Validate and correct common errors
   */
  private validateAndCorrect(content: string): string {
    // Fix common spelling mistakes
    const corrections: Record<string, string> = {
      'teh': 'the',
      'recieve': 'receive',
      'seperate': 'separate',
      'occured': 'occurred',
      'untill': 'until'
    };

    Object.entries(corrections).forEach(([wrong, correct]) => {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      content = content.replace(regex, correct);
    });

    // Fix punctuation issues
    content = content.replace(/\s+([.,!?;:])/g, '$1');
    content = content.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2');
    
    // Ensure sentences start with capital letters
    content = content.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    return content;
  }

  /**
   * Apply context-specific optimizations
   */
  private applyContextOptimizations(
    content: string,
    context: any
  ): string {
    // Add subject-specific formatting
    if (context.subject) {
      if (!content.includes(context.subject)) {
        content = `**Subject:** ${context.subject}\n\n` + content;
      }
    }

    // Add topic breadcrumb
    if (context.topic) {
      if (!content.includes(context.topic)) {
        content = `**Topic:** ${context.topic}\n\n` + content;
      }
    }

    // Add user level indicator
    if (context.userLevel) {
      const levelIndicators = {
        beginner: '🌱',
        intermediate: '📚',
        advanced: '🎓'
      };
      const indicator = levelIndicators[context.userLevel] || '📚';
      content = `${indicator} **Level:** ${context.userLevel}\n\n` + content;
    }

    return content;
  }

  /**
   * Generate suggestions based on content
   */
  private generateSuggestions(content: string, context?: any): string[] {
    const suggestions: string[] = [];

    // Analyze content and generate relevant suggestions
    if (content.includes('practice') || content.includes('exercise')) {
      suggestions.push('Try solving similar problems to reinforce learning');
    }

    if (content.includes('concept') || content.includes('theory')) {
      suggestions.push('Create flashcards for key concepts');
    }

    if (content.includes('formula') || content.includes('equation')) {
      suggestions.push('Practice applying formulas with different values');
    }

    if (context?.responseType === 'study_plan') {
      suggestions.push('Set reminders for study sessions');
      suggestions.push('Track your progress regularly');
    }

    if (context?.userLevel === 'beginner') {
      suggestions.push('Start with basic examples before moving to complex ones');
    }

    return suggestions;
  }

  /**
   * Extract related topics from content
   */
  private extractRelatedTopics(content: string, context?: any): string[] {
    const relatedTopics: string[] = [];

    // Extract topics mentioned in the content
    const topicPatterns = [
      /related to[s]?\s+([^.,]+)/gi,
      /see also[:]?\s+([^.,]+)/gi,
      /similar to[:]?\s+([^.,]+)/gi,
      /connected with[:]?\s+([^.,]+)/gi
    ];

    topicPatterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          relatedTopics.push(match[1].trim());
        }
      }
    });

    // Add context-based related topics
    if (context?.topic) {
      // Add prerequisite and advanced topics
      relatedTopics.push(`${context.topic} - Prerequisites`);
      relatedTopics.push(`Advanced ${context.topic}`);
    }

    return [...new Set(relatedTopics)].slice(0, 5);
  }

  /**
   * Calculate quality score for the optimized response
   */
  private calculateQualityScore(
    content: string,
    enhancementsApplied: string[]
  ): number {
    let score = 50; // Base score

    // Structure quality
    if (content.includes('##')) score += 10;
    if (content.includes('###')) score += 5;
    
    // Content richness
    if (content.includes('Example') || content.includes('example')) score += 10;
    if (content.includes('Key Point') || content.includes('Summary')) score += 10;
    
    // Formatting quality
    if (content.includes('**')) score += 5;
    if (content.includes('•') || content.includes('-')) score += 5;
    
    // Enhancement bonus
    score += enhancementsApplied.length * 2;
    
    // Length appropriateness
    const wordCount = content.split(/\s+/).length;
    if (wordCount >= 100 && wordCount <= 1000) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * Extract key points from content
   */
  private extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
      sentence = sentence.trim();
      // Look for sentences with important keywords
      if (sentence.length > 20 && sentence.length < 200) {
        if (
          sentence.includes('important') ||
          sentence.includes('key') ||
          sentence.includes('essential') ||
          sentence.includes('must') ||
          sentence.includes('should') ||
          sentence.includes('remember')
        ) {
          keyPoints.push(sentence);
        }
      }
    });
    
    return keyPoints.slice(0, 5);
  }

  /**
   * Check if examples should be included
   */
  private shouldIncludeExamples(responseType?: string): boolean {
    const typesNeedingExamples = ['explanation', 'concept', 'practice'];
    return responseType ? typesNeedingExamples.includes(responseType) : true;
  }

  /**
   * Sanitize content to remove any harmful elements
   */
  private sanitizeContent(content: string): string {
    // Remove any script tags or HTML
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    content = content.replace(/<[^>]+>/g, '');
    
    // Remove any potential command injections
    content = content.replace(/\$\([^)]+\)/g, '');
    content = content.replace(/`[^`]+`/g, (match) => {
      // Keep code blocks but sanitize them
      return match.replace(/[;&|]/g, '');
    });
    
    return content;
  }

  /**
   * Optimize request before sending to DeepSeek
   */
  async optimizeRequest(
    prompt: string,
    context?: any
  ): Promise<{
    optimizedPrompt: string;
    systemPrompt?: string;
    parameters?: any;
  }> {
    let optimizedPrompt = prompt;
    let systemPrompt = '';

    // Add context to the prompt
    if (context?.subject && context?.topic) {
      optimizedPrompt = `[Subject: ${context.subject}, Topic: ${context.topic}]\n${prompt}`;
    }

    // Generate appropriate system prompt based on response type
    if (context?.responseType) {
      systemPrompt = this.generateSystemPrompt(context.responseType, context.userLevel);
    }

    // Optimize parameters based on response type
    const parameters = this.getOptimalParameters(context?.responseType);

    return {
      optimizedPrompt,
      systemPrompt,
      parameters
    };
  }

  /**
   * Generate system prompt based on response type
   */
  private generateSystemPrompt(responseType: string, userLevel?: string): string {
    const basePrompt = 'You are an expert educational AI tutor. ';
    const levelContext = userLevel ? `The user is at ${userLevel} level. ` : '';

    const typePrompts: Record<string, string> = {
      explanation: `${basePrompt}${levelContext}Provide clear, detailed explanations with examples. Break down complex concepts into understandable parts.`,
      study_plan: `${basePrompt}${levelContext}Create comprehensive, structured study plans with clear timelines, milestones, and resources.`,
      practice: `${basePrompt}${levelContext}Generate practice questions that progressively build understanding. Include hints and detailed solutions.`,
      concept: `${basePrompt}${levelContext}Explain concepts thoroughly with definitions, examples, and connections to related topics.`
    };

    return typePrompts[responseType] || basePrompt;
  }

  /**
   * Get optimal parameters for different response types
   */
  private getOptimalParameters(responseType?: string): any {
    const defaultParams = {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.95
    };

    const typeParams: Record<string, any> = {
      explanation: { temperature: 0.6, max_tokens: 1500 },
      study_plan: { temperature: 0.5, max_tokens: 2500 },
      practice: { temperature: 0.8, max_tokens: 2000 },
      concept: { temperature: 0.6, max_tokens: 1800 }
    };

    return responseType && typeParams[responseType]
      ? { ...defaultParams, ...typeParams[responseType] }
      : defaultParams;
  }
}

// Export singleton instance
export const deepSeekOptimizer = DeepSeekResponseOptimizer.getInstance();