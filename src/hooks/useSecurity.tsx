import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { rateLimit, isSessionExpired, updateLastActivity, createAuditLog } from '@/lib/security';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface SecurityContextType {
  checkRateLimit: (action: string, limit?: number, windowMs?: number) => boolean;
  logSecurityEvent: (event: string, details?: Record<string, unknown>) => void;
  isActionAllowed: (action: string) => boolean;
  sessionStatus: 'active' | 'idle' | 'expired';
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionStatus, setSessionStatus] = useState<'active' | 'idle' | 'expired'>('active');

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      updateLastActivity();
      setSessionStatus('active');
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Check session status periodically
  useEffect(() => {
    const checkSessionStatus = () => {
      if (isSessionExpired()) {
        setSessionStatus('expired');
        toast({
          title: "Session Expired",
          description: "Please refresh the page to continue.",
          variant: "destructive",
        });
      }
    };

    const interval = setInterval(checkSessionStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [toast]);

  const checkRateLimit = (
    action: string, 
    limit: number = 100, 
    windowMs: number = 15 * 60 * 1000
  ): boolean => {
    const userId = user?.id || 'anonymous';
    const key = `${userId}:${action}`;
    const result = rateLimit(key, limit, windowMs);
    
    if (!result.allowed) {
      logSecurityEvent('rate_limit_exceeded', { action, userId });
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many requests. Please try again later.",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  const logSecurityEvent = (event: string, details: Record<string, unknown> = {}) => {
    createAuditLog(event, {
      userId: user?.id,
      timestamp: new Date().toISOString(),
      ...details,
    });
  };

  const isActionAllowed = (action: string): boolean => {
    // Check if user is authenticated for protected actions
    const protectedActions = ['create', 'update', 'delete'];
    if (protectedActions.some(pa => action.includes(pa)) && !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to perform this action.",
        variant: "destructive",
      });
      return false;
    }

    // Check session status
    if (sessionStatus === 'expired') {
      toast({
        title: "Session Expired",
        description: "Please refresh the page to continue.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const value: SecurityContextType = {
    checkRateLimit,
    logSecurityEvent,
    isActionAllowed,
    sessionStatus,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};