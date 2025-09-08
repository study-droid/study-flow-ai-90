/**
 * Motivational Words Service
 * Generates inspiring words to replace token counts and motivate learners
 */

interface MotivationalWord {
  word: string;
  category: 'achievement' | 'encouragement' | 'wisdom' | 'energy';
  context: 'question' | 'response' | 'general';
}

class MotivationalWordsService {
  private words: MotivationalWord[] = [
    // Achievement words
    { word: "Brilliant!", category: "achievement", context: "response" },
    { word: "Excellent!", category: "achievement", context: "response" },
    { word: "Outstanding!", category: "achievement", context: "response" },
    { word: "Superb!", category: "achievement", context: "response" },
    { word: "Fantastic!", category: "achievement", context: "response" },
    { word: "Amazing!", category: "achievement", context: "response" },
    { word: "Wonderful!", category: "achievement", context: "response" },
    { word: "Impressive!", category: "achievement", context: "response" },
    
    // Encouragement words
    { word: "Thoughtful!", category: "encouragement", context: "question" },
    { word: "Insightful!", category: "encouragement", context: "question" },
    { word: "Great question!", category: "encouragement", context: "question" },
    { word: "Smart thinking!", category: "encouragement", context: "question" },
    { word: "Well asked!", category: "encouragement", context: "question" },
    { word: "Curious mind!", category: "encouragement", context: "question" },
    { word: "Deep question!", category: "encouragement", context: "question" },
    { word: "Good thinking!", category: "encouragement", context: "question" },
    
    // Wisdom words
    { word: "Enlightening!", category: "wisdom", context: "general" },
    { word: "Educational!", category: "wisdom", context: "general" },
    { word: "Illuminating!", category: "wisdom", context: "general" },
    { word: "Informative!", category: "wisdom", context: "general" },
    { word: "Enriching!", category: "wisdom", context: "general" },
    { word: "Eye-opening!", category: "wisdom", context: "general" },
    { word: "Mind-expanding!", category: "wisdom", context: "general" },
    { word: "Fascinating!", category: "wisdom", context: "general" },
    
    // Energy words
    { word: "Energizing!", category: "energy", context: "general" },
    { word: "Inspiring!", category: "energy", context: "general" },
    { word: "Motivating!", category: "energy", context: "general" },
    { word: "Uplifting!", category: "energy", context: "general" },
    { word: "Empowering!", category: "energy", context: "general" },
    { word: "Invigorating!", category: "energy", context: "general" },
    { word: "Refreshing!", category: "energy", context: "general" },
    { word: "Revitalizing!", category: "energy", context: "general" },
  ];

  private lastUsedWords: string[] = [];
  private maxHistory = 10; // Avoid repeating last 10 words

  /**
   * Get a random motivational word based on context
   */
  getMotivationalWord(context: 'question' | 'response' | 'general' = 'general'): string {
    // Filter words by context, fallback to general if no specific context words
    let contextWords = this.words.filter(w => w.context === context);
    if (contextWords.length === 0) {
      contextWords = this.words.filter(w => w.context === 'general');
    }

    // Remove recently used words to avoid repetition
    let availableWords = contextWords.filter(w => !this.lastUsedWords.includes(w.word));
    
    // If all words have been used recently, reset the history
    if (availableWords.length === 0) {
      this.lastUsedWords = [];
      availableWords = contextWords;
    }

    // Select random word
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    const selectedWord = availableWords[randomIndex].word;

    // Update history
    this.lastUsedWords.push(selectedWord);
    if (this.lastUsedWords.length > this.maxHistory) {
      this.lastUsedWords.shift();
    }

    return selectedWord;
  }

  /**
   * Get a motivational word based on message role
   */
  getWordForMessageRole(role: 'user' | 'assistant'): string {
    return role === 'user' 
      ? this.getMotivationalWord('question')
      : this.getMotivationalWord('response');
  }

  /**
   * Get multiple motivational words for variety
   */
  getMultipleWords(count: number, context: 'question' | 'response' | 'general' = 'general'): string[] {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(this.getMotivationalWord(context));
    }
    return words;
  }

  /**
   * Get a motivational phrase (combination of words)
   */
  getMotivationalPhrase(context: 'question' | 'response' | 'general' = 'general'): string {
    const prefixes = ["Keep going!", "You're doing great!", "Nice work!", "Well done!", "Keep it up!"];
    const word = this.getMotivationalWord(context);
    
    if (Math.random() > 0.7) { // 30% chance for a phrase
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      return `${prefix} ${word}`;
    }
    
    return word;
  }

  /**
   * Reset the word history (useful for new sessions)
   */
  resetHistory(): void {
    this.lastUsedWords = [];
  }

  /**
   * Get words by category
   */
  getWordsByCategory(category: MotivationalWord['category']): string[] {
    return this.words
      .filter(w => w.category === category)
      .map(w => w.word);
  }

  /**
   * Get a contextual motivational message based on time of day
   */
  getTimeBasedMotivation(): string {
    const hour = new Date().getHours();
    const timeWords = {
      morning: ["Fresh start!", "New day energy!", "Morning brilliance!", "Dawn of knowledge!"],
      afternoon: ["Midday motivation!", "Afternoon achievement!", "Steady progress!", "Keep the momentum!"],
      evening: ["Evening excellence!", "Twilight wisdom!", "Nighttime knowledge!", "End strong!"],
      night: ["Night owl power!", "Late-night learning!", "Midnight mastery!", "Burning the midnight oil!"]
    };

    let timeCategory: keyof typeof timeWords;
    if (hour >= 5 && hour < 12) timeCategory = 'morning';
    else if (hour >= 12 && hour < 17) timeCategory = 'afternoon';
    else if (hour >= 17 && hour < 21) timeCategory = 'evening';
    else timeCategory = 'night';

    const words = timeWords[timeCategory];
    return words[Math.floor(Math.random() * words.length)];
  }
}

export const motivationalWordsService = new MotivationalWordsService();