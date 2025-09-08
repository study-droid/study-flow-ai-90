/**
 * Tests for mobile responsiveness and touch optimization
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MobileAITutorWrapper } from '../MobileAITutorWrapper';
import { useMobile, useViewport, useDeviceCapabilities } from '@/components/mobile/mobile-hooks';

// Mock the hooks
vi.mock('@/components/mobile/mobile-hooks', () => ({
  useMobile: vi.fn(),
  useViewport: vi.fn(),
  useDeviceCapabilities: vi.fn(),
  useKeyboardHeight: vi.fn(() => ({ keyboardHeight: 0, isKeyboardVisible: false })),
}));

// Mock the AI Tutor component
vi.mock('../AITutorEnhanced', () => ({
  AITutorEnhanced: () => <div data-testid="ai-tutor-enhanced">AI Tutor Enhanced</div>
}));

describe('Mobile Responsiveness and Touch Optimization', () => {
  const mockUseMobile = useMobile as vi.MockedFunction<typeof useMobile>;
  const mockUseViewport = useViewport as vi.MockedFunction<typeof useViewport>;
  const mockUseDeviceCapabilities = useDeviceCapabilities as vi.MockedFunction<typeof useDeviceCapabilities>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Default mock values
    mockUseMobile.mockReturnValue(false);
    mockUseViewport.mockReturnValue({
      width: 1024,
      height: 768,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });
    mockUseDeviceCapabilities.mockReturnValue({
      hasTouch: false,
      hasHover: true,
      hasPointer: true,
      prefersReducedMotion: false,
      supportsVibration: false,
    });

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Responsive Layout', () => {
    it('should render mobile layout on mobile devices', () => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      render(<MobileAITutorWrapper />);
      
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });

    it('should render tablet layout on tablet devices', () => {
      mockUseViewport.mockReturnValue({
        width: 768,
        height: 1024,
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      });

      render(<MobileAITutorWrapper />);
      
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });

    it('should render desktop layout on desktop devices', () => {
      mockUseViewport.mockReturnValue({
        width: 1920,
        height: 1080,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });

      render(<MobileAITutorWrapper />);
      
      expect(screen.getByTestId('ai-tutor-enhanced')).toBeInTheDocument();
    });
  });

  describe('Touch Interactions', () => {
    beforeEach(() => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
      
      mockUseDeviceCapabilities.mockReturnValue({
        hasTouch: true,
        hasHover: false,
        hasPointer: false,
        prefersReducedMotion: false,
        supportsVibration: true,
      });
    });

    it('should handle touch gestures', async () => {
      render(<MobileAITutorWrapper />);
      
      const swipeArea = screen.getByTestId('ai-tutor-enhanced').parentElement;
      
      // Simulate swipe left with sufficient distance
      fireEvent.touchStart(swipeArea!, {
        touches: [{ clientX: 200, clientY: 100 }]
      });
      
      fireEvent.touchMove(swipeArea!, {
        touches: [{ clientX: 100, clientY: 100 }]
      });
      
      fireEvent.touchEnd(swipeArea!);
      
      // Should trigger haptic feedback if supported
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('should provide haptic feedback on button press', () => {
      render(<MobileAITutorWrapper />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);
      
      expect(navigator.vibrate).toHaveBeenCalledWith(25);
    });

    it('should show swipe hint on first mobile visit', async () => {
      // Mock localStorage to simulate first visit
      const localStorageMock = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
        writable: true,
      });

      render(<MobileAITutorWrapper />);
      
      await waitFor(() => {
        expect(screen.getByText(/swipe left for history/i)).toBeInTheDocument();
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('ai-tutor-swipe-hint-shown', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper touch target sizes', () => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      render(<MobileAITutorWrapper />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Check if button has touch-optimized classes
        expect(button.className).toMatch(/min-h-\[44px\]|min-w-\[44px\]/);
      });
    });

    it('should support keyboard navigation', () => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      render(<MobileAITutorWrapper />);
      
      const buttons = screen.getAllByRole('button');
      // Buttons should be focusable (have tabIndex 0 or be naturally focusable)
      buttons.forEach(button => {
        expect(button.tabIndex).toBeGreaterThanOrEqual(0);
      });
    });

    it('should respect reduced motion preferences', () => {
      mockUseDeviceCapabilities.mockReturnValue({
        hasTouch: true,
        hasHover: false,
        hasPointer: false,
        prefersReducedMotion: true,
        supportsVibration: false,
      });

      const { container } = render(<MobileAITutorWrapper />);
      
      expect(container.firstChild).toHaveClass('motion-reduce');
    });
  });

  describe('Performance Optimizations', () => {
    it('should apply performance optimizations for mobile', () => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      const { container } = render(<MobileAITutorWrapper />);
      
      // Should have touch-manipulation class for better touch performance
      const touchElements = container.querySelectorAll('.touch-manipulation');
      expect(touchElements.length).toBeGreaterThan(0);
    });

    it('should handle viewport changes', () => {
      const { rerender } = render(<MobileAITutorWrapper />);
      
      // Change viewport to mobile
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
      
      rerender(<MobileAITutorWrapper />);
      
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });
  });

  describe('Fullscreen Mode', () => {
    beforeEach(() => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
    });

    it('should toggle fullscreen mode', () => {
      render(<MobileAITutorWrapper />);
      
      const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i });
      fireEvent.click(fullscreenButton);
      
      // Should change to minimize icon
      expect(screen.getByRole('button', { name: /exit fullscreen/i })).toBeInTheDocument();
    });

    it('should apply fullscreen styles', () => {
      const { container } = render(<MobileAITutorWrapper />);
      
      const fullscreenButton = screen.getByRole('button', { name: /enter fullscreen/i });
      fireEvent.click(fullscreenButton);
      
      expect(container.firstChild).toHaveClass('fixed', 'inset-0', 'z-50');
    });
  });

  describe('Mobile Menu', () => {
    beforeEach(() => {
      mockUseViewport.mockReturnValue({
        width: 375,
        height: 667,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
    });

    it('should open mobile menu', () => {
      render(<MobileAITutorWrapper />);
      
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);
      
      expect(screen.getByText('Menu')).toBeInTheDocument();
      expect(screen.getByText('New Chat')).toBeInTheDocument();
    });

    it('should close mobile menu', () => {
      render(<MobileAITutorWrapper />);
      
      // Open menu
      const menuButton = screen.getByRole('button', { name: /open menu/i });
      fireEvent.click(menuButton);
      
      // Close menu - get the one in the mobile menu panel
      const closeButtons = screen.getAllByRole('button', { name: /close menu/i });
      const menuCloseButton = closeButtons.find(btn => btn.className.includes('h-8 w-8'));
      fireEvent.click(menuCloseButton!);
      
      expect(screen.queryByText('Menu')).not.toBeInTheDocument();
    });
  });
});