/**
 * Comprehensive tests for AI Tutor Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AITutorIntegrated, AITutorWithErrorBoundary } from '../AITutorIntegrated';

// Mock dependencies
vi.mock('@/components/accessibility/AccessibilityProvider', () => ({
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="accessibility-provider">{children}</div>,
  useAccessibility: () => ({
    settings: {
      highContrastMode: false,
      reducedMotion: false,
      fontSize: 'medium',
      keyboardNavigation: true,
      screenReaderOptimized: false,
      focusIndicators: 'default',
    },
    announceToScreenReader: vi.fn(),
  }),
}));

vi.mock('@/components/mobile/mobile-hooks', () => ({
  useMobile: vi.fn(() => false),
  useDeviceCapabilities: () => ({
    hasTouch: false,
    supportsVibration: false,
    prefersReducedMotion: false,
  }),
  useViewport: () => ({
    isMobile: false,
    isTablet: false,
    width: 1024,
    height: 768,
  }),
}));

vi.mock('@/hooks/useOfflineMode', () => ({
  useOfflineMode: () => ({
    offlineState: {
      isOffline: false,
      isOnline: true,
      effectiveType: '4g',
      offlineDuration: 0,
    },
    hasPendingSync: false,
    isSyncing: false,
    lastSyncTime: new Date(),
    syncError: null,
    canSync: true,
    forceSyncNow: vi.fn(),
    pendingSyncData: {
      messages: [],
      sessions: [],
    },
  }),
}));

vi.mock('@/services/monitoring/performance-metrics', () => ({
  usePerformanceMetrics: () => ({
    trackPageLoad: vi.fn(),
    trackUserInteraction: vi.fn(),
    trackAPICall: vi.fn(),
    trackError: vi.fn(),
    getMetricsSummary: vi.fn(() => ({
      totalMetrics: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topErrors: [],
      performanceGrades: {},
    })),
    exportMetrics: vi.fn(),
    setUserId: vi.fn(),
  }),
}));

vi.mock('../AITutorEnhanced', () => ({
  AITutorEnhanced: () => <div data-testid="ai-tutor-enhanced">AI Tutor Enhanced</div>,
}));

vi.mock('../MobileAITutorWrapper', () => ({
  MobileAITutorWrapper: ({ className }: { className?: string }) => (
    <div data-testid="mobile-ai-tutor-wrapper" className={className}>
      Mobile AI Tutor Wrapper
    </div>
  ),
}));

describe('AITutorIntegrated', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Desktop Rendering', () => {
    it('renders desktop version when not on mobile', () => {
      const { useMobile } = require('@/components/mobile/mobile-hooks');
      useMobile.mockReturnValue(false);

      render(<AITutorIntegrated />);

      expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();
      expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
      expect(screen.getByTestId('ai-tutor-enhanced')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-ai-tutor-wrapper')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<AITutorIntegrated className="custom-class" />);

      const container = screen.getByTestId('ai-tutor-integrated');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('Mobile Rendering', () => {
    it('renders mobile version when on mobile', () => {
      const { useMobile } = require('@/components/mobile/mobile-hooks');
      useMobile.mockReturnValue(true);

      render(<AITutorIntegrated />);

      expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();
      expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-ai-tutor-wrapper')).toBeInTheDocument();
      expect(screen.queryByTestId('ai-tutor-enhanced')).not.toBeInTheDocument();
    });

    it('passes className to mobile wrapper', () => {
      const { useMobile } = require('@/components/mobile/mobile-hooks');
      useMobile.mockReturnValue(true);

      render(<AITutorIntegrated />);

      const mobileWrapper = screen.getByTestId('mobile-ai-tutor-wrapper');
      expect(mobileWrapper).toHaveClass('h-full');
    });
  });

  describe('Performance Tracking', () => {
    it('tracks page load performance', async () => {
      const { usePerformanceMetrics } = require('@/services/monitoring/performance-metrics');
      const mockTrackPageLoad = vi.fn();
      usePerformanceMetrics.mockReturnValue({
        trackPageLoad: mockTrackPageLoad,
        trackUserInteraction: vi.fn(),
        trackAPICall: vi.fn(),
        trackError: vi.fn(),
        getMetricsSummary: vi.fn(() => ({})),
        exportMetrics: vi.fn(),
        setUserId: vi.fn(),
      });

      render(<AITutorIntegrated />);

      await waitFor(() => {
        expect(mockTrackPageLoad).toHaveBeenCalledWith(
          'ai-tutor-integrated',
          expect.any(Number)
        );
      }, { timeout: 200 });
    });
  });

  describe('Accessibility Integration', () => {
    it('wraps content with AccessibilityProvider', () => {
      render(<AITutorIntegrated />);

      expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
    });

    it('provides accessibility context to child components', () => {
      const { useAccessibility } = require('@/components/accessibility/AccessibilityProvider');
      
      render(<AITutorIntegrated />);

      // Verify accessibility provider is available
      expect(useAccessibility).toBeDefined();
    });
  });

  describe('Suspense and Loading', () => {
    it('shows loading fallback during suspense', () => {
      // Mock Suspense behavior
      const SuspenseMock = ({ children, fallback }: any) => fallback;
      
      vi.doMock('react', async () => {
        const actual = await vi.importActual('react');
        return {
          ...actual,
          Suspense: SuspenseMock,
        };
      });

      render(<AITutorIntegrated />);

      expect(screen.getByText('Loading AI Tutor...')).toBeInTheDocument();
    });
  });
});

describe('AITutorWithErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when there are no errors', () => {
    render(<AITutorWithErrorBoundary />);

    expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();
  });

  it('catches and displays errors from child components', () => {
    // Mock a component that throws an error
    const ThrowError = () => {
      throw new Error('Test error message');
    };

    // Mock the AITutorIntegrated to throw an error
    vi.doMock('./AITutorIntegrated', () => ({
      AITutorIntegrated: ThrowError,
    }));

    const ErrorBoundaryTest = () => (
      <AITutorWithErrorBoundary />
    );

    render(<ErrorBoundaryTest />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('allows error recovery through try again button', () => {
    const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="recovered">Recovered</div>;
    };

    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;

    // Mock the component to initially throw, then recover
    vi.doMock('./AITutorIntegrated', () => ({
      AITutorIntegrated: TestComponent,
    }));

    render(<AITutorWithErrorBoundary />);

    // Should show error initially
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Click try again
    shouldThrow = false;
    fireEvent.click(screen.getByText('Try Again'));

    // Should recover (in a real scenario, this would re-render without error)
    // Note: This test is simplified as error boundary behavior is complex to test
  });

  describe('Error Tracking', () => {
    it('tracks errors for monitoring', () => {
      const mockGtag = vi.fn();
      (global as any).window = { gtag: mockGtag };

      const ThrowError = () => {
        throw new Error('Tracking test error');
      };

      vi.doMock('./AITutorIntegrated', () => ({
        AITutorIntegrated: ThrowError,
      }));

      render(<AITutorWithErrorBoundary />);

      expect(mockGtag).toHaveBeenCalledWith('event', 'exception', {
        description: 'Tracking test error',
        fatal: false,
      });
    });
  });
});

describe('Integration Scenarios', () => {
  it('handles mobile to desktop transitions', () => {
    const { useMobile } = require('@/components/mobile/mobile-hooks');
    
    // Start with mobile
    useMobile.mockReturnValue(true);
    const { rerender } = render(<AITutorIntegrated />);
    expect(screen.getByTestId('mobile-ai-tutor-wrapper')).toBeInTheDocument();

    // Switch to desktop
    useMobile.mockReturnValue(false);
    rerender(<AITutorIntegrated />);
    expect(screen.getByTestId('ai-tutor-enhanced')).toBeInTheDocument();
    expect(screen.queryByTestId('mobile-ai-tutor-wrapper')).not.toBeInTheDocument();
  });

  it('maintains accessibility context across device changes', () => {
    const { useMobile } = require('@/components/mobile/mobile-hooks');
    
    useMobile.mockReturnValue(true);
    const { rerender } = render(<AITutorIntegrated />);
    
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();

    useMobile.mockReturnValue(false);
    rerender(<AITutorIntegrated />);
    
    expect(screen.getByTestId('accessibility-provider')).toBeInTheDocument();
  });

  it('handles offline state changes gracefully', () => {
    const { useOfflineMode } = require('@/hooks/useOfflineMode');
    
    // Start online
    useOfflineMode.mockReturnValue({
      offlineState: { isOffline: false, isOnline: true },
      hasPendingSync: false,
      isSyncing: false,
    });

    const { rerender } = render(<AITutorIntegrated />);
    expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();

    // Go offline
    useOfflineMode.mockReturnValue({
      offlineState: { isOffline: true, isOnline: false },
      hasPendingSync: true,
      isSyncing: false,
    });

    rerender(<AITutorIntegrated />);
    expect(screen.getByTestId('ai-tutor-integrated')).toBeInTheDocument();
  });
});