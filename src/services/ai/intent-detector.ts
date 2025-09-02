export interface MessageIntent {
  type: 'greeting' | 'question' | 'request' | 'casual' | 'educational';
  confidence: number;
  responseMode: 'casual' | 'educational';
}

export class IntentDetector {
  private static greetingPatterns = [
    /^(hi|hello|hey|hiya|good\s+(morning|afternoon|evening)|greetings?)\.?\s*$/i,
    /^(what's\s+up|how\s+(are\s+you|you\s+doing)|how's\s+it\s+going)\.?\s*$/i,
    /^(sup|yo|howdy)\.?\s*$/i
  ];

  private static casualPatterns = [
    /^(thanks?|thank\s+you|ty|thx)\.?\s*$/i,
    /^(ok|okay|cool|nice|great|awesome|good)\.?\s*$/i,
    /^(bye|goodbye|see\s+you|later|cya)\.?\s*$/i,
    /^(yes|yeah|yep|no|nope|maybe)\.?\s*$/i
  ];

  private static questionPatterns = [
    /\?$/,
    /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did)/i,
    /^(explain|tell\s+me|show\s+me)/i
  ];

  private static educationalKeywords = [
    'explain', 'learn', 'understand', 'concept', 'theory', 'definition',
    'example', 'practice', 'solve', 'calculate', 'analyze', 'study',
    'homework', 'assignment', 'lesson', 'tutorial', 'formula', 'method'
  ];

  static detectIntent(message: string): MessageIntent {
    const trimmed = message.trim();
    
    // Check for greetings first
    if (this.greetingPatterns.some(pattern => pattern.test(trimmed))) {
      return {
        type: 'greeting',
        confidence: 0.95,
        responseMode: 'casual'
      };
    }

    // Check for casual responses
    if (this.casualPatterns.some(pattern => pattern.test(trimmed))) {
      return {
        type: 'casual',
        confidence: 0.9,
        responseMode: 'casual'
      };
    }

    // Check for educational keywords
    const hasEducationalKeywords = this.educationalKeywords.some(keyword =>
      trimmed.toLowerCase().includes(keyword.toLowerCase())
    );

    // Check if it's a question
    const isQuestion = this.questionPatterns.some(pattern => pattern.test(trimmed));

    if (hasEducationalKeywords || (isQuestion && trimmed.length > 20)) {
      return {
        type: isQuestion ? 'question' : 'request',
        confidence: hasEducationalKeywords ? 0.9 : 0.7,
        responseMode: 'educational'
      };
    }

    // Short questions or simple requests default to casual
    if (trimmed.length < 15 && (isQuestion || trimmed.split(' ').length < 4)) {
      return {
        type: 'casual',
        confidence: 0.6,
        responseMode: 'casual'
      };
    }

    // Default to educational for longer messages
    return {
      type: 'request',
      confidence: 0.5,
      responseMode: 'educational'
    };
  }
}