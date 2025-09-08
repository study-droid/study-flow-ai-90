/**
 * Tests for EnhancedMessageBubble component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { EnhancedMessageBubble } from '../EnhancedMessageBubble';
import type { ChatMessage } from '../../types';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
  },
});

// Mock react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre data-testid="syntax-highlighter">{children}</pre>,
}));

vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  oneDark: {},
  oneLight: {},
}));

const mockMessage: ChatMessage = {
  id: 'test-message-1',
  role: 'assistant',
  content: 'This is a test message with some **markdown** and `code`.',
  type: 'text',
  sessionId: 'test-session',
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  metadata: {
    tokens: 150,
    model: 'deepseek-chat',
    temperature: 0.7,
    processingTime: 1500,
    retryCount: 0,
  },
};

const mockUserMessage: ChatMessage = {
  id: 'test-message-2',
  role: 'user',
  content: 'Hello, can you help me with this problem?',
  type: 'text',
  sessionId: 'test-session',
  createdAt: new Date('2024-01-01T11:59:00Z'),
  updatedAt: new Date('2024-01-01T11:59:00Z'),
};

const mockErrorMessage: ChatMessage = {
  id: 'test-message-3',
  role: 'assistant',
  content: 'Service temporarily unavailable',
  type: 'error',
  sessionId: 'test-session',
  createdAt: new Date('2024-01-01T12:01:00Z'),
  updatedAt: new Date('2024-01-01T12:01:00Z'),
  metadata: {
    originalError: 'Network timeout',
    retryCount: 2,
    fallback: true,
  },
};

describe('EnhancedMessageBubble', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders assistant message correctly', () => {
    render(<EnhancedMessageBubble message={mockMessage} />);
    
    expect(screen.getByText(/This is a test message/)).toBeInTheDocument();
    
    // Check for copy button by finding button with copy icon
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-copy'));
    expect(copyButton).toBeTruthy();
  });

  it('renders user message correctly', () => {
    render(<EnhancedMessageBubble message={mockUserMessage} />);
    
    expect(screen.getByText(/Hello, can you help me/)).toBeInTheDocument();
    
    // Check for copy button by finding button with copy icon
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-copy'));
    expect(copyButton).toBeTruthy();
  });

  it('renders error message correctly', () => {
    render(<EnhancedMessageBubble message={mockErrorMessage} />);
    
    expect(screen.getByText('Error occurred')).toBeInTheDocument();
    expect(screen.getByText('Service temporarily unavailable')).toBeInTheDocument();
  });

  it('shows metadata when enabled', () => {
    render(<EnhancedMessageBubble message={mockMessage} showMetadata={true} />);
    
    expect(screen.getByText('deepseek-chat')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  it('handles copy functionality', async () => {
    render(<EnhancedMessageBubble message={mockMessage} />);
    
    const buttons = screen.getAllByRole('button');
    const copyButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-copy'));
    expect(copyButton).toBeTruthy();
    
    fireEvent.click(copyButton!);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMessage.content);
    });
  });

  it('handles feedback functionality', () => {
    const onFeedback = vi.fn();
    render(<EnhancedMessageBubble message={mockMessage} onFeedback={onFeedback} />);
    
    const buttons = screen.getAllByRole('button');
    const helpfulButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-thumbs-up'));
    expect(helpfulButton).toBeTruthy();
    
    fireEvent.click(helpfulButton!);
    
    expect(onFeedback).toHaveBeenCalledWith(mockMessage.id, 'helpful');
  });

  it('handles retry functionality for error messages', () => {
    const onRetry = vi.fn();
    render(<EnhancedMessageBubble message={mockErrorMessage} onRetry={onRetry} />);
    
    const buttons = screen.getAllByRole('button');
    const retryButton = buttons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-refresh-cw') &&
      button.classList.contains('text-orange-600')
    );
    expect(retryButton).toBeTruthy();
    
    fireEvent.click(retryButton!);
    
    expect(onRetry).toHaveBeenCalledWith(mockErrorMessage.id);
  });

  it('renders code blocks with syntax highlighting', () => {
    const messageWithCode: ChatMessage = {
      ...mockMessage,
      content: '```javascript\nconst hello = "world";\n```',
    };
    
    render(<EnhancedMessageBubble message={messageWithCode} />);
    
    expect(screen.getByTestId('syntax-highlighter')).toBeInTheDocument();
  });

  it('shows thinking state when loading', () => {
    const thinkingState = {
      isVisible: true,
      content: 'Analyzing your question...',
      stage: 'analyzing' as const,
    };
    
    render(
      <EnhancedMessageBubble 
        message={{ ...mockMessage, content: '' }} 
        isThinking={true}
        thinkingState={thinkingState}
      />
    );
    
    expect(screen.getByText('Analyzing your question...')).toBeInTheDocument();
  });

  it('displays performance metrics correctly', () => {
    render(<EnhancedMessageBubble message={mockMessage} showMetadata={true} />);
    
    // Check for processing time badge
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    
    // Check for model badge
    expect(screen.getByText('deepseek-chat')).toBeInTheDocument();
  });

  it('shows retry count for messages with retries', () => {
    render(<EnhancedMessageBubble message={mockErrorMessage} showMetadata={true} />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // retry count
  });

  it('shows fallback indicator when fallback was used', () => {
    render(<EnhancedMessageBubble message={mockErrorMessage} showMetadata={true} />);
    
    expect(screen.getByText('Fallback')).toBeInTheDocument();
  });

  it('applies dark mode styling when enabled', () => {
    render(<EnhancedMessageBubble message={mockMessage} isDarkMode={true} />);
    
    // Component should render without errors in dark mode
    expect(screen.getByText(/This is a test message/)).toBeInTheDocument();
  });

  it('handles staggered animation with index', () => {
    const { container } = render(<EnhancedMessageBubble message={mockMessage} index={5} />);
    
    const messageElement = container.querySelector('.message-bubble');
    expect(messageElement).toHaveStyle({ animationDelay: '250ms' });
  });

  it('disables feedback buttons after feedback is given', () => {
    const onFeedback = vi.fn();
    render(<EnhancedMessageBubble message={mockMessage} onFeedback={onFeedback} />);
    
    const buttons = screen.getAllByRole('button');
    const helpfulButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-thumbs-up'));
    const notHelpfulButton = buttons.find(button => button.querySelector('svg')?.classList.contains('lucide-thumbs-down'));
    
    expect(helpfulButton).toBeTruthy();
    expect(notHelpfulButton).toBeTruthy();
    
    fireEvent.click(helpfulButton!);
    
    expect(helpfulButton).toBeDisabled();
    expect(notHelpfulButton).toBeDisabled();
  });
});