/**
 * Tests for DeepSeekMessageBubble component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeepSeekMessageBubble } from '../DeepSeekMessageBubble';
import type { ChatMessage } from '@/features/ai-tutor/types';

// Mock dependencies
vi.mock('@/services/ai/deepseek-validator', () => ({
  validateDeepSeekResponse: vi.fn(() => ({
    isValid: true,
    processedResponse: {
      formattedResponse: {
        content: 'Processed content',
        metadata: { responseType: 'explanation', difficulty: 'medium', estimatedReadTime: 2 },
        structure: { headers: [], sections: [], codeBlocks: [] }
      },
      qualityAssessment: {
        overallScore: 85,
        breakdown: { structure: 80, consistency: 85, formatting: 90, completeness: 85, educational: 80 },
        recommendations: ['Great response!']
      },
      processingMetadata: {
        processingTime: 150,
        stepsCompleted: ['validation', 'processing'],
        warnings: [],
        optimizations: []
      }
    },
    qualityAssessment: {
      overallScore: 85,
      breakdown: { structure: 80, consistency: 85, formatting: 90, completeness: 85, educational: 80 },
      recommendations: ['Great response!']
    },
    fallbacksUsed: [],
    warnings: [],
    validationMetrics: {
      processingTime: 150,
      contentLength: 100,
      markdownElements: 5,
      codeBlocks: 1,
      validationScore: 85,
      educationalScore: 80
    }
  }))
}));

vi.mock('@/services/markdown-response-processor', () => ({
  MarkdownResponseProcessor: {
    processResponse: vi.fn(() => ({
      content: 'Processed markdown content',
      metadata: {
        contentType: 'explanation',
        wordCount: 50,
        estimatedReadTime: 2,
        headers: [],
        codeBlocks: [],
        isComplete: true,
        hasMarkdown: true
      },
      quality: {
        overall: 85,
        structure: 80,
        formatting: 90,
        completeness: 85,
        readability: 80
      },
      renderingHints: {
        shouldUseStreaming: false,
        preferredRenderer: 'markdown',
        customStyles: []
      },
      warnings: []
    }))
  }
}));

vi.mock('@/features/ai-tutor/services/motivational-words.service', () => ({
  motivationalWordsService: {
    getWordForMessageRole: vi.fn(() => 'Brilliant!')
  }
}));

vi.mock('@/components/ai-tutor/ProfessionalResponseRenderer', () => ({
  ProfessionalResponseRenderer: ({ result, fallbackContent }: any) => (
    <div data-testid="professional-renderer">
      {result ? 'Professional rendered content' : fallbackContent}
    </div>
  )
}));

vi.mock('@/features/ai-tutor/components/AIThinkingBubble', () => ({
  AIThinkingBubble: ({ content }: any) => (
    <div data-testid="thinking-bubble">{content}</div>
  )
}));

describe('DeepSeekMessageBubble', () => {
  const mockUserMessage: ChatMessage = {
    id: '1',
    role: 'user',
    content: 'Hello, can you help me?',
    sessionId: 'test-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockAssistantMessage: ChatMessage = {
    id: '2',
    role: 'assistant',
    content: '# Hello!\n\nI can help you with your studies.\n\n```javascript\nconsole.log("Hello World");\n```',
    sessionId: 'test-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockErrorMessage: ChatMessage = {
    id: '3',
    role: 'assistant',
    content: 'An error occurred',
    type: 'error',
    sessionId: 'test-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user message correctly', () => {
    render(<DeepSeekMessageBubble message={mockUserMessage} />);
    
    expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument();
    expect(screen.getByText('Brilliant!')).toBeInTheDocument();
  });

  it('renders assistant message with professional renderer', () => {
    render(<DeepSeekMessageBubble message={mockAssistantMessage} />);
    
    expect(screen.getByTestId('professional-renderer')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek AI')).toBeInTheDocument();
    expect(screen.getByText('Validated')).toBeInTheDocument();
  });

  it('shows thinking bubble when loading', () => {
    const loadingMessage = { ...mockAssistantMessage, content: '' };
    
    render(
      <DeepSeekMessageBubble 
        message={loadingMessage} 
        isLoading={true}
        thinkingState={{
          isVisible: true,
          content: 'Processing...',
          stage: 'analyzing'
        }}
      />
    );
    
    expect(screen.getByTestId('thinking-bubble')).toBeInTheDocument();
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('displays error message correctly', () => {
    render(<DeepSeekMessageBubble message={mockErrorMessage} />);
    
    expect(screen.getByText('DeepSeek Error')).toBeInTheDocument();
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('handles copy functionality', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    render(<DeepSeekMessageBubble message={mockUserMessage} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello, can you help me?');
    });
  });

  it('handles feedback correctly', () => {
    const mockFeedback = vi.fn();
    
    render(
      <DeepSeekMessageBubble 
        message={mockAssistantMessage} 
        onFeedback={mockFeedback}
      />
    );
    
    const thumbsUpButton = screen.getByRole('button', { name: /thumbs up/i });
    fireEvent.click(thumbsUpButton);
    
    expect(mockFeedback).toHaveBeenCalledWith('2', 'helpful');
  });

  it('shows quality metrics when enabled', () => {
    render(
      <DeepSeekMessageBubble 
        message={mockAssistantMessage} 
        showMetrics={true}
      />
    );
    
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('toggles between enhanced and raw view', () => {
    render(<DeepSeekMessageBubble message={mockAssistantMessage} />);
    
    const toggleButton = screen.getByRole('button', { name: /raw/i });
    fireEvent.click(toggleButton);
    
    expect(screen.getByRole('button', { name: /enhanced/i })).toBeInTheDocument();
  });

  it('handles processing errors gracefully', () => {
    // Mock validation to throw error
    const { validateDeepSeekResponse } = require('@/services/ai/deepseek-validator');
    validateDeepSeekResponse.mockImplementationOnce(() => {
      throw new Error('Processing failed');
    });

    render(
      <DeepSeekMessageBubble 
        message={mockAssistantMessage} 
        enableFallback={true}
      />
    );
    
    // Should still render the message, possibly with fallback
    expect(screen.getByText('DeepSeek AI')).toBeInTheDocument();
  });

  it('displays processing warnings', () => {
    // Mock validation with warnings
    const { validateDeepSeekResponse } = require('@/services/ai/deepseek-validator');
    validateDeepSeekResponse.mockReturnValueOnce({
      isValid: true,
      processedResponse: {
        formattedResponse: {
          content: 'Content',
          metadata: { responseType: 'explanation', difficulty: 'medium', estimatedReadTime: 1 },
          structure: { headers: [], sections: [], codeBlocks: [] }
        },
        qualityAssessment: { overallScore: 70, breakdown: {}, recommendations: [] },
        processingMetadata: { processingTime: 100, stepsCompleted: [], warnings: [], optimizations: [] }
      },
      qualityAssessment: { overallScore: 70, breakdown: {}, recommendations: [] },
      fallbacksUsed: [],
      warnings: ['Warning 1', 'Warning 2'],
      validationMetrics: {
        processingTime: 100,
        contentLength: 50,
        markdownElements: 2,
        codeBlocks: 0,
        validationScore: 70,
        educationalScore: 75
      }
    });

    render(<DeepSeekMessageBubble message={mockAssistantMessage} />);
    
    expect(screen.getByText('2 warning(s)')).toBeInTheDocument();
  });
});