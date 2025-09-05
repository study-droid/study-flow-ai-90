/**
 * Markdown Processing Utilities
 * Robust JSON parsing, markdown rendering, and structured content processing
 */

import type { StructuredAnswer } from '../types/ai-tutor';

/**
 * Robust JSON parser with multiple fallback strategies
 * @param raw - Raw string that might contain JSON
 * @returns Parsed JSON object or null if parsing fails
 */
export function tryParseJSON<T = any>(raw: string): T | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  // Strategy 1: Direct JSON parse
  try {
    return JSON.parse(raw.trim());
  } catch {}

  // Strategy 2: Extract largest JSON object with regex
  const jsonObjectMatch = raw.match(/\{[\s\S]*\}$/m);
  if (jsonObjectMatch) {
    try {
      return JSON.parse(jsonObjectMatch[0]);
    } catch {}
  }

  // Strategy 3: Find balanced braces approach
  let braceCount = 0;
  let start = -1;
  
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    
    if (char === '{') {
      if (start === -1) start = i;
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      
      if (braceCount === 0 && start !== -1) {
        try {
          const candidate = raw.slice(start, i + 1);
          return JSON.parse(candidate);
        } catch {}
      }
    }
  }

  // Strategy 4: Try to find JSON between code fences or quotes
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/gi,
    /```\s*([\s\S]*?)\s*```/gi,
    /"([\s\S]*?)"/g,
    /'([\s\S]*?)'/g
  ];

  for (const pattern of patterns) {
    const matches = raw.matchAll(pattern);
    for (const match of matches) {
      try {
        return JSON.parse(match[1]);
      } catch {}
    }
  }

  // Strategy 5: Try to extract JSON-like structure manually
  try {
    const cleaned = raw
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* comments */
      .replace(/\/\/.*$/gm, '')         // Remove // comments
      .replace(/,(\s*[}\]])/g, '$1')    // Remove trailing commas
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
      .trim();
    
    return JSON.parse(cleaned);
  } catch {}

  return null;
}

/**
 * Extract JSON from mixed content (text + JSON)
 * @param content - Mixed content that might contain JSON
 * @returns Array of parsed JSON objects found
 */
export function extractJSONFromContent<T = any>(content: string): T[] {
  const results: T[] = [];
  
  // Look for JSON objects and arrays
  const jsonPatterns = [
    /(\{[\s\S]*?\})/g,
    /(\[[\s\S]*?\])/g
  ];

  for (const pattern of jsonPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const parsed = tryParseJSON<T>(match[1]);
      if (parsed) {
        results.push(parsed);
      }
    }
  }

  return results;
}

/**
 * Convert structured answer to markdown
 * @param answer - Structured answer object
 * @returns Formatted markdown string
 */
export function renderMarkdown(answer: StructuredAnswer): string {
  if (!answer) {
    return '# No Content Available\n\n> Unable to render content.';
  }

  const lines: string[] = [];

  // Title
  if (answer.title) {
    lines.push(`# ${answer.title}`);
    lines.push('');
  }

  // TLDR section
  if (answer.tldr) {
    lines.push(`> **TL;DR**: ${answer.tldr}`);
    lines.push('');
  }

  // Sections
  if (answer.sections && Array.isArray(answer.sections)) {
    for (const section of answer.sections) {
      if (!section.heading || !section.body) continue;

      // Section heading
      lines.push(`## ${section.heading}`);
      lines.push('');

      // Section body
      const cleanedBody = section.body
        .replace(/\u200b/g, '') // Remove zero-width spaces
        .trim();
      
      lines.push(cleanedBody);
      lines.push('');

      // Code blocks
      if (section.code && Array.isArray(section.code)) {
        for (const codeBlock of section.code) {
          if (!codeBlock.content) continue;

          const language = codeBlock.language || '';
          const content = codeBlock.content.replace(/\u200b/g, '');
          
          lines.push(`\`\`\`${language}`);
          lines.push(content);
          lines.push('```');

          // Caption
          if (codeBlock.caption) {
            lines.push(`*${codeBlock.caption}*`);
          }
          
          lines.push('');
        }
      }
    }
  }

  // References
  if (answer.references && Array.isArray(answer.references) && answer.references.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('### References');
    lines.push('');

    for (const ref of answer.references) {
      if (ref.label && ref.url) {
        lines.push(`- [${ref.label}](${ref.url})`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Parse markdown content to extract structure information
 * @param markdown - Markdown content
 * @returns Structure analysis
 */
export function analyzeMarkdownStructure(markdown: string) {
  const lines = markdown.split('\n');
  
  const headers = lines
    .filter(line => /^#{1,6}\s/.test(line))
    .map(line => {
      const level = (line.match(/^#+/)?.[0].length) ?? 1;
      const text = line.replace(/^#+\s*/, '').trim();
      const hasEmoji = /[\p{Emoji}]/u.test(text);
      
      return { text, level, hasEmoji };
    });

  const codeBlocks = [];
  let inCodeBlock = false;
  let currentLanguage = '';

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        codeBlocks.push({
          language: currentLanguage,
          isValid: true
        });
        inCodeBlock = false;
        currentLanguage = '';
      } else {
        inCodeBlock = true;
        currentLanguage = line.slice(3).trim();
      }
    }
  }

  // Handle unclosed code blocks
  if (inCodeBlock) {
    codeBlocks.push({
      language: currentLanguage,
      isValid: false
    });
  }

  const lists = [];
  let currentList: any = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect ordered lists
    if (/^\d+\.\s/.test(trimmed)) {
      if (!currentList || currentList.type !== 'ordered') {
        currentList = {
          type: 'ordered' as const,
          items: [],
          nested: false
        };
        lists.push(currentList);
      }
      currentList.items.push(trimmed.replace(/^\d+\.\s*/, ''));
      
      // Check for nesting
      if (/^\s{2,}/.test(line)) {
        currentList.nested = true;
      }
    }
    // Detect unordered lists
    else if (/^[-*+]\s/.test(trimmed)) {
      if (!currentList || currentList.type !== 'unordered') {
        currentList = {
          type: 'unordered' as const,
          items: [],
          nested: false
        };
        lists.push(currentList);
      }
      currentList.items.push(trimmed.replace(/^[-*+]\s*/, ''));
      
      // Check for nesting
      if (/^\s{2,}/.test(line)) {
        currentList.nested = true;
      }
    } else if (currentList && trimmed === '') {
      // Empty line might end current list context
      // Keep it simple - don't end list on single empty line
    } else if (currentList && !trimmed.match(/^\s*$/)) {
      // Non-list content ends current list
      currentList = null;
    }
  }

  // Simple table detection
  const tables = [];
  let inTable = false;
  let currentTable: any = null;

  for (const line of lines) {
    if (line.includes('|') && line.trim() !== '') {
      if (!inTable) {
        inTable = true;
        currentTable = {
          columnCount: (line.match(/\|/g) || []).length - 1,
          rows: [],
          isValid: true
        };
        tables.push(currentTable);
      }
      
      const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell !== '');
      currentTable.rows.push(cells);
      
      // Validate column consistency
      if (cells.length !== currentTable.columnCount && cells.length > 0) {
        currentTable.isValid = false;
      }
    } else {
      inTable = false;
      currentTable = null;
    }
  }

  return {
    headers,
    codeBlocks,
    lists,
    tables,
    wordCount: markdown.split(/\s+/).filter(Boolean).length,
    lineCount: lines.length,
    hasImages: /!\[.*?\]\(.*?\)/.test(markdown),
    hasLinks: /\[.*?\]\(.*?\)/.test(markdown)
  };
}

/**
 * Validate structured answer format
 * @param answer - Object to validate
 * @returns Validation result
 */
export function validateStructuredAnswer(answer: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!answer || typeof answer !== 'object') {
    errors.push('Answer must be an object');
    return { isValid: false, errors, warnings };
  }

  // Required fields
  if (!answer.title || typeof answer.title !== 'string' || answer.title.trim() === '') {
    errors.push('Title is required and must be a non-empty string');
  }

  if (!answer.tldr || typeof answer.tldr !== 'string' || answer.tldr.trim() === '') {
    errors.push('TLDR is required and must be a non-empty string');
  }

  if (!answer.sections || !Array.isArray(answer.sections)) {
    errors.push('Sections must be an array');
  } else {
    // Validate sections
    for (let i = 0; i < answer.sections.length; i++) {
      const section = answer.sections[i];
      
      if (!section.heading || typeof section.heading !== 'string') {
        errors.push(`Section ${i + 1}: heading is required`);
      }
      
      if (!section.body || typeof section.body !== 'string') {
        errors.push(`Section ${i + 1}: body is required`);
      }

      // Validate code blocks if present
      if (section.code && Array.isArray(section.code)) {
        for (let j = 0; j < section.code.length; j++) {
          const code = section.code[j];
          
          if (!code.content || typeof code.content !== 'string') {
            errors.push(`Section ${i + 1}, Code block ${j + 1}: content is required`);
          }
          
          if (code.language && typeof code.language !== 'string') {
            warnings.push(`Section ${i + 1}, Code block ${j + 1}: language should be a string`);
          }
        }
      }
    }
  }

  // Validate references if present
  if (answer.references) {
    if (!Array.isArray(answer.references)) {
      warnings.push('References should be an array');
    } else {
      for (let i = 0; i < answer.references.length; i++) {
        const ref = answer.references[i];
        
        if (!ref.label || typeof ref.label !== 'string') {
          warnings.push(`Reference ${i + 1}: label should be a string`);
        }
        
        if (!ref.url || typeof ref.url !== 'string') {
          warnings.push(`Reference ${i + 1}: url should be a string`);
        } else {
          // Basic URL validation
          try {
            new URL(ref.url);
          } catch {
            warnings.push(`Reference ${i + 1}: invalid URL format`);
          }
        }
      }
    }
  }

  // Quality checks
  if (answer.title && answer.title.length > 100) {
    warnings.push('Title is very long, consider shortening');
  }

  if (answer.tldr && answer.tldr.length > 300) {
    warnings.push('TLDR is very long, should be concise');
  }

  if (answer.sections && answer.sections.length === 0) {
    warnings.push('No sections provided, content may be incomplete');
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}

/**
 * Clean and sanitize markdown content
 * @param markdown - Raw markdown content
 * @returns Cleaned markdown
 */
export function cleanMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }

  return markdown
    // Remove zero-width spaces and other invisible characters
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    
    // Fix multiple consecutive empty lines
    .replace(/\n{3,}/g, '\n\n')
    
    // Fix unclosed code blocks
    .replace(/(```[\s\S]*?)(\n(?!```))$/g, (match, code, ending) => {
      const openFences = (code.match(/```/g) || []).length;
      return openFences % 2 === 1 ? code + '\n```' : match;
    })
    
    // Clean up list formatting
    .replace(/^(\s*)[-*+]\s+/gm, '$1- ')
    
    // Normalize headers
    .replace(/^(#{1,6})\s*(.+?)#*$/gm, '$1 $2')
    
    // Remove trailing spaces
    .replace(/[ \t]+$/gm, '')
    
    // Ensure single trailing newline
    .replace(/\n*$/, '\n')
    
    .trim();
}

/**
 * Convert plain text to markdown with basic formatting
 * @param text - Plain text
 * @returns Formatted markdown
 */
export function textToMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Convert line breaks to proper markdown
    .replace(/\n{2,}/g, '\n\n')
    
    // Auto-detect and format code blocks (simple heuristic)
    .replace(/(^|\n)([ ]{4,}.*(\n[ ]{4,}.*)*)/g, '\n```\n$2\n```\n')
    
    // Auto-detect headers (lines that end with colon and start new paragraph)
    .replace(/^(.+):(\n\n)/gm, '## $1\n\n')
    
    // Auto-detect lists (lines starting with numbers or bullets)
    .replace(/^(\d+\.|\*|-)\s+(.+)/gm, '$1 $2')
    
    .trim();
}

/**
 * Extract metadata from markdown frontmatter
 * @param markdown - Markdown with optional frontmatter
 * @returns Object with content and metadata
 */
export function parseMarkdownWithMetadata(markdown: string): {
  content: string;
  metadata: Record<string, any>;
} {
  const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!frontmatterMatch) {
    return { content: markdown, metadata: {} };
  }

  const [, frontmatter, content] = frontmatterMatch;
  const metadata: Record<string, any> = {};

  // Simple YAML-like parsing
  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      try {
        // Try to parse as JSON, fall back to string
        metadata[key] = JSON.parse(value);
      } catch {
        metadata[key] = value.trim();
      }
    }
  }

  return { content: content.trim(), metadata };
}

/**
 * Estimate reading time for markdown content
 * @param markdown - Markdown content
 * @param wordsPerMinute - Reading speed (default: 200)
 * @returns Estimated reading time in minutes
 */
export function estimateReadingTime(markdown: string, wordsPerMinute = 200): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '')        // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '')  // Remove links
    .replace(/#+ /g, '')             // Remove headers
    .replace(/[*_~]+/g, '');         // Remove formatting

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / wordsPerMinute));
}

/**
 * Default export combining common utilities
 */
export default {
  tryParseJSON,
  extractJSONFromContent,
  renderMarkdown,
  analyzeMarkdownStructure,
  validateStructuredAnswer,
  cleanMarkdown,
  textToMarkdown,
  parseMarkdownWithMetadata,
  estimateReadingTime
};