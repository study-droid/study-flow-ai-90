/**
 * Main AI Tutor hook - Clean Version
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useAITutorStore } from '../store/ai-tutor.store';
import { AITutorService } from '../services/ai-tutor.service';
import { AITutorRepository } from '../services/ai-tutor.repo';
import type { ChatSession, ChatMessage, ChatEvent } from '../types';
import { generateId } from '@/shared/utils';
import { useAuth } from '@/hooks/useAuth';

const aiTutorService = new AITutorService();
const aiTutorRepo = new AITutorRepository();

export function useAITutor() {
  const auth = useAuth();
  const {
    currentSession,
    sessions,
    isLoading,
    isThinking,
    error,
    settings,
    thinkingState,
    // Actions
    setCurrentSession,
    addSession,
    updateSession,
    removeSession,
    addMessage,
    updateMessage,
    setSessions,
    setLoading,
    setThinking,
    setError,
    setThinkingState,
    resetCurrentSession,
  } = useAITutorStore();

  /**
   * Create a new chat session
   */
  const createNewSession = useCallback((title?: string) => {
    const { user } = auth;
    if (user) {
      // Persist to Supabase
      return aiTutorRepo
        .createSession(user.id, { title, provider: settings.model, subject: 'General' })
        .then((session) => {
          addSession(session);
          return session;
        })
        .catch(() => {
          // Fallback to local session on failure
          const s = aiTutorService.createSession(title);
          addSession(s);
          return s;
        });
    } else {
      const session = aiTutorService.createSession(title);
      addSession(session);
      return session;
    }
  }, [addSession, settings.model]);

  /**
   * Switch to a different session
   */
  const switchToSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSession(session);
    }
  }, [sessions, setCurrentSession]);

  /**
   * Delete a session
   */
  const deleteSession = useCallback((sessionId: string) => {
    const { user } = auth;
    removeSession(sessionId);
    if (user) {
      aiTutorRepo.deleteSession(sessionId).catch(() => {
        // No-op: optimistic removal; errors can be surfaced via setError if desired
      });
    }
  }, [removeSession]);

  /**
   * Send a message to the AI tutor
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession) {
      throw new Error('No active session');
    }

    try {
      setError(null);
      setLoading(true);

      // Build history BEFORE adding current user message
      const history = currentSession.messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt as unknown as string | Date).getTime(),
      }));

      // Create user message
      let userMessage: ChatMessage = aiTutorService.createMessage('user', content, currentSession.id);
      
      // Persist user message if authenticated
      if (auth.user) {
        try {
          const saved = await aiTutorRepo.insertMessage(currentSession.id, {
            role: 'user',
            content,
            sessionId: currentSession.id,
            metadata: {},
            createdAt: new Date(),
          } as any);
          userMessage = saved;
        } catch {
          // Fallback to local message on database failure
        }
      }
      addMessage(currentSession.id, userMessage);

      // Update session title if this is the first message
      if (currentSession.messages.length === 0) {
        const title = aiTutorService.generateSessionTitle(content);
        updateSession(currentSession.id, { title });
        // Persist title to session metadata
        if (auth.user) {
          aiTutorRepo.touchSession(currentSession.id, { metadata: { ...(currentSession.metadata || {}), title } })
            .catch(() => {});
        }
      }

      // Create placeholder assistant message
      let assistantMessage = aiTutorService.createMessage('assistant', '', currentSession.id);
      
      // Use a mutable reference to track the current message ID
      const messageIdRef = { current: assistantMessage.id };
      
      if (auth.user) {
        try {
          const saved = await aiTutorRepo.insertMessage(currentSession.id, {
            role: 'assistant',
            content: '',
            sessionId: currentSession.id,
            metadata: {},
            createdAt: new Date(),
          } as any);
          // Update both the message and the reference
          assistantMessage.id = saved.id;
          assistantMessage.createdAt = saved.createdAt;
          assistantMessage.updatedAt = saved.updatedAt;
          messageIdRef.current = saved.id;
        } catch {
          // Fallback to local message on database failure
        }
      }
      addMessage(currentSession.id, assistantMessage);

      // Handle streaming events
      const handleEvent = (event: ChatEvent) => {
        console.log('📨 AI Tutor Hook: Received event', {
          type: event.type,
          sessionId: event.sessionId,
          data: event.data,
          hasContent: event.data?.content ? !!event.data.content : false,
          contentLength: event.data?.content?.length || 0
        });
        
        switch (event.type) {
          case 'thinking_start':
            console.log('🧠 Starting thinking state', { stage: event.data.stage });
            setThinking(true);
            setThinkingState({
              isVisible: true,
              content: event.data.reasoning || 'Analyzing your question...',
              stage: event.data.stage || 'analyzing',
            });
            break;

          case 'thinking_delta':
            console.log('🔄 Updating thinking state', { stage: event.data.stage });
            setThinking(true);
            setThinkingState({
              isVisible: true,
              content: event.data.reasoning || 'Processing your request...',
              stage: event.data.stage || 'reasoning',
            });
            break;

          case 'thinking_stop':
            console.log('⏹️ Stopping thinking state');
            setThinking(false);
            setThinkingState({
              isVisible: false,
              content: '',
            });
            break;

          case 'message_delta':
            updateMessage(currentSession.id, messageIdRef.current, {
              content: event.data.fullContent,
            });
            break;

          case 'message_stop':
            console.log('💾 AI Tutor Hook: Updating message with content', {
              sessionId: currentSession.id,
              messageId: messageIdRef.current,
              hasContent: !!event.data.content,
              contentLength: event.data.content?.length || 0,
              contentPreview: event.data.content ? event.data.content.substring(0, 100) + (event.data.content.length > 100 ? '...' : '') : 'No content'
            });
            
            updateMessage(currentSession.id, messageIdRef.current, {
              content: event.data.content,
              metadata: event.data.metadata,
            });
            // Persist final assistant content and touch session
            if (auth.user) {
              aiTutorRepo.updateAssistantMessageContent(messageIdRef.current, event.data.content, event.data.metadata)
                .then(() => aiTutorRepo.touchSession(currentSession.id))
                .catch(() => {});
            }
            setLoading(false);
            break;

          case 'error':
            setError(event.data.error);
            setLoading(false);
            setThinking(false);
            break;
        }
      };

      // Send message to service
      await aiTutorService.sendMessage(content, currentSession.id, {
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        mode: 'chat', // DeepSeek v3.1 non-thinking mode
        history,
        onEvent: handleEvent,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setError(errorMessage);
      setLoading(false);
      setThinking(false);
    }
  }, [
    currentSession,
    settings,
    auth,
    setError,
    setLoading,
    setThinking,
    setThinkingState,
    addMessage,
    updateMessage,
    updateSession,
  ]);

  /**
   * Clear current session messages
   */
  const clearSession = useCallback(() => {
    if (currentSession) {
      resetCurrentSession();
    }
  }, [currentSession, resetCurrentSession]);

  /**
   * Export current session
   */
  const exportSession = useCallback((format: 'json' | 'txt' | 'md' = 'json') => {
    if (!currentSession) {
      throw new Error('No active session to export');
    }
    return aiTutorService.exportSession(currentSession, format);
  }, [currentSession]);

  /**
   * Search sessions
   */
  const searchSessions = useCallback((query: string) => {
    return aiTutorService.searchSessions(sessions, query);
  }, [sessions]);

  /**
   * Get session statistics
   */
  const getSessionStats = useCallback(() => {
    if (!currentSession) return null;
    return aiTutorService.getSessionStats(currentSession);
  }, [currentSession]);

  /**
   * Retry last message
   */
  const retryLastMessage = useCallback(async () => {
    if (!currentSession || currentSession.messages.length < 2) {
      throw new Error('No message to retry');
    }

    const lastUserMessage = [...currentSession.messages]
      .reverse()
      .find(m => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message found');
    }

    // Remove the last assistant message if it exists
    const lastMessage = currentSession.messages[currentSession.messages.length - 1];
    if (lastMessage.role === 'assistant') {
      // Remove last message logic would need to be implemented in the store
    }

    await sendMessage(lastUserMessage.content);
  }, [currentSession, sendMessage]);

  // Memoized session list sorted by update time
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [sessions]);

  // Initialize circuit breaker and create session if needed
  useEffect(() => {
    // Reset circuit breakers on hook initialization to clear any stale OPEN states
    import('@/services/reliability/circuit-breaker').then(({ circuitBreakerManager }) => {
      const healthSummary = circuitBreakerManager.getHealthSummary();
      if (healthSummary.failed > 0) {
        console.log('🔧 AI Tutor Hook: Resetting failing circuit breakers on initialization', {
          failedCount: healthSummary.failed,
          totalCount: healthSummary.total
        });
        circuitBreakerManager.resetFailingCircuits();
      }
    });

    if (sessions.length === 0) {
      // Try hydrate from Supabase if logged in
      if (auth.user) {
        aiTutorRepo
          .listSessionsWithMessages(auth.user.id)
          .then((remote) => {
            if (remote.length > 0) {
              setSessions(remote);
              setCurrentSession(remote[0]);
            } else {
              createNewSession();
            }
          })
          .catch(() => createNewSession());
      } else {
        createNewSession();
      }
    }
  }, [sessions.length, createNewSession, auth.user, setSessions, setCurrentSession]);

  return {
    // State
    currentSession,
    sessions: sortedSessions,
    isLoading,
    isThinking,
    error,
    settings,
    thinkingState,
    
    // Actions
    createNewSession,
    switchToSession,
    deleteSession,
    sendMessage,
    clearSession,
    exportSession,
    searchSessions,
    getSessionStats,
    retryLastMessage,
    updateSession, // expose for UI tweaks like rename
    renameSession: useCallback(async (sessionId: string, title: string) => {
      updateSession(sessionId, { title });
      if (auth.user) {
        try {
          await aiTutorRepo.touchSession(sessionId, { metadata: { title } });
        } catch {
          // Swallow; UI already updated optimistically
        }
      }
    }, [auth.user, updateSession]),
    
    // Computed
    hasActiveSessions: sessions.length > 0,
    canSendMessage: !!currentSession && !isLoading,
  };
}