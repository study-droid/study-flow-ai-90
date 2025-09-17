import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// import { ambientAudioService } from '@/services/ambientAudioService';
// import { authRateLimiter } from '@/lib/rate-limiter';
// import { SecureLogger } from '@/lib/secure-logger';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  needsEmailConfirmation: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Check rate limit before attempting login
      const rateLimitCheck = await authRateLimiter.checkLimit(email, 'login');
      
      if (!rateLimitCheck.allowed) {
        const waitMinutes = Math.ceil((rateLimitCheck.waitTime || 60) / 60);
        toast({
          title: "Too many login attempts",
          description: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`,
          variant: "destructive",
        });
        return { error: `Rate limited. Wait ${waitMinutes} minutes.` };
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record failed login attempt
        const failureResult = await authRateLimiter.recordFailure(email, 'login');
        
        if (failureResult.shouldLockAccount) {
          // Log potential account compromise
          SecureLogger.warn('Multiple failed login attempts detected', {
            email: email,
            action: 'potential_account_lock'
          });
        }
        
        if (error.message.includes('Email not confirmed')) {
          setNeedsEmailConfirmation(true);
          toast({
            title: "Email not confirmed",
            description: "Please check your email and click the confirmation link before signing in.",
            variant: "destructive",
          });
        } else {
          const attemptsStatus = authRateLimiter.getStatus(email, 'login');
          const remainingAttempts = Math.max(0, 5 - attemptsStatus.attempts);
          
          toast({
            title: "Sign in failed",
            description: remainingAttempts > 0 
              ? `${error.message} (${remainingAttempts} attempts remaining)`
              : error.message,
            variant: "destructive",
          });
        }
      } else {
        // Reset rate limit on successful login
        authRateLimiter.recordSuccess(email, 'login');
        setNeedsEmailConfirmation(false);
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }

      return { error };
    } catch (error: unknown) {
      toast({
        title: "Sign in failed",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      // Check rate limit for signup
      const rateLimitCheck = await authRateLimiter.checkLimit(email, 'signup');
      
      if (!rateLimitCheck.allowed) {
        const waitMinutes = Math.ceil((rateLimitCheck.waitTime || 60) / 60);
        toast({
          title: "Too many signup attempts",
          description: `Please wait ${waitMinutes} minute${waitMinutes > 1 ? 's' : ''} before trying again.`,
          variant: "destructive",
        });
        return { error: `Rate limited. Wait ${waitMinutes} minutes.` };
      }
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });

      if (error) {
        // Record failed signup attempt
        await authRateLimiter.recordFailure(email, 'signup');
        
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account exists",
            description: "An account with this email already exists. Try signing in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        // Reset rate limit on successful signup
        authRateLimiter.recordSuccess(email, 'signup');
        setNeedsEmailConfirmation(true);
        toast({
          title: "Account created!",
          description: "Please check your email and click the confirmation link within 10 minutes to activate your account.",
        });
      }

      return { error: error?.message };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Sign up failed",
        description: message,
        variant: "destructive",
      });
      return { error: message };
    }
  };

  const resendConfirmation = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        toast({
          title: "Failed to resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email sent!",
          description: "A new confirmation email has been sent to your inbox.",
        });
      }

      return { error };
    } catch (error: unknown) {
      toast({
        title: "Failed to resend",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }

      return { error: error?.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Google sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      // Stop all ambient sounds before signing out
      ambientAudioService.stopAllSounds();
      
      await supabase.auth.signOut();
      setNeedsEmailConfirmation(false);
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Sign out failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
        return { error: error.message };
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions.",
      });

      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast({
        title: "Password reset failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error: errorMessage };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      needsEmailConfirmation,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      resendConfirmation,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};