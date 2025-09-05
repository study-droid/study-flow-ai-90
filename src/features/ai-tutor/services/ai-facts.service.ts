/**
 * AI Facts Service - Provides educational facts about AI processing
 * Used during thinking phases to educate users about how AI works
 */

export interface AIFact {
  id: string;
  category: 'analyzing' | 'reasoning' | 'responding' | 'general';
  title: string;
  content: string;
  icon?: string;
}

export class AIFactsService {
  private facts: AIFact[] = [
    // Analyzing Phase Facts
    {
      id: 'analyze-1',
      category: 'analyzing',
      title: 'Token Processing',
      content: 'AI breaks down your text into tokens - small pieces that represent words, parts of words, or punctuation. This helps the AI understand the structure of your question.',
      icon: '🔤'
    },
    {
      id: 'analyze-2',
      category: 'analyzing',
      title: 'Context Understanding',
      content: 'The AI analyzes not just your current question, but also the conversation history to maintain context and provide relevant responses.',
      icon: '📝'
    },
    {
      id: 'analyze-3',
      category: 'analyzing',
      title: 'Pattern Recognition',
      content: 'AI uses pattern recognition to identify what type of question you\'re asking - whether it\'s mathematical, conceptual, or requires creative thinking.',
      icon: '🧩'
    },
    {
      id: 'analyze-4',
      category: 'analyzing',
      title: 'Input Preprocessing',
      content: 'Your question goes through preprocessing to normalize text, handle special characters, and prepare it for neural network processing.',
      icon: '⚙️'
    },

    // Reasoning Phase Facts
    {
      id: 'reason-1',
      category: 'reasoning',
      title: 'Neural Networks',
      content: 'AI uses billions of neural connections (parameters) to process information, similar to how neurons work in the human brain, but at incredible speed.',
      icon: '🧠'
    },
    {
      id: 'reason-2',
      category: 'reasoning',
      title: 'Attention Mechanism',
      content: 'The AI uses attention mechanisms to focus on the most relevant parts of your question and previous context while generating a response.',
      icon: '👁️'
    },
    {
      id: 'reason-3',
      category: 'reasoning',
      title: 'Probability Calculations',
      content: 'AI calculates probabilities for millions of possible word combinations to determine the most helpful and accurate response for your question.',
      icon: '📊'
    },
    {
      id: 'reason-4',
      category: 'reasoning',
      title: 'Knowledge Synthesis',
      content: 'The AI combines information from its training data, applying logical reasoning to synthesize new insights relevant to your specific question.',
      icon: '🔬'
    },
    {
      id: 'reason-5',
      category: 'reasoning',
      title: 'Multi-Step Reasoning',
      content: 'For complex problems, AI breaks down reasoning into multiple steps, checking and validating each step before moving to the next.',
      icon: '🪜'
    },

    // Responding Phase Facts
    {
      id: 'respond-1',
      category: 'responding',
      title: 'Response Generation',
      content: 'AI generates responses word by word, each word chosen based on what came before and what would be most helpful for your learning.',
      icon: '✍️'
    },
    {
      id: 'respond-2',
      category: 'responding',
      title: 'Quality Control',
      content: 'Before finalizing the response, AI checks for accuracy, relevance, and educational value to ensure it meets high standards.',
      icon: '✅'
    },
    {
      id: 'respond-3',
      category: 'responding',
      title: 'Personalization',
      content: 'The AI adapts its communication style and complexity level based on the context of your questions and learning goals.',
      icon: '🎯'
    },
    {
      id: 'respond-4',
      category: 'responding',
      title: 'Educational Optimization',
      content: 'Responses are crafted not just to answer your question, but to enhance understanding and promote deeper learning.',
      icon: '📚'
    },

    // General AI Facts
    {
      id: 'general-1',
      category: 'general',
      title: 'Training Process',
      content: 'AI learns from vast amounts of text data, developing understanding of language, concepts, and reasoning patterns through statistical analysis.',
      icon: '📖'
    },
    {
      id: 'general-2',
      category: 'general',
      title: 'Parallel Processing',
      content: 'Unlike humans who think sequentially, AI can process multiple aspects of your question simultaneously using parallel computation.',
      icon: '⚡'
    },
    {
      id: 'general-3',
      category: 'general',
      title: 'Continuous Improvement',
      content: 'AI systems are continuously being improved through research in machine learning, making them more helpful and accurate over time.',
      icon: '🔄'
    },
    {
      id: 'general-4',
      category: 'general',
      title: 'Computational Scale',
      content: 'Modern AI models can perform trillions of calculations per second to understand and respond to your questions with human-like fluency.',
      icon: '💻'
    },
    {
      id: 'general-5',
      category: 'general',
      title: 'Language Understanding',
      content: 'AI doesn\'t just match keywords - it understands context, nuance, and implied meanings to provide more relevant responses.',
      icon: '🗣️'
    }
  ];

  /**
   * Get a random fact for a specific thinking stage
   */
  getFactForStage(stage: 'analyzing' | 'reasoning' | 'responding'): AIFact {
    const stageFacts = this.facts.filter(fact => fact.category === stage);
    const randomIndex = Math.floor(Math.random() * stageFacts.length);
    return stageFacts[randomIndex] || this.getRandomFact();
  }

  /**
   * Get a completely random fact
   */
  getRandomFact(): AIFact {
    const randomIndex = Math.floor(Math.random() * this.facts.length);
    return this.facts[randomIndex];
  }

  /**
   * Get multiple facts for longer thinking sessions
   */
  getFactsForStage(stage: 'analyzing' | 'reasoning' | 'responding', count: number = 3): AIFact[] {
    const stageFacts = this.facts.filter(fact => fact.category === stage);
    const shuffled = [...stageFacts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, stageFacts.length));
  }

  /**
   * Get facts by category
   */
  getFactsByCategory(category: AIFact['category']): AIFact[] {
    return this.facts.filter(fact => fact.category === category);
  }

  /**
   * Search facts by content
   */
  searchFacts(query: string): AIFact[] {
    const lowerQuery = query.toLowerCase();
    return this.facts.filter(fact => 
      fact.title.toLowerCase().includes(lowerQuery) ||
      fact.content.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get a fact rotation for extended thinking sessions
   */
  getFactRotation(stage: 'analyzing' | 'reasoning' | 'responding', duration: number = 10000): AIFact[] {
    const facts = this.getFactsForStage(stage, Math.ceil(duration / 3000));
    return facts.length > 0 ? facts : [this.getRandomFact()];
  }
}

// Export singleton instance
export const aiFactsService = new AIFactsService();