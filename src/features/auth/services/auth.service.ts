/**
 * Authentication service
 */

import { supabase } from '@/integrations/supabase/client';
import type { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthSession 
} from '../types';
import { AppError, AuthenticationError } from '@/shared/utils/error';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError('Login failed');
      }

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
        user: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Login failed', 'LOGIN_ERROR', 500, true, { error });
    }
  }

  async register(data: RegisterData): Promise<AuthSession> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      });

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!authData.user || !authData.session) {
        throw new AuthenticationError('Registration failed');
      }

      return {
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
        expiresAt: new Date(authData.session.expires_at! * 1000),
        user: this.mapSupabaseUser(authData.user),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Registration failed', 'REGISTER_ERROR', 500, true, { error });
    }
  }

  async logout(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new AuthenticationError(error.message);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Logout failed', 'LOGOUT_ERROR', 500, true, { error });
    }
  }

  async refreshToken(): Promise<AuthSession> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        throw new AuthenticationError(error.message);
      }

      if (!data.user || !data.session) {
        throw new AuthenticationError('Token refresh failed');
      }

      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: new Date(data.session.expires_at! * 1000),
        user: this.mapSupabaseUser(data.user),
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Token refresh failed', 'REFRESH_ERROR', 500, true, { error });
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        throw new AuthenticationError(error.message);
      }

      return user ? this.mapSupabaseUser(user) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      return null;
    }
  }

  async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        throw new AppError(error.message, 'UPDATE_PROFILE_ERROR', 400);
      }

      return data as User;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Profile update failed', 'UPDATE_PROFILE_ERROR', 500, true, { error });
    }
  }

  private mapSupabaseUser(supabaseUser: any): User {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email,
      avatar: supabaseUser.user_metadata?.avatar_url,
      createdAt: new Date(supabaseUser.created_at),
      updatedAt: new Date(supabaseUser.updated_at || supabaseUser.created_at),
      preferences: {
        theme: 'system',
        studyReminders: true,
        emailNotifications: true,
        soundEnabled: true,
        pomodoroEnabled: true,
        defaultStudyDuration: 25,
        defaultBreakDuration: 5,
      },
      subscription: 'free',
      profile: {
        firstName: supabaseUser.user_metadata?.name?.split(' ')[0] || '',
        lastName: supabaseUser.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: 'en',
        studyGoals: [],
        academicLevel: 'undergraduate',
        subjects: [],
      },
    };
  }
}

// Export singleton instance
export const authService = new AuthService();