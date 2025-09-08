/**
 * Enhanced Thinking Indicator Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EnhancedThinkingIndicator } from '../EnhancedThinkingIndicator';
import { thinkingStateService } from '../../services/thinking-state.service';

// Mock the thinking state service
vi.mock('../../services/thinking-state.service', () => ({
  thinkingStateService: {
    analyzeMessage: vi.fn(),
    generateThinkingState: vi.fn(),
    updateThinkingProgress: vi.fn(),
  }
}));

// Mock the AI facts service
vi.mock('../../services/ai-facts.service', () => ({
  aiFactsService: {
    getFactsForStage: vi.fn(() => [
      {
        id: 'test-fact',
        category: 'analyzing',
        title: 'Test Fact',
        content: 'This is a test fact about AI processing.',
        icon: '🧠'
      }
    ])
  }
}));

describe('EnhancedThinkingIndicator', () => {
  const mockMessageContext = {
    messageContent: 'What is machine learning?',
    messageType: 'question' as const,
    complexity: 'moderate' as const,
    subject: 'technology'
  };

  const mockThinkingState = {
    isVisible: true,
    content: 'Analyzing your question about machine learning...',
    stage: 'analyzing' as const,
    progress: 25,
    contextualMessage: 'Understanding your question...',
    estimatedDuration: 2000,
    currentFact: {
      id: 'test-fact',
      category: 'analyzing' as const,
      title: 'Pattern Recognition',
      content: 'AI uses pattern recognition to understand questions.',
      icon: '🧩'
    },
    factRotation: [],
    messageType: 'question' as const,
    complexity: 'moderate' as const,
    animations: {
      primaryAnimation: 'pulse-analyze',
      particleCount: 6,
      pulseIntensity: 0.6,
      colorScheme: 'blue'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (thinkingStateService.generateThinkingState as any).mockReturnValue(mockThinkingState);
  });

  it('renders when visible with message context', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={false}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('displays correct stage information', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="reasoning"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.getByText('Reasoning')).toBeInTheDocument();
  });

  it('shows progress indicator with correct value', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
        progress={75}
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays contextual message', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.getByText('Understanding your question...')).toBeInTheDocument();
  });

  it('shows complexity and message type badges', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.getAllByText('moderate')).toHaveLength(2); // One in stage badge, one in metadata
    expect(screen.getByText('question')).toBeInTheDocument();
  });

  it('displays AI facts when available', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(screen.getByText('Test Fact')).toBeInTheDocument();
    expect(screen.getByText('This is a test fact about AI processing.')).toBeInTheDocument();
  });

  it('toggles content visibility when eye button is clicked', async () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    const toggleButton = screen.getByLabelText('Hide thinking details');
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.queryByText('Understanding your question...')).not.toBeInTheDocument();
    });
  });

  it('expands details when chevron button is clicked', async () => {
    const mockStateWithContent = {
      ...mockThinkingState,
      content: 'Detailed analysis of the machine learning question...'
    };
    
    (thinkingStateService.generateThinkingState as any).mockReturnValue(mockStateWithContent);

    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
        content="Detailed analysis content"
      />
    );

    const expandButton = screen.getByLabelText('Expand details');
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('Detailed analysis of the machine learning question...')).toBeInTheDocument();
    });
  });

  it('calls onVisibilityChange when visibility is toggled', () => {
    const onVisibilityChange = vi.fn();
    
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
        onVisibilityChange={onVisibilityChange}
      />
    );

    const toggleButton = screen.getByLabelText('Hide thinking details');
    fireEvent.click(toggleButton);

    expect(onVisibilityChange).toHaveBeenCalledWith(false);
  });

  it('applies correct CSS classes based on stage', () => {
    const { container } = render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="reasoning"
        messageContext={mockMessageContext}
      />
    );

    expect(container.firstChild).toHaveClass('thinking-reasoning');
  });

  it('applies correct CSS classes based on complexity', () => {
    const complexContext = {
      ...mockMessageContext,
      complexity: 'advanced' as const
    };

    const complexState = {
      ...mockThinkingState,
      complexity: 'advanced' as const
    };

    (thinkingStateService.generateThinkingState as any).mockReturnValue(complexState);

    const { container } = render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={complexContext}
      />
    );

    expect(container.firstChild).toHaveClass('complexity-advanced');
  });

  it('applies correct CSS classes based on message type', () => {
    const problemContext = {
      ...mockMessageContext,
      messageType: 'problem-solving' as const
    };

    const problemState = {
      ...mockThinkingState,
      messageType: 'problem-solving' as const
    };

    (thinkingStateService.generateThinkingState as any).mockReturnValue(problemState);

    const { container } = render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={problemContext}
      />
    );

    expect(container.firstChild).toHaveClass('type-problem-solving');
  });

  it('generates thinking state when message context changes', () => {
    const { rerender } = render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
      />
    );

    expect(thinkingStateService.generateThinkingState).toHaveBeenCalledWith(
      'analyzing',
      mockMessageContext,
      undefined
    );

    const newContext = {
      ...mockMessageContext,
      messageContent: 'How does neural networks work?'
    };

    rerender(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={newContext}
      />
    );

    expect(thinkingStateService.generateThinkingState).toHaveBeenCalledWith(
      'analyzing',
      newContext,
      undefined
    );
  });

  it('uses external progress when provided', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
        progress={85}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('estimates remaining time correctly', () => {
    render(
      <EnhancedThinkingIndicator
        isVisible={true}
        stage="analyzing"
        messageContext={mockMessageContext}
        progress={50}
      />
    );

    // With 50% progress and 2000ms estimated duration, remaining time should be ~1s
    expect(screen.getByText('~1s')).toBeInTheDocument();
  });
});