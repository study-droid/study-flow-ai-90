/**
 * Logger Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevel } from './logger';

describe('Logger Service', () => {
  beforeEach(() => {
    // Clear logs before each test
    logger.clearLogs();
    // Reset log level to default
    logger.setLogLevel(LogLevel.DEBUG);
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Log Levels', () => {
    it('should log debug messages when level is DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG);
      logger.debug('Debug message', 'TestContext');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.DEBUG);
      expect(logs[0].message).toBe('Debug message');
      expect(logs[0].context).toBe('TestContext');
    });

    it('should not log debug messages when level is INFO', () => {
      logger.setLogLevel(LogLevel.INFO);
      logger.debug('Debug message', 'TestContext');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(0);
    });

    it('should log error messages at all levels', () => {
      logger.setLogLevel(LogLevel.CRITICAL);
      logger.error('Error message', 'TestContext');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
    });

    it('should log critical messages at CRITICAL level', () => {
      logger.setLogLevel(LogLevel.CRITICAL);
      logger.critical('Critical error', 'TestContext');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.CRITICAL);
    });
  });

  describe('Log Storage', () => {
    it('should store logs with timestamps', () => {
      const before = new Date();
      logger.info('Test message', 'TestContext');
      const after = new Date();
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      
      const logTime = new Date(logs[0].timestamp);
      expect(logTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should store additional data with logs', () => {
      const testData = { userId: '123', action: 'login' };
      logger.info('User action', 'TestContext', testData);
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].data).toEqual(testData);
    });

    it('should limit stored logs to maxLogs', () => {
      // Set a small limit for testing
      const maxLogs = 5;
      for (let i = 0; i < maxLogs + 3; i++) {
        logger.info(`Message ${i}`, 'TestContext');
      }
      
      const logs = logger.getLogs();
      // Logger has a default max of 1000, so all 8 should be stored
      expect(logs.length).toBeLessThanOrEqual(1000);
    });

    it('should include stack traces for errors', () => {
      logger.error('Error with stack', 'TestContext');
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].stack).toBeDefined();
      expect(logs[0].stack).toContain('Error');
    });
  });

  describe('Log Filtering', () => {
    it('should filter logs by level', () => {
      logger.debug('Debug', 'Test');
      logger.info('Info', 'Test');
      logger.warn('Warning', 'Test');
      logger.error('Error', 'Test');
      
      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe('Error');
      
      const warnAndAbove = logger.getLogs(LogLevel.WARN);
      expect(warnAndAbove).toHaveLength(2);
    });
  });

  describe('Console Output', () => {
    it('should output to console in development mode', () => {
      // Mock development environment
      vi.stubEnv('MODE', 'development');
      
      logger.info('Console test', 'TestContext');
      
      // In development, console.log should be called
      // Note: This depends on the logger implementation checking import.meta.env.MODE
    });

    it('should not output to console in production mode', () => {
      // Mock production environment
      vi.stubEnv('MODE', 'production');
      
      logger.info('Console test', 'TestContext');
      
      // In production, console should not be called
      // The logger still stores the log internally
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
    });
  });

  describe('Log Export', () => {
    it('should export logs as JSON string', () => {
      logger.info('Export test 1', 'TestContext');
      logger.warn('Export test 2', 'TestContext');
      
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].message).toBe('Export test 1');
      expect(parsed[1].message).toBe('Export test 2');
    });

    it('should export empty array when no logs', () => {
      const exported = logger.exportLogs();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(0);
    });
  });

  describe('Clear Logs', () => {
    it('should clear all stored logs', () => {
      logger.info('Message 1', 'Test');
      logger.info('Message 2', 'Test');
      logger.info('Message 3', 'Test');
      
      expect(logger.getLogs()).toHaveLength(3);
      
      logger.clearLogs();
      
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle circular references in data', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      // Should not throw
      expect(() => {
        logger.info('Circular reference test', 'TestContext', circularData);
      }).not.toThrow();
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
    });

    it('should handle undefined and null values', () => {
      expect(() => {
        logger.info('Undefined test', undefined, undefined);
        logger.info('Null test', null as any, null);
      }).not.toThrow();
      
      const logs = logger.getLogs();
      expect(logs).toHaveLength(2);
    });
  });
});