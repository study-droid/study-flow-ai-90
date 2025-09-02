/**
 * Comprehensive validation schemas using Zod
 * Production-ready validation for all data inputs
 */

import { z } from 'zod';

// Common validation patterns
const uuidSchema = z.string().uuid('Invalid UUID format');
const emailSchema = z.string().email('Invalid email address');
const nonEmptyStringSchema = z.string().min(1, 'This field is required').trim();
const optionalStringSchema = z.string().optional();
const positiveIntegerSchema = z.number().int().positive('Must be a positive integer');
const nonNegativeIntegerSchema = z.number().int().min(0, 'Must be non-negative');

// Date validation
const futureDateSchema = z.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
);
const pastOrPresentDateSchema = z.date().refine(
  (date) => date <= new Date(),
  'Date cannot be in the future'
);

// Text content validation
const createSafeTextSchema = (maxLength?: number) => {
  let schema = z.string().trim();
  
  if (maxLength) {
    schema = schema.max(maxLength, `Text is too long (max ${maxLength} characters)`);
  }
  
  return schema.refine(
    (text) => !/<script|<iframe|javascript:|data:/i.test(text),
    'Content contains potentially unsafe elements'
  );
};

const safeTextSchema = createSafeTextSchema();

const createSafeLongTextSchema = (maxLength = 5000) => {
  return z.string()
    .trim()
    .max(maxLength, `Text is too long (max ${maxLength} characters)`)
    .refine(
      (text) => !/<script|<iframe|javascript:|data:/i.test(text),
      'Content contains potentially unsafe elements'
    );
};

const safeLongTextSchema = createSafeLongTextSchema();

// Study Sessions
export const studySessionSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(), // Will be set server-side
  session_type: z.enum(['focus', 'review', 'practice', 'lecture', 'break'], {
    errorMap: () => ({ message: 'Invalid session type' })
  }),
  subject: createSafeTextSchema(100).optional(),
  duration_minutes: z.number()
    .int('Duration must be a whole number')
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration cannot exceed 8 hours'),
  completed_at: z.date().optional().default(() => new Date()),
  notes: safeLongTextSchema.optional(),
  focus_score: z.number()
    .int('Focus score must be a whole number')
    .min(0, 'Focus score cannot be negative')
    .max(100, 'Focus score cannot exceed 100')
    .optional(),
  interruptions: nonNegativeIntegerSchema.optional().default(0),
});

export const studySessionUpdateSchema = studySessionSchema.partial();

// Tasks
export const taskSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  title: nonEmptyStringSchema.max(200, 'Title too long'),
  description: createSafeLongTextSchema(1000).optional(),
  subject: createSafeTextSchema(100).optional(),
  due_date: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Priority must be low, medium, or high' })
  }).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed'], {
    errorMap: () => ({ message: 'Invalid status' })
  }).default('pending'),
  estimated_time: z.number()
    .int('Estimated time must be a whole number')
    .min(1, 'Estimated time must be at least 1 minute')
    .max(1440, 'Estimated time cannot exceed 24 hours')
    .optional(),
  actual_time: nonNegativeIntegerSchema.default(0),
});

export const taskUpdateSchema = taskSchema.partial();

export const taskBulkUpdateSchema = z.array(
  z.object({
    id: uuidSchema,
    updates: taskUpdateSchema
  })
).max(50, 'Cannot update more than 50 tasks at once');

// Flashcards
export const flashcardSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  front_text: nonEmptyStringSchema
    .max(500, 'Front text too long')
    .refine(
      (text) => text.trim().length >= 3,
      'Front text must be at least 3 characters'
    ),
  back_text: nonEmptyStringSchema
    .max(1000, 'Back text too long')
    .refine(
      (text) => text.trim().length >= 3,
      'Back text must be at least 3 characters'
    ),
  subject: createSafeTextSchema(100).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard'], {
    errorMap: () => ({ message: 'Difficulty must be easy, medium, or hard' })
  }).default('medium'),
  tags: z.array(
    createSafeTextSchema(50)
  ).max(10, 'Too many tags (max 10)').optional(),
  review_count: nonNegativeIntegerSchema.default(0),
  correct_count: nonNegativeIntegerSchema.default(0),
  current_streak: nonNegativeIntegerSchema.default(0),
  next_review_date: z.date().optional(),
});

export const flashcardUpdateSchema = flashcardSchema.partial();

export const flashcardReviewSchema = z.object({
  flashcard_id: uuidSchema,
  quality: z.number()
    .int('Quality must be a whole number')
    .min(0, 'Quality cannot be less than 0')
    .max(5, 'Quality cannot be greater than 5'),
});

// Subjects
export const subjectSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  name: nonEmptyStringSchema
    .max(100, 'Subject name too long')
    .refine(
      (name) => /^[a-zA-Z0-9\s\-_&.]+$/.test(name),
      'Subject name contains invalid characters'
    ),
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #FF5733)')
    .default('#3B82F6'),
  description: createSafeLongTextSchema(500).optional(),
  credits: z.number()
    .int('Credits must be a whole number')
    .min(0, 'Credits cannot be negative')
    .max(10, 'Credits cannot exceed 10')
    .optional(),
  is_active: z.boolean().default(true),
});

export const subjectUpdateSchema = subjectSchema.partial();

// Study Goals
export const studyGoalSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  title: nonEmptyStringSchema.max(200, 'Title too long'),
  description: createSafeLongTextSchema(1000).optional(),
  target_value: positiveIntegerSchema,
  current_value: nonNegativeIntegerSchema.default(0),
  unit: z.enum(['minutes', 'hours', 'sessions', 'flashcards'], {
    errorMap: () => ({ message: 'Invalid unit type' })
  }).default('minutes'),
  deadline: z.date().optional(),
  status: z.enum(['active', 'completed', 'paused'], {
    errorMap: () => ({ message: 'Invalid status' })
  }).default('active'),
});

export const studyGoalUpdateSchema = studyGoalSchema.partial();

export const goalProgressUpdateSchema = z.object({
  id: uuidSchema,
  progress: nonNegativeIntegerSchema,
});

// Timetable Entries
const timetableEntryBaseSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  subject_name: nonEmptyStringSchema.max(100, 'Subject name too long'),
  day_of_week: z.number()
    .int('Day must be a whole number')
    .min(0, 'Day must be 0 (Sunday) to 6 (Saturday)')
    .max(6, 'Day must be 0 (Sunday) to 6 (Saturday)'),
  start_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Start time must be in HH:MM format'),
  end_time: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'End time must be in HH:MM format'),
  room: createSafeTextSchema(50).optional(),
  instructor: createSafeTextSchema(100).optional(),
  notes: createSafeLongTextSchema(2000).optional(),
  is_recurring: z.boolean().default(true),
});

export const timetableEntrySchema = timetableEntryBaseSchema.refine(
  (data) => {
    // Validate that end time is after start time
    const [startHour, startMin] = data.start_time.split(':').map(Number);
    const [endHour, endMin] = data.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  },
  {
    message: 'End time must be after start time',
    path: ['end_time']
  }
);

export const timetableEntryUpdateSchema = timetableEntryBaseSchema.partial();

// Notifications
export const notificationSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  title: nonEmptyStringSchema.max(100, 'Title too long'),
  message: nonEmptyStringSchema.max(500, 'Message too long'),
  type: z.enum(['info', 'success', 'warning', 'error'], {
    errorMap: () => ({ message: 'Invalid notification type' })
  }).default('info'),
  priority: z.enum(['low', 'normal', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Invalid priority level' })
  }).default('normal'),
  action_url: z.string()
    .url('Invalid URL format')
    .max(500, 'URL too long')
    .optional(),
  action_text: createSafeTextSchema(50).optional(),
  expires_at: z.date().optional(),
});

export const notificationUpdateSchema = z.object({
  is_read: z.boolean()
});

// User Settings
export const userSettingsSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(false),
  dark_mode: z.boolean().default(false),
  timezone: z.string()
    .max(50, 'Timezone string too long')
    .default('UTC'),
  language: z.string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code')
    .default('en'),
  session_reminders: z.boolean().default(true),
  break_reminders: z.boolean().default(true),
  daily_goal_reminders: z.boolean().default(true),
  week_start_day: z.number()
    .int('Week start day must be a whole number')
    .min(0, 'Week start day must be 0-6')
    .max(6, 'Week start day must be 0-6')
    .default(1),
  pomodoro_work_duration: z.number()
    .int('Work duration must be a whole number')
    .min(15, 'Work duration must be at least 15 minutes')
    .max(120, 'Work duration cannot exceed 2 hours')
    .default(25),
  pomodoro_short_break: z.number()
    .int('Short break must be a whole number')
    .min(3, 'Short break must be at least 3 minutes')
    .max(30, 'Short break cannot exceed 30 minutes')
    .default(5),
  pomodoro_long_break: z.number()
    .int('Long break must be a whole number')
    .min(10, 'Long break must be at least 10 minutes')
    .max(60, 'Long break cannot exceed 1 hour')
    .default(15),
  pomodoro_sessions_until_long_break: z.number()
    .int('Sessions until long break must be a whole number')
    .min(2, 'Must be at least 2 sessions')
    .max(8, 'Cannot exceed 8 sessions')
    .default(4),
});

export const userSettingsUpdateSchema = userSettingsSchema.partial();

// Profile
export const profileSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  display_name: z.string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name too long')
    .regex(/^[a-zA-Z0-9\s_-]+$/, 'Display name contains invalid characters')
    .refine(
      (text) => !/<script|<iframe|javascript:|data:/i.test(text),
      'Display name contains potentially unsafe elements'
    )
    .optional(),
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .max(500, 'Avatar URL too long')
    .optional(),
  study_streak: nonNegativeIntegerSchema.default(0),
  total_study_time: nonNegativeIntegerSchema.default(0),
  preferred_session_length: z.number()
    .int('Session length must be a whole number')
    .min(15, 'Session length must be at least 15 minutes')
    .max(240, 'Session length cannot exceed 4 hours')
    .default(25),
});

export const profileUpdateSchema = profileSchema.partial();

// AI API Request Validation
export const aiRecommendationsRequestSchema = z.object({
  studyData: z.object({
    totalHours: z.number().min(0),
    sessionsCompleted: nonNegativeIntegerSchema,
    averageSessionLength: z.number().min(0),
    focusScore: z.number().min(0).max(100),
    streakDays: nonNegativeIntegerSchema,
  }),
  subjects: z.array(
    z.object({
      name: z.string(),
      hours: z.number().min(0),
      performance: z.number().min(0).max(100),
    })
  ),
  goals: z.array(
    z.object({
      subject: z.string(),
      target_hours: z.number().min(0),
      current_hours: z.number().min(0),
    })
  ),
  timePreferences: z.object({
    preferredStudyTimes: z.array(z.string()),
    sessionLength: z.number().min(15).max(240),
    breakPreference: z.string(),
  }),
  currentPerformance: z.object({
    overall_efficiency: z.number().min(0).max(100),
    focus_quality: z.number().min(0).max(100),
    consistency_score: z.number().min(0).max(100),
  }),
});

// Pagination and Query Parameters
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export const dateRangeSchema = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate']
  }
);

// Utility functions for validation
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): T => {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation failed: ${formattedError}`);
    }
    throw error;
  }
};

export const validatePartialData = <T>(schema: z.ZodSchema<T>, data: unknown): Partial<T> => {
  try {
    // Create a partial version of the schema
    const partialSchema = schema instanceof z.ZodObject 
      ? schema.partial() 
      : schema;
    return partialSchema.parse(data) as Partial<T>;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedError = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Validation failed: ${formattedError}`);
    }
    throw error;
  }
};

// Export all schemas as a collection for easier imports
export const schemas = {
  studySession: studySessionSchema,
  studySessionUpdate: studySessionUpdateSchema,
  task: taskSchema,
  taskUpdate: taskUpdateSchema,
  taskBulkUpdate: taskBulkUpdateSchema,
  flashcard: flashcardSchema,
  flashcardUpdate: flashcardUpdateSchema,
  flashcardReview: flashcardReviewSchema,
  subject: subjectSchema,
  subjectUpdate: subjectUpdateSchema,
  studyGoal: studyGoalSchema,
  studyGoalUpdate: studyGoalUpdateSchema,
  goalProgressUpdate: goalProgressUpdateSchema,
  timetableEntry: timetableEntrySchema,
  timetableEntryUpdate: timetableEntryUpdateSchema,
  notification: notificationSchema,
  notificationUpdate: notificationUpdateSchema,
  userSettings: userSettingsSchema,
  userSettingsUpdate: userSettingsUpdateSchema,
  profile: profileSchema,
  profileUpdate: profileUpdateSchema,
  aiRecommendationsRequest: aiRecommendationsRequestSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
};