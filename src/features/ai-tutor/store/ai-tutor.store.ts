/**
 * AI Tutor state store using Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  AITutorState, 
  AITutorSettings, 
  ChatSession, 
  ChatMessage,
  ThinkingState 
} from '../types';

// Revive Date fields after rehydration from localStorage
function reviveSessionDates(session: any): ChatSession {
  const revived: ChatSession = {
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    messages: (session.messages || []).map((m: any) => ({
      ...m,
      createdAt: new Date(m.createdAt),
      updatedAt: new Date(m.updatedAt),
    })),
  };
  return revived;
}

interface AITutorStore extends AITutorState {
  // Session Management
  setCurrentSession: (session: ChatSession | null) => void;
  addSession: (session: ChatSession) => void;
  updateSession: (id: string, updates: Partial<ChatSession>) => void;
  removeSession: (id: string) => void;
  setSessions: (sessions: ChatSession[]) => void;

  // Message Management
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: (sessionId: string) => void;

  // State Management
  setLoading: (loading: boolean) => void;
  setThinking: (thinking: boolean) => void;
  setError: (error: string | null) => void;
  
  // Settings Management
  updateSettings: (settings: Partial<AITutorSettings>) => void;
  
  // Thinking State
  thinkingState: ThinkingState;
  setThinkingState: (state: Partial<ThinkingState>) => void;
  
  // Actions
  reset: () => void;
  resetCurrentSession: () => void;
}

const defaultSettings: AITutorSettings = {
  model: 'deepseek',
  temperature: 0.7,
  maxTokens: 4000,
  showThinking: true,
  autoSave: true,
  version: '3.1', // DeepSeek v3.1
  mode: 'chat', // Non-thinking mode
};

const initialState: AITutorState = {
  currentSession: null,
  sessions: [],
  isLoading: false,
  isThinking: false,
  error: null,
  settings: defaultSettings,
};

const initialThinkingState: ThinkingState = {
  isVisible: false,
  content: '',
  stage: 'analyzing',
};

export const useAITutorStore = create<AITutorStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        thinkingState: initialThinkingState,

        setCurrentSession: (session) =>
          set((state) => {
            state.currentSession = session;
          }),

        addSession: (session) =>
          set((state) => {
            state.sessions.unshift(session);
            state.currentSession = session;
          }),

        updateSession: (id, updates) =>
          set((state) => {
            const index = state.sessions.findIndex((s) => s.id === id);
            if (index !== -1) {
              Object.assign(state.sessions[index], updates);
            }
            if (state.currentSession?.id === id) {
              Object.assign(state.currentSession, updates);
            }
          }),

        removeSession: (id) =>
          set((state) => {
            state.sessions = state.sessions.filter((s) => s.id !== id);
            if (state.currentSession?.id === id) {
              state.currentSession = state.sessions[0] || null;
            }
          }),

        setSessions: (sessions) =>
          set((state) => {
            state.sessions = sessions;
          }),

        addMessage: (sessionId, message) =>
          set((state) => {
            const session = state.sessions.find((s) => s.id === sessionId);
            if (session) {
              session.messages.push(message);
              session.updatedAt = new Date();
            }
            if (state.currentSession?.id === sessionId) {
              state.currentSession.messages.push(message);
              state.currentSession.updatedAt = new Date();
            }
          }),

        updateMessage: (sessionId, messageId, updates) =>
          set((state) => {
            console.log('🏪 AI Tutor Store: Updating message', {
              sessionId,
              messageId,
              updates,
              hasContent: !!updates.content,
              contentLength: updates.content?.length || 0,
              currentSessionId: state.currentSession?.id,
              totalSessions: state.sessions.length
            });
            
            let messageUpdated = false;
            
            // Update in sessions array
            const session = state.sessions.find((s) => s.id === sessionId);
            if (session) {
              const messageIndex = session.messages.findIndex((m) => m.id === messageId);
              if (messageIndex !== -1) {
                console.log('🏪 AI Tutor Store: Found message in session, updating', {
                  messageIndex,
                  oldContent: session.messages[messageIndex].content,
                  newContent: updates.content
                });
                Object.assign(session.messages[messageIndex], updates);
                session.updatedAt = new Date();
                messageUpdated = true;
              } else {
                console.warn('🏪 AI Tutor Store: Message not found in session - creating it', {
                  messageId,
                  sessionMessageIds: session.messages.map(m => m.id),
                  sessionId
                });
                // Create the message if it doesn't exist (defensive programming)
                const now = new Date();
                const newMessage: ChatMessage = {
                  id: messageId,
                  role: 'assistant',
                  content: updates.content || '',
                  sessionId,
                  type: 'text',
                  createdAt: now,
                  updatedAt: now,
                  ...updates
                };
                session.messages.push(newMessage);
                session.updatedAt = new Date();
                messageUpdated = true;
              }
            } else {
              console.warn('🏪 AI Tutor Store: Session not found for message update', {
                sessionId,
                availableSessionIds: state.sessions.map(s => s.id)
              });
            }
            
            // Update in current session if it matches
            if (state.currentSession?.id === sessionId) {
              const messageIndex = state.currentSession.messages.findIndex((m) => m.id === messageId);
              if (messageIndex !== -1) {
                console.log('🏪 AI Tutor Store: Found message in current session, updating');
                Object.assign(state.currentSession.messages[messageIndex], updates);
                state.currentSession.updatedAt = new Date();
                messageUpdated = true;
              } else if (session) {
                // Sync current session with session from array
                console.log('🏪 AI Tutor Store: Syncing current session with session array');
                state.currentSession.messages = [...session.messages];
                state.currentSession.updatedAt = session.updatedAt;
              }
            }
            
            if (!messageUpdated) {
              console.error('🏪 AI Tutor Store: Failed to update message - no session or message found', {
                sessionId,
                messageId,
                availableSessionIds: state.sessions.map(s => s.id)
              });
            }
          }),

        clearMessages: (sessionId) =>
          set((state) => {
            const session = state.sessions.find((s) => s.id === sessionId);
            if (session) {
              session.messages = [];
            }
            if (state.currentSession?.id === sessionId) {
              state.currentSession.messages = [];
            }
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setThinking: (thinking) =>
          set((state) => {
            state.isThinking = thinking;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
            if (error) {
              state.isLoading = false;
              state.isThinking = false;
            }
          }),

        updateSettings: (settings) =>
          set((state) => {
            Object.assign(state.settings, settings);
          }),

        setThinkingState: (thinkingState) =>
          set((state) => {
            Object.assign(state.thinkingState, thinkingState);
          }),

        reset: () =>
          set((state) => {
            Object.assign(state, initialState);
            state.thinkingState = initialThinkingState;
          }),

        resetCurrentSession: () =>
          set((state) => {
            if (state.currentSession) {
              state.currentSession.messages = [];
            }
          }),
      })),
      {
        name: 'ai-tutor-store',
        partialize: (state) => ({
          currentSession: state.currentSession,
          sessions: state.sessions,
          settings: state.settings,
        }),
        onRehydrateStorage: () => (state) => {
          if (!state) return;
          try {
            // Revive sessions and currentSession date fields
            state.sessions = (state.sessions || []).map(reviveSessionDates);
            state.currentSession = state.currentSession
              ? reviveSessionDates(state.currentSession)
              : null;
          } catch (e) {
            // Safe fallback; leave state as-is
          }
        },
      }
    ),
    { name: 'AITutorStore' }
  )
);
