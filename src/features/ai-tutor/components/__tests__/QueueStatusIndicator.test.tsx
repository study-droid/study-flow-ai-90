/**
 * QueueStatusIndicator Component Tests
 * Tests for the queue status display component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueueStatusIndicator } from '../QueueStatusIndicator';

// Mock the request queue service
const mockQueueService = {
  onStatusChange: vi.fn(),
  getStatus: vi.fn()
};

vi.mock('../../services/request-queue.service', () => ({
  requestQueueService: mockQueueService
}));

describe('QueueStatusIndicator', () => {
  let statusCallback: (status: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the status change subscription
    mockQueueService.onStatusChange.mockImplementation((callback) => {
      statusCallback = callback;
      return () => {}; // Unsubscribe function
    });

    // Default status (no activity)
    mockQueueService.getStatus.mockReturnValue({
      queueLength: 0,
      processingCount: 0,
      rateLimitActive: false,
      estimatedWaitTime: 0,
      requestsInLastMinute: 0,
      nextAvailableSlot: Date.now()
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Visibility Logic', () => {
    it('should not render when there is no queue activity', () => {
      const { container } = render(<QueueStatusIndicator />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when there are queued requests', async () => {
      render(<QueueStatusIndicator />);

      // Simulate queue activity
      const activeStatus = {
        queueLength: 2,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 5000,
        requestsInLastMinute: 2,
        nextAvailableSlot: Date.now()
      };

      statusCallback(activeStatus);

      await waitFor(() => {
        expect(screen.getByText('2 requests queued')).toBeInTheDocument();
      });
    });

    it('should render when processing requests', async () => {
      render(<QueueStatusIndicator />);

      const processingStatus = {
        queueLength: 0,
        processingCount: 1,
        rateLimitActive: false,
        estimatedWaitTime: 0,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      };

      statusCallback(processingStatus);

      await waitFor(() => {
        expect(screen.getByText('Processing 1 request')).toBeInTheDocument();
      });
    });

    it('should render when rate limited', async () => {
      render(<QueueStatusIndicator />);

      const rateLimitedStatus = {
        queueLength: 0,
        processingCount: 0,
        rateLimitActive: true,
        estimatedWaitTime: 0,
        requestsInLastMinute: 10,
        nextAvailableSlot: Date.now() + 30000
      };

      statusCallback(rateLimitedStatus);

      await waitFor(() => {
        expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Messages', () => {
    it('should show correct message for single queued request', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 2000,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('1 request queued')).toBeInTheDocument();
      });
    });

    it('should show correct message for multiple queued requests', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 3,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 8000,
        requestsInLastMinute: 3,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('3 requests queued')).toBeInTheDocument();
      });
    });

    it('should show correct message for single processing request', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 1,
        rateLimitActive: false,
        estimatedWaitTime: 0,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('Processing 1 request')).toBeInTheDocument();
      });
    });

    it('should show correct message for multiple processing requests', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 2,
        rateLimitActive: false,
        estimatedWaitTime: 0,
        requestsInLastMinute: 2,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('Processing 2 requests')).toBeInTheDocument();
      });
    });

    it('should show combined message for processing and queued requests', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 3,
        processingCount: 2,
        rateLimitActive: false,
        estimatedWaitTime: 10000,
        requestsInLastMinute: 5,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('Processing 2, 3 queued')).toBeInTheDocument();
      });
    });

    it('should show rate limit message with wait time', async () => {
      const futureTime = Date.now() + 45000; // 45 seconds from now
      
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 0,
        rateLimitActive: true,
        estimatedWaitTime: 0,
        requestsInLastMinute: 10,
        nextAvailableSlot: futureTime
      });

      await waitFor(() => {
        expect(screen.getByText(/Rate limited - 1m wait/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Icons', () => {
    it('should show loading icon when processing', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 1,
        rateLimitActive: false,
        estimatedWaitTime: 0,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        const icon = document.querySelector('.animate-spin');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should show clock icon when queued', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 2,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 5000,
        requestsInLastMinute: 2,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('2 requests queued')).toBeInTheDocument();
      });
    });

    it('should show alert icon when rate limited', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 0,
        rateLimitActive: true,
        estimatedWaitTime: 0,
        requestsInLastMinute: 10,
        nextAvailableSlot: Date.now() + 30000
      });

      await waitFor(() => {
        expect(screen.getByText(/Rate limited/)).toBeInTheDocument();
      });
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color class for rate limited state', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 0,
        rateLimitActive: true,
        estimatedWaitTime: 0,
        requestsInLastMinute: 10,
        nextAvailableSlot: Date.now() + 30000
      });

      await waitFor(() => {
        const element = screen.getByText(/Rate limited/).closest('div');
        expect(element).toHaveClass('text-yellow-600');
      });
    });

    it('should apply correct color class for processing state', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 0,
        processingCount: 1,
        rateLimitActive: false,
        estimatedWaitTime: 0,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        const element = screen.getByText('Processing 1 request').closest('div');
        expect(element).toHaveClass('text-blue-600');
      });
    });

    it('should apply correct color class for queued state', async () => {
      render(<QueueStatusIndicator />);

      statusCallback({
        queueLength: 2,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 5000,
        requestsInLastMinute: 2,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        const element = screen.getByText('2 requests queued').closest('div');
        expect(element).toHaveClass('text-orange-600');
      });
    });
  });

  describe('Detailed Information', () => {
    it('should show estimated wait time when showDetails is true', async () => {
      render(<QueueStatusIndicator showDetails={true} />);

      statusCallback({
        queueLength: 2,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 8500, // 8.5 seconds
        requestsInLastMinute: 2,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('(~9s)')).toBeInTheDocument();
      });
    });

    it('should show requests per minute when showDetails is true', async () => {
      render(<QueueStatusIndicator showDetails={true} />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 2000,
        requestsInLastMinute: 5,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('5/min')).toBeInTheDocument();
      });
    });

    it('should not show details when showDetails is false', async () => {
      render(<QueueStatusIndicator showDetails={false} />);

      statusCallback({
        queueLength: 2,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 8500,
        requestsInLastMinute: 5,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('2 requests queued')).toBeInTheDocument();
        expect(screen.queryByText('(~9s)')).not.toBeInTheDocument();
        expect(screen.queryByText('5/min')).not.toBeInTheDocument();
      });
    });
  });

  describe('Time Formatting', () => {
    it('should format milliseconds correctly', async () => {
      render(<QueueStatusIndicator showDetails={true} />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 500, // Less than 1 second
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('(~Less than 1s)')).toBeInTheDocument();
      });
    });

    it('should format seconds correctly', async () => {
      render(<QueueStatusIndicator showDetails={true} />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 15000, // 15 seconds
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('(~15s)')).toBeInTheDocument();
      });
    });

    it('should format minutes correctly', async () => {
      render(<QueueStatusIndicator showDetails={true} />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 90000, // 1.5 minutes
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        expect(screen.getByText('(~2m)')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', async () => {
      render(<QueueStatusIndicator className="custom-class" />);

      statusCallback({
        queueLength: 1,
        processingCount: 0,
        rateLimitActive: false,
        estimatedWaitTime: 2000,
        requestsInLastMinute: 1,
        nextAvailableSlot: Date.now()
      });

      await waitFor(() => {
        const element = screen.getByText('1 request queued').closest('div');
        expect(element).toHaveClass('custom-class');
      });
    });
  });
});