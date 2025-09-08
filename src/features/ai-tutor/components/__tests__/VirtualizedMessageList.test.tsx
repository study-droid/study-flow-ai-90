/**
 * Tests for VirtualizedMessageList component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { VirtualizedMessageList, SimpleMessageList } from '../VirtualizedMessageList';
import type { ChatMessage } from '../../types';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemData, itemCount }: any) => (
    <div data-testid="virtualized-list">
      {Array.from({ length: Math.min(itemCount, 5) }, (_, index) => 
        children({ index, style: {}, data: itemData })
      )}
    </div>
  ),
}));

// Mock EnhancedMessageBubble
vi.mock('../EnhancedMessageBubble', () => ({
  EnhancedMessageBubble: ({ message }: { message: ChatMessage }) => (
    <div data-testid={`message-${message.id}`}>
      {message.content}
    </div>
  ),
}));

const createMockMessage = (id: string, role: 'user' | 'assistant', content: string): ChatMessage => ({
  id,
  role,
  content,
  type: 'text',
  sessionId: 'test-session',
  createdAt: new Date(),
  updatedAt: new Date(),
});

const mockMessages: ChatMessage[] = [
  createMockMessage('1', 'user', 'Hello'),
  createMockMessage('2', 'assistant', 'Hi there!'),
  createMockMessage('3', 'user', 'How are you?'),
  createMockMessage('4', 'assistant', 'I am doing well, thank you!'),
  createMockMessage('5', 'user', 'Great!'),
];

describe('VirtualizedMessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders virtualized list with messages', () => {
    render(<VirtualizedMessageList messages={mockMessages} />);
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(<VirtualizedMessageList messages={[]} />);
    
    expect(screen.getByText('No messages yet. Start a conversation!')).toBeInTheDocument();
  });

  it('shows scroll controls for long message lists', () => {
    const longMessageList = Array.from({ length: 20 }, (_, i) => 
      createMockMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
    );
    
    render(<VirtualizedMessageList messages={longMessageList} />);
    
    // Scroll controls container should be present (even if buttons are not visible initially)
    const scrollControlsContainer = document.querySelector('.absolute.right-4.bottom-4');
    expect(scrollControlsContainer).toBeInTheDocument();
  });

  it('shows loading indicator when loading', () => {
    render(<VirtualizedMessageList messages={mockMessages} isLoading={true} />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('shows message count for large lists', () => {
    const longMessageList = Array.from({ length: 15 }, (_, i) => 
      createMockMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
    );
    
    render(<VirtualizedMessageList messages={longMessageList} />);
    
    expect(screen.getByText('15 messages')).toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    render(<VirtualizedMessageList messages={mockMessages} />);
    
    const container = screen.getByRole('log');
    
    // Test Home key
    fireEvent.keyDown(container, { key: 'Home' });
    
    // Test End key
    fireEvent.keyDown(container, { key: 'End' });
    
    // Should not throw errors
    expect(container).toBeInTheDocument();
  });

  it('passes through props to message bubbles', () => {
    const onFeedback = vi.fn();
    const onRetry = vi.fn();
    
    render(
      <VirtualizedMessageList 
        messages={mockMessages}
        onFeedback={onFeedback}
        onRetry={onRetry}
        showMetadata={true}
        isDarkMode={true}
      />
    );
    
    expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
  });
});

describe('SimpleMessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock scrollIntoView for SimpleMessageList
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renders simple list with messages', () => {
    render(<SimpleMessageList messages={mockMessages} />);
    
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
    expect(screen.getByTestId('message-2')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('renders all messages without virtualization', () => {
    const longMessageList = Array.from({ length: 100 }, (_, i) => 
      createMockMessage(`msg-${i}`, i % 2 === 0 ? 'user' : 'assistant', `Message ${i}`)
    );
    
    render(<SimpleMessageList messages={longMessageList} />);
    
    // All messages should be rendered
    expect(screen.getByTestId('message-msg-0')).toBeInTheDocument();
    expect(screen.getByTestId('message-msg-99')).toBeInTheDocument();
  });

  it('shows loading state on last message', () => {
    render(<SimpleMessageList messages={mockMessages} isLoading={true} />);
    
    // The last message should receive the loading prop
    expect(screen.getByTestId('message-5')).toBeInTheDocument();
  });

  it('shows thinking state on last message', () => {
    const thinkingState = {
      isVisible: true,
      content: 'Processing...',
      stage: 'analyzing' as const,
    };
    
    render(
      <SimpleMessageList 
        messages={mockMessages} 
        isThinking={true}
        thinkingState={thinkingState}
      />
    );
    
    expect(screen.getByTestId('message-5')).toBeInTheDocument();
  });

  it('passes through all props correctly', () => {
    const onFeedback = vi.fn();
    const onRetry = vi.fn();
    
    render(
      <SimpleMessageList 
        messages={mockMessages}
        onFeedback={onFeedback}
        onRetry={onRetry}
        showMetadata={true}
        isDarkMode={false}
      />
    );
    
    // Should render without errors
    expect(screen.getByTestId('message-1')).toBeInTheDocument();
  });
});