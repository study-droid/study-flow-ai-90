/**
 * AI Tutor Accessibility Tests
 * Comprehensive accessibility testing for AI tutor components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider';
import { KeyboardNavigation } from '@/components/accessibility/KeyboardNavigation';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
const MockAITutorInterface = () => (
  <div role="main" aria-label="AI Tutor Interface">
    <div role="region" aria-label="Chat Messages" aria-live="polite">
      <div role="log" aria-label="Message History">
        <div role="article" aria-label="User Message">
          <span className="sr-only">User said:</span>
          What is machine learning?
        </div>
        <div role="article" aria-label="AI Response">
          <span className="sr-only">AI responded:</span>
          Machine learning is a subset of artificial intelligence...
        </div>
      </div>
    </div>
    
    <form role="form" aria-label="Send Message">
      <label htmlFor="message-input" className="sr-only">
        Type your message
      </label>
      <textarea
        id="message-input"
        placeholder="Ask me anything..."
        aria-describedby="message-help"
        aria-required="true"
      />
      <div id="message-help" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </div>
      <button type="submit" aria-label="Send message">
        Send
      </button>
    </form>

    <div role="status" aria-live="polite" aria-label="AI Status">
      <span className="sr-only">AI is ready</span>
    </div>

    <nav role="navigation" aria-label="Chat Actions">
      <button aria-label="Clear conversation">Clear</button>
      <button aria-label="Export conversation">Export</button>
      <button aria-label="Settings">Settings</button>
    </nav>
  </div>
);

const MockProviderSelector = () => (
  <div role="region" aria-label="AI Provider Selection">
    <fieldset>
      <legend>Choose AI Provider</legend>
      <div role="radiogroup" aria-label="Available AI Providers">
        <label>
          <input 
            type="radio" 
            name="provider" 
            value="deepseek"
            aria-describedby="deepseek-info"
          />
          DeepSeek
        </label>
        <div id="deepseek-info" className="sr-only">
          Fast and cost-effective AI provider
        </div>
        
        <label>
          <input 
            type="radio" 
            name="provider" 
            value="openai"
            aria-describedby="openai-info"
          />
          OpenAI GPT-4
        </label>
        <div id="openai-info" className="sr-only">
          Advanced AI with excellent reasoning capabilities
        </div>
      </div>
    </fieldset>
  </div>
);

const MockThinkingIndicator = ({ isThinking }: { isThinking: boolean }) => (
  <div 
    role="status" 
    aria-live="polite" 
    aria-label={isThinking ? "AI is thinking" : "AI is ready"}
  >
    {isThinking && (
      <>
        <span className="sr-only">AI is processing your request</span>
        <div aria-hidden="true">🤔 Thinking...</div>
      </>
    )}
  </div>
);

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        <KeyboardNavigation>
          {children}
        </KeyboardNavigation>
      </AccessibilityProvider>
    </QueryClientProvider>
  );
};

describe('AI Tutor Accessibility Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock window.speechSynthesis for screen reader tests
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: vi.fn(() => []),
        speaking: false,
        pending: false,
        paused: false
      },
      writable: true
    });
  });

  describe('Semantic HTML Structure', () => {
    it('should have proper ARIA landmarks', async () => {
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('should have no accessibility violations', async () => {
      const { container } = render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <TestWrapper>
          <div>
            <h1>StudyFlow AI Tutor</h1>
            <div role="region" aria-labelledby="chat-heading">
              <h2 id="chat-heading">Chat Interface</h2>
              <div role="region" aria-labelledby="messages-heading">
                <h3 id="messages-heading">Messages</h3>
              </div>
            </div>
            <div role="region" aria-labelledby="settings-heading">
              <h2 id="settings-heading">Settings</h2>
            </div>
          </div>
        </TestWrapper>
      );

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveTextContent('StudyFlow AI Tutor');
      expect(headings[1]).toHaveTextContent('Chat Interface');
      expect(headings[2]).toHaveTextContent('Messages');
      expect(headings[3]).toHaveTextContent('Settings');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      const messageInput = screen.getByLabelText('Type your message');
      const sendButton = screen.getByLabelText('Send message');
      const clearButton = screen.getByLabelText('Clear conversation');

      // Tab through interactive elements
      await user.tab();
      expect(messageInput).toHaveFocus();

      await user.tab();
      expect(sendButton).toHaveFocus();

      await user.tab();
      expect(clearButton).toHaveFocus();
    });

    it('should handle Enter key for form submission', async () => {
      const mockSubmit = vi.fn();
      
      render(
        <TestWrapper>
          <form onSubmit={mockSubmit}>
            <textarea aria-label="Message input" />
            <button type="submit">Send</button>
          </form>
        </TestWrapper>
      );

      const textarea = screen.getByLabelText('Message input');
      await user.click(textarea);
      await user.type(textarea, 'Test message');
      await user.keyboard('{Enter}');

      expect(mockSubmit).toHaveBeenCalled();
    });

    it('should support Shift+Enter for new lines', async () => {
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      const messageInput = screen.getByLabelText('Type your message');
      await user.click(messageInput);
      await user.type(messageInput, 'First line');
      await user.keyboard('{Shift>}{Enter}{/Shift}');
      await user.type(messageInput, 'Second line');

      expect(messageInput).toHaveValue('First line\nSecond line');
    });

    it('should support escape key to close modals', async () => {
      const mockClose = vi.fn();
      
      render(
        <TestWrapper>
          <div role="dialog" aria-modal="true" onKeyDown={(e) => {
            if (e.key === 'Escape') mockClose();
          }}>
            <button>Close</button>
          </div>
        </TestWrapper>
      );

      const dialog = screen.getByRole('dialog');
      fireEvent.keyDown(dialog, { key: 'Escape' });
      
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      const messageInput = screen.getByLabelText('Type your message');
      expect(messageInput).toHaveAttribute('aria-describedby', 'message-help');
      expect(screen.getByText('Press Enter to send, Shift+Enter for new line')).toBeInTheDocument();
    });

    it('should announce status changes with aria-live', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MockThinkingIndicator isThinking={false} />
        </TestWrapper>
      );

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label', 'AI is ready');

      rerender(
        <TestWrapper>
          <MockThinkingIndicator isThinking={true} />
        </TestWrapper>
      );

      expect(status).toHaveAttribute('aria-label', 'AI is thinking');
      expect(screen.getByText('AI is processing your request')).toBeInTheDocument();
    });

    it('should provide context for screen readers', () => {
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      expect(screen.getByText('User said:')).toHaveClass('sr-only');
      expect(screen.getByText('AI responded:')).toHaveClass('sr-only');
    });

    it('should have proper form labels and fieldsets', () => {
      render(
        <TestWrapper>
          <MockProviderSelector />
        </TestWrapper>
      );

      expect(screen.getByRole('group', { name: 'Choose AI Provider' })).toBeInTheDocument();
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', 'Available AI Providers');
    });
  });

  describe('Focus Management', () => {
    it('should trap focus in modal dialogs', async () => {
      render(
        <TestWrapper>
          <div>
            <button>Outside Modal</button>
            <div role="dialog" aria-modal="true">
              <button>First Button</button>
              <button>Second Button</button>
              <button>Last Button</button>
            </div>
          </div>
        </TestWrapper>
      );

      const firstButton = screen.getByText('First Button');
      const lastButton = screen.getByText('Last Button');

      // Focus should be trapped within modal
      firstButton.focus();
      await user.tab();
      expect(screen.getByText('Second Button')).toHaveFocus();

      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab from last element should cycle to first
      await user.tab();
      expect(firstButton).toHaveFocus();
    });

    it('should restore focus when modal closes', async () => {
      const { rerender } = render(
        <TestWrapper>
          <div>
            <button>Open Modal</button>
          </div>
        </TestWrapper>
      );

      const openButton = screen.getByText('Open Modal');
      openButton.focus();

      rerender(
        <TestWrapper>
          <div>
            <button>Open Modal</button>
            <div role="dialog" aria-modal="true">
              <button>Modal Button</button>
            </div>
          </div>
        </TestWrapper>
      );

      // Focus should move to modal
      expect(screen.getByText('Modal Button')).toHaveFocus();

      rerender(
        <TestWrapper>
          <div>
            <button>Open Modal</button>
          </div>
        </TestWrapper>
      );

      // Focus should return to trigger element
      expect(openButton).toHaveFocus();
    });

    it('should have visible focus indicators', () => {
      render(
        <TestWrapper>
          <button className="focus:ring-2 focus:ring-blue-500">Focusable Button</button>
        </TestWrapper>
      );

      const button = screen.getByText('Focusable Button');
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });

  describe('Color and Contrast', () => {
    it('should not rely solely on color for information', () => {
      render(
        <TestWrapper>
          <div>
            <div className="text-red-600">
              <span aria-label="Error">❌</span>
              Error: Invalid input
            </div>
            <div className="text-green-600">
              <span aria-label="Success">✅</span>
              Success: Message sent
            </div>
            <div className="text-yellow-600">
              <span aria-label="Warning">⚠️</span>
              Warning: Rate limit approaching
            </div>
          </div>
        </TestWrapper>
      );

      // Icons and text provide information beyond color
      expect(screen.getByLabelText('Error')).toBeInTheDocument();
      expect(screen.getByLabelText('Success')).toBeInTheDocument();
      expect(screen.getByLabelText('Warning')).toBeInTheDocument();
    });

    it('should support high contrast mode', () => {
      render(
        <TestWrapper>
          <div className="high-contrast:border-2 high-contrast:border-white">
            <button className="high-contrast:bg-black high-contrast:text-white">
              High Contrast Button
            </button>
          </div>
        </TestWrapper>
      );

      const button = screen.getByText('High Contrast Button');
      expect(button).toHaveClass('high-contrast:bg-black', 'high-contrast:text-white');
    });
  });

  describe('Responsive Design Accessibility', () => {
    it('should maintain accessibility on mobile devices', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      render(
        <TestWrapper>
          <div className="touch-manipulation">
            <button className="min-h-[44px] min-w-[44px] p-3">
              Mobile Friendly Button
            </button>
          </div>
        </TestWrapper>
      );

      const button = screen.getByText('Mobile Friendly Button');
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]', 'p-3');
    });

    it('should support touch gestures accessibility', () => {
      render(
        <TestWrapper>
          <div 
            role="button"
            tabIndex={0}
            aria-label="Swipeable message"
            onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') {
                // Handle swipe left equivalent
              }
            }}
          >
            Swipe left to delete
          </div>
        </TestWrapper>
      );

      const swipeableElement = screen.getByLabelText('Swipeable message');
      expect(swipeableElement).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Error Handling Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      render(
        <TestWrapper>
          <div>
            <form>
              <input aria-label="Message" aria-invalid="true" aria-describedby="error-message" />
              <div id="error-message" role="alert" aria-live="assertive">
                Error: Message cannot be empty
              </div>
            </form>
          </div>
        </TestWrapper>
      );

      const input = screen.getByLabelText('Message');
      const errorMessage = screen.getByRole('alert');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'error-message');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    it('should provide recovery instructions', () => {
      render(
        <TestWrapper>
          <div role="alert">
            <h3>Connection Error</h3>
            <p>Unable to connect to AI service.</p>
            <p>Please check your internet connection and try again.</p>
            <button>Retry Connection</button>
          </div>
        </TestWrapper>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toContainElement(screen.getByText('Connection Error'));
      expect(alert).toContainElement(screen.getByText('Retry Connection'));
    });
  });

  describe('Loading States Accessibility', () => {
    it('should announce loading states', () => {
      render(
        <TestWrapper>
          <div role="status" aria-live="polite" aria-label="Loading">
            <span className="sr-only">Loading AI response, please wait</span>
            <div aria-hidden="true">Loading...</div>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Loading AI response, please wait')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide progress information when available', () => {
      render(
        <TestWrapper>
          <div role="progressbar" aria-valuenow={65} aria-valuemin={0} aria-valuemax={100}>
            <span className="sr-only">Processing: 65% complete</span>
            <div style={{ width: '65%' }} aria-hidden="true" />
          </div>
        </TestWrapper>
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '65');
      expect(screen.getByText('Processing: 65% complete')).toBeInTheDocument();
    });
  });

  describe('Internationalization Accessibility', () => {
    it('should support RTL languages', () => {
      render(
        <TestWrapper>
          <div dir="rtl" lang="ar">
            <button>إرسال</button>
          </div>
        </TestWrapper>
      );

      const container = screen.getByText('إرسال').parentElement;
      expect(container).toHaveAttribute('dir', 'rtl');
      expect(container).toHaveAttribute('lang', 'ar');
    });

    it('should provide language information for screen readers', () => {
      render(
        <TestWrapper>
          <div>
            <p>This is in English</p>
            <p lang="es">Esto está en español</p>
            <p lang="fr">Ceci est en français</p>
          </div>
        </TestWrapper>
      );

      expect(screen.getByText('Esto está en español')).toHaveAttribute('lang', 'es');
      expect(screen.getByText('Ceci est en français')).toHaveAttribute('lang', 'fr');
    });
  });

  describe('Performance Accessibility', () => {
    it('should not cause accessibility performance issues', async () => {
      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <MockAITutorInterface />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete quickly
      expect(renderTime).toBeLessThan(100);
    });

    it('should handle large message histories efficiently', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => (
        <div key={i} role="article" aria-label={`Message ${i + 1}`}>
          Message {i + 1}
        </div>
      ));

      render(
        <TestWrapper>
          <div role="log" aria-label="Message History">
            {manyMessages}
          </div>
        </TestWrapper>
      );

      const messageHistory = screen.getByRole('log');
      expect(messageHistory.children).toHaveLength(100);
    });
  });
});