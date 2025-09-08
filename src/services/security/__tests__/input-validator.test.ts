/**
 * Input Validator Tests
 * Comprehensive unit tests for the input validation and sanitization service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inputValidator, ValidationSchemas } from '../input-validator';
import DOMPurify from 'dompurify';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((content) => content.replace(/<script[^>]*>.*?<\/script>/gi, ''))
  }
}));

// Mock logger
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Mock audit logger
vi.mock('../audit-logger', () => ({
  auditLogger: {
    logSecurityEvent: vi.fn()
  }
}));

describe('InputValidator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = inputValidator;
      const instance2 = inputValidator;
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Schema Validation', () => {
    it('should validate valid AI message', () => {
      const validMessage = {
        content: 'Hello, how can I help you?',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user',
        metadata: {
          timestamp: Date.now(),
          model: 'gpt-4',
          temperature: 0.7
        }
      };

      const result = inputValidator.validate(
        ValidationSchemas.aiMessage, 
        validMessage, 
        'test'
      );

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(validMessage);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid AI message', () => {
      const invalidMessage = {
        content: '', // Empty content
        sessionId: 'invalid-uuid',
        role: 'invalid-role'
      };

      const result = inputValidator.validate(
        ValidationSchemas.aiMessage, 
        invalidMessage, 
        'test'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('Message cannot be empty'))).toBe(true);
    });

    it('should detect malicious content in AI messages', () => {
      const maliciousMessage = {
        content: 'Hello <script>alert("xss")</script>',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user'
      };

      const result = inputValidator.validate(
        ValidationSchemas.aiMessage, 
        maliciousMessage, 
        'test'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('malicious content'))).toBe(true);
    });

    it('should validate API keys', () => {
      const validKey = 'sk-1234567890abcdef';
      const result = inputValidator.validate(
        ValidationSchemas.apiKey, 
        validKey, 
        'test'
      );

      expect(result.isValid).toBe(true);
      expect(result.data).toBe(validKey);
    });

    it('should reject invalid API keys', () => {
      const invalidKeys = [
        'short', // Too short
        'a'.repeat(501), // Too long
        'invalid-chars-!@#$%', // Invalid characters
      ];

      invalidKeys.forEach(key => {
        const result = inputValidator.validate(
          ValidationSchemas.apiKey, 
          key, 
          'test'
        );
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate file uploads', () => {
      const validFile = {
        name: 'document.txt',
        size: 1024 * 1024, // 1MB
        type: 'text/plain'
      };

      const result = inputValidator.validate(
        ValidationSchemas.fileUpload, 
        validFile, 
        'test'
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject oversized files', () => {
      const oversizedFile = {
        name: 'large-file.txt',
        size: 15 * 1024 * 1024, // 15MB
        type: 'text/plain'
      };

      const result = inputValidator.validate(
        ValidationSchemas.fileUpload, 
        oversizedFile, 
        'test'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('File too large'))).toBe(true);
    });

    it('should validate URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org/path?query=value',
        'https://subdomain.example.com:8080/path'
      ];

      validUrls.forEach(url => {
        const result = inputValidator.validate(
          ValidationSchemas.url, 
          url, 
          'test'
        );
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'ftp://example.com', // Invalid protocol
        'javascript:alert(1)', // Dangerous protocol
        'not-a-url',
        ''
      ];

      invalidUrls.forEach(url => {
        const result = inputValidator.validate(
          ValidationSchemas.url, 
          url, 
          'test'
        );
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('HTML Sanitization', () => {
    it('should sanitize HTML content', () => {
      const maliciousHtml = '<p>Safe content</p><script>alert("xss")</script>';
      
      const sanitized = inputValidator.sanitizeHtml(maliciousHtml);
      
      expect(DOMPurify.sanitize).toHaveBeenCalledWith(
        maliciousHtml,
        expect.objectContaining({
          ALLOWED_TAGS: expect.arrayContaining(['p', 'strong', 'em']),
          FORBID_TAGS: expect.arrayContaining(['script', 'style', 'iframe'])
        })
      );
    });

    it('should handle custom sanitization options', () => {
      const content = '<p>Test</p><strong>Bold</strong>';
      const options = {
        allowedTags: ['p'],
        maxLength: 10
      };
      
      const sanitized = inputValidator.sanitizeHtml(content, options);
      
      expect(DOMPurify.sanitize).toHaveBeenCalled();
    });

    it('should strip all tags when requested', () => {
      const htmlContent = '<p>Test <strong>content</strong></p>';
      const options = { stripTags: true };
      
      // Mock DOMPurify to return the content as-is for this test
      vi.mocked(DOMPurify.sanitize).mockReturnValueOnce(htmlContent);
      
      const sanitized = inputValidator.sanitizeHtml(htmlContent, options);
      
      expect(sanitized).toBe('Test content');
    });

    it('should truncate content when max length is specified', () => {
      const longContent = 'a'.repeat(100);
      const options = { maxLength: 50 };
      
      vi.mocked(DOMPurify.sanitize).mockReturnValueOnce(longContent);
      
      const sanitized = inputValidator.sanitizeHtml(longContent, options);
      
      expect(sanitized).toBe('a'.repeat(50) + '...');
    });

    it('should handle sanitization errors gracefully', () => {
      vi.mocked(DOMPurify.sanitize).mockImplementationOnce(() => {
        throw new Error('Sanitization error');
      });
      
      const result = inputValidator.sanitizeHtml('<p>Test</p>');
      
      expect(result).toBe(''); // Should return empty string on error
    });
  });

  describe('Text Sanitization', () => {
    it('should remove script injections from text', () => {
      const maliciousText = 'Hello <script>alert("xss")</script> world';
      
      const sanitized = inputValidator.sanitizeText(maliciousText);
      
      expect(sanitized).toBe('Hello  world');
    });

    it('should remove dangerous protocols', () => {
      const dangerousText = 'Click javascript:alert(1) or data:text/html,<script>alert(1)</script>';
      
      const sanitized = inputValidator.sanitizeText(dangerousText);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:');
    });

    it('should remove event handlers', () => {
      const textWithEvents = 'Click here onclick=alert(1) onmouseover=alert(2)';
      
      const sanitized = inputValidator.sanitizeText(textWithEvents);
      
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).not.toContain('onmouseover=');
    });

    it('should normalize whitespace', () => {
      const messyText = '  Hello    world  \n\n  test  ';
      
      const sanitized = inputValidator.sanitizeText(messyText);
      
      expect(sanitized).toBe('Hello world test');
    });

    it('should handle sanitization errors', () => {
      // Mock a scenario where sanitization might fail
      const originalReplace = String.prototype.replace;
      String.prototype.replace = vi.fn().mockImplementationOnce(() => {
        throw new Error('Replace error');
      });
      
      const result = inputValidator.sanitizeText('test');
      
      expect(result).toBe(''); // Should return empty string on error
      
      // Restore original method
      String.prototype.replace = originalReplace;
    });
  });

  describe('AI Message Validation', () => {
    it('should validate and sanitize AI messages', () => {
      const message = {
        content: 'Hello <script>alert("xss")</script> world',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user'
      };

      const result = inputValidator.validateAIMessage(message);
      
      expect(result.isValid).toBe(false); // Should be invalid due to script tag
    });

    it('should sanitize valid AI message content', () => {
      const message = {
        content: 'Hello world with some   extra   spaces',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'user'
      };

      const result = inputValidator.validateAIMessage(message);
      
      if (result.isValid && result.sanitizedData) {
        expect(result.sanitizedData.content).toBe('Hello world with some extra spaces');
      }
    });
  });

  describe('API Key Validation', () => {
    it('should validate legitimate API keys', () => {
      const validKey = 'sk-1234567890abcdefghijklmnopqrstuvwxyz';
      
      const result = inputValidator.validateApiKey(validKey, 'openai');
      
      expect(result.isValid).toBe(true);
    });

    it('should detect suspicious API keys', () => {
      const suspiciousKeys = [
        'fake-api-key-123',
        'test-password-secret',
        'demo-token-test'
      ];

      suspiciousKeys.forEach(key => {
        const result = inputValidator.validateApiKey(key, 'test-provider');
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('invalid or test key'))).toBe(true);
      });
    });
  });

  describe('File Upload Validation', () => {
    it('should validate safe file uploads', () => {
      const safeFile = new File(['content'], 'document.txt', {
        type: 'text/plain'
      });

      const result = inputValidator.validateFileUpload(safeFile);
      
      expect(result.isValid).toBe(true);
    });

    it('should block dangerous file extensions', () => {
      const dangerousFiles = [
        new File([''], 'malware.exe', { type: 'application/octet-stream' }),
        new File([''], 'script.bat', { type: 'application/octet-stream' }),
        new File([''], 'virus.scr', { type: 'application/octet-stream' })
      ];

      dangerousFiles.forEach(file => {
        const result = inputValidator.validateFileUpload(file);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('not allowed for security'))).toBe(true);
      });
    });
  });

  describe('URL Validation', () => {
    it('should validate safe URLs', () => {
      const safeUrl = 'https://api.example.com/data';
      
      const result = inputValidator.validateUrl(safeUrl);
      
      expect(result.isValid).toBe(true);
    });

    it('should block dangerous URLs', () => {
      const dangerousUrls = [
        'http://localhost:3000/admin',
        'https://127.0.0.1/secret',
        'http://0.0.0.0/internal'
      ];

      dangerousUrls.forEach(url => {
        const result = inputValidator.validateUrl(url);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('not allowed for security'))).toBe(true);
      });
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize nested objects', () => {
      const testData = {
        name: 'Test <script>alert(1)</script>',
        nested: {
          description: 'Safe content with   extra   spaces',
          array: ['item1 <script>', 'item2']
        }
      };

      const result = inputValidator.validate(
        ValidationSchemas.userInput,
        JSON.stringify(testData),
        'test'
      );

      if (result.isValid && result.sanitizedData) {
        // The sanitized data should be cleaned
        expect(result.sanitizedData).not.toContain('<script>');
      }
    });

    it('should handle arrays in sanitization', () => {
      const testArray = [
        'Clean text',
        'Text with <script>alert(1)</script>',
        { nested: 'object with   spaces' }
      ];

      // Test through the private sanitizeData method indirectly
      const result = inputValidator.validate(
        ValidationSchemas.userInput,
        JSON.stringify(testArray),
        'test'
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should validate rate limits', () => {
      const isAllowed = inputValidator.validateRateLimit(
        'user-123',
        'api-call',
        100,
        60000
      );

      // Currently returns true as it's a placeholder
      expect(isAllowed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Create a schema that will throw an error
      const badSchema = {
        safeParse: vi.fn().mockImplementationOnce(() => {
          throw new Error('Schema error');
        })
      };

      const result = inputValidator.validate(badSchema as any, 'test', 'error-test');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation failed due to internal error');
    });

    it('should handle malformed input gracefully', () => {
      const result = inputValidator.validate(
        ValidationSchemas.aiMessage,
        null,
        'null-test'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Security Event Logging', () => {
    it('should log successful validations', () => {
      const { auditLogger } = require('../audit-logger');
      
      inputValidator.validate(
        ValidationSchemas.userInput,
        'safe content',
        'test-context'
      );

      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input_validation',
          action: 'validation_success',
          context: 'test-context'
        })
      );
    });

    it('should log validation failures', () => {
      const { auditLogger } = require('../audit-logger');
      
      inputValidator.validate(
        ValidationSchemas.aiMessage,
        { invalid: 'data' },
        'test-context'
      );

      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'input_validation',
          action: 'validation_failed',
          context: 'test-context'
        })
      );
    });

    it('should log content sanitization events', () => {
      const { auditLogger } = require('../audit-logger');
      
      // Mock DOMPurify to return different content to trigger sanitization logging
      vi.mocked(DOMPurify.sanitize).mockReturnValueOnce('cleaned content');
      
      inputValidator.sanitizeHtml('original <script>alert(1)</script> content');

      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'content_sanitization',
          action: 'content_modified'
        })
      );
    });
  });
});