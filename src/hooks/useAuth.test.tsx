import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides authentication context', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('signIn');
    expect(result.current).toHaveProperty('signUp');
    expect(result.current).toHaveProperty('signOut');
    expect(result.current).toHaveProperty('signInWithGoogle');
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
  });

  it('handles sign in', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: mockUser, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'password');
      expect(response.error).toBeNull();
    });

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    });
  });

  it('handles sign up', async () => {
    const mockUser = { id: '123', email: 'new@example.com' };
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      const response = await result.current.signUp('new@example.com', 'password');
      expect(response.error).toBeNull();
    });

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password',
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
  });

  it('handles sign out', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signOut();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('handles authentication errors', async () => {
    const mockError = { message: 'Invalid credentials' };
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      const response = await result.current.signIn('test@example.com', 'wrong');
      expect(response.error).toEqual(mockError);
    });
  });

  it('listens to auth state changes', async () => {
    const mockUser = { id: '123', email: 'test@example.com' };
    const mockCallback = vi.fn();
    
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      mockCallback.mockImplementation(callback);
      // Simulate auth state change
      callback('SIGNED_IN', { user: mockUser });
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await waitFor(() => {
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  it('handles email confirmation requirement', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      await result.current.signUp('new@example.com', 'password');
    });

    expect(result.current.needsEmailConfirmation).toBe(true);
  });

  it('handles password reset', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValue({
      data: {},
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    
    await act(async () => {
      const response = await result.current.resetPassword('test@example.com');
      expect(response.success).toBe(true);
    });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: `${window.location.origin}/auth?reset=true` }
    );
  });
});