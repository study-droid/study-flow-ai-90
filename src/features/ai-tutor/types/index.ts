/**
 * AI Tutor types and interfaces
 */

import type { BaseEntity } from '@/shared/types';

export interface ChatSession extends BaseEntity {
  title: string;
  messages: ChatMessage[];
  isActive: boolean;
  metadata?: SessionMetadata;
}

export interface ChatMessage extends BaseEntity {
  role: 'user' | 'assistant' | 'system';
  content: string;
  type?: 'text' | 'thinking' | 'error';
  metadata?: MessageMetadata;
  sessionId: string;
}

export interface SessionMetadata {
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  duration?: number;
}

export interface MessageMetadata {
  tokens?: number;
  model?: string;
  temperature?: number;
  reasoning?: string;
  sources?: string[];
}

export interface AITutorState {
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  isLoading: boolean;
  isThinking: boolean;
  error: string | null;
  settings: AITutorSettings;
}

export interface AITutorSettings {
  model: 'deepseek' | 'openai' | 'anthropic';
  temperature: number;
  maxTokens: number;
  showThinking: boolean;
  autoSave: boolean;
  version?: '3.1'; // DeepSeek version
  mode?: 'chat' | 'reasoning'; // v3.1 modes
}

export interface ThinkingState {
  isVisible: boolean;
  content: string;
  stage: 'analyzing' | 'reasoning' | 'responding';
  currentFact?: AIFact;
  factRotation?: AIFact[];
}

export interface AIFact {
  id: string;
  category: 'analyzing' | 'reasoning' | 'responding' | 'general';
  title: string;
  content: string;
  icon?: string;
}

export interface DeepSeekResponse {
  content: string;
  reasoning?: string;
  metadata?: {
    model: string;
    tokens: number;
    temperature: number;
  };
}

export type ChatEventType = 
  | 'message_start'
  | 'message_delta'
  | 'message_stop'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_stop'
  | 'error';

export interface ChatEvent {
  type: ChatEventType;
  data: {
    message?: string;
    reasoning?: string;
    stage?: 'analyzing' | 'reasoning' | 'responding';
    timestamp?: number;
    fullContent?: string;
    error?: string;
    [key: string]: any;
  };
  sessionId: string;
}