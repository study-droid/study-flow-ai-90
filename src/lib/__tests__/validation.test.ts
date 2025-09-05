/**
 * Comprehensive Unit Tests for Validation Utilities
 * Tests all validation schemas, sanitization functions, and validation helpers
 */

import { describe, it, expect } from 'vitest';
import {
  commonValidation,
  profileSchema,
  taskSchema,
  subjectSchema,
  studyGoalSchema,
  flashcardSchema,
  timetableEntrySchema,
  studySessionSchema,
  sanitizeInput,
  rateLimitConfig,
  validateInput,
} from '../validation';

describe('validation', () => {
  describe('commonValidation', () => {
    describe('id validation', () => {
      it('should accept valid UUIDs', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        expect(commonValidation.id.parse(validUUID)).toBe(validUUID);
      });

      it('should reject invalid UUIDs', () => {
        expect(() => commonValidation.id.parse('invalid-uuid')).toThrow();
        expect(() => commonValidation.id.parse('123-456-789')).toThrow();
        expect(() => commonValidation.id.parse('')).toThrow();
      });
    });

    describe('email validation', () => {
      it('should accept valid email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'test+label@gmail.com',
          'user123@sub.domain.com'
        ];

        validEmails.forEach(email => {
          expect(commonValidation.email.parse(email)).toBe(email);
        });
      });

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user..name@domain.com',
          '',
          'user name@domain.com'
        ];

        invalidEmails.forEach(email => {
          expect(() => commonValidation.email.parse(email)).toThrow();
        });
      });
    });

    describe('password validation', () => {
      it('should accept strong passwords', () => {
        const strongPasswords = [
          'StrongPass123!',
          'MySecure#Pass456',
          'Complex$Password789',
          'Test@Password2024'
        ];

        strongPasswords.forEach(password => {
          expect(commonValidation.password.parse(password)).toBe(password);
        });
      });

      it('should reject weak passwords', () => {
        const weakPasswords = [
          'weak', // too short
          'weakpassword', // no uppercase
          'WEAKPASSWORD', // no lowercase
          'WeakPassword', // no number
          'WeakPassword123', // no special character
          'Weak12!', // too short (need at least 8 chars)
        ];

        weakPasswords.forEach(password => {
          expect(() => commonValidation.password.parse(password)).toThrow();
        });
      });
    });

    describe('displayName validation', () => {
      it('should accept valid display names', () => {
        const validNames = [
          'JohnDoe',
          'Jane_Smith',
          'User123',
          'Test User',
          'user-name',
          'UserName123_test'
        ];

        validNames.forEach(name => {
          expect(commonValidation.displayName.parse(name)).toBe(name);
        });
      });

      it('should reject invalid display names', () => {
        const invalidNames = [
          '', // empty
          'a'.repeat(51), // too long
          'user@name', // invalid characters
          'user#name',
          'user<>name',
          'user&name'
        ];

        invalidNames.forEach(name => {
          expect(() => commonValidation.displayName.parse(name)).toThrow();
        });
      });
    });

    describe('title validation', () => {
      it('should accept valid titles', () => {
        const title = 'Valid Task Title';
        expect(commonValidation.title.parse(title)).toBe(title);
        expect(commonValidation.title.parse('  Trimmed Title  ')).toBe('Trimmed Title');
      });

      it('should reject invalid titles', () => {
        expect(() => commonValidation.title.parse('')).toThrow();
        expect(() => commonValidation.title.parse('a'.repeat(201))).toThrow();
      });
    });
  });

  describe('profileSchema', () => {
    it('should validate correct profile data', () => {
      const validProfile = {
        display_name: 'TestUser',
        current_semester: 'Fall 2024',
        academic_year: '2024',
        preferred_session_length: 45
      };

      expect(profileSchema.parse(validProfile)).toEqual(validProfile);
    });

    it('should apply default preferred_session_length', () => {
      const profileWithoutLength = {
        display_name: 'TestUser'
      };

      const result = profileSchema.parse(profileWithoutLength);
      expect(result.preferred_session_length).toBe(45);
    });

    it('should reject invalid session lengths', () => {
      expect(() => profileSchema.parse({
        display_name: 'TestUser',
        preferred_session_length: 10 // too short
      })).toThrow();

      expect(() => profileSchema.parse({
        display_name: 'TestUser',
        preferred_session_length: 300 // too long
      })).toThrow();
    });
  });

  describe('taskSchema', () => {
    it('should validate correct task data', () => {
      const validTask = {
        title: 'Complete assignment',
        description: 'Math homework chapter 5',
        status: 'pending' as const,
        priority: 'high' as const,
        due_date: new Date().toISOString(),
        subject_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(taskSchema.parse(validTask)).toEqual(validTask);
    });

    it('should apply default values', () => {
      const minimalTask = {
        title: 'Test Task'
      };

      const result = taskSchema.parse(minimalTask);
      expect(result.status).toBe('pending');
      expect(result.priority).toBe('medium');
    });

    it('should reject invalid status and priority values', () => {
      expect(() => taskSchema.parse({
        title: 'Test Task',
        status: 'invalid_status'
      })).toThrow();

      expect(() => taskSchema.parse({
        title: 'Test Task',
        priority: 'invalid_priority'
      })).toThrow();
    });
  });

  describe('subjectSchema', () => {
    it('should validate correct subject data', () => {
      const validSubject = {
        name: 'Mathematics',
        color: '#FF5733',
        credits: 3,
        instructor: 'Dr. Smith',
        room: 'Room 101'
      };

      expect(subjectSchema.parse(validSubject)).toEqual(validSubject);
    });

    it('should reject invalid color formats', () => {
      const invalidColors = [
        'red',
        '#ZZZ',
        '#12345',
        '#1234567',
        'rgb(255, 0, 0)'
      ];

      invalidColors.forEach(color => {
        expect(() => subjectSchema.parse({
          name: 'Test Subject',
          color
        })).toThrow();
      });
    });

    it('should accept valid hex colors', () => {
      const validColors = [
        '#FF5733',
        '#123456',
        '#ABCDEF',
        '#000000',
        '#FFFFFF',
        '#ff5733', // lowercase
        '#AbCdEf' // mixed case
      ];

      validColors.forEach(color => {
        const result = subjectSchema.parse({
          name: 'Test Subject',
          color
        });
        expect(result.color).toBe(color);
      });
    });
  });

  describe('studyGoalSchema', () => {
    it('should validate correct study goal data', () => {
      const validGoal = {
        title: 'Study 100 hours this semester',
        description: 'Focus on core subjects',
        target_value: 100,
        unit: 'hours' as const,
        deadline: new Date().toISOString()
      };

      expect(studyGoalSchema.parse(validGoal)).toEqual(validGoal);
    });

    it('should reject zero or negative target values', () => {
      expect(() => studyGoalSchema.parse({
        title: 'Test Goal',
        target_value: 0,
        unit: 'hours'
      })).toThrow();

      expect(() => studyGoalSchema.parse({
        title: 'Test Goal',
        target_value: -5,
        unit: 'hours'
      })).toThrow();
    });

    it('should only accept valid units', () => {
      const validUnits = ['minutes', 'hours', 'sessions', 'flashcards'] as const;
      
      validUnits.forEach(unit => {
        expect(studyGoalSchema.parse({
          title: 'Test Goal',
          target_value: 50,
          unit
        }).unit).toBe(unit);
      });

      expect(() => studyGoalSchema.parse({
        title: 'Test Goal',
        target_value: 50,
        unit: 'invalid_unit'
      })).toThrow();
    });
  });

  describe('flashcardSchema', () => {
    it('should validate correct flashcard data', () => {
      const validFlashcard = {
        front_text: 'What is 2 + 2?',
        back_text: '4',
        subject: 'Mathematics',
        difficulty: 'easy' as const
      };

      expect(flashcardSchema.parse(validFlashcard)).toEqual(validFlashcard);
    });

    it('should apply default difficulty', () => {
      const flashcardWithoutDifficulty = {
        front_text: 'Question',
        back_text: 'Answer',
        subject: 'Subject'
      };

      const result = flashcardSchema.parse(flashcardWithoutDifficulty);
      expect(result.difficulty).toBe('medium');
    });

    it('should reject empty or too long text', () => {
      expect(() => flashcardSchema.parse({
        front_text: '',
        back_text: 'Answer',
        subject: 'Subject'
      })).toThrow();

      expect(() => flashcardSchema.parse({
        front_text: 'Question',
        back_text: 'a'.repeat(1001),
        subject: 'Subject'
      })).toThrow();
    });
  });

  describe('timetableEntrySchema', () => {
    it('should validate correct timetable entry', () => {
      const validEntry = {
        subject_name: 'Mathematics',
        day_of_week: 1, // Monday
        start_time: '09:00',
        end_time: '10:30',
        room: 'Room 101',
        instructor: 'Dr. Smith',
        notes: 'Lecture on calculus'
      };

      expect(timetableEntrySchema.parse(validEntry)).toEqual(validEntry);
    });

    it('should reject invalid day_of_week', () => {
      expect(() => timetableEntrySchema.parse({
        subject_name: 'Test',
        day_of_week: 7, // Invalid day
        start_time: '09:00',
        end_time: '10:00'
      })).toThrow();

      expect(() => timetableEntrySchema.parse({
        subject_name: 'Test',
        day_of_week: -1, // Invalid day
        start_time: '09:00',
        end_time: '10:00'
      })).toThrow();
    });

    it('should reject invalid time formats', () => {
      const invalidTimes = ['25:00', '12:60', '9:00', '12:5', 'invalid'];

      invalidTimes.forEach(time => {
        expect(() => timetableEntrySchema.parse({
          subject_name: 'Test',
          day_of_week: 1,
          start_time: time,
          end_time: '10:00'
        })).toThrow();
      });
    });

    it('should reject end time before start time', () => {
      expect(() => timetableEntrySchema.parse({
        subject_name: 'Test',
        day_of_week: 1,
        start_time: '10:00',
        end_time: '09:00' // Before start time
      })).toThrow();
    });

    it('should accept valid time formats', () => {
      const validTimes = ['10:00', '12:30', '23:59', '15:15'];

      validTimes.forEach(time => {
        const result = timetableEntrySchema.parse({
          subject_name: 'Test',
          day_of_week: 1,
          start_time: '09:00',
          end_time: time
        });
        expect(result.end_time).toBe(time);
      });
    });
  });

  describe('studySessionSchema', () => {
    it('should validate correct study session data', () => {
      const validSession = {
        session_type: 'focus' as const,
        subject: 'Mathematics',
        duration_minutes: 45,
        notes: 'Productive session'
      };

      expect(studySessionSchema.parse(validSession)).toEqual(validSession);
    });

    it('should apply default session_type', () => {
      const sessionWithoutType = {
        subject: 'Mathematics',
        duration_minutes: 30
      };

      const result = studySessionSchema.parse(sessionWithoutType);
      expect(result.session_type).toBe('focus');
    });

    it('should reject invalid duration', () => {
      expect(() => studySessionSchema.parse({
        subject: 'Test',
        duration_minutes: 0 // Too short
      })).toThrow();

      expect(() => studySessionSchema.parse({
        subject: 'Test',
        duration_minutes: 500 // Too long
      })).toThrow();
    });
  });

  describe('sanitizeInput', () => {
    describe('text sanitization', () => {
      it('should remove script tags', () => {
        const maliciousInput = '<script>alert("xss")</script>Hello World';
        expect(sanitizeInput.text(maliciousInput)).toBe('Hello World');
      });

      it('should remove HTML tags', () => {
        const htmlInput = '<div><p>Hello <b>World</b></p></div>';
        expect(sanitizeInput.text(htmlInput)).toBe('Hello World');
      });

      it('should trim whitespace', () => {
        const input = '  Hello World  ';
        expect(sanitizeInput.text(input)).toBe('Hello World');
      });

      it('should handle complex HTML with scripts', () => {
        const complexInput = `
          <div>
            <script>malicious code</script>
            <p>Safe content</p>
            <script src="evil.js"></script>
            More content
          </div>
        `;
        const result = sanitizeInput.text(complexInput);
        expect(result).not.toContain('<script>');
        expect(result).toContain('Safe content');
        expect(result).toContain('More content');
      });
    });

    describe('SQL sanitization', () => {
      it('should remove SQL keywords', () => {
        const sqlInput = 'SELECT * FROM users WHERE id = 1';
        const result = sanitizeInput.sql(sqlInput);
        expect(result).not.toContain('SELECT');
        expect(result).not.toContain('FROM');
        expect(result).not.toContain('WHERE');
      });

      it('should be case insensitive', () => {
        const sqlInput = 'select * from Users where ID = 1';
        const result = sanitizeInput.sql(sqlInput);
        expect(result).not.toContain('select');
        expect(result).not.toContain('from');
        expect(result).not.toContain('where');
      });

      it('should preserve non-SQL content', () => {
        const normalInput = 'This is normal text with select words';
        const result = sanitizeInput.sql(normalInput);
        expect(result).toContain('This is normal text with');
        expect(result).toContain('words');
      });
    });

    describe('XSS sanitization', () => {
      it('should escape HTML entities', () => {
        const xssInput = '<script>alert("xss")</script>';
        const result = sanitizeInput.xss(xssInput);
        expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      });

      it('should escape all dangerous characters', () => {
        const dangerousInput = `& < > " '`;
        const result = sanitizeInput.xss(dangerousInput);
        expect(result).toBe('&amp; &lt; &gt; &quot; &#x27;');
      });

      it('should preserve safe content', () => {
        const safeInput = 'Hello World 123';
        expect(sanitizeInput.xss(safeInput)).toBe(safeInput);
      });
    });
  });

  describe('rateLimitConfig', () => {
    it('should have correct auth rate limit configuration', () => {
      expect(rateLimitConfig.auth).toEqual({
        requests: 5,
        windowMs: 15 * 60 * 1000 // 15 minutes
      });
    });

    it('should have correct API rate limit configuration', () => {
      expect(rateLimitConfig.api).toEqual({
        requests: 100,
        windowMs: 15 * 60 * 1000 // 15 minutes
      });
    });

    it('should have correct upload rate limit configuration', () => {
      expect(rateLimitConfig.upload).toEqual({
        requests: 10,
        windowMs: 60 * 1000 // 1 minute
      });
    });
  });

  describe('validateInput helper', () => {
    it('should return success for valid data', () => {
      const validator = validateInput(commonValidation.email);
      const result = validator('test@example.com');
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('test@example.com');
      }
    });

    it('should return error for invalid data', () => {
      const validator = validateInput(commonValidation.email);
      const result = validator('invalid-email');
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid email format');
      }
    });

    it('should format error messages with path', () => {
      const validator = validateInput(taskSchema);
      const result = validator({ title: '' }); // Empty title
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('title:');
        expect(result.error).toContain('required');
      }
    });

    it('should handle nested validation errors', () => {
      const validator = validateInput(profileSchema);
      const result = validator({
        display_name: 'Valid Name',
        preferred_session_length: 5 // Too short
      });
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('preferred_session_length');
      }
    });

    it('should handle non-Zod errors gracefully', () => {
      const validator = validateInput(commonValidation.id);
      
      // This will cause a Zod error (symbol is not a string)
      const result = validator(Symbol('test'));
      
      expect(result.success).toBe(false);
      if (!result.success) {
        // Zod will still catch this and provide an error message
        expect(result.error).toContain('Expected string, received symbol');
      }
    });
  });
});