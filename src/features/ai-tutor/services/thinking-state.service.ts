/**
 * Enhanced Thinking State Service
 * Provides intelligent thinking content based on message analysis
 */

import { aiFactsService, type AIFact } from './ai-facts.service';

export interface ThinkingContext {
  messageContent: string;
  messageType: MessageType;
  complexity: ComplexityLevel;
  subject?: string;
  previousMessages?: Array<{ role: string; content: string }>;
}

export interface EnhancedThinkingState {
  isVisible: boolean;
  content: string;
  stage: ThinkingStage;
  progress: number;
  contextualMessage: string;
  estimatedDuration: number;
  currentFact?: AIFact;
  factRotation?: AIFact[];
  messageType: MessageType;
  complexity: ComplexityLevel;
  animations: ThinkingAnimations;
}

export type ThinkingStage = 'analyzing' | 'reasoning' | 'responding';
export type MessageType = 'question' | 'explanation' | 'problem-solving' | 'creative' | 'factual' | 'conversational';
export type ComplexityLevel = 'simple' | 'moderate' | 'complex' | 'advanced';

export interface ThinkingAnimations {
  primaryAnimation: string;
  particleCount: number;
  pulseIntensity: number;
  colorScheme: string;
}

export class ThinkingStateService {
  private readonly stageProgressMap = {
    analyzing: { min: 0, max: 30 },
    reasoning: { min: 30, max: 80 },
    responding: { min: 80, max: 100 }
  };

  private readonly complexityDurationMap = {
    simple: { analyzing: 800, reasoning: 1500, responding: 1000 },
    moderate: { analyzing: 1200, reasoning: 2500, responding: 1500 },
    complex: { analyzing: 1800, reasoning: 4000, responding: 2000 },
    advanced: { analyzing: 2500, reasoning: 6000, responding: 3000 }
  };

  /**
   * Analyze message content to determine type and complexity
   */
  analyzeMessage(content: string, previousMessages?: Array<{ role: string; content: string }>): ThinkingContext {
    const messageType = this.detectMessageType(content);
    const complexity = this.assessComplexity(content, messageType);
    const subject = this.detectSubject(content);

    return {
      messageContent: content,
      messageType,
      complexity,
      subject,
      previousMessages
    };
  }

  /**
   * Generate enhanced thinking state based on context
   */
  generateThinkingState(
    stage: ThinkingStage,
    context: ThinkingContext,
    progress?: number
  ): EnhancedThinkingState {
    const contextualMessage = this.generateContextualMessage(stage, context);
    const estimatedDuration = this.calculateEstimatedDuration(stage, context.complexity);
    const animations = this.generateAnimations(stage, context);
    const facts = aiFactsService.getFactsForStage(stage, 3);

    // Calculate progress based on stage and context
    const stageProgress = progress ?? this.calculateStageProgress(stage, context);

    return {
      isVisible: true,
      content: contextualMessage,
      stage,
      progress: stageProgress,
      contextualMessage,
      estimatedDuration,
      currentFact: facts[0],
      factRotation: facts,
      messageType: context.messageType,
      complexity: context.complexity,
      animations
    };
  }

  /**
   * Update thinking state with new progress
   */
  updateThinkingProgress(
    currentState: EnhancedThinkingState,
    newProgress: number,
    additionalContext?: string
  ): EnhancedThinkingState {
    const updatedContent = additionalContext || currentState.content;
    
    return {
      ...currentState,
      progress: Math.min(100, Math.max(0, newProgress)),
      content: updatedContent,
      contextualMessage: updatedContent
    };
  }

  /**
   * Detect the type of message being processed
   */
  private detectMessageType(content: string): MessageType {
    const lowerContent = content.toLowerCase();
    
    // Question patterns
    if (lowerContent.includes('?') || 
        lowerContent.startsWith('what') || 
        lowerContent.startsWith('how') || 
        lowerContent.startsWith('why') || 
        lowerContent.startsWith('when') || 
        lowerContent.startsWith('where') ||
        lowerContent.startsWith('can you')) {
      return 'question';
    }

    // Problem-solving patterns
    if (lowerContent.includes('solve') || 
        lowerContent.includes('calculate') || 
        lowerContent.includes('find') || 
        lowerContent.includes('determine') ||
        /\d+[\+\-\*\/]\d+/.test(content)) {
      return 'problem-solving';
    }

    // Creative patterns
    if (lowerContent.includes('create') || 
        lowerContent.includes('write') || 
        lowerContent.includes('design') || 
        lowerContent.includes('imagine') ||
        lowerContent.includes('brainstorm')) {
      return 'creative';
    }

    // Explanation patterns
    if (lowerContent.includes('explain') || 
        lowerContent.includes('describe') || 
        lowerContent.includes('tell me about') ||
        lowerContent.includes('help me understand')) {
      return 'explanation';
    }

    // Factual patterns
    if (lowerContent.includes('fact') || 
        lowerContent.includes('definition') || 
        lowerContent.includes('meaning') ||
        lowerContent.startsWith('define')) {
      return 'factual';
    }

    return 'conversational';
  }

  /**
   * Assess the complexity of the message
   */
  private assessComplexity(content: string, messageType: MessageType): ComplexityLevel {
    let complexityScore = 0;

    // Length factor
    if (content.length > 200) complexityScore += 2;
    else if (content.length > 100) complexityScore += 1;

    // Technical terms
    const technicalTerms = /\b(algorithm|function|derivative|integral|quantum|molecular|synthesis|analysis|theorem|hypothesis)\b/gi;
    complexityScore += (content.match(technicalTerms) || []).length;

    // Multiple questions or parts
    const questionMarks = (content.match(/\?/g) || []).length;
    if (questionMarks > 1) complexityScore += 1;

    // Mathematical expressions
    const mathExpressions = /[a-zA-Z]*\d+[a-zA-Z]*[\+\-\*\/\^\(\)]/g;
    complexityScore += (content.match(mathExpressions) || []).length;

    // Message type complexity
    switch (messageType) {
      case 'problem-solving':
        complexityScore += 2;
        break;
      case 'creative':
        complexityScore += 1;
        break;
      case 'explanation':
        complexityScore += 1;
        break;
      case 'conversational':
        complexityScore -= 1;
        break;
    }

    // Determine complexity level
    if (complexityScore >= 5) return 'advanced';
    if (complexityScore >= 3) return 'complex';
    if (complexityScore >= 1) return 'moderate';
    return 'simple';
  }

  /**
   * Detect the subject area of the message
   */
  private detectSubject(content: string): string | undefined {
    const lowerContent = content.toLowerCase();
    
    const subjects = {
      mathematics: ['math', 'calculate', 'equation', 'algebra', 'geometry', 'calculus', 'statistics'],
      science: ['physics', 'chemistry', 'biology', 'experiment', 'hypothesis', 'molecule'],
      programming: ['code', 'function', 'algorithm', 'programming', 'javascript', 'python', 'debug'],
      language: ['grammar', 'writing', 'essay', 'literature', 'language', 'translate'],
      history: ['history', 'historical', 'ancient', 'war', 'civilization', 'century'],
      general: []
    };

    for (const [subject, keywords] of Object.entries(subjects)) {
      if (keywords.some(keyword => lowerContent.includes(keyword))) {
        return subject;
      }
    }

    return 'general';
  }

  /**
   * Generate contextual thinking messages based on stage and context
   */
  private generateContextualMessage(stage: ThinkingStage, context: ThinkingContext): string {
    const { messageType, complexity, subject } = context;

    const messages = {
      analyzing: {
        question: {
          simple: "Understanding your question...",
          moderate: "Analyzing the key components of your question...",
          complex: "Breaking down your multi-part question...",
          advanced: "Parsing the complex relationships in your inquiry..."
        },
        'problem-solving': {
          simple: "Identifying the problem type...",
          moderate: "Analyzing the problem structure and requirements...",
          complex: "Decomposing the problem into manageable components...",
          advanced: "Mapping the problem space and identifying solution strategies..."
        },
        creative: {
          simple: "Gathering creative inspiration...",
          moderate: "Exploring creative possibilities and approaches...",
          complex: "Synthesizing multiple creative elements and themes...",
          advanced: "Architecting a comprehensive creative framework..."
        },
        explanation: {
          simple: "Preparing a clear explanation...",
          moderate: "Structuring the explanation for optimal understanding...",
          complex: "Organizing complex concepts into digestible parts...",
          advanced: "Designing a multi-layered explanatory framework..."
        },
        factual: {
          simple: "Retrieving relevant information...",
          moderate: "Gathering and verifying factual information...",
          complex: "Cross-referencing multiple information sources...",
          advanced: "Synthesizing comprehensive factual analysis..."
        },
        conversational: {
          simple: "Processing your message...",
          moderate: "Understanding the conversational context...",
          complex: "Analyzing the nuanced aspects of our conversation...",
          advanced: "Integrating conversational history and context..."
        }
      },
      reasoning: {
        question: {
          simple: "Formulating a helpful response...",
          moderate: "Reasoning through the best way to answer...",
          complex: "Connecting multiple concepts to address your question...",
          advanced: "Synthesizing advanced reasoning patterns..."
        },
        'problem-solving': {
          simple: "Working through the solution steps...",
          moderate: "Applying problem-solving methodologies...",
          complex: "Evaluating multiple solution approaches...",
          advanced: "Optimizing solution strategies and validating approaches..."
        },
        creative: {
          simple: "Developing creative ideas...",
          moderate: "Weaving together creative concepts...",
          complex: "Balancing creativity with practical constraints...",
          advanced: "Orchestrating sophisticated creative synthesis..."
        },
        explanation: {
          simple: "Organizing the explanation clearly...",
          moderate: "Structuring concepts for maximum clarity...",
          complex: "Layering explanations from basic to advanced...",
          advanced: "Crafting pedagogically optimized explanations..."
        },
        factual: {
          simple: "Verifying information accuracy...",
          moderate: "Cross-checking facts and sources...",
          complex: "Analyzing information reliability and context...",
          advanced: "Performing comprehensive fact validation..."
        },
        conversational: {
          simple: "Considering the best response...",
          moderate: "Balancing informativeness with engagement...",
          complex: "Crafting a contextually appropriate response...",
          advanced: "Optimizing conversational flow and depth..."
        }
      },
      responding: {
        question: {
          simple: "Finalizing your answer...",
          moderate: "Polishing the response for clarity...",
          complex: "Ensuring comprehensive coverage of your question...",
          advanced: "Optimizing response depth and accessibility..."
        },
        'problem-solving': {
          simple: "Presenting the solution clearly...",
          moderate: "Formatting the solution with clear steps...",
          complex: "Organizing the complete solution framework...",
          advanced: "Delivering comprehensive solution architecture..."
        },
        creative: {
          simple: "Presenting creative ideas...",
          moderate: "Organizing creative concepts effectively...",
          complex: "Structuring the creative output for impact...",
          advanced: "Delivering sophisticated creative synthesis..."
        },
        explanation: {
          simple: "Finalizing the explanation...",
          moderate: "Ensuring explanation clarity and flow...",
          complex: "Optimizing explanation structure and examples...",
          advanced: "Delivering pedagogically refined explanation..."
        },
        factual: {
          simple: "Presenting accurate information...",
          moderate: "Organizing facts for easy understanding...",
          complex: "Structuring comprehensive factual response...",
          advanced: "Delivering authoritative information synthesis..."
        },
        conversational: {
          simple: "Crafting a thoughtful response...",
          moderate: "Finalizing an engaging reply...",
          complex: "Optimizing conversational engagement...",
          advanced: "Delivering contextually perfect response..."
        }
      }
    };

    const stageMessages = messages[stage];
    const typeMessages = stageMessages[messageType] || stageMessages.conversational;
    
    return typeMessages[complexity];
  }

  /**
   * Calculate estimated duration for each stage
   */
  private calculateEstimatedDuration(stage: ThinkingStage, complexity: ComplexityLevel): number {
    return this.complexityDurationMap[complexity][stage];
  }

  /**
   * Calculate progress within a stage
   */
  private calculateStageProgress(stage: ThinkingStage, context: ThinkingContext): number {
    const stageRange = this.stageProgressMap[stage];
    const baseProgress = stageRange.min;
    const progressRange = stageRange.max - stageRange.min;
    
    // Add some randomness and complexity-based adjustment
    const complexityMultiplier = {
      simple: 0.8,
      moderate: 0.6,
      complex: 0.4,
      advanced: 0.2
    }[context.complexity];
    
    return baseProgress + (progressRange * complexityMultiplier);
  }

  /**
   * Generate animations based on context
   */
  private generateAnimations(stage: ThinkingStage, context: ThinkingContext): ThinkingAnimations {
    const baseAnimations = {
      analyzing: {
        primaryAnimation: 'pulse-analyze',
        particleCount: 6,
        pulseIntensity: 0.6,
        colorScheme: 'blue'
      },
      reasoning: {
        primaryAnimation: 'wave-reason',
        particleCount: 8,
        pulseIntensity: 0.8,
        colorScheme: 'purple'
      },
      responding: {
        primaryAnimation: 'glow-respond',
        particleCount: 10,
        pulseIntensity: 1.0,
        colorScheme: 'green'
      }
    };

    const stageAnimation = baseAnimations[stage];
    
    // Adjust based on complexity
    const complexityMultiplier = {
      simple: 0.7,
      moderate: 0.85,
      complex: 1.0,
      advanced: 1.2
    }[context.complexity];

    return {
      ...stageAnimation,
      particleCount: Math.round(stageAnimation.particleCount * complexityMultiplier),
      pulseIntensity: stageAnimation.pulseIntensity * complexityMultiplier
    };
  }

  /**
   * Generate stage transition with smooth progress updates
   */
  generateStageTransition(
    fromStage: ThinkingStage,
    toStage: ThinkingStage,
    context: ThinkingContext
  ): { progress: number; message: string } {
    const transitionMessages = {
      'analyzing->reasoning': 'Moving to deep analysis...',
      'reasoning->responding': 'Preparing your response...',
      'analyzing->responding': 'Finalizing quick response...'
    };

    const transitionKey = `${fromStage}->${toStage}` as keyof typeof transitionMessages;
    const message = transitionMessages[transitionKey] || 'Transitioning...';
    
    const toStageRange = this.stageProgressMap[toStage];
    const progress = toStageRange.min;

    return { progress, message };
  }
}

// Export singleton instance
export const thinkingStateService = new ThinkingStateService();