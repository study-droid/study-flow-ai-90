/**
 * Authentication and user-related types
 */

import { BaseEntity } from './common';

export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  subscription: SubscriptionTier;
  profile: UserProfile;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  timezone: string;
  language: string;
  studyGoals: string[];
  academicLevel: AcademicLevel;
  subjects: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  studyReminders: boolean;
  emailNotifications: boolean;
  soundEnabled: boolean;
  pomodoroEnabled: boolean;
  defaultStudyDuration: number;
  defaultBreakDuration: number;
}

export type SubscriptionTier = 'free' | 'premium' | 'enterprise';

export type AcademicLevel = 
  | 'elementary'
  | 'middle_school'
  | 'high_school'
  | 'undergraduate'
  | 'graduate'
  | 'professional';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  acceptedTerms: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  user: User;
}