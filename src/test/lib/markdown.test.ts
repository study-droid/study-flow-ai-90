/**
 * Tests for Markdown Utilities
 * Comprehensive testing of JSON parsing, markdown rendering, and content analysis
 */

import { describe, it, expect, vi } from 'vitest';
import {
  tryParseJSON,
  analyzeMarkdownStructure,
  cleanContent,
  isValidMarkdown,
  extractCodeBlocks,
  countWords,
  estimateReadingTime
} from '../../lib/markdown';

describe('Markdown Utilities', () => {
  describe('tryParseJSON', () => {
    it('should parse valid JSON strings', () => {
      const validJSON = '{"key": "value", "number": 42}';
      const result = tryParseJSON(validJSON);
      expect(result).toEqual({ key: 'value', number: 42 });
    });

    it('should handle JSON with extra whitespace', () => {
      const jsonWithWhitespace = '  \n  {"clean": true}  \n  ';
      const result = tryParseJSON(jsonWithWhitespace);
      expect(result).toEqual({ clean: true });
    });

    it('should extract JSON from markdown code blocks', () => {
      const markdownWithJSON = `
Here is some JSON:
\`\`\`json
{"extracted": true}
\`\`\`
More text here.`;
      const result = tryParseJSON(markdownWithJSON);
      expect(result).toEqual({ extracted: true });
    });

    it('should handle JSON with trailing commas by removing them', () => {
      const jsonWithTrailingCommas = '{"key": "value", "array": [1, 2, 3,], }';
      const result = tryParseJSON(jsonWithTrailingCommas);
      expect(result).toEqual({ key: 'value', array: [1, 2, 3] });
    });

    it('should return null for invalid JSON', () => {
      const invalidJSON = '{"incomplete": true';
      const result = tryParseJSON(invalidJSON);
      expect(result).toBeNull();
    });

    it('should return null for non-string input', () => {
      const result = tryParseJSON(null as any);
      expect(result).toBeNull();
    });

    it('should handle nested objects and arrays', () => {
      const complexJSON = '{"nested": {"array": [{"id": 1}, {"id": 2}]}}';
      const result = tryParseJSON(complexJSON);
      expect(result).toEqual({
        nested: {
          array: [{ id: 1 }, { id: 2 }]
        }
      });
    });
  });

  describe('analyzeMarkdownStructure', () => {
    it('should analyze markdown structure correctly', () => {
      const markdown = `
# Main Title
## Section 1
Some content here.
- Item 1
- Item 2

### Subsection
More content.

\`\`\`javascript
console.log("code block");
\`\`\`

## Section 2
Final content.`;

      const result = analyzeMarkdownStructure(markdown);
      expect(result.headings).toHaveLength(4);
      expect(result.headings[0]).toEqual({ level: 1, text: 'Main Title' });
      expect(result.headings[1]).toEqual({ level: 2, text: 'Section 1' });
      expect(result.codeBlocks).toHaveLength(1);
      expect(result.codeBlocks[0].language).toBe('javascript');
      expect(result.listItems).toHaveLength(2);
      expect(result.wordCount).toBeGreaterThan(10);
    });

    it('should handle empty or invalid markdown', () => {
      const result = analyzeMarkdownStructure('');
      expect(result.headings).toHaveLength(0);
      expect(result.codeBlocks).toHaveLength(0);
      expect(result.listItems).toHaveLength(0);
      expect(result.wordCount).toBe(0);
    });

    it('should detect various list types', () => {
      const markdown = `
- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

* Another bullet
+ Plus bullet`;

      const result = analyzeMarkdownStructure(markdown);
      expect(result.listItems).toHaveLength(6);
    });

    it('should extract code blocks with different languages', () => {
      const markdown = `
\`\`\`python
def hello():
    print("Hello")
\`\`\`

\`\`\`
Generic code block
\`\`\`

\`\`\`typescript
const x: string = "test";
\`\`\``;

      const result = analyzeMarkdownStructure(markdown);
      expect(result.codeBlocks).toHaveLength(3);
      expect(result.codeBlocks[0].language).toBe('python');
      expect(result.codeBlocks[1].language).toBe('');
      expect(result.codeBlocks[2].language).toBe('typescript');
    });
  });

  describe('cleanContent', () => {
    it('should remove harmful scripts and iframes', () => {
      const dirtyContent = `
<script>alert('xss')</script>
<p>Safe content</p>
<iframe src="evil.com"></iframe>
More safe content.`;

      const result = cleanContent(dirtyContent);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<iframe>');
      expect(result).toContain('Safe content');
      expect(result).toContain('More safe content');
    });

    it('should preserve safe HTML tags', () => {
      const safeContent = `
<h1>Title</h1>
<p>Paragraph with <strong>bold</strong> text.</p>
<ul><li>List item</li></ul>
<code>code snippet</code>`;

      const result = cleanContent(safeContent);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<code>code snippet</code>');
    });

    it('should handle plain text without modification', () => {
      const plainText = 'This is just plain text with no HTML.';
      const result = cleanContent(plainText);
      expect(result).toBe(plainText);
    });

    it('should normalize excessive whitespace', () => {
      const messyContent = '   Too     much    whitespace   \n\n\n\n   ';
      const result = cleanContent(messyContent);
      expect(result).toBe('Too much whitespace');
    });
  });

  describe('isValidMarkdown', () => {
    it('should identify valid markdown', () => {
      const validMarkdown = `
# Title
## Section
Content with **bold** and *italic* text.
- List item
\`\`\`javascript
code();
\`\`\``;
      expect(isValidMarkdown(validMarkdown)).toBe(true);
    });

    it('should reject markdown with suspicious content', () => {
      const suspiciousMarkdown = '<script>alert("xss")</script>';
      expect(isValidMarkdown(suspiciousMarkdown)).toBe(false);
    });

    it('should handle empty or minimal content', () => {
      expect(isValidMarkdown('')).toBe(true); // Empty is valid
      expect(isValidMarkdown('Just plain text')).toBe(true);
      expect(isValidMarkdown('# Just a title')).toBe(true);
    });

    it('should detect malformed markdown structures', () => {
      const malformedMarkdown = '```\nUnclosed code block';
      // This should still be valid - markdown is quite forgiving
      expect(isValidMarkdown(malformedMarkdown)).toBe(true);
    });
  });

  describe('extractCodeBlocks', () => {
    it('should extract all code blocks from markdown', () => {
      const markdown = `
Text before

\`\`\`javascript
console.log("Hello");
\`\`\`

More text

\`\`\`python
print("World")
\`\`\`

Final text`;

      const codeBlocks = extractCodeBlocks(markdown);
      expect(codeBlocks).toHaveLength(2);
      expect(codeBlocks[0].language).toBe('javascript');
      expect(codeBlocks[0].code).toContain('console.log("Hello")');
      expect(codeBlocks[1].language).toBe('python');
      expect(codeBlocks[1].code).toContain('print("World")');
    });

    it('should handle code blocks without language specification', () => {
      const markdown = `
\`\`\`
generic code
\`\`\``;

      const codeBlocks = extractCodeBlocks(markdown);
      expect(codeBlocks).toHaveLength(1);
      expect(codeBlocks[0].language).toBe('');
      expect(codeBlocks[0].code).toContain('generic code');
    });

    it('should return empty array for markdown without code blocks', () => {
      const markdown = 'Just regular text with no code blocks.';
      const codeBlocks = extractCodeBlocks(markdown);
      expect(codeBlocks).toHaveLength(0);
    });
  });

  describe('countWords', () => {
    it('should count words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('One two three four five')).toBe(5);
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0);
    });

    it('should handle punctuation and special characters', () => {
      expect(countWords('Hello, world! How are you?')).toBe(5);
      expect(countWords('test@example.com')).toBe(1);
      expect(countWords('multi-word hyphenated-term')).toBe(2);
    });

    it('should handle markdown formatting', () => {
      expect(countWords('**bold** and *italic* text')).toBe(4);
      expect(countWords('# Title\n\nContent here')).toBe(3);
    });
  });

  describe('estimateReadingTime', () => {
    it('should estimate reading time correctly', () => {
      const shortText = 'This is a short text.'; // 5 words
      expect(estimateReadingTime(shortText)).toBe(1); // Minimum 1 minute

      // Average adult reads ~200-250 words per minute
      const longText = new Array(400).fill('word').join(' '); // 400 words
      const readingTime = estimateReadingTime(longText);
      expect(readingTime).toBeGreaterThanOrEqual(1);
      expect(readingTime).toBeLessThanOrEqual(3);
    });

    it('should handle empty content', () => {
      expect(estimateReadingTime('')).toBe(1); // Minimum 1 minute
      expect(estimateReadingTime('   ')).toBe(1);
    });

    it('should account for code blocks (slower reading)', () => {
      const textWithCode = `
Regular text content here.
\`\`\`javascript
function complexFunction() {
  // This code takes longer to read
  return someComplexLogic();
}
\`\`\`
More regular text.`;

      const textOnly = new Array(50).fill('word').join(' ');
      
      expect(estimateReadingTime(textWithCode)).toBeGreaterThan(estimateReadingTime(textOnly));
    });
  });
});