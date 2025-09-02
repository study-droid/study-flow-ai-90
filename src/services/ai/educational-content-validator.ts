/**
 * Educational Content Validator
 * Implements quality checks for the Robust Educational Answer Framework
 */

export interface QualityCheckResult {
  isValid: boolean;
  score: number;
  completedChecks: string[];
  failedChecks: string[];
  suggestions: string[];
  wordCounts: {
    total: number;
    introduction: number;
    coreConcepts: number;
    applications: number;
    commonPitfalls: number;
    nextSteps: number;
  };
}

export interface ContentSection {
  name: string;
  content: string;
  wordCount: number;
  hasExamples: boolean;
  isComplete: boolean;
}

export class EducationalContentValidator {
  private static readonly WORD_COUNT_TARGETS = {
    introduction: { min: 20, max: 30 },
    coreConceptPoint: { min: 40, max: 60 },
    application: { min: 15, max: 25 },
    totalTarget: { min: 200, max: 400 }
  };

  private static readonly REQUIRED_SECTIONS = [
    'Topic Introduction',
    'Core Concepts',
    'Applications',
    'Common Pitfalls',
    'Next Steps'
  ];

  /**
   * Validate content against the robust educational framework
   */
  static validateContent(content: string, context: { subject: string; topic?: string }): QualityCheckResult {
    const sections = this.extractSections(content);
    const wordCounts = this.calculateWordCounts(sections);
    const completedChecks: string[] = [];
    const failedChecks: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // 1. Check all sections are complete (no placeholders)
    if (this.checkSectionCompleteness(sections)) {
      completedChecks.push('All sections complete (no placeholders)');
    } else {
      failedChecks.push('Missing or incomplete sections detected');
      suggestions.push('Complete all required sections: ' + this.REQUIRED_SECTIONS.join(', '));
      score -= 25;
    }

    // 2. Check examples work and are relevant
    if (this.checkExamplesQuality(sections)) {
      completedChecks.push('Examples work and are relevant');
    } else {
      failedChecks.push('Examples missing or inadequate');
      suggestions.push('Add specific, working examples for each core concept');
      score -= 20;
    }

    // 3. Check formatting is consistent
    if (this.checkFormattingConsistency(content)) {
      completedChecks.push('Formatting is consistent');
    } else {
      failedChecks.push('Inconsistent formatting detected');
      suggestions.push('Use consistent markdown formatting throughout');
      score -= 15;
    }

    // 4. Check content flows logically
    if (this.checkLogicalFlow(sections)) {
      completedChecks.push('Content flows logically');
    } else {
      failedChecks.push('Logical flow issues detected');
      suggestions.push('Ensure concepts progress from simple to complex');
      score -= 15;
    }

    // 5. Check terminology is appropriate for audience
    if (this.checkTerminologyLevel(content, context)) {
      completedChecks.push('Terminology is appropriate for audience');
    } else {
      failedChecks.push('Terminology level issues');
      suggestions.push('Adjust vocabulary complexity for target audience');
      score -= 10;
    }

    // 6. Check word count targets
    const wordCountResult = this.validateWordCounts(wordCounts);
    if (wordCountResult.isValid) {
      completedChecks.push('Word count targets met');
    } else {
      failedChecks.push('Word count targets not met');
      suggestions.push(...wordCountResult.suggestions);
      score -= 15;
    }

    return {
      isValid: failedChecks.length === 0,
      score: Math.max(0, score),
      completedChecks,
      failedChecks,
      suggestions,
      wordCounts
    };
  }

  /**
   * Extract sections from content
   */
  private static extractSections(content: string): ContentSection[] {
    const sections: ContentSection[] = [];
    const lines = content.split('\n');
    let currentSection: ContentSection | null = null;
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Check for section headers
      if (trimmed.match(/^##\s+(.+)$/)) {
        // Save previous section
        if (currentSection) {
          currentSection.wordCount = this.countWords(currentSection.content);
          currentSection.hasExamples = this.hasExamples(currentSection.content);
          currentSection.isComplete = this.isContentComplete(currentSection.content);
          sections.push(currentSection);
        }
        
        // Start new section
        const sectionName = trimmed.replace(/^##\s+/, '');
        currentSection = {
          name: sectionName,
          content: '',
          wordCount: 0,
          hasExamples: false,
          isComplete: false
        };
      } else if (currentSection && trimmed) {
        currentSection.content += line + '\n';
      }
    });
    
    // Add final section
    if (currentSection) {
      currentSection.wordCount = this.countWords(currentSection.content);
      currentSection.hasExamples = this.hasExamples(currentSection.content);
      currentSection.isComplete = this.isContentComplete(currentSection.content);
      sections.push(currentSection);
    }
    
    return sections;
  }

  /**
   * Calculate word counts for different sections
   */
  private static calculateWordCounts(sections: ContentSection[]): QualityCheckResult['wordCounts'] {
    const wordCounts = {
      total: 0,
      introduction: 0,
      coreConcepts: 0,
      applications: 0,
      commonPitfalls: 0,
      nextSteps: 0
    };

    sections.forEach(section => {
      wordCounts.total += section.wordCount;
      
      const lowerName = section.name.toLowerCase();
      if (lowerName.includes('introduction') || lowerName.includes('overview')) {
        wordCounts.introduction = section.wordCount;
      } else if (lowerName.includes('core') || lowerName.includes('concept')) {
        wordCounts.coreConcepts = section.wordCount;
      } else if (lowerName.includes('application')) {
        wordCounts.applications = section.wordCount;
      } else if (lowerName.includes('pitfall') || lowerName.includes('misconception')) {
        wordCounts.commonPitfalls = section.wordCount;
      } else if (lowerName.includes('next') || lowerName.includes('step')) {
        wordCounts.nextSteps = section.wordCount;
      }
    });

    return wordCounts;
  }

  /**
   * Check if all required sections are complete
   */
  private static checkSectionCompleteness(sections: ContentSection[]): boolean {
    const sectionNames = sections.map(s => s.name.toLowerCase());
    
    const hasIntroduction = sectionNames.some(name => 
      name.includes('introduction') || name.includes('overview')
    );
    const hasConcepts = sectionNames.some(name => 
      name.includes('core') || name.includes('concept')
    );
    const hasApplications = sectionNames.some(name => 
      name.includes('application')
    );
    const hasPitfalls = sectionNames.some(name => 
      name.includes('pitfall') || name.includes('misconception')
    );
    const hasNextSteps = sectionNames.some(name => 
      name.includes('next') || name.includes('step')
    );

    return hasIntroduction && hasConcepts && hasApplications && hasPitfalls && hasNextSteps &&
           sections.every(section => section.isComplete);
  }

  /**
   * Check quality of examples
   */
  private static checkExamplesQuality(sections: ContentSection[]): boolean {
    const coreConceptSections = sections.filter(s => 
      s.name.toLowerCase().includes('core') || s.name.toLowerCase().includes('concept')
    );
    
    if (coreConceptSections.length === 0) return false;
    
    return coreConceptSections.every(section => section.hasExamples);
  }

  /**
   * Check formatting consistency
   */
  private static checkFormattingConsistency(content: string): boolean {
    // Check for consistent heading levels
    const headings = content.match(/^#+\s+.+$/gm) || [];
    const headingLevels = headings.map(h => h.match(/^#+/)?.[0].length || 0);
    
    // Should have consistent structure (## for main sections, ### for subsections)
    const hasMainSections = headingLevels.some(level => level === 2);
    const noInconsistentLevels = !headingLevels.some(level => level > 3);
    
    // Check for consistent list formatting
    const bulletPoints = content.match(/^[-*+]\s+.+$/gm) || [];
    const numberedPoints = content.match(/^\d+\.\s+.+$/gm) || [];
    
    // Should not mix bullet styles within same context
    const consistentBullets = bulletPoints.length === 0 || 
      bulletPoints.every(bp => bp.startsWith('- ')) ||
      bulletPoints.every(bp => bp.startsWith('* ')) ||
      bulletPoints.every(bp => bp.startsWith('+ '));
    
    return hasMainSections && noInconsistentLevels && consistentBullets;
  }

  /**
   * Check logical flow between sections
   */
  private static checkLogicalFlow(sections: ContentSection[]): boolean {
    if (sections.length < 3) return false;
    
    const sectionNames = sections.map(s => s.name.toLowerCase());
    
    // Introduction should come first
    const introIndex = sectionNames.findIndex(name => 
      name.includes('introduction') || name.includes('overview')
    );
    
    // Next steps should come last
    const nextStepsIndex = sectionNames.findIndex(name => 
      name.includes('next') || name.includes('step')
    );
    
    return introIndex <= 1 && nextStepsIndex >= sections.length - 2;
  }

  /**
   * Check terminology appropriateness
   */
  private static checkTerminologyLevel(content: string, context: { subject: string; topic?: string }): boolean {
    // Basic check for overly complex terminology
    const complexWords = content.match(/\b\w{10,}\b/g) || [];
    const totalWords = this.countWords(content);
    const complexityRatio = complexWords.length / totalWords;
    
    // Should not be more than 10% very long words
    return complexityRatio < 0.1;
  }

  /**
   * Validate word counts against targets
   */
  private static validateWordCounts(wordCounts: QualityCheckResult['wordCounts']): {
    isValid: boolean;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let isValid = true;
    
    // Check total word count
    if (wordCounts.total < this.WORD_COUNT_TARGETS.totalTarget.min) {
      suggestions.push(`Content too short (${wordCounts.total} words). Target: ${this.WORD_COUNT_TARGETS.totalTarget.min}-${this.WORD_COUNT_TARGETS.totalTarget.max} words`);
      isValid = false;
    } else if (wordCounts.total > this.WORD_COUNT_TARGETS.totalTarget.max) {
      suggestions.push(`Content too long (${wordCounts.total} words). Target: ${this.WORD_COUNT_TARGETS.totalTarget.min}-${this.WORD_COUNT_TARGETS.totalTarget.max} words`);
      isValid = false;
    }
    
    // Check introduction length
    if (wordCounts.introduction > 0) {
      const { min, max } = this.WORD_COUNT_TARGETS.introduction;
      if (wordCounts.introduction < min || wordCounts.introduction > max) {
        suggestions.push(`Introduction should be ${min}-${max} words (currently ${wordCounts.introduction})`);
        isValid = false;
      }
    }
    
    return { isValid, suggestions };
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Check if content has examples
   */
  private static hasExamples(content: string): boolean {
    const exampleMarkers = [
      /\*\*Example:\*\*/i,
      /\*\*For example:\*\*/i,
      /For instance/i,
      /Consider this/i,
      /Take.*example/i
    ];
    
    return exampleMarkers.some(marker => marker.test(content));
  }

  /**
   * Check if content is complete (no placeholders)
   */
  private static isContentComplete(content: string): boolean {
    const placeholders = [
      /\[.*?\]/g,  // [placeholder text]
      /\{.*?\}/g,  // {placeholder text}
      /\.\.\.+/g,  // ...
      /TODO/gi,
      /FIXME/gi,
      /TBD/gi,
      /\bexample\s+goes\s+here\b/gi,
      /\bto\s+be\s+determined\b/gi,
      /\binsert\s+/gi,
      /\badd\s+content\b/gi,
      /\bfill\s+in\b/gi,
      /\bplaceholder\b/gi,
      /\[.*?name.*?\]/gi,
      /\[.*?content.*?\]/gi,
      /\[.*?description.*?\]/gi
    ];
    
    return !placeholders.some(pattern => pattern.test(content)) && 
           content.trim().length > 10; // Minimum content length
  }

  /**
   * Generate improvement suggestions based on validation results
   */
  static generateImprovementSuggestions(result: QualityCheckResult): string[] {
    const suggestions: string[] = [...result.suggestions];
    
    if (result.score < 70) {
      suggestions.push('Consider significant revision to meet educational standards');
    } else if (result.score < 85) {
      suggestions.push('Minor improvements needed to reach professional quality');
    }
    
    if (!result.completedChecks.includes('All sections complete')) {
      suggestions.push('Ensure all five framework sections are present and complete');
    }
    
    if (!result.completedChecks.includes('Examples work and are relevant')) {
      suggestions.push('Add concrete, specific examples for each major concept');
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }
}