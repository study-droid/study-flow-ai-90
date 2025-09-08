/**
 * AI Response Filter Service
 * 
 * This service acts as an intermediary layer between the AI responses and the user interface.
 * It filters out model-specific references, standardizes branding, and ensures consistent messaging.
 */

import { logger } from './logging/logger';

interface FilterRule {
  pattern: RegExp;
  replacement: string;
  description?: string;
}

interface FilterConfig {
  modelBranding: FilterRule[];
  competitorBrands: FilterRule[];
  sensitiveContent: FilterRule[];
  standardPhrases: {
    modelIntro: string;
    capabilities: string;
    limitations: string;
    poweredBy: string;
  };
}

interface FilterResult {
  original: string;
  filtered: string;
  rulesApplied: string[];
  filterTime: number;
  brandMentionsRemoved: number;
}

export class AIResponseFilter {
  private static instance: AIResponseFilter;
  
  private readonly filterConfig: FilterConfig = {
    modelBranding: [
      // AI Model Names
      { 
        pattern: /\b(deepseek|deep seek|deep-seek)\b/gi, 
        replacement: 'AI',
        description: 'DeepSeek model reference'
      },
      { 
        pattern: /\b(gpt-?[0-9.]*|chatgpt|chat gpt)\b/gi, 
        replacement: 'AI',
        description: 'GPT model reference'
      },
      { 
        pattern: /\b(claude|anthropic)\b/gi, 
        replacement: 'AI',
        description: 'Claude model reference'
      },
      { 
        pattern: /\b(gemini|google ai|bard)\b/gi, 
        replacement: 'AI',
        description: 'Gemini model reference'
      },
      { 
        pattern: /\b(llama|meta ai)\b/gi, 
        replacement: 'AI',
        description: 'Llama model reference'
      },
      
      // Model Introduction Patterns
      { 
        pattern: /I am (a |an )?(DeepSeek|GPT|Claude|Gemini|ChatGPT|Bard|LLaMA|OpenAI|Anthropic|Google)(\s+\w+)*/gi,
        replacement: 'I am an AI tutor',
        description: 'Model self-identification'
      },
      { 
        pattern: /As (a |an )?(DeepSeek|GPT|Claude|Gemini|ChatGPT|Bard|LLaMA)(\s+\w+)*/gi,
        replacement: 'As an AI tutor',
        description: 'Model role identification'
      },
      { 
        pattern: /I'm (a |an )?(DeepSeek|GPT|Claude|Gemini|ChatGPT|Bard|LLaMA)(\s+\w+)*/gi,
        replacement: "I'm an AI tutor",
        description: 'Informal model identification'
      },
      
      // Company References
      { 
        pattern: /\b(OpenAI|Anthropic|Google AI|DeepSeek Inc|Meta AI)\b/gi,
        replacement: 'AI technology',
        description: 'AI company reference'
      },
      
      // Training Data References
      { 
        pattern: /(my training data|I was trained|my training|trained on|training cutoff)/gi,
        replacement: 'my knowledge',
        description: 'Training data reference'
      },
      { 
        pattern: /knowledge cutoff/gi,
        replacement: 'last update',
        description: 'Knowledge cutoff reference'
      },
      
      // Model Version References
      { 
        pattern: /\b(version|v)\s*[0-9]+(\.[0-9]+)*\b/gi,
        replacement: '',
        description: 'Version number reference'
      },
      
      // API References
      { 
        pattern: /\b(API|API key|endpoint|token)\b/gi,
        replacement: 'service',
        description: 'API technical reference'
      }
    ],
    
    competitorBrands: [
      { 
        pattern: /\b(studyflow|study flow)\b/gi, 
        replacement: 'this platform',
        description: 'StudyFlow reference'
      },
      { 
        pattern: /\b(coursehero|course hero)\b/gi, 
        replacement: 'educational resources',
        description: 'CourseHero reference'
      },
      { 
        pattern: /\b(chegg)\b/gi, 
        replacement: 'study materials',
        description: 'Chegg reference'
      },
      { 
        pattern: /\b(khan academy|khanacademy)\b/gi, 
        replacement: 'educational content',
        description: 'Khan Academy reference'
      },
      { 
        pattern: /\b(quizlet)\b/gi, 
        replacement: 'study tools',
        description: 'Quizlet reference'
      },
      { 
        pattern: /\b(brainly)\b/gi, 
        replacement: 'learning community',
        description: 'Brainly reference'
      }
    ],
    
    sensitiveContent: [
      { 
        pattern: /\b(api[\s-]?key|secret|password|token|credential)\b/gi,
        replacement: '[REDACTED]',
        description: 'Sensitive information'
      },
      { 
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        replacement: '[email protected]',
        description: 'Email address'
      },
      { 
        pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
        replacement: '[PHONE]',
        description: 'Phone number'
      }
    ],
    
    standardPhrases: {
      modelIntro: 'This is powered by AI',
      capabilities: 'As an AI tutor, I can help you understand complex topics, create study plans, and provide practice questions',
      limitations: 'Please note that AI-generated content should be verified with authoritative sources',
      poweredBy: 'Powered by AI'
    }
  };

  private constructor() {}

  static getInstance(): AIResponseFilter {
    if (!this.instance) {
      this.instance = new AIResponseFilter();
    }
    return this.instance;
  }

  /**
   * Main filtering method - processes AI responses
   */
  async filterResponse(response: string, context?: {
    responseType?: string;
    subject?: string;
    preserveFormatting?: boolean;
  }): Promise<FilterResult> {
    const startTime = Date.now();
    const rulesApplied: string[] = [];
    let brandMentionsRemoved = 0;
    let filteredContent = response;

    try {
      // Step 1: Apply model branding filters
      const brandingResult = this.applyFilters(
        filteredContent, 
        this.filterConfig.modelBranding
      );
      filteredContent = brandingResult.content;
      brandMentionsRemoved += brandingResult.matchCount;
      if (brandingResult.matchCount > 0) {
        rulesApplied.push('model_branding');
      }

      // Step 2: Apply competitor brand filters
      const competitorResult = this.applyFilters(
        filteredContent,
        this.filterConfig.competitorBrands
      );
      filteredContent = competitorResult.content;
      brandMentionsRemoved += competitorResult.matchCount;
      if (competitorResult.matchCount > 0) {
        rulesApplied.push('competitor_brands');
      }

      // Step 3: Apply sensitive content filters
      const sensitiveResult = this.applyFilters(
        filteredContent,
        this.filterConfig.sensitiveContent
      );
      filteredContent = sensitiveResult.content;
      if (sensitiveResult.matchCount > 0) {
        rulesApplied.push('sensitive_content');
      }

      // Step 4: Add standard branding if needed
      filteredContent = this.addStandardBranding(filteredContent, context);
      
      // Step 5: Clean up any artifacts from filtering
      filteredContent = this.cleanupContent(filteredContent);

      // Step 6: Validate no model references remain
      const hasModelReferences = this.validateFiltering(filteredContent);
      if (hasModelReferences) {
        logger.warn('Model references still present after filtering', 'AIResponseFilter');
        // Apply a more aggressive filter
        filteredContent = this.aggressiveFilter(filteredContent);
        rulesApplied.push('aggressive_filter');
      }

      const filterTime = Date.now() - startTime;

      logger.info('Response filtered successfully', 'AIResponseFilter', {
        originalLength: response.length,
        filteredLength: filteredContent.length,
        rulesApplied,
        brandMentionsRemoved,
        filterTime
      });

      return {
        original: response,
        filtered: filteredContent,
        rulesApplied,
        filterTime,
        brandMentionsRemoved
      };

    } catch (error) {
      logger.error('Error filtering response', 'AIResponseFilter', error);
      // Return original response if filtering fails
      return {
        original: response,
        filtered: response,
        rulesApplied: [],
        filterTime: Date.now() - startTime,
        brandMentionsRemoved: 0
      };
    }
  }

  /**
   * Apply a set of filter rules to content
   */
  private applyFilters(content: string, rules: FilterRule[]): {
    content: string;
    matchCount: number;
  } {
    let matchCount = 0;
    let filteredContent = content;

    for (const rule of rules) {
      const matches = filteredContent.match(rule.pattern);
      if (matches) {
        matchCount += matches.length;
        filteredContent = filteredContent.replace(rule.pattern, rule.replacement);
        
        if (rule.description) {
          logger.debug(`Applied filter: ${rule.description}`, 'AIResponseFilter', {
            matches: matches.length
          });
        }
      }
    }

    return { content: filteredContent, matchCount };
  }

  /**
   * Add standard branding to the response
   */
  private addStandardBranding(content: string, context?: any): string {
    // Don't add branding to very short responses
    if (content.length < 100) {
      return content;
    }

    // Check if response already has our standard branding
    if (content.includes('Powered by AI') || content.includes('powered by AI')) {
      return content;
    }

    // Add subtle branding at the end for longer responses
    if (content.length > 500 && !context?.preserveFormatting) {
      // Only add if the response doesn't end with a question
      if (!content.trim().endsWith('?')) {
        content += '\n\n---\n*Powered by AI*';
      }
    }

    return content;
  }

  /**
   * Clean up content after filtering
   */
  private cleanupContent(content: string): string {
    // Remove multiple spaces
    content = content.replace(/\s{2,}/g, ' ');
    
    // Remove empty parentheses or brackets from removed content
    content = content.replace(/\(\s*\)/g, '');
    content = content.replace(/\[\s*\]/g, '');
    
    // Fix sentence structure issues from replacements
    content = content.replace(/\s+([.,!?;:])/g, '$1');
    content = content.replace(/([.,!?;:])([A-Za-z])/g, '$1 $2');
    
    // Remove duplicate punctuation
    content = content.replace(/([.,!?;:]){2,}/g, '$1');
    
    // Ensure proper capitalization after periods
    content = content.replace(/\. ([a-z])/g, (match, letter) => `. ${letter.toUpperCase()}`);
    
    return content.trim();
  }

  /**
   * Validate that filtering was successful
   */
  private validateFiltering(content: string): boolean {
    const modelKeywords = [
      'deepseek', 'gpt', 'claude', 'gemini', 'openai', 
      'anthropic', 'chatgpt', 'bard', 'llama'
    ];
    
    const lowerContent = content.toLowerCase();
    return modelKeywords.some(keyword => lowerContent.includes(keyword));
  }

  /**
   * Apply aggressive filtering for stubborn content
   */
  private aggressiveFilter(content: string): string {
    // More aggressive patterns
    const aggressiveRules: FilterRule[] = [
      { 
        pattern: /\b\w*(?:deep|seek|gpt|claude|gemini|openai|anthropic|chat|bot|llm)\w*\b/gi,
        replacement: 'AI',
        description: 'Aggressive model keyword filter'
      },
      {
        pattern: /powered by \w+/gi,
        replacement: 'powered by AI',
        description: 'Powered by replacement'
      },
      {
        pattern: /built with \w+/gi,
        replacement: 'built with AI',
        description: 'Built with replacement'
      }
    ];

    let filtered = content;
    for (const rule of aggressiveRules) {
      filtered = filtered.replace(rule.pattern, rule.replacement);
    }
    
    return filtered;
  }

  /**
   * Get filter statistics
   */
  getFilterStats(): {
    totalRules: number;
    categories: string[];
  } {
    return {
      totalRules: 
        this.filterConfig.modelBranding.length +
        this.filterConfig.competitorBrands.length +
        this.filterConfig.sensitiveContent.length,
      categories: ['model_branding', 'competitor_brands', 'sensitive_content']
    };
  }

  /**
   * Update filter rules dynamically
   */
  addCustomRule(category: keyof FilterConfig, rule: FilterRule): void {
    if (Array.isArray(this.filterConfig[category])) {
      (this.filterConfig[category] as FilterRule[]).push(rule);
      logger.info('Added custom filter rule', 'AIResponseFilter', {
        category,
        pattern: rule.pattern.toString()
      });
    }
  }

  /**
   * Get standard phrases for UI display
   */
  getStandardPhrases(): typeof this.filterConfig.standardPhrases {
    return this.filterConfig.standardPhrases;
  }
}

// Export singleton instance
export const aiResponseFilter = AIResponseFilter.getInstance();