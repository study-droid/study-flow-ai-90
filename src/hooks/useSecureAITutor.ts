/**
 * React Hook for Secure AI Tutor
 * Uses Supabase Edge Functions with automatic fallback
 */

import { useState, useCallback, useEffect } from 'react';
import { secureAITutor } from '@/services/ai-tutor-secure';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/services/logging/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TutorSession {
  id: string;
  subject: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  aiProvider: 'openai' | 'gemini' | 'claude';
}

interface UseSecureAITutorReturn {
  currentSession: TutorSession | null;
  sessions: TutorSession[];
  isLoading: boolean;
  error: string | null;
  provider: 'openai' | 'gemini' | 'claude';
  createSession: (subject: string, provider?: 'openai' | 'gemini' | 'claude') => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  loadSessions: () => Promise<void>;
  clearSessions: () => void;
  setProvider: (provider: 'openai' | 'gemini' | 'claude') => void;
}

export function useSecureAITutor(): UseSecureAITutorReturn {
  const [currentSession, setCurrentSession] = useState<TutorSession | null>(null);
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude'>('openai');
  const { toast } = useToast();

  // Load existing sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      const loadedSessions = await secureAITutor.loadSessions();
      setSessions(loadedSessions);
      if (loadedSessions.length > 0 && !currentSession) {
        setCurrentSession(loadedSessions[0]);
      }
    } catch (err) {
      logger.error('Error loading sessions:', err, 'UseSecureAITutor');
      setError('Failed to load previous sessions');
    } finally {
      setIsLoading(false);
    }
  }, [currentSession]);

  const createSession = useCallback(async (
    subject: string,
    customProvider?: 'openai' | 'gemini' | 'claude'
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const session = await secureAITutor.createSession(
        subject,
        customProvider || provider
      );
      
      setCurrentSession(session);
      setSessions(prev => [session, ...prev]);
      
      toast({
        title: 'Session Created',
        description: `New ${session.aiProvider} tutoring session for ${subject}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [provider, toast]);

  const sendMessage = useCallback(async (message: string) => {
    if (!currentSession) {
      setError('No active session. Please create a session first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await secureAITutor.sendMessage(
        currentSession.id,
        message,
        provider
      );
      
      // Update current session with new messages
      const updatedSession = secureAITutor.getSession(currentSession.id);
      if (updatedSession) {
        setCurrentSession(updatedSession);
        setSessions(prev => 
          prev.map(s => s.id === updatedSession.id ? updatedSession : s)
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Check if it's an API key configuration error
      if (errorMessage.includes('API key not configured')) {
        toast({
          title: 'API Key Not Configured',
          description: 'Please configure your OpenAI API key in Supabase secrets.',
          variant: 'destructive',
          action: (
            <div className="text-xs">
              <p>1. Go to Supabase Dashboard → Settings → Secrets</p>
              <p>2. Add secret: OPEN_AI_KEY = your-api-key</p>
              <p>3. Optional: Add fallback OPEN_AI_KEY_QWEN</p>
            </div>
          ),
        });
      } else if (errorMessage.includes('primary and fallback keys failed')) {
        toast({
          title: 'Both API Keys Failed',
          description: 'Primary and fallback OpenAI keys are invalid or exhausted.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentSession, provider, toast]);

  const clearSessions = useCallback(() => {
    secureAITutor.clearSessions();
    setSessions([]);
    setCurrentSession(null);
  }, []);

  const handleSetProvider = useCallback((newProvider: 'openai' | 'gemini' | 'claude') => {
    setProvider(newProvider);
    secureAITutor.setDefaultProvider(newProvider);
    toast({
      title: 'Provider Changed',
      description: `AI provider changed to ${newProvider}`,
    });
  }, [toast]);

  return {
    currentSession,
    sessions,
    isLoading,
    error,
    provider,
    createSession,
    sendMessage,
    loadSessions,
    clearSessions,
    setProvider: handleSetProvider,
  };
}