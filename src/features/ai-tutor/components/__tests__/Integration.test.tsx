/**
 * Simple integration test for AI Tutor components
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import { AITutorIntegrated } from '../AITutorIntegrated';

// Mock all dependencies
vi.mock('@/components/accessibility/AccessibilityProvider', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="accessibility-provider">{children}</div>
  ),
}));

vi.mock('@/components/mobile/mobile-hooks', () => ({
  useMobile: () => false,
}));

vi.mock('@/services/monitoring/performance-metrics', () => ({
  usePerformanceMetrics: () => ({
    trackPageLoad: vi.fn(),
  }),
}));

vi.mock('../AITutorEnhanced', () => ({
  AITutorEnhanced: () => <div data-testid="ai-tutor-enhanced">AI Tutor Enhanced</div>,
}));

vi.mock('../MobileAITutorWrapper', () => ({
  MobileAITutorWrapper: () => <div data-testid="mobile-wrapper">Mobile Wrapper</div>,
}));

describe('AI Tutor Integration', () => {
  it('renders the integrated component successfully', () => {
    render(<AITutorIntegrated />);
    
    expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
    expect(screen.getByTestId('ai-tutor-enhanced')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<AITutorIntegrated className="test-class" />);
    
    const container = screen.getByTestId('ai-tutor-integrated');
    expect(container).toHaveClass('test-class');
  });
});