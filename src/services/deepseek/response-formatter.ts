/**
 * Professional Response Formatter Module
 * 
 * This module handles the formatting and structuring of AI responses
 * to ensure consistent, professional output with proper markdown formatting.
 */

import { logger } from '../logging/logger';

export interface FormattedResponse {
  content: string;
  structure: ResponseStructure;
  metadata: ResponseMetadata;
  quality: QualityMetrics;
}

export interface ResponseStructure {
  headers: HeaderInfo[];
  sections: SectionInfo[];
  lists: ListInfo[];
  tables: TableInfo[];
  codeBlocks: CodeBlockInfo[];
}

export interface ResponseMetadata {
  title?: string;
  goal?: string;
  duration?: string;
  totalHours?: number;
  weeklyGoals?: string[];
  progressMarkers?: ProgressMarker[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedReadTime?: number;
}

export interface QualityMetrics {
  structureScore: number;
  consistencyScore: number;
  formattingScore: number;
  completenessScore: number;
  overallScore: number;
  issues: string[];
  suggestions: string[];
}

interface HeaderInfo {
  level: number;
  text: string;
  line: number;
  hasEmoji: boolean;
}

interface SectionInfo {
  title: string;
  content: string;
  wordCount: number;
  hasSubsections: boolean;
}

interface ListInfo {
  type: 'ordered' | 'unordered';
  items: string[];
  nested: boolean;
}

interface TableInfo {
  headers: string[];
  rows: string[][];
  columnCount: number;
  isValid: boolean;
}

interface CodeBlockInfo {
  language?: string;
  content: string;
  isValid: boolean;
}

interface ProgressMarker {
  week?: number;
  day?: number;
  milestone: string;
  timeEstimate?: string;
  emoji?: string;
}

export class ResponseFormatter {
  private static readonly MAX_TABLE_COLUMNS = 3;
  private static readonly MIN_SECTION_WORDS = 10;
  private static readonly REQUIRED_EMOJIS = ['🎯', '⏱️', '📚', '📅', '✅', '📊'];
  
  // Placeholder patterns to detect and remove
  private static readonly PLACEHOLDER_PATTERNS = [
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
  
  // Empty section patterns
  private static readonly EMPTY_SECTION_PATTERNS = [
    /^(#{1,6})\s+([^\n]+)\n\n\[Content to be added\]/gm,
    /^(#{1,6})\s+([^\n]+)\n\s*$/gm,
    /^(#{1,6})\s+([^\n]+)\n\n(?=#{1,6}|\s*$)/gm
  ];

  /**
   * Format a study plan response with professional structure
   */
  static formatStudyPlan(rawResponse: string): FormattedResponse {
    logger.info('Formatting study plan response', 'ResponseFormatter');
    
    let content = this.cleanMarkdown(rawResponse);
    const originalStructure = this.parseStructure(content);
    
    // Apply study plan specific formatting
    content = this.ensureStudyPlanStructure(content);
    content = this.formatWeeklyStructure(content);
    content = this.addProgressTrackers(content);
    content = this.standardizeTimeEstimates(content);
    
    const structure = this.parseStructure(content);
    const metadata = this.extractStudyPlanMetadata(content, structure);
    const quality = this.assessQuality(content, structure, 'study_plan');
    
    return {
      content,
      structure,
      metadata,
      quality
    };
  }

  /**
   * Format an explanation response with clear structure
   */
  static formatExplanation(rawResponse: string): FormattedResponse {
    logger.info('Formatting explanation response', 'ResponseFormatter');
    
    let content = this.cleanMarkdown(rawResponse);
    
    // Apply explanation specific formatting
    content = this.ensureExplanationStructure(content);
    content = this.addKeyPointsSection(content);
    content = this.formatExamples(content);
    
    const structure = this.parseStructure(content);
    const metadata = this.extractExplanationMetadata(content, structure);
    const quality = this.assessQuality(content, structure, 'explanation');
    
    return {
      content,
      structure,
      metadata,
      quality
    };
  }

  /**
   * Format practice questions with consistent structure
   */
  static formatPractice(rawResponse: string): FormattedResponse {
    logger.info('Formatting practice response', 'ResponseFormatter');
    
    let content = this.cleanMarkdown(rawResponse);
    
    // Apply practice specific formatting
    content = this.formatQuestionNumbers(content);
    content = this.addDifficultyIndicators(content);
    content = this.formatHintsAndSolutions(content);
    
    const structure = this.parseStructure(content);
    const metadata = this.extractPracticeMetadata(content, structure);
    const quality = this.assessQuality(content, structure, 'practice');
    
    return {
      content,
      structure,
      metadata,
      quality
    };
  }

  /**
   * Format concept explanation with comprehensive structure
   */
  static formatConcept(rawResponse: string): FormattedResponse {
    logger.info('Formatting concept response', 'ResponseFormatter');
    
    let content = this.cleanMarkdown(rawResponse);
    
    // Apply concept specific formatting
    content = this.ensureConceptStructure(content);
    content = this.addDefinitionSection(content);
    content = this.formatRelatedConcepts(content);
    
    const structure = this.parseStructure(content);
    const metadata = this.extractConceptMetadata(content, structure);
    const quality = this.assessQuality(content, structure, 'concept');
    
    return {
      content,
      structure,
      metadata,
      quality
    };
  }

  /**
   * Clean and normalize markdown formatting
   */
  static cleanMarkdown(text: string): string {
    let content = text;

    // FIRST: Remove placeholder content and incomplete sections
    content = this.removePlaceholderSections(content);
    content = this.removeIncompleteSections(content);

    // Remove excessive whitespace
    content = content.replace(/\n{4,}/g, '\n\n\n');
    content = content.replace(/\s+$/gm, '');
    content = content.replace(/^\s+/gm, '');

    // Fix header formatting
    content = content.replace(/#{7,}/g, '######');
    content = content.replace(/^(#+)\s*([^#\n]*)\s*#+$/gm, '$1 $2');
    content = content.replace(/^(#+)\s{2,}/gm, '$1 ');

    // Standardize list formatting
    content = content.replace(/^[\s]*[-*+]\s+/gm, '- ');
    content = content.replace(/^[\s]*(\d+)[.)]\s+/gm, '$1. ');

    // Fix emphasis formatting
    content = content.replace(/\*{3,}/g, '**');
    content = content.replace(/_{3,}/g, '__');

    // Standardize code block formatting
    content = content.replace(/```(\w*)\n/g, '```$1\n');
    content = content.replace(/```\n\n/g, '```\n');

    // Fix sentence spacing
    content = content.replace(/([.!?])([A-Z])/g, '$1 $2');
    content = content.replace(/\s+([.!?])/g, '$1');

    // Remove trailing periods from headers
    content = content.replace(/^(#+\s+[^.\n]*)\.\s*$/gm, '$1');

    // Final cleanup to remove empty sections that may have been created
    content = this.removeEmptySections(content);

    return content.trim();
  }

  /**
   * Remove sections containing only placeholder content
   */
  private static removePlaceholderSections(content: string): string {
    let cleanedContent = content;

    // Remove all placeholder patterns
    for (const pattern of this.PLACEHOLDER_PATTERNS) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }

    return cleanedContent;
  }

  /**
   * Remove incomplete sections that have headers but no real content
   */
  private static removeIncompleteSections(content: string): string {
    let cleanedContent = content;

    // Remove sections with headers followed immediately by placeholders or empty content
    cleanedContent = cleanedContent.replace(
      /^(#{1,6})\s+([^\n]+)\n\n\[Content to be added\]\n*/gm,
      ''
    );

    // Remove sections that are just headers with no content before next header or end
    cleanedContent = cleanedContent.replace(
      /^(#{1,6})\s+([^\n]+)\n\s*(?=#{1,6}|\s*$)/gm,
      ''
    );

    // Remove sections that contain only whitespace after header
    cleanedContent = cleanedContent.replace(
      /^(#{1,6})\s+([^\n]+)\n\s*\n\s*(?=#{1,6}|\s*$)/gm,
      ''
    );

    return cleanedContent;
  }

  /**
   * Remove empty sections created during cleanup process
   */
  private static removeEmptySections(content: string): string {
    let cleanedContent = content;

    // Remove multiple consecutive empty lines
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remove headers that are followed immediately by another header (no content)
    cleanedContent = cleanedContent.replace(
      /^(#{1,6})\s+([^\n]+)\n\s*\n\s*(#{1,6})/gm,
      '$3'
    );

    // Remove trailing empty sections at the end
    cleanedContent = cleanedContent.replace(/\n(#{1,6})\s+([^\n]+)\s*$/, '');

    // Remove any remaining placeholder brackets that may have content inside
    cleanedContent = cleanedContent.replace(/\[([^\]]*to be added[^\]]*)\]/gi, '');
    cleanedContent = cleanedContent.replace(/\[([^\]]*TBD[^\]]*)\]/gi, '');
    cleanedContent = cleanedContent.replace(/\[([^\]]*TODO[^\]]*)\]/gi, '');

    return cleanedContent.trim();
  }

  /**
   * Validate that content sections have substantial, complete content
   */
  private static validateContentCompleteness(content: string): boolean {
    // Check if content has any placeholder patterns
    for (const pattern of this.PLACEHOLDER_PATTERNS) {
      if (pattern.test(content)) {
        return false;
      }
    }

    // Check if content has meaningful length (more than just headers)
    const contentWithoutHeaders = content.replace(/^#{1,6}\s+[^\n]+$/gm, '');
    const meaningfulContent = contentWithoutHeaders.replace(/\s+/g, ' ').trim();
    
    return meaningfulContent.length > 20; // Minimum meaningful content
  }

  /**
   * Parse the structure of a response
   */
  static parseStructure(content: string): ResponseStructure {
    const headers = this.parseHeaders(content);
    const sections = this.parseSections(content, headers);
    const lists = this.parseLists(content);
    const tables = this.parseTables(content);
    const codeBlocks = this.parseCodeBlocks(content);

    return {
      headers,
      sections,
      lists,
      tables,
      codeBlocks
    };
  }

  /**
   * Extract metadata from formatted content
   */
  static extractMetadata(content: string, structure: ResponseStructure): ResponseMetadata {
    const title = this.extractTitle(content, structure);
    const goal = this.extractGoal(content);
    const duration = this.extractDuration(content);
    const totalHours = this.calculateTotalHours(content);
    const weeklyGoals = this.extractWeeklyGoals(content);
    const progressMarkers = this.extractProgressMarkers(content);
    const difficulty = this.extractDifficulty(content);
    const estimatedReadTime = this.calculateReadTime(content);

    return {
      title,
      goal,
      duration,
      totalHours,
      weeklyGoals,
      progressMarkers,
      difficulty,
      estimatedReadTime
    };
  }

  /**
   * Ensure study plan has proper structure
   */
  private static ensureStudyPlanStructure(content: string): string {
    const requiredSections = [
      { header: '## 📅 Timeline', content: 'Study schedule and milestones' },
      { header: '## 📚 Topics to Cover', content: 'Key subjects and concepts' },
      { header: '## 🎯 Learning Objectives', content: 'Goals and outcomes' },
      { header: '## 📝 Resources', content: 'Recommended materials and tools' }
    ];

    let structured = content;

    // Add missing sections
    requiredSections.forEach(section => {
      if (!structured.includes(section.header)) {
        structured += `\n\n${section.header}\n${section.content}\n`;
      }
    });

    // Ensure proper header hierarchy
    structured = this.fixHeaderHierarchy(structured);

    return structured;
  }

  /**
   * Format weekly structure with consistent patterns
   */
  private static formatWeeklyStructure(content: string): string {
    // Standardize week headers
    content = content.replace(/^#+\s*week\s*(\d+)[:\-\s]*(.*?)$/gmi, '## Week $1: $2');
    
    // Standardize day headers  
    content = content.replace(/^#+\s*day\s*(\d+)[:\-\s]*(.*?)$/gmi, '### Day $1: $2');
    
    // Add consistent formatting to week sections
    const weekPattern = /(## Week \d+:.*?)\n((?:(?!## Week)[\s\S])*?)(?=## Week|\n## [^W]|$)/g;
    
    content = content.replace(weekPattern, (match, header, weekContent) => {
      let formatted = header + '\n';
      
      // Ensure each week has goals and time estimates
      if (!weekContent.includes('🎯')) {
        formatted += '\n🎯 **Goals:**\n- [Week goals to be defined]\n';
      }
      if (!weekContent.includes('⏱️')) {
        formatted += '\n⏱️ **Time Commitment:** [X hours]\n';
      }
      
      formatted += weekContent;
      return formatted;
    });

    return content;
  }

  /**
   * Add progress tracking elements
   */
  private static addProgressTrackers(content: string): string {
    // Add progress section if missing
    if (!content.includes('Progress') && !content.includes('Tracking')) {
      content += '\n\n## 📊 Progress Tracking\n';
      content += '- [ ] Week 1 objectives completed\n';
      content += '- [ ] Week 2 objectives completed\n';
      content += '- [ ] Week 3 objectives completed\n';
      content += '- [ ] Week 4 objectives completed\n';
    }

    // Convert progress items to checkboxes
    content = content.replace(/^[-*]\s*(.+(?:complete|finish|done|achieve).*?)$/gmi, '- [ ] $1');

    return content;
  }

  /**
   * Standardize time estimates format
   */
  private static standardizeTimeEstimates(content: string): string {
    // Standardize time format patterns
    const timePatterns = [
      { pattern: /(\d+)\s*(?:hour|hr|h)(?:s)?/gi, replacement: '$1 hours' },
      { pattern: /(\d+)\s*(?:minute|min|m)(?:s)?/gi, replacement: '$1 minutes' },
      { pattern: /(\d+)\s*(?:day|d)(?:s)?/gi, replacement: '$1 days' },
      { pattern: /(\d+)\s*(?:week|wk|w)(?:s)?/gi, replacement: '$1 weeks' }
    ];

    timePatterns.forEach(({ pattern, replacement }) => {
      content = content.replace(pattern, replacement);
    });

    // Add time emoji if missing
    content = content.replace(/^(.+?\d+\s+(?:hours?|minutes?|days?|weeks?).*)$/gmi, (match) => {
      if (!match.includes('⏱️')) {
        return `⏱️ ${match}`;
      }
      return match;
    });

    return content;
  }

  /**
   * Parse headers from content
   */
  private static parseHeaders(content: string): HeaderInfo[] {
    const headers: HeaderInfo[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#+)\s+(.+)/);
      if (headerMatch) {
        headers.push({
          level: headerMatch[1].length,
          text: headerMatch[2].trim(),
          line: index,
          hasEmoji: /[\u1F600-\u1F6FF]/.test(headerMatch[2])
        });
      }
    });

    return headers;
  }

  /**
   * Parse sections from content based on headers
   */
  private static parseSections(content: string, headers: HeaderInfo[]): SectionInfo[] {
    const sections: SectionInfo[] = [];
    const lines = content.split('\n');

    headers.forEach((header, index) => {
      const nextHeader = headers[index + 1];
      const startLine = header.line + 1;
      const endLine = nextHeader ? nextHeader.line : lines.length;
      
      const sectionContent = lines.slice(startLine, endLine).join('\n').trim();
      const wordCount = sectionContent.split(/\s+/).filter(w => w.length > 0).length;
      
      sections.push({
        title: header.text,
        content: sectionContent,
        wordCount,
        hasSubsections: sectionContent.includes('#')
      });
    });

    return sections;
  }

  /**
   * Parse lists from content
   */
  private static parseLists(content: string): ListInfo[] {
    const lists: ListInfo[] = [];
    const listBlocks = content.match(/^(\s*[-*+]|\s*\d+\.)\s+.+(\n\s*[-*+]|\n\s*\d+\.|\n\s+.+)*$/gm);

    if (listBlocks) {
      listBlocks.forEach(block => {
        const isOrdered = /^\s*\d+\./.test(block);
        const items = block.split('\n')
          .map(line => line.replace(/^\s*[-*+]|\s*\d+\.\s*/, '').trim())
          .filter(item => item.length > 0);

        lists.push({
          type: isOrdered ? 'ordered' : 'unordered',
          items,
          nested: /\n\s{2,}[-*+]|\n\s{2,}\d+\./.test(block)
        });
      });
    }

    return lists;
  }

  /**
   * Parse tables from content
   */
  private static parseTables(content: string): TableInfo[] {
    const tables: TableInfo[] = [];
    const tablePattern = /^\|.+\|\s*\n\|[-\s|]+\|\s*\n(\|.+\|\s*\n?)+/gm;
    const matches = content.matchAll(tablePattern);

    for (const match of matches) {
      const tableText = match[0];
      const lines = tableText.trim().split('\n');
      
      if (lines.length >= 3) {
        const headers = lines[0].split('|').map(h => h.trim()).filter(h => h.length > 0);
        const rows = lines.slice(2).map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0)
        );

        tables.push({
          headers,
          rows,
          columnCount: headers.length,
          isValid: headers.length <= this.MAX_TABLE_COLUMNS && rows.every(row => row.length === headers.length)
        });
      }
    }

    return tables;
  }

  /**
   * Parse code blocks from content
   */
  private static parseCodeBlocks(content: string): CodeBlockInfo[] {
    const codeBlocks: CodeBlockInfo[] = [];
    const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;
    const matches = content.matchAll(codeBlockPattern);

    for (const match of matches) {
      codeBlocks.push({
        language: match[1] || undefined,
        content: match[2].trim(),
        isValid: match[2].trim().length > 0
      });
    }

    return codeBlocks;
  }

  /**
   * Extract study plan specific metadata
   */
  private static extractStudyPlanMetadata(content: string, structure: ResponseStructure): ResponseMetadata {
    const baseMetadata = this.extractMetadata(content, structure);
    
    // Extract weekly goals
    const weeklyGoals = structure.sections
      .filter(section => section.title.includes('Week'))
      .map(section => {
        const goalMatch = section.content.match(/🎯.*?:(.*?)(?:\n|$)/);
        return goalMatch ? goalMatch[1].trim() : section.title;
      });

    // Extract progress markers
    const progressMarkers: ProgressMarker[] = [];
    const weekSections = structure.sections.filter(s => s.title.match(/Week \d+/));
    
    weekSections.forEach(section => {
      const weekMatch = section.title.match(/Week (\d+)/);
      if (weekMatch) {
        const weekNumber = parseInt(weekMatch[1]);
        const milestones = section.content.match(/🎯.*?:(.+?)(?:\n|$)/g);
        
        if (milestones) {
          milestones.forEach(milestone => {
            const cleanMilestone = milestone.replace(/🎯.*?:/, '').trim();
            const timeMatch = milestone.match(/⏱️\s*(.+?)(?:\n|$)/);
            
            progressMarkers.push({
              week: weekNumber,
              milestone: cleanMilestone,
              timeEstimate: timeMatch ? timeMatch[1].trim() : undefined,
              emoji: '🎯'
            });
          });
        }
      }
    });

    return {
      ...baseMetadata,
      weeklyGoals,
      progressMarkers
    };
  }

  /**
   * Extract explanation specific metadata
   */
  private static extractExplanationMetadata(content: string, structure: ResponseStructure): ResponseMetadata {
    const baseMetadata = this.extractMetadata(content, structure);
    
    // Extract difficulty from content indicators
    const difficulty = this.extractDifficulty(content);
    
    return {
      ...baseMetadata,
      difficulty
    };
  }

  /**
   * Extract practice specific metadata
   */
  private static extractPracticeMetadata(content: string, structure: ResponseStructure): ResponseMetadata {
    const baseMetadata = this.extractMetadata(content, structure);
    
    // Count questions
    const questionCount = (content.match(/^\s*\d+\.|Question\s+\d+/gmi) || []).length;
    
    return {
      ...baseMetadata,
      totalHours: questionCount * 0.25 // Estimate 15 minutes per question
    };
  }

  /**
   * Extract concept specific metadata
   */
  private static extractConceptMetadata(content: string, structure: ResponseStructure): ResponseMetadata {
    return this.extractMetadata(content, structure);
  }

  /**
   * Assess response quality
   */
  private static assessQuality(content: string, structure: ResponseStructure, type: string): QualityMetrics {
    let structureScore = 0;
    let consistencyScore = 0;
    let formattingScore = 0;
    let completenessScore = 0;
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Structure assessment
    if (structure.headers.length >= 3) structureScore += 25;
    if (structure.headers.some(h => h.hasEmoji)) structureScore += 15;
    if (structure.lists.length > 0) structureScore += 10;

    // Consistency assessment  
    const headerLevels = structure.headers.map(h => h.level);
    const hasConsistentLevels = this.hasConsistentHeaderLevels(headerLevels);
    if (hasConsistentLevels) consistencyScore += 30;

    // Formatting assessment
    if (structure.codeBlocks.every(cb => cb.isValid)) formattingScore += 20;
    if (structure.tables.every(t => t.isValid)) formattingScore += 20;
    if (content.includes('**') || content.includes('*')) formattingScore += 10;

    // Completeness assessment based on type
    completenessScore = this.assessTypeSpecificCompleteness(content, structure, type);

    // Identify issues
    if (structure.tables.some(t => t.columnCount > this.MAX_TABLE_COLUMNS)) {
      issues.push(`Tables have too many columns (max ${this.MAX_TABLE_COLUMNS})`);
    }
    if (structure.sections.some(s => s.wordCount < this.MIN_SECTION_WORDS)) {
      issues.push('Some sections are too short');
    }

    // Generate suggestions
    if (structureScore < 40) suggestions.push('Add more structured sections with headers');
    if (!structure.headers.some(h => h.hasEmoji)) suggestions.push('Add emoji indicators to headers');

    const overallScore = Math.round((structureScore + consistencyScore + formattingScore + completenessScore) / 4);

    return {
      structureScore,
      consistencyScore, 
      formattingScore,
      completenessScore,
      overallScore,
      issues,
      suggestions
    };
  }

  /**
   * Helper methods for metadata extraction
   */
  private static extractTitle(content: string, structure: ResponseStructure): string | undefined {
    const firstHeader = structure.headers.find(h => h.level === 1);
    return firstHeader?.text || structure.headers[0]?.text;
  }

  private static extractGoal(content: string): string | undefined {
    const goalMatch = content.match(/(?:goal|objective|aim):\s*(.+?)(?:\n|$)/i);
    return goalMatch ? goalMatch[1].trim() : undefined;
  }

  private static extractDuration(content: string): string | undefined {
    const durationMatch = content.match(/(?:duration|timeline|period):\s*(.+?)(?:\n|$)/i);
    return durationMatch ? durationMatch[1].trim() : undefined;
  }

  private static calculateTotalHours(content: string): number {
    const hourMatches = content.matchAll(/(\d+)\s+hours?/gi);
    let total = 0;
    for (const match of hourMatches) {
      total += parseInt(match[1]);
    }
    return total;
  }

  private static extractWeeklyGoals(content: string): string[] {
    const goals: string[] = [];
    const weekSections = content.match(/## Week \d+:[\s\S]*?(?=## Week|\n## [^W]|$)/g);
    
    if (weekSections) {
      weekSections.forEach(section => {
        const goalMatch = section.match(/🎯.*?:(.+?)(?:\n|$)/);
        if (goalMatch) {
          goals.push(goalMatch[1].trim());
        }
      });
    }
    
    return goals;
  }

  private static extractProgressMarkers(content: string): ProgressMarker[] {
    const markers: ProgressMarker[] = [];
    const checkboxes = content.matchAll(/- \[ \]\s*(.+)/g);
    
    for (const match of checkboxes) {
      markers.push({
        milestone: match[1].trim(),
        emoji: '✅'
      });
    }
    
    return markers;
  }

  private static extractDifficulty(content: string): 'easy' | 'medium' | 'hard' {
    const lower = content.toLowerCase();
    if (lower.includes('advanced') || lower.includes('complex') || lower.includes('difficult')) return 'hard';
    if (lower.includes('intermediate') || lower.includes('moderate')) return 'medium';
    return 'easy';
  }

  private static calculateReadTime(content: string): number {
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / 200); // Average reading speed: 200 words per minute
  }

  private static ensureExplanationStructure(content: string): string {
    const requiredSections = [
      '## Overview',
      '## Detailed Explanation', 
      '## Key Points',
      '## Examples',
      '## Summary'
    ];

    let structured = content;
    requiredSections.forEach(section => {
      if (!structured.includes(section)) {
        structured += `\n\n${section}\n[Content to be added]\n`;
      }
    });

    return structured;
  }

  private static addKeyPointsSection(content: string): string {
    if (!content.includes('Key Points') && !content.includes('key points')) {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      if (sentences.length >= 3) {
        content += '\n\n## Key Points\n';
        sentences.slice(0, 3).forEach(sentence => {
          content += `- ${sentence.trim()}\n`;
        });
      }
    }
    return content;
  }

  private static formatExamples(content: string): string {
    content = content.replace(/example\s*\d*:\s*/gi, '### Example:\n');
    return content;
  }

  private static ensureConceptStructure(content: string): string {
    const requiredSections = [
      '## 📖 Definition',
      '## 🔍 Detailed Explanation',
      '## 💡 Examples', 
      '## 🔗 Related Concepts'
    ];

    let structured = content;
    requiredSections.forEach(section => {
      if (!structured.includes(section)) {
        structured += `\n\n${section}\n[Content to be added]\n`;
      }
    });

    return structured;
  }

  private static addDefinitionSection(content: string): string {
    if (!content.includes('Definition') && !content.includes('definition')) {
      // Extract first sentence as definition
      const firstSentence = content.match(/^[^.!?]*[.!?]/);
      if (firstSentence) {
        content = `## 📖 Definition\n${firstSentence[0]}\n\n${content}`;
      }
    }
    return content;
  }

  private static formatRelatedConcepts(content: string): string {
    const relatedPattern = /(?:related|similar|connected)\s+(?:to|concepts?|topics?):\s*(.+?)(?:\n|$)/gi;
    const matches = content.matchAll(relatedPattern);
    
    let relatedSection = '';
    for (const match of matches) {
      relatedSection += `- ${match[1].trim()}\n`;
    }
    
    if (relatedSection && !content.includes('Related Concepts')) {
      content += `\n\n## 🔗 Related Concepts\n${relatedSection}`;
    }
    
    return content;
  }

  private static formatQuestionNumbers(content: string): string {
    return content.replace(/^(\d+)[.)]\s*/gm, '\n**Question $1:**\n');
  }

  private static addDifficultyIndicators(content: string): string {
    if (!content.includes('Difficulty:') && !content.includes('🟢') && !content.includes('🟡') && !content.includes('🔴')) {
      content = '**Difficulty:** 🟡 Medium\n\n' + content;
    }
    return content;
  }

  private static formatHintsAndSolutions(content: string): string {
    content = content.replace(/hint\s*\d*:\s*/gi, '\n💡 **Hint:**\n');
    content = content.replace(/solution\s*\d*:\s*/gi, '\n✅ **Solution:**\n');
    return content;
  }

  private static fixHeaderHierarchy(content: string): string {
    const lines = content.split('\n');
    let lastLevel = 0;
    
    return lines.map(line => {
      const headerMatch = line.match(/^(#+)\s+(.+)/);
      if (headerMatch) {
        const currentLevel = headerMatch[1].length;
        if (currentLevel > lastLevel + 1 && lastLevel > 0) {
          const correctedLevel = '#'.repeat(lastLevel + 1);
          line = `${correctedLevel} ${headerMatch[2]}`;
        }
        lastLevel = headerMatch[1].length;
      }
      return line;
    }).join('\n');
  }

  private static hasConsistentHeaderLevels(levels: number[]): boolean {
    const levelSet = new Set(levels);
    return levelSet.size <= 3 && Math.max(...levels) - Math.min(...levels) <= 2;
  }

  private static assessTypeSpecificCompleteness(content: string, structure: ResponseStructure, type: string): number {
    switch (type) {
      case 'study_plan':
        return this.assessStudyPlanCompleteness(content, structure);
      case 'explanation':
        return this.assessExplanationCompleteness(content, structure);
      case 'practice':
        return this.assessPracticeCompleteness(content, structure);
      case 'concept':
        return this.assessConceptCompleteness(content, structure);
      default:
        return 50;
    }
  }

  private static assessStudyPlanCompleteness(content: string, structure: ResponseStructure): number {
    let score = 0;
    
    if (content.includes('Timeline') || content.includes('📅')) score += 25;
    if (content.includes('Week') && structure.headers.some(h => h.text.includes('Week'))) score += 25;
    if (content.includes('🎯')) score += 25;
    if (content.includes('Resources') || content.includes('📝')) score += 25;
    
    return score;
  }

  private static assessExplanationCompleteness(content: string, structure: ResponseStructure): number {
    let score = 0;
    
    if (content.includes('Overview') || structure.headers.some(h => h.text.includes('Overview'))) score += 25;
    if (content.includes('Example') || content.includes('example')) score += 25;
    if (content.includes('Key Points') || content.includes('key points')) score += 25;
    if (content.includes('Summary') || structure.headers.some(h => h.text.includes('Summary'))) score += 25;
    
    return score;
  }

  private static assessPracticeCompleteness(content: string, structure: ResponseStructure): number {
    let score = 0;
    
    const questionCount = (content.match(/Question\s+\d+|^\s*\d+\./gm) || []).length;
    if (questionCount > 0) score += 30;
    if (content.includes('Hint') || content.includes('💡')) score += 25;
    if (content.includes('Solution') || content.includes('Answer')) score += 25;
    if (content.includes('Difficulty') || content.includes('🟢') || content.includes('🟡') || content.includes('🔴')) score += 20;
    
    return score;
  }

  private static assessConceptCompleteness(content: string, structure: ResponseStructure): number {
    let score = 0;
    
    if (content.includes('Definition') || content.includes('📖')) score += 25;
    if (content.includes('Example') || content.includes('💡')) score += 25;
    if (content.includes('Related') || content.includes('🔗')) score += 25;
    if (structure.sections.length >= 4) score += 25;
    
    return score;
  }
}