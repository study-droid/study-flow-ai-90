/**
 * Authentication hook
 */

import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { localStorage } from '@/shared/utils/storage';
import { reportError } from '@/shared/utils/error';
import type { 
  User, 
  AuthState, 
  LoginCredentials, 
  RegisterData, 
  AuthSession 
} from '../types';

const AUTH_STORAGE_KEY = 'auth_session';

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check for stored session
      const storedSession = localStorage.get<AuthSession>(AUTH_STORAGE_KEY);
      
      if (storedSession && storedSession.expiresAt > new Date()) {
        // Session exists and is valid
        const currentUser = await authService.getCurrentUser();
        
        if (currentUser) {
          setState({
            user: currentUser,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return;
        }
      }

      // Try to get current user from Supabase
      const currentUser = await authService.getCurrentUser();
      
      if (currentUser) {
        setState({
          user: currentUser,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
        localStorage.remove(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Auth initialization failed',
      });
      localStorage.remove(AUTH_STORAGE_KEY);
    }
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const session = await authService.login(credentials);
      
      // Store session
      localStorage.set(AUTH_STORAGE_KEY, session);

      setState({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      reportError(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const session = await authService.register(data);
      
      // Store session
      localStorage.set(AUTH_STORAGE_KEY, session);

      setState({
        user: session.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      reportError(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      await authService.logout();
      
      // Clear stored session
      localStorage.remove(AUTH_STORAGE_KEY);

      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      
      // Clear local state even if logout fails
      localStorage.remove(AUTH_STORAGE_KEY);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const session = await authService.refreshToken();
      
      // Update stored session
      localStorage.set(AUTH_STORAGE_KEY, session);

      setState(prev => ({
        ...prev,
        user: session.user,
        isAuthenticated: true,
        error: null,
      }));

      return session;
    } catch (error) {
      // If refresh fails, logout user
      await logout();
      throw error;
    }
  }, [logout]);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!state.user) {
      throw new Error('No authenticated user');
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const updatedUser = await authService.updateProfile(state.user.id, updates);
      
      setState(prev => ({
        ...prev,
        user: updatedUser,
        isLoading: false,
        error: null,
      }));

      return updatedUser;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Profile update failed';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      reportError(error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }, [state.user]);

  return {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    retry: initializeAuth,
  };
}