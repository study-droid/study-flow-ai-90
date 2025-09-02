/**
 * Authentication Flow Integration Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { supabase } from '@/integrations/supabase/client';
import Auth from '@/pages/Auth';

// Mock Supabase auth
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
  },
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Authentication Flow', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Default to no user logged in
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: null },
      error: null,
    });
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  describe('Sign In Flow', () => {
    it('should display sign in form by default', () => {
      render(<Auth />);
      
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should sign in with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      render(<Auth />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    it('should show error on invalid credentials', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      render(<Auth />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'wrong@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
      });
    });

    it('should validate email format', async () => {
      render(<Auth />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'password123');
      await user.click(signInButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });

      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });
  });

  describe('Sign Up Flow', () => {
    it('should switch to sign up form', async () => {
      render(<Auth />);
      
      const signUpLink = screen.getByText(/don't have an account/i).parentElement;
      const switchButton = signUpLink?.querySelector('button');
      
      await user.click(switchButton!);

      expect(screen.getByText(/create your account/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    });

    it('should sign up with valid information', async () => {
      const mockUser = {
        id: 'new-user-123',
        email: 'newuser@example.com',
      };

      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: { access_token: 'token' } },
        error: null,
      });

      render(<Auth />);
      
      // Switch to sign up
      const signUpLink = screen.getByText(/don't have an account/i).parentElement;
      const switchButton = signUpLink?.querySelector('button');
      await user.click(switchButton!);

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'newuser@example.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.click(signUpButton);

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should validate password strength', async () => {
      render(<Auth />);
      
      // Switch to sign up
      const signUpLink = screen.getByText(/don't have an account/i).parentElement;
      const switchButton = signUpLink?.querySelector('button');
      await user.click(switchButton!);

      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signUpButton = screen.getByRole('button', { name: /sign up/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123'); // Weak password
      await user.click(signUpButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least/i)).toBeInTheDocument();
      });

      expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });
  });

  describe('OAuth Sign In', () => {
    it('should sign in with Google', async () => {
      (supabase.auth.signInWithOAuth as any).mockResolvedValue({
        data: { url: 'https://accounts.google.com/oauth' },
        error: null,
      });

      render(<Auth />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining(window.location.origin),
        },
      });
    });

    it('should handle OAuth errors', async () => {
      (supabase.auth.signInWithOAuth as any).mockResolvedValue({
        data: null,
        error: { message: 'OAuth provider error' },
      });

      render(<Auth />);
      
      const googleButton = screen.getByRole('button', { name: /continue with google/i });
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/oauth provider error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Protected Route Behavior', () => {
    it('should redirect to home if already authenticated', async () => {
      const mockUser = {
        id: 'existing-user',
        email: 'existing@example.com',
      };

      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: { access_token: 'token', user: mockUser } },
        error: null,
      });

      render(<Auth />);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('Form Interactions', () => {
    it('should show/hide password', async () => {
      render(<Auth />);
      
      const passwordInput = screen.getByPlaceholderText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Find and click the show/hide button
      const toggleButton = screen.getByRole('button', { name: /show password/i });
      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should disable form during submission', async () => {
      // Mock a slow response
      (supabase.auth.signInWithPassword as any).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: null },
          error: { message: 'Test error' },
        }), 100))
      );

      render(<Auth />);
      
      const emailInput = screen.getByPlaceholderText(/email/i);
      const passwordInput = screen.getByPlaceholderText(/password/i);
      const signInButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      
      // Start submission
      fireEvent.click(signInButton);

      // Check that form is disabled
      await waitFor(() => {
        expect(signInButton).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });

      // Wait for completion
      await waitFor(() => {
        expect(signInButton).not.toBeDisabled();
      });
    });
  });
});