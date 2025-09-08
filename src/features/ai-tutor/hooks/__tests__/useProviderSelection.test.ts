/**
 * Provider Selection Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useProviderSelection } from '../useProviderSelection';
import { aiTutorService } from '../../services/ai-tutor.service';
import { aiProviderRouter } from '@/services/ai/ai-provider-router';

// Mock dependencies
vi.mock('../../services/ai-tutor.service', () => ({
  aiTutorService: {
    getAvailableProviders: vi.fn(),
    switchProvider: vi.fn(),
  }
}));

vi.mock('@/services/ai/ai-provider-router', () => ({
  aiProviderRouter: {
    getAvailableProviders: vi.fn(() => []),
    getAllProviderHealth: vi.fn(() => []),
  }
}));

const mockAITutorService = vi.mocked(aiTutorService);
const mockAIProviderRouter = vi.mocked(aiProviderRouter);

const mockProviders = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    type: 'direct-api',
    capabilities: ['text-generation', 'code-generation', 'reasoning'],
    status: 'online' as const,
    priority: 1,
    responseTime: 500,
    errorRate: 0.02,
    lastSuccess: new Date(),
    models: ['deepseek-chat', 'deepseek-coder'],
    config: {} as any,
    health: {} as any
  },
  {
    id: 'openai',
    name: 'OpenAI',
    type: 'direct-api',
    capabilities: ['text-generation', 'reasoning', 'creative-writing'],
    status: 'degraded' as const,
    priority: 2,
    responseTime: 800,
    errorRate: 0.05,
    lastSuccess: new Date(Date.now() - 60000),
    models: ['gpt-4', 'gpt-3.5-turbo'],
    config: {} as any,
    health: {} as any
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    type: 'direct-api',
    capabilities: ['text-generation', 'reasoning'],
    status: 'offline' as const,
    priority: 3,
    responseTime: 1200,
    errorRate: 0.1,
    lastSuccess: new Date(Date.now() - 300000),
    models: ['claude-3-sonnet'],
    config: {} as any,
    health: {} as any
  }
];

describe('useProviderSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAITutorService.getAvailableProviders.mockReturnValue(mockProviders);
    mockAITutorService.switchProvider.mockReturnValue(true);
    
    mockAIProviderRouter.getAvailableProviders.mockReturnValue([]);
    mockAIProviderRouter.getAllProviderHealth.mockReturnValue([]);
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useProviderSelection());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.availableProviders).toEqual([]);
    expect(result.current.currentProvider).toBe(null);
  });

  it('fetches providers on mount', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockAITutorService.getAvailableProviders).toHaveBeenCalled();
    expect(result.current.availableProviders).toEqual(mockProviders);
  });

  it('switches provider successfully', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let switchResult: any;
    await act(async () => {
      switchResult = await result.current.switchProvider('deepseek');
    });

    expect(switchResult.success).toBe(true);
    expect(switchResult.newProvider).toBe('deepseek');
    expect(mockAITutorService.switchProvider).toHaveBeenCalledWith('deepseek');
    expect(result.current.currentProvider).toBe('deepseek');
  });

  it('handles provider switch failure', async () => {
    mockAITutorService.switchProvider.mockReturnValue(false);
    
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let switchResult: any;
    await act(async () => {
      switchResult = await result.current.switchProvider('deepseek');
    });

    expect(switchResult.success).toBe(false);
    expect(switchResult.error).toContain('Failed to switch');
    expect(result.current.currentProvider).toBe(null);
  });

  it('prevents switching to offline provider', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let switchResult: any;
    await act(async () => {
      switchResult = await result.current.switchProvider('anthropic');
    });

    expect(switchResult.success).toBe(false);
    expect(switchResult.error).toContain('currently offline');
  });

  it('generates provider recommendations correctly', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const recommendations = result.current.getProviderRecommendations();

    expect(recommendations).toHaveLength(3);
    expect(recommendations[0].providerId).toBe('deepseek'); // Should be highest scored
    expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
  });

  it('filters recommendations by capabilities', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const recommendations = result.current.getProviderRecommendations({
      requiredCapabilities: ['code-generation']
    });

    expect(recommendations).toHaveLength(1);
    expect(recommendations[0].providerId).toBe('deepseek');
  });

  it('finds best provider for capability', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const bestProvider = result.current.getBestProviderForCapability('code-generation');

    expect(bestProvider?.id).toBe('deepseek');
  });

  it('checks if provider switching is available', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.canSwitchProvider('deepseek')).toBe(true);
    expect(result.current.canSwitchProvider('openai')).toBe(true);
    expect(result.current.canSwitchProvider('anthropic')).toBe(false); // offline
  });

  it('provides provider comparison data', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const comparison = result.current.getProviderComparison();

    expect(comparison).toHaveLength(3);
    expect(comparison[0]).toHaveProperty('id');
    expect(comparison[0]).toHaveProperty('name');
    expect(comparison[0]).toHaveProperty('status');
    expect(comparison[0]).toHaveProperty('responseTime');
    expect(comparison[0]).toHaveProperty('capabilities');
  });

  it('resets to default provider', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let resetResult: any;
    await act(async () => {
      resetResult = await result.current.resetToDefaultProvider();
    });

    expect(resetResult.success).toBe(true);
    expect(resetResult.newProvider).toBe('deepseek'); // Should be the recommended one
  });

  it('tracks switch history', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.switchProvider('deepseek');
    });

    await act(async () => {
      await result.current.switchProvider('openai');
    });

    expect(result.current.switchHistory).toHaveLength(2);
    expect(result.current.switchHistory[0].newProvider).toBe('openai');
    expect(result.current.switchHistory[1].newProvider).toBe('deepseek');
  });

  it('computes provider statistics correctly', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.onlineProviders).toHaveLength(1);
    expect(result.current.degradedProviders).toHaveLength(1);
    expect(result.current.offlineProviders).toHaveLength(1);
    expect(result.current.hasHealthyProviders).toBe(true);
    expect(result.current.totalProviders).toBe(3);
  });

  it('handles provider not found error', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let switchResult: any;
    await act(async () => {
      switchResult = await result.current.switchProvider('nonexistent');
    });

    expect(switchResult.success).toBe(false);
    expect(switchResult.error).toContain('not found');
  });

  it('refreshes providers on demand', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshProviders();
    });

    expect(mockAITutorService.getAvailableProviders).toHaveBeenCalledTimes(2);
  });

  it('checks provider availability correctly', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isProviderAvailable('deepseek')).toBe(true);
    expect(result.current.isProviderAvailable('openai')).toBe(true);
    expect(result.current.isProviderAvailable('anthropic')).toBe(false);
  });

  it('gets provider by ID', async () => {
    const { result } = renderHook(() => useProviderSelection());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const provider = result.current.getProviderById('deepseek');
    expect(provider?.name).toBe('DeepSeek');
    
    const nonexistent = result.current.getProviderById('nonexistent');
    expect(nonexistent).toBeUndefined();
  });
});