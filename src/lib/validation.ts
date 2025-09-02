import { z } from 'zod';

// Common validation schemas
export const commonValidation = {
  id: z.string().uuid('Invalid ID format'),
  email: z.string().email('Invalid email format').min(1, 'Email is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Display name contains invalid characters'),
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
};

// Profile validation
export const profileSchema = z.object({
  display_name: commonValidation.displayName,
  current_semester: z.string().max(50).optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
  preferred_session_length: z.number().min(15).max(240).default(45),
});

// Task validation
export const taskSchema = z.object({
  title: commonValidation.title,
  description: commonValidation.description,
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.string().datetime().optional().nullable(),
  subject_id: commonValidation.id.optional().nullable(),
});

// Subject validation
export const subjectSchema = z.object({
  name: z.string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name must be less than 100 characters')
    .trim(),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color'),
  credits: z.number().min(0).max(10).optional().nullable(),
  instructor: z.string().max(100).optional().nullable(),
  room: z.string().max(50).optional().nullable(),
});

// Study goal validation
export const studyGoalSchema = z.object({
  title: commonValidation.title,
  description: commonValidation.description,
  target_value: z.number().min(1, 'Target value must be greater than 0'),
  unit: z.enum(['minutes', 'hours', 'sessions', 'flashcards']),
  deadline: z.string().datetime().optional().nullable(),
});

// Flashcard validation
export const flashcardSchema = z.object({
  front_text: z.string()
    .min(1, 'Front text is required')
    .max(500, 'Front text must be less than 500 characters'),
  back_text: z.string()
    .min(1, 'Back text is required')
    .max(1000, 'Back text must be less than 1000 characters'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be less than 100 characters'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
});

// Timetable entry validation
export const timetableEntrySchema = z.object({
  subject_name: z.string()
    .min(1, 'Subject name is required')
    .max(100, 'Subject name must be less than 100 characters'),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
  room: z.string().max(50).optional().nullable(),
  instructor: z.string().max(100).optional().nullable(),
  notes: commonValidation.notes,
}).refine((data) => {
  const start = new Date(`1970-01-01T${data.start_time}:00`);
  const end = new Date(`1970-01-01T${data.end_time}:00`);
  return end > start;
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

// Study session validation
export const studySessionSchema = z.object({
  session_type: z.enum(['focus', 'review', 'practice', 'lecture']).default('focus'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(100, 'Subject must be less than 100 characters'),
  duration_minutes: z.number().min(1).max(480),
  notes: commonValidation.notes,
});

// Input sanitization helpers
export const sanitizeInput = {
  text: (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>?/gm, '') // Remove HTML tags
      .trim();
  },
  
  sql: (input: string): string => {
    // Basic SQL injection prevention
    const sqlKeywords = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE|FROM|INTO|VALUES)\b)/gi;
    return input.replace(sqlKeywords, '');
  },
  
  xss: (input: string): string => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },
};

// Rate limiting helper
export const rateLimitConfig = {
  auth: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  api: { requests: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  upload: { requests: 10, windowMs: 60 * 1000 }, // 10 uploads per minute
};

// Validation middleware helper
export const validateInput = <T>(schema: z.ZodSchema<T>) => {
  return (data: unknown): { success: true; data: T } | { success: false; error: string } => {
    try {
      const result = schema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return { 
          success: false, 
          error: `${firstError.path.join('.')}: ${firstError.message}` 
        };
      }
      return { success: false, error: 'Invalid input' };
    }
  };
};