/**
 * Robust Markdown Response Processor
 * 
 * A comprehensive markdown processing system that preserves content integrity
 * while providing intelligent formatting and organization for AI responses.
 * 
 * Key Features:
 * - Content preservation with minimal aggressive filtering
 * - Intelligent markdown structure enhancement
 * - Stream completion detection and error recovery
 * - Fallback rendering for malformed responses
 */

import { logger } from './logging/logger';

export interface ProcessedResponse {
  content: string;
  metadata: ResponseMetadata;
  quality: QualityScore;
  renderingHints: RenderingHints;
  warnings: string[];
}

export interface ResponseMetadata {
  isComplete: boolean;
  hasMarkdown: boolean;
  wordCount: number;
  estimatedReadTime: number;
  contentType: 'explanation' | 'code' | 'mixed' | 'list' | 'table';
  headers: HeaderStructure[];
  codeBlocks: CodeBlock[];
}

export interface QualityScore {
  completeness: number;
  formatting: number;
  structure: number;
  readability: number;
  overall: number;
}

export interface RenderingHints {
  shouldUseStreaming: boolean;
  preferredRenderer: 'markdown' | 'html' | 'text';
  customStyles?: string[];
  interactiveElements?: string[];
}

export interface HeaderStructure {
  level: number;
  text: string;
  anchor: string;
  position: number;
  hasEmoji: boolean;
}

export interface CodeBlock {
  language: string | null;
  content: string;
  isValid: boolean;
  lineCount: number;
}

export class MarkdownResponseProcessor {
  private static readonly INCOMPLETE_INDICATORS = [
    /\.\.\.$/, // Trailing ellipsis
    /\[incomplete\]/gi,
    /\[loading\]/gi,
    /\[processing\]/gi,
    /\[wait\]/gi
  ];

  private static readonly PRESERVE_PATTERNS = [
    /```[\s\S]*?```/g, // Code blocks
    /`[^`]+`/g, // Inline code
    /\[[^\]]*\]\([^)]*\)/g, // Markdown links
    /!\[[^\]]*\]\([^)]*\)/g, // Images
    /\*\*[^*]+\*\*/g, // Bold text
    /\*[^*]+\*/g, // Italic text
    /~~[^~]+~~/g, // Strikethrough
    /#{1,6}\s+.+$/gm // Headers
  ];

  private static readonly MINIMAL_FILTER_PATTERNS = [
    /\[Content will be added shortly\]/gi,
    /\[Response incomplete - please retry\]/gi,
    /\[Error: Response truncated\]/gi
  ];

  /**
   * Main processing method that handles AI responses robustly
   */
  static processResponse(rawResponse: string, options: ProcessingOptions = {}): ProcessedResponse {
    logger.info('Processing AI response with content preservation', 'MarkdownResponseProcessor');

    try {
      // Step 1: Preserve important content before any processing
      const preservedContent = this.preserveImportantContent(rawResponse);
      
      // Step 2: Apply minimal content filtering (only truly problematic patterns)
      const filteredContent = this.applyMinimalFiltering(preservedContent);
      
      // Step 3: Enhance markdown structure without removing content
      const enhancedContent = this.enhanceMarkdownStructure(filteredContent, options);
      
      // Step 4: Fix formatting issues while preserving meaning
      const formattedContent = this.fixFormattingIssues(enhancedContent);
      
      // Step 5: Generate metadata and quality assessment
      const metadata = this.extractMetadata(formattedContent);
      const quality = this.assessQuality(formattedContent, metadata);
      const renderingHints = this.generateRenderingHints(formattedContent, metadata);
      
      // Step 6: Detect any potential issues or warnings
      const warnings = this.detectPotentialIssues(formattedContent, rawResponse);

      return {
        content: formattedContent,
        metadata,
        quality,
        renderingHints,
        warnings
      };

    } catch (error) {
      logger.error('Error processing response, falling back to safe mode', 'MarkdownResponseProcessor', error);
      return this.safeFallbackProcessing(rawResponse);
    }
  }

  /**
   * Preserve important markdown elements before processing
   */
  private static preserveImportantContent(content: string): string {
    const preserved: Map<string, string> = new Map();
    let processedContent = content;
    let placeholderIndex = 0;

    // Preserve code blocks, links, and other important markdown elements
    for (const pattern of this.PRESERVE_PATTERNS) {
      processedContent = processedContent.replace(pattern, (match) => {
        const placeholder = `__PRESERVE_${placeholderIndex++}__`;
        preserved.set(placeholder, match);
        return placeholder;
      });
    }

    // Store preserved content for later restoration
    (processedContent as any).__preserved = preserved;
    return processedContent;
  }

  /**
   * Apply only minimal filtering for truly problematic content
   */
  private static applyMinimalFiltering(content: string): string {
    let filtered = content;

    // Only filter patterns that are definitively placeholders or errors
    for (const pattern of this.MINIMAL_FILTER_PATTERNS) {
      filtered = filtered.replace(pattern, '');
    }

    // Remove only completely empty sections (header with no content)
    filtered = filtered.replace(/^(#{1,6})\s+([^\n]+)\n\s*(?=#{1,6}|\s*$)/gm, '');
    
    // Clean up excessive whitespace but preserve intentional formatting
    filtered = filtered.replace(/\n{4,}/g, '\n\n\n');
    
    return filtered.trim();
  }

  /**
   * Enhance markdown structure without removing legitimate content
   */
  private static enhanceMarkdownStructure(content: string, options: ProcessingOptions): string {
    let enhanced = content;

    // Fix header hierarchy without removing headers
    enhanced = this.improveHeaderHierarchy(enhanced);
    
    // Enhance list formatting
    enhanced = this.enhanceListFormatting(enhanced);
    
    // Improve table formatting if present
    enhanced = this.enhanceTableFormatting(enhanced);
    
    // Add section breaks for better readability
    enhanced = this.addSectionBreaks(enhanced);
    
    // Restore preserved content
    enhanced = this.restorePreservedContent(enhanced);

    return enhanced;
  }

  /**
   * Fix common formatting issues while preserving content
   */
  private static fixFormattingIssues(content: string): string {
    let fixed = content;

    // Fix spacing around headers
    fixed = fixed.replace(/^(#{1,6})\s{2,}/gm, '$1 ');
    fixed = fixed.replace(/^(#{1,6})\s*([^#\s])/gm, '$1 $2');
    
    // Fix list formatting
    fixed = fixed.replace(/^[\s]*[-*+]\s{2,}/gm, '- ');
    fixed = fixed.replace(/^[\s]*(\d+)[.)]\s{2,}/gm, '$1. ');
    
    // Fix emphasis formatting without removing content
    fixed = fixed.replace(/\*{3,}([^*]+)\*{3,}/g, '**$1**');
    fixed = fixed.replace(/_{3,}([^_]+)_{3,}/g, '__$1__');
    
    // Fix sentence spacing
    fixed = fixed.replace(/([.!?])([A-Z])/g, '$1 $2');
    
    // Remove trailing periods from headers only if they seem unintentional
    fixed = fixed.replace(/^(#{1,6}\s+[^.\n]{5,})\.\s*$/gm, '$1');

    return fixed;
  }

  /**
   * Extract comprehensive metadata from processed content
   */
  private static extractMetadata(content: string): ResponseMetadata {
    const headers = this.parseHeaders(content);
    const codeBlocks = this.parseCodeBlocks(content);
    const wordCount = this.countWords(content);
    const estimatedReadTime = Math.ceil(wordCount / 200);
    
    // Determine content type based on analysis
    const contentType = this.determineContentType(content, headers, codeBlocks);
    
    // Check for completion indicators
    const isComplete = this.isResponseComplete(content);
    
    // Check for markdown elements
    const hasMarkdown = this.hasMarkdownElements(content);

    return {
      isComplete,
      hasMarkdown,
      wordCount,
      estimatedReadTime,
      contentType,
      headers,
      codeBlocks
    };
  }

  /**
   * Assess content quality without penalizing legitimate content
   */
  private static assessQuality(content: string, metadata: ResponseMetadata): QualityScore {
    let completeness = 100;
    let formatting = 80;
    let structure = 70;
    let readability = 75;

    // Assess completeness based on content indicators, not aggressive filtering
    if (!metadata.isComplete) completeness -= 30;
    if (this.hasIncompleteIndicators(content)) completeness -= 20;
    
    // Assess formatting based on markdown elements
    if (metadata.hasMarkdown) formatting += 10;
    if (metadata.codeBlocks.every(cb => cb.isValid)) formatting += 10;
    
    // Assess structure based on organization
    if (metadata.headers.length >= 2) structure += 15;
    if (this.hasGoodHeaderHierarchy(metadata.headers)) structure += 15;
    
    // Assess readability based on word count and structure
    if (metadata.wordCount >= 50) readability += 10;
    if (metadata.headers.length > 0) readability += 15;

    const overall = Math.round((completeness + formatting + structure + readability) / 4);

    return {
      completeness: Math.max(0, Math.min(100, completeness)),
      formatting: Math.max(0, Math.min(100, formatting)),
      structure: Math.max(0, Math.min(100, structure)),
      readability: Math.max(0, Math.min(100, readability)),
      overall: Math.max(0, Math.min(100, overall))
    };
  }

  /**
   * Generate rendering hints for optimal display
   */
  private static generateRenderingHints(content: string, metadata: ResponseMetadata): RenderingHints {
    const shouldUseStreaming = metadata.wordCount > 200;
    let preferredRenderer: 'markdown' | 'html' | 'text' = 'markdown';
    
    if (!metadata.hasMarkdown) {
      preferredRenderer = 'text';
    } else if (metadata.codeBlocks.length > 2) {
      preferredRenderer = 'html'; // Better code syntax highlighting
    }

    const customStyles = [];
    if (metadata.contentType === 'code') {
      customStyles.push('code-heavy');
    }
    if (metadata.headers.length > 5) {
      customStyles.push('multi-section');
    }

    return {
      shouldUseStreaming,
      preferredRenderer,
      customStyles,
      interactiveElements: this.detectInteractiveElements(content)
    };
  }

  /**
   * Detect potential issues without false positives
   */
  private static detectPotentialIssues(processedContent: string, originalContent: string): string[] {
    const warnings: string[] = [];

    // Check for significant content loss (more than 20% reduction)
    const originalLength = originalContent.length;
    const processedLength = processedContent.length;
    const reductionPercent = ((originalLength - processedLength) / originalLength) * 100;
    
    if (reductionPercent > 20) {
      warnings.push(`Significant content reduction detected: ${Math.round(reductionPercent)}%`);
    }

    // Check for incomplete responses
    if (this.hasIncompleteIndicators(processedContent)) {
      warnings.push('Response may be incomplete - check for truncation');
    }

    // Check for malformed markdown
    if (this.hasMalformedMarkdown(processedContent)) {
      warnings.push('Some markdown elements may not render correctly');
    }

    return warnings;
  }

  /**
   * Safe fallback processing when main processing fails
   */
  private static safeFallbackProcessing(rawResponse: string): ProcessedResponse {
    logger.warn('Using safe fallback processing', 'MarkdownResponseProcessor');

    // Minimal processing that preserves all content
    const content = rawResponse
      .replace(/\n{4,}/g, '\n\n\n') // Basic whitespace cleanup
      .trim();

    const metadata: ResponseMetadata = {
      isComplete: true,
      hasMarkdown: false,
      wordCount: this.countWords(content),
      estimatedReadTime: Math.ceil(this.countWords(content) / 200),
      contentType: 'mixed',
      headers: [],
      codeBlocks: []
    };

    const quality: QualityScore = {
      completeness: 70,
      formatting: 50,
      structure: 50,
      readability: 60,
      overall: 57
    };

    const renderingHints: RenderingHints = {
      shouldUseStreaming: false,
      preferredRenderer: 'text',
      customStyles: ['fallback-mode'],
      interactiveElements: []
    };

    return {
      content,
      metadata,
      quality,
      renderingHints,
      warnings: ['Used fallback processing mode - some formatting may be suboptimal']
    };
  }

  // Helper methods
  private static parseHeaders(content: string): HeaderStructure[] {
    const headers: HeaderStructure[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const headerMatch = line.match(/^(#{1,6})\s+(.+)/);
      if (headerMatch) {
        const text = headerMatch[2].trim();
        headers.push({
          level: headerMatch[1].length,
          text,
          anchor: text.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          position: index,
          hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(text)
        });
      }
    });

    return headers;
  }

  private static parseCodeBlocks(content: string): CodeBlock[] {
    const codeBlocks: CodeBlock[] = [];
    const codeBlockPattern = /```(\w*)\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      const language = match[1] || null;
      const codeContent = match[2].trim();
      
      codeBlocks.push({
        language,
        content: codeContent,
        isValid: codeContent.length > 0,
        lineCount: codeContent.split('\n').length
      });
    }

    return codeBlocks;
  }

  private static countWords(content: string): number {
    // Remove code blocks and markdown syntax for accurate word count
    const textContent = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/[#*_~`\[\]()]/g, '') // Remove markdown syntax
      .trim();

    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  private static determineContentType(content: string, headers: HeaderStructure[], codeBlocks: CodeBlock[]): 'explanation' | 'code' | 'mixed' | 'list' | 'table' {
    const hasSignificantCode = codeBlocks.length > 2 || codeBlocks.some(cb => cb.lineCount > 10);
    const hasLists = /^[\s]*[-*+]\s+/m.test(content) || /^[\s]*\d+\.\s+/m.test(content);
    const hasTables = /^\|.+\|/m.test(content);
    const hasExplanatory = headers.length > 0 && content.length > 200;

    if (hasTables) return 'table';
    if (hasSignificantCode) return 'code';
    if (hasLists && !hasExplanatory) return 'list';
    if (hasExplanatory) return 'explanation';
    return 'mixed';
  }

  private static isResponseComplete(content: string): boolean {
    // Check for incomplete indicators, but be conservative
    for (const pattern of this.INCOMPLETE_INDICATORS) {
      if (pattern.test(content)) return false;
    }
    
    // Consider complete if it has substantial content
    return this.countWords(content) > 10;
  }

  private static hasMarkdownElements(content: string): boolean {
    return /[#*_`\[\]|]/.test(content);
  }

  private static hasIncompleteIndicators(content: string): boolean {
    return this.INCOMPLETE_INDICATORS.some(pattern => pattern.test(content));
  }

  private static hasGoodHeaderHierarchy(headers: HeaderStructure[]): boolean {
    if (headers.length < 2) return false;
    
    // Check if header levels are reasonably structured
    const levels = headers.map(h => h.level);
    const maxLevel = Math.max(...levels);
    const minLevel = Math.min(...levels);
    
    return maxLevel - minLevel <= 3; // Reasonable hierarchy depth
  }

  private static hasMalformedMarkdown(content: string): boolean {
    // Check for common malformed patterns
    const malformedPatterns = [
      /```[^`]*$/, // Unclosed code blocks
      /\[[^\]]*$/, // Unclosed links
      /\*\*[^*]*$/, // Unclosed bold
      /`[^`]*$/m // Unclosed inline code
    ];

    return malformedPatterns.some(pattern => pattern.test(content));
  }

  private static detectInteractiveElements(content: string): string[] {
    const interactive = [];
    
    if (/- \[ \]/.test(content)) interactive.push('checkboxes');
    if (/\[[^\]]*\]\([^)]*\)/.test(content)) interactive.push('links');
    if (/```/.test(content)) interactive.push('code-blocks');
    
    return interactive;
  }

  private static improveHeaderHierarchy(content: string): string {
    // Fix header hierarchy without removing headers
    const lines = content.split('\n');
    let lastLevel = 0;
    
    return lines.map(line => {
      const headerMatch = line.match(/^(#+)\s+(.+)/);
      if (headerMatch) {
        const currentLevel = headerMatch[1].length;
        
        // Only adjust if there's a significant jump (more than 2 levels)
        if (currentLevel > lastLevel + 2 && lastLevel > 0) {
          const correctedLevel = '#'.repeat(Math.min(lastLevel + 1, 6));
          line = `${correctedLevel} ${headerMatch[2]}`;
        }
        lastLevel = Math.min(headerMatch[1].length, 6);
      }
      return line;
    }).join('\n');
  }

  private static enhanceListFormatting(content: string): string {
    // Standardize list markers without removing content
    let enhanced = content;
    
    // Standardize unordered lists
    enhanced = enhanced.replace(/^[\s]*[*+]\s+/gm, '- ');
    
    // Standardize ordered lists
    enhanced = enhanced.replace(/^[\s]*(\d+)[)]\s+/gm, '$1. ');
    
    return enhanced;
  }

  private static enhanceTableFormatting(content: string): string {
    // Basic table formatting improvements
    return content.replace(/\|\s*([^|]+)\s*\|/g, '| $1 |');
  }

  private static addSectionBreaks(content: string): string {
    // Add appropriate spacing between sections
    return content.replace(/^(#{1,6}\s+.+)$/gm, '\n$1');
  }

  private static restorePreservedContent(content: string): string {
    const preserved = (content as any).__preserved as Map<string, string>;
    if (!preserved) return content;

    let restored = content;
    preserved.forEach((originalContent, placeholder) => {
      restored = restored.replace(placeholder, originalContent);
    });

    return restored;
  }
}

export interface ProcessingOptions {
  preserveOriginalFormatting?: boolean;
  enhanceCodeBlocks?: boolean;
  addTableOfContents?: boolean;
  customFilterPatterns?: RegExp[];
}