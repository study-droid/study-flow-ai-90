/**
 * Main AI Tutor hook - Clean Version
 */

import { useCallback, useEffect, useMemo } from 'react';
import { useAITutorStore } from '../store/ai-tutor.store';
import { aiTutorService } from '../services/ai-tutor.service';
import { AITutorRepository } from '../services/ai-tutor.repo';
import type { ChatSession, ChatMessage, ChatEvent } from '../types';
import { generateId } from '@/shared/utils';
import { useAuth } from '@/hooks/useAuth';
import { useErrorRecovery } from './useErrorRecovery';
import { useRequestQueue } from './useRequestQueue';
import { useOfflineMode } from '@/hooks/useOfflineMode';
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

  // Initialize error recovery system
  const errorRecovery = useErrorRecovery({
    maxRetries: 3,
    showToasts: true,
    autoRecover: true,
    onError: (classifiedError) => {
      setError(classifiedError.userMessage);
    },
    onRecovery: (result) => {
      if (result.success) {
        setError(null);
      }
    }
  });

  // Initialize request queue system
  const requestQueue = useRequestQueue({
    priority: 0,
    maxRetries: 3,
    onStatusChange: (status) => {
      // Update UI based on queue status if needed
      if (status.rateLimitActive && status.estimatedWaitTime > 5000) {
        // Show rate limit warning for long waits
        setError(`Rate limited. Please wait ${Math.ceil(status.estimatedWaitTime / 1000)} seconds.`);
      } else if (!status.rateLimitActive && error?.includes('Rate limited')) {
        // Clear rate limit error when no longer rate limited
        setError(null);
      }
    }
  });

  // Initialize offline mode system
  const offlineMode = useOfflineMode({
    enableAutoSync: true,
    syncInterval: 30000, // 30 seconds
    onOfflineDetected: () => {
      setError('You are now offline. Messages will be saved locally and synced when you reconnect.');
    },
    onOnlineDetected: () => {
      setError(null);
    },
    onSyncComplete: (success, synced) => {
      if (success && synced > 0) {
        // Optionally show success message
        console.log(`Successfully synced ${synced} items`);
      }
    },
  });

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
   * Send a message to the AI tutor with enhanced error handling and offline support
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession) {
      const error = new Error('No active session');
      await errorRecovery.handleError(error, undefined, { action: 'sendMessage' });
      throw error;
    }

    const sendOperation = async () => {
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
      
      // Handle offline mode for user message
      if (offlineMode.offlineState.isOffline) {
        // Store user message for offline sync
        offlineMode.storeForSync('message', {
          id: userMessage.id,
          sessionId: currentSession.id,
          content,
          role: 'user',
          metadata: {},
        });
        
        // Add message locally
        addMessage(currentSession.id, userMessage);
        
        // Show offline message and stop processing
        setError('Message saved offline. It will be sent when you reconnect.');
        setLoading(false);
        return;
      }
      
      // Persist user message if authenticated and online
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
          // Store for offline sync as backup
          offlineMode.storeForSync('message', {
            id: userMessage.id,
            sessionId: currentSession.id,
            content,
            role: 'user',
            metadata: {},
          });
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
      const assistantMessage = aiTutorService.createMessage('assistant', '', currentSession.id);
      
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
              stage: 'responding',
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
            if (auth.user && offlineMode.offlineState.isOnline) {
              aiTutorRepo.updateAssistantMessageContent(messageIdRef.current, event.data.content, event.data.metadata)
                .then(() => aiTutorRepo.touchSession(currentSession.id))
                .catch(() => {
                  // Store for offline sync if database update fails
                  offlineMode.storeForSync('message', {
                    id: messageIdRef.current,
                    sessionId: currentSession.id,
                    content: event.data.content,
                    role: 'assistant',
                    metadata: event.data.metadata,
                  });
                });
            } else if (auth.user && offlineMode.offlineState.isOffline) {
              // Store assistant message for offline sync
              offlineMode.storeForSync('message', {
                id: messageIdRef.current,
                sessionId: currentSession.id,
                content: event.data.content,
                role: 'assistant',
                metadata: event.data.metadata,
              });
            }
            
            setLoading(false);
            // Ensure thinking state is properly cleaned up
            setThinking(false);
            setThinkingState({
              isVisible: false,
              content: '',
              stage: 'responding',
            });
            break;

          case 'error':
            setError(event.data.error);
            setLoading(false);
            setThinking(false);
            setThinkingState({
              isVisible: false,
              content: '',
              stage: 'analyzing',
            });
            break;
        }
      };

      // Send message to service with queue integration
      await aiTutorService.sendMessage(content, currentSession.id, {
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        mode: 'chat', // DeepSeek v3.1 non-thinking mode
        history,
        onEvent: handleEvent,
        priority: 0, // Normal priority
        useQueue: true, // Enable request queuing
      });
    };

    try {
      await sendOperation();
    } catch (error) {
      const originalError = error instanceof Error ? error : new Error('Failed to send message');
      
      // Use error recovery system to handle the error
      await errorRecovery.handleError(originalError, sendOperation, {
        action: 'sendMessage',
        sessionId: currentSession.id,
        messageContent: content.substring(0, 100) // First 100 chars for context
      });

      setLoading(false);
      setThinking(false);
      setThinkingState({
        isVisible: false,
        content: '',
        stage: 'analyzing',
      });

      throw originalError;
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
    errorRecovery,
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
    
    // Error Recovery
    errorRecovery: {
      canRetry: errorRecovery.canRetry,
      isRecovering: errorRecovery.isRecovering,
      retryLastOperation: errorRecovery.retryLastOperation,
      resetServices: errorRecovery.resetServices,
      getErrorInfo: errorRecovery.getErrorInfo,
      getServiceHealth: errorRecovery.getServiceHealth,
    },
    
    // Request Queue
    requestQueue: {
      status: requestQueue.status,
      isQueueActive: requestQueue.isQueueActive,
      isRateLimited: requestQueue.isRateLimited,
      estimatedWaitTime: requestQueue.estimatedWaitTime,
      activeRequests: requestQueue.activeRequests,
      clearQueue: requestQueue.clearQueue,
      pauseQueue: requestQueue.pauseQueue,
      resumeQueue: requestQueue.resumeQueue,
      getQueueStats: requestQueue.getQueueStats,
    },
    
    // Computed
    hasActiveSessions: sessions.length > 0,
    canSendMessage: !!currentSession && !isLoading && !errorRecovery.isRecovering && !requestQueue.isRateLimited,
    serviceHealth: errorRecovery.getServiceHealth(),
  };
}