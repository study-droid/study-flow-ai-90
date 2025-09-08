/**
 * Provider Selector Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProviderSelector } from '../ProviderSelector';
import { useAITutor } from '../../hooks/useAITutor';
import { aiTutorService } from '../../services/ai-tutor.service';

// Mock dependencies
vi.mock('../../hooks/useAITutor');
vi.mock('../../services/ai-tutor.service');

const mockUseAITutor = vi.mocked(useAITutor);
const mockAITutorService = vi.mocked(aiTutorService);

const mockProviders = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'direct-api',
    capabilities: ['text-generation', 'code-generation', 'reasoning'],
    status: 'online' as const,
    priority: 1,
    responseTime: 500,
    errorRate: 0.02
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'direct-api',
    capabilities: ['text-generation', 'reasoning', 'creative-writing'],
    status: 'degraded' as const,
    priority: 2,
    responseTime: 800,
    errorRate: 0.05
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'direct-api',
    capabilities: ['text-generation', 'reasoning'],
    status: 'offline' as const,
    priority: 3,
    responseTime: 1200,
    errorRate: 0.1
  }
];

describe('ProviderSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseAITutor.mockReturnValue({
      serviceHealth: {
        overallHealth: 'healthy',
        providers: [],
        lastCheck: new Date(),
        metrics: {
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          averageResponseTime: 600
        }
      },
      errorRecovery: {
        canRetry: false,
        isRecovering: false,
        retryLastOperation: vi.fn(),
        resetServices: vi.fn(),
        getErrorInfo: vi.fn(),
        getServiceHealth: vi.fn()
      }
    } as any);

    mockAITutorService.getAvailableProviders.mockReturnValue(mockProviders);
    mockAITutorService.switchProvider.mockReturnValue(true);
  });

  it('renders provider list correctly', () => {
    render(<ProviderSelector />);

    expect(screen.getByText('AI Provider Selection')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic Claude')).toBeInTheDocument();
  });

  it('displays provider status correctly', () => {
    render(<ProviderSelector />);

    // Check status indicators are present
    const onlineStatus = screen.getByText('Online');
    const degradedStatus = screen.getByText('Degraded');
    const offlineStatus = screen.getByText('Offline');

    expect(onlineStatus).toBeInTheDocument();
    expect(degradedStatus).toBeInTheDocument();
    expect(offlineStatus).toBeInTheDocument();
  });

  it('shows provider capabilities', () => {
    render(<ProviderSelector />);

    // Check for capability badges with proper text transformation
    const textGenElements = screen.getAllByText(/text.generation/i);
    const codeGenElements = screen.getAllByText(/code.generation/i);
    const reasoningElements = screen.getAllByText(/reasoning/i);
    
    expect(textGenElements.length).toBeGreaterThan(0);
    expect(codeGenElements.length).toBeGreaterThan(0);
    expect(reasoningElements.length).toBeGreaterThan(0);
  });

  it('handles provider selection', async () => {
    const onProviderChange = vi.fn();
    render(<ProviderSelector onProviderChange={onProviderChange} />);

    const deepSeekCard = screen.getByText('DeepSeek').closest('.provider-card');
    expect(deepSeekCard).toBeInTheDocument();

    fireEvent.click(deepSeekCard!);

    await waitFor(() => {
      expect(mockAITutorService.switchProvider).toHaveBeenCalledWith('deepseek');
      expect(onProviderChange).toHaveBeenCalledWith('deepseek');
    });
  });

  it('displays recommended provider badge', () => {
    render(<ProviderSelector />);

    // DeepSeek should be recommended (highest score: online, priority 1, good performance)
    const recommendedBadge = screen.getByText('Recommended');
    expect(recommendedBadge).toBeInTheDocument();
  });

  it('shows provider comparison when enabled', () => {
    render(<ProviderSelector showComparison={true} />);

    expect(screen.getByText('Provider Comparison')).toBeInTheDocument();
    
    // Check table headers
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Response Time')).toBeInTheDocument();
    expect(screen.getByText('Capabilities')).toBeInTheDocument();
  });

  it('handles refresh functionality', async () => {
    render(<ProviderSelector />);

    const refreshButton = screen.getByTitle('Refresh provider status');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockUseAITutor().errorRecovery.resetServices).toHaveBeenCalled();
    });
  });

  it('renders in compact mode', () => {
    render(<ProviderSelector compact={true} />);

    // In compact mode, it shows the current provider name instead of "Select Provider"
    const compactButton = screen.getByText('DeepSeek');
    expect(compactButton).toBeInTheDocument();

    // Provider list should not be visible initially
    expect(screen.queryByText('AI Provider Selection')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(compactButton);
    expect(screen.getByText('AI Provider Selection')).toBeInTheDocument();
  });

  it('shows provider details on toggle', async () => {
    render(<ProviderSelector />);

    const showDetailsButton = screen.getAllByText('Show Details')[0];
    fireEvent.click(showDetailsButton);

    await waitFor(() => {
      expect(screen.getByText('Priority:')).toBeInTheDocument();
      expect(screen.getByText('Error Rate:')).toBeInTheDocument();
    });

    // Click again to hide
    const hideDetailsButton = screen.getByText('Hide Details');
    fireEvent.click(hideDetailsButton);

    await waitFor(() => {
      expect(screen.queryByText('Priority:')).not.toBeInTheDocument();
    });
  });

  it('displays no providers message when empty', () => {
    mockAITutorService.getAvailableProviders.mockReturnValue([]);
    
    render(<ProviderSelector />);

    expect(screen.getByText('No AI providers available')).toBeInTheDocument();
    expect(screen.getByText('Refresh to check again')).toBeInTheDocument();
  });

  it('handles provider switch failure gracefully', async () => {
    mockAITutorService.switchProvider.mockReturnValue(false);
    
    const onProviderChange = vi.fn();
    render(<ProviderSelector onProviderChange={onProviderChange} />);

    const deepSeekCard = screen.getByText('DeepSeek').closest('.provider-card');
    fireEvent.click(deepSeekCard!);

    await waitFor(() => {
      expect(mockAITutorService.switchProvider).toHaveBeenCalledWith('deepseek');
      expect(onProviderChange).not.toHaveBeenCalled();
    });
  });

  it('calculates provider scores correctly', () => {
    render(<ProviderSelector />);

    // DeepSeek should have the highest score (online, priority 1, good performance)
    const scores = screen.getAllByText(/Score: \d+\/100/);
    expect(scores.length).toBeGreaterThan(0);
    
    // Check that scores are displayed
    expect(scores[0]).toHaveTextContent(/Score: \d+\/100/);
  });

  it('shows provider selection tips', () => {
    render(<ProviderSelector />);

    expect(screen.getByText('Provider Selection Tips:')).toBeInTheDocument();
    expect(screen.getByText(/Recommended providers offer the best balance/)).toBeInTheDocument();
    expect(screen.getByText(/Switching providers preserves your conversation context/)).toBeInTheDocument();
  });

  it('handles current provider highlighting', () => {
    render(<ProviderSelector currentProvider="deepseek" />);

    const deepSeekCard = screen.getByText('DeepSeek').closest('.provider-card');
    expect(deepSeekCard).toHaveClass('border-blue-500', 'bg-blue-50');
  });

  it('displays response times correctly', () => {
    render(<ProviderSelector />);

    expect(screen.getByText('500ms')).toBeInTheDocument();
    expect(screen.getByText('800ms')).toBeInTheDocument();
    expect(screen.getByText('1200ms')).toBeInTheDocument();
  });
});