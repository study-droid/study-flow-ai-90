/**
 * Tests for Enhanced Chat Sheet with DeepSeek Integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedChatSheet } from '../EnhancedChatSheet';
import type { ChatMessage } from '@/features/ai-tutor/types';

// Mock dependencies
vi.mock('@/features/ai-tutor/hooks/useAITutor', () => ({
  useAITutor: vi.fn(() => ({
    currentSession: {
      id: 'test-session',
      title: 'Test Session',
      messages: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    isLoading: false,
    isThinking: false,
    error: null,
    thinkingState: null,
    createNewSession: vi.fn(),
    sendMessage: vi.fn(),
    canSendMessage: true
  }))
}));

vi.mock('../SmartMessageBubble', () => ({
  SmartMessageBubble: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.id}`}>
      {message.content}
    </div>
  )
}));

vi.mock('@/features/ai-tutor/components/AIThinkingBubble', () => ({
  AIThinkingBubble: ({ content }: { content: string }) => (
    <div data-testid="thinking-bubble">{content}</div>
  )
}));

describe('EnhancedChatSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders chat trigger button', () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    expect(trigger).toBeInTheDocument();
  });

  it('opens chat dialog when trigger is clicked', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Enhanced AI Study Assistant')).toBeInTheDocument();
    });
  });

  it('displays welcome message when no messages exist', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome to your Enhanced AI Study Assistant!')).toBeInTheDocument();
    });
  });

  it('shows provider-specific welcome message for DeepSeek', async () => {
    render(<EnhancedChatSheet defaultProvider="deepseek" />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText(/DeepSeek AI provides enhanced mathematical reasoning/)).toBeInTheDocument();
    });
  });

  it('displays provider selection in settings', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      expect(screen.getByText('DeepSeek')).toBeInTheDocument();
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Anthropic')).toBeInTheDocument();
    });
  });

  it('toggles streaming option', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      const streamingToggle = screen.getByLabelText('Streaming');
      fireEvent.click(streamingToggle);
      
      // Should show streaming badge
      expect(screen.getByText('Streaming')).toBeInTheDocument();
    });
  });

  it('toggles metrics option', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      const metricsToggle = screen.getByLabelText('Show Metrics');
      fireEvent.click(metricsToggle);
      
      // Should show metrics badge
      expect(screen.getByText('Metrics')).toBeInTheDocument();
    });
  });

  it('handles message input and sending', async () => {
    const mockSendMessage = vi.fn();
    const { useAITutor } = require('@/features/ai-tutor/hooks/useAITutor');
    useAITutor.mockReturnValue({
      currentSession: {
        id: 'test-session',
        title: 'Test Session',
        messages: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isLoading: false,
      isThinking: false,
      error: null,
      thinkingState: null,
      createNewSession: vi.fn(),
      sendMessage: mockSendMessage,
      canSendMessage: true
    });

    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Ask me anything about your studies/);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);
      
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('handles Enter key to send message', async () => {
    const mockSendMessage = vi.fn();
    const { useAITutor } = require('@/features/ai-tutor/hooks/useAITutor');
    useAITutor.mockReturnValue({
      currentSession: {
        id: 'test-session',
        title: 'Test Session',
        messages: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isLoading: false,
      isThinking: false,
      error: null,
      thinkingState: null,
      createNewSession: vi.fn(),
      sendMessage: mockSendMessage,
      canSendMessage: true
    });

    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const textarea = screen.getByPlaceholderText(/Ask me anything about your studies/);
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      
      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });
  });

  it('displays error messages', async () => {
    const { useAITutor } = require('@/features/ai-tutor/hooks/useAITutor');
    useAITutor.mockReturnValue({
      currentSession: null,
      isLoading: false,
      isThinking: false,
      error: 'Test error message',
      thinkingState: null,
      createNewSession: vi.fn(),
      sendMessage: vi.fn(),
      canSendMessage: false
    });

    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });

  it('shows thinking state', async () => {
    const { useAITutor } = require('@/features/ai-tutor/hooks/useAITutor');
    useAITutor.mockReturnValue({
      currentSession: {
        id: 'test-session',
        title: 'Test Session',
        messages: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isLoading: false,
      isThinking: true,
      error: null,
      thinkingState: {
        isVisible: true,
        content: 'Analyzing your question...',
        stage: 'analyzing'
      },
      createNewSession: vi.fn(),
      sendMessage: vi.fn(),
      canSendMessage: true
    });

    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
      expect(screen.getByTestId('thinking-bubble')).toBeInTheDocument();
    });
  });

  it('renders messages with SmartMessageBubble', async () => {
    const testMessages: ChatMessage[] = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        sessionId: 'test-session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Hi there!',
        sessionId: 'test-session',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const { useAITutor } = require('@/features/ai-tutor/hooks/useAITutor');
    useAITutor.mockReturnValue({
      currentSession: {
        id: 'test-session',
        title: 'Test Session',
        messages: testMessages,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      isLoading: false,
      isThinking: false,
      error: null,
      thinkingState: null,
      createNewSession: vi.fn(),
      sendMessage: vi.fn(),
      canSendMessage: true
    });

    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByTestId('message-1')).toBeInTheDocument();
      expect(screen.getByTestId('message-2')).toBeInTheDocument();
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('applies provider-specific styling', async () => {
    render(<EnhancedChatSheet defaultProvider="deepseek" />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    expect(trigger).toBeInTheDocument();
    
    fireEvent.click(trigger);
    
    await waitFor(() => {
      expect(screen.getByText('Powered by DeepSeek AI')).toBeInTheDocument();
    });
  });

  it('handles provider switching', async () => {
    render(<EnhancedChatSheet />);
    
    const trigger = screen.getByTestId('enhanced-chat-trigger');
    fireEvent.click(trigger);
    
    await waitFor(() => {
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsButton);
      
      const deepseekOption = screen.getByText('Deepseek');
      fireEvent.click(deepseekOption);
      
      // Should update the provider display
      expect(screen.getByText('Powered by DeepSeek AI')).toBeInTheDocument();
    });
  });
});