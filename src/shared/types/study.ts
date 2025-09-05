/**
 * Study and learning-related types
 */

import { BaseEntity } from './common';

export interface Subject extends BaseEntity {
  name: string;
  color: string;
  icon?: string;
  description?: string;
  userId: string;
}

export interface StudySession extends BaseEntity {
  userId: string;
  subjectId: string;
  title: string;
  description?: string;
  duration: number; // minutes
  startedAt: Date;
  completedAt?: Date;
  status: StudySessionStatus;
  type: StudySessionType;
  metadata: StudySessionMetadata;
}

export type StudySessionStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

export type StudySessionType = 
  | 'focus'
  | 'review'
  | 'practice'
  | 'reading'
  | 'writing'
  | 'problem_solving'
  | 'memorization';

export interface StudySessionMetadata {
  pomodoroCount?: number;
  breaksTaken?: number;
  distractions?: number;
  focusScore?: number;
  notes?: string;
  achievements?: string[];
}

export interface Task extends BaseEntity {
  title: string;
  description?: string;
  subjectId: string;
  userId: string;
  dueDate?: Date;
  priority: TaskPriority;
  status: TaskStatus;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  tags: string[];
  attachments?: TaskAttachment[];
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

export interface StudyGoal extends BaseEntity {
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: StudyGoalUnit;
  deadline?: Date;
  userId: string;
  subjectId?: string;
  status: GoalStatus;
  type: StudyGoalType;
}

export type StudyGoalUnit = 'hours' | 'sessions' | 'pages' | 'chapters' | 'problems' | 'custom';

export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';

export type StudyGoalType = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface StudyStats {
  totalStudyTime: number; // minutes
  sessionsCompleted: number;
  currentStreak: number;
  longestStreak: number;
  averageFocusScore: number;
  subjectBreakdown: SubjectStats[];
  weeklyProgress: DailyStats[];
}

export interface SubjectStats {
  subjectId: string;
  subjectName: string;
  totalTime: number;
  sessionCount: number;
  averageFocusScore: number;
}

export interface DailyStats {
  date: Date;
  studyTime: number;
  sessionCount: number;
  focusScore: number;
}