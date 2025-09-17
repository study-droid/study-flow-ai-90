import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isTyping?: boolean;
}

export interface AITutorSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
}

export const useAITutor = () => {
  const { user } = useAuth();
  const [currentSession, setCurrentSession] = useState<AITutorSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async (title?: string) => {
    if (!user) return null;

    try {
      const { data, error: createError } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          user_id: user.id,
          title: title || 'Chat with Teddy',
          status: 'active',
          ai_provider: 'deepseek',
        })
        .select()
        .single();

      if (createError) throw createError;

      const newSession: AITutorSession = {
        id: data.id,
        title: data.title || 'Chat with Teddy',
        messages: [],
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };

      setCurrentSession(newSession);
      setMessages([{
        id: 'welcome',
        content: "Hi there! I'm Teddy, your cuddly AI study companion! 🧸 I'm here to help you learn and understand any subject. What would you like to study today?",
        role: 'assistant',
        timestamp: new Date(),
      }]);

      return newSession;
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Failed to create chat session');
      return null;
    }
  }, [user]);

  const sendMessage = useCallback(async (content: string, context?: {
    subject?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }) => {
    if (!user || !currentSession) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: typingId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true,
    }]);

    try {
      // Store user message in database
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        session_id: currentSession.id,
        content,
        role: 'user',
        ai_provider: 'deepseek',
      });

      // Call the AI tutor edge function
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-tutor-professional', {
        body: {
          message: content,
          context: {
            subject: context?.subject,
            difficulty: context?.difficulty || 'intermediate',
            sessionId: currentSession.id,
            userId: user.id,
            history: messages.filter(m => !m.isTyping).slice(-5).map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp.getTime(),
            })),
          },
          options: {
            stream: false,
            mode: 'chat',
            temperature: 0.7,
            maxTokens: 2000,
          },
        },
      });

      if (aiError) throw aiError;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        content: aiResponse.content || "I'm sorry, I couldn't process that request. Please try again!",
        role: 'assistant',
        timestamp: new Date(),
      };

      // Remove typing indicator and add real response
      setMessages(prev => [
        ...prev.filter(m => m.id !== typingId),
        assistantMessage,
      ]);

      // Store AI response in database
      await supabase.from('ai_messages').insert({
        user_id: user.id,
        session_id: currentSession.id,
        content: assistantMessage.content,
        role: 'assistant',
        ai_provider: 'deepseek',
        tokens_used: aiResponse.usage?.totalTokens,
        response_time: aiResponse.metadata?.processingTime,
        message_metadata: {
          quality: aiResponse.quality,
          model: aiResponse.metadata?.model,
          requestId: aiResponse.metadata?.requestId,
        },
      });

      // Update session activity
      await supabase
        .from('ai_tutor_sessions')
        .update({
          last_activity: new Date().toISOString(),
          total_messages: messages.length + 2, // +1 for user, +1 for AI
        })
        .eq('id', currentSession.id);

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove typing indicator and show error
      setMessages(prev => [
        ...prev.filter(m => m.id !== typingId),
        {
          id: `error-${Date.now()}`,
          content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment! 🧸",
          role: 'assistant',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [user, currentSession, messages]);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      // Load session data
      const { data: sessionData, error: sessionError } = await supabase
        .from('ai_tutor_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (sessionError) throw sessionError;
      if (!sessionData) throw new Error('Session not found');

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const session: AITutorSession = {
        id: sessionData.id,
        title: sessionData.title || 'Chat with Teddy',
        messages: messagesData.map(msg => ({
          id: msg.id,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          timestamp: new Date(msg.created_at),
        })),
        created_at: new Date(sessionData.created_at),
        updated_at: new Date(sessionData.updated_at),
      };

      setCurrentSession(session);
      setMessages(session.messages);

    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearChat = useCallback(() => {
    setMessages([{
      id: 'welcome',
      content: "Hi there! I'm Teddy, your cuddly AI study companion! 🧸 I'm here to help you learn and understand any subject. What would you like to study today?",
      role: 'assistant',
      timestamp: new Date(),
    }]);
    setError(null);
  }, []);

  return {
    currentSession,
    messages,
    isLoading,
    error,
    createSession,
    sendMessage,
    loadSession,
    clearChat,
  };
};