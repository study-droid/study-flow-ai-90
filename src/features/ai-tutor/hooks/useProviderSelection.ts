/**
 * Provider Selection Hook
 * Manages AI provider selection state and switching logic
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { aiTutorService } from '../services/ai-tutor.service';
import { aiProviderRouter } from '@/services/ai/ai-provider-router';
import type { AIProviderConfig, ProviderHealth } from '@/services/ai/ai-provider-router';

export interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  status: 'online' | 'degraded' | 'offline';
  priority: number;
  responseTime?: number;
  errorRate?: number;
  lastSuccess?: Date;
  models: string[];
  config: AIProviderConfig;
  health: ProviderHealth;
}

export interface ProviderSelectionState {
  currentProvider: string | null;
  availableProviders: ProviderInfo[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface ProviderSwitchResult {
  success: boolean;
  previousProvider: string | null;
  newProvider: string;
  preservedContext: boolean;
  error?: string;
}

export interface ProviderRecommendation {
  providerId: string;
  score: number;
  reasons: string[];
  capabilities: string[];
}

export function useProviderSelection() {
  const [state, setState] = useState<ProviderSelectionState>({
    currentProvider: null,
    availableProviders: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  });

  const [switchHistory, setSwitchHistory] = useState<ProviderSwitchResult[]>([]);

  /**
   * Fetch available providers and their health status
   */
  const fetchProviders = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get providers from AI tutor service
      const providers = aiTutorService.getAvailableProviders();
      const providerConfigs = aiProviderRouter.getAvailableProviders();
      const healthStatuses = aiProviderRouter.getAllProviderHealth();

      // Combine provider info with health data
      const enrichedProviders: ProviderInfo[] = providers.map(provider => {
        const config = providerConfigs.find(c => c.id === provider.id);
        const health = healthStatuses.find(h => h.id === provider.id);

        return {
          ...provider,
          models: config?.models || [],
          config: config!,
          health: health!,
          responseTime: health?.responseTime,
          errorRate: health?.errorRate,
          lastSuccess: health?.lastSuccess
        };
      });

      setState(prev => ({
        ...prev,
        availableProviders: enrichedProviders,
        isLoading: false,
        lastUpdated: new Date()
      }));

    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch providers',
        isLoading: false
      }));
    }
  }, []);

  /**
   * Switch to a different AI provider
   */
  const switchProvider = useCallback(async (
    providerId: string,
    preserveContext: boolean = true
  ): Promise<ProviderSwitchResult> => {
    const previousProvider = state.currentProvider;

    try {
      // Validate provider exists and is available
      const provider = state.availableProviders.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      if (provider.status === 'offline') {
        throw new Error(`Provider ${provider.name} is currently offline`);
      }

      // Attempt to switch provider
      const success = aiTutorService.switchProvider(providerId);
      
      if (!success) {
        throw new Error(`Failed to switch to provider ${provider.name}`);
      }

      // Update current provider state
      setState(prev => ({
        ...prev,
        currentProvider: providerId
      }));

      const result: ProviderSwitchResult = {
        success: true,
        previousProvider,
        newProvider: providerId,
        preservedContext: preserveContext
      };

      // Add to switch history
      setSwitchHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 switches

      return result;

    } catch (error) {
      const result: ProviderSwitchResult = {
        success: false,
        previousProvider,
        newProvider: providerId,
        preservedContext: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      setSwitchHistory(prev => [result, ...prev.slice(0, 9)]);
      return result;
    }
  }, [state.currentProvider, state.availableProviders]);

  /**
   * Get provider recommendations based on current context
   */
  const getProviderRecommendations = useCallback((
    criteria?: {
      preferSpeed?: boolean;
      preferQuality?: boolean;
      preferCost?: boolean;
      requiredCapabilities?: string[];
    }
  ): ProviderRecommendation[] => {
    const { preferSpeed = false, preferQuality = true, preferCost = false, requiredCapabilities = [] } = criteria || {};

    return state.availableProviders
      .filter(provider => {
        // Filter by required capabilities
        if (requiredCapabilities.length > 0) {
          return requiredCapabilities.every(cap => 
            provider.capabilities.includes(cap)
          );
        }
        return true;
      })
      .map(provider => {
        let score = 0;
        const reasons: string[] = [];

        // Base score from status
        if (provider.status === 'online') {
          score += 40;
          reasons.push('Currently online and available');
        } else if (provider.status === 'degraded') {
          score += 20;
          reasons.push('Available but with some issues');
        }

        // Priority score (lower priority number = higher score)
        const priorityScore = (10 - provider.priority) * 3;
        score += priorityScore;
        if (provider.priority <= 2) {
          reasons.push('High priority provider');
        }

        // Performance scores
        if (provider.responseTime !== undefined) {
          if (provider.responseTime < 500) {
            score += 15;
            if (preferSpeed) {
              score += 10;
              reasons.push('Very fast response times');
            }
          } else if (provider.responseTime < 1000) {
            score += 10;
            if (preferSpeed) {
              score += 5;
              reasons.push('Good response times');
            }
          }
        }

        if (provider.errorRate !== undefined && provider.errorRate < 0.05) {
          score += 10;
          reasons.push('Low error rate');
        }

        // Capability scoring
        const capabilityScore = provider.capabilities.length * 2;
        score += capabilityScore;
        if (provider.capabilities.length >= 4) {
          reasons.push('Comprehensive capabilities');
        }

        // Quality preference (based on provider type and capabilities)
        if (preferQuality) {
          if (provider.capabilities.includes('reasoning')) {
            score += 8;
            reasons.push('Advanced reasoning capabilities');
          }
          if (provider.type === 'edge-function') {
            score += 5;
            reasons.push('Professional-grade service');
          }
        }

        // Cost preference (favor lower cost providers)
        if (preferCost) {
          if (provider.id === 'deepseek') {
            score += 15;
            reasons.push('Cost-effective option');
          } else if (provider.type === 'direct-api') {
            score += 5;
            reasons.push('Direct API access');
          }
        }

        // Recent success bonus
        if (provider.lastSuccess && 
            Date.now() - provider.lastSuccess.getTime() < 300000) { // 5 minutes
          score += 5;
          reasons.push('Recently successful');
        }

        return {
          providerId: provider.id,
          score: Math.min(100, score),
          reasons: reasons.slice(0, 3), // Top 3 reasons
          capabilities: provider.capabilities
        };
      })
      .sort((a, b) => b.score - a.score);
  }, [state.availableProviders]);

  /**
   * Get the best provider for a specific capability
   */
  const getBestProviderForCapability = useCallback((capability: string): ProviderInfo | null => {
    const providersWithCapability = state.availableProviders
      .filter(p => p.capabilities.includes(capability) && p.status !== 'offline')
      .sort((a, b) => {
        // Sort by status first, then by priority
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (b.status === 'online' && a.status !== 'online') return 1;
        return a.priority - b.priority;
      });

    return providersWithCapability[0] || null;
  }, [state.availableProviders]);

  /**
   * Check if provider switching is available
   */
  const canSwitchProvider = useCallback((providerId: string): boolean => {
    const provider = state.availableProviders.find(p => p.id === providerId);
    return !!(provider && provider.status !== 'offline' && provider.id !== state.currentProvider);
  }, [state.availableProviders, state.currentProvider]);

  /**
   * Get provider comparison data
   */
  const getProviderComparison = useCallback(() => {
    return state.availableProviders.map(provider => ({
      id: provider.id,
      name: provider.name,
      status: provider.status,
      responseTime: provider.responseTime || 0,
      errorRate: provider.errorRate || 0,
      capabilities: provider.capabilities.length,
      priority: provider.priority,
      score: getProviderRecommendations()[0]?.score || 0
    }));
  }, [state.availableProviders, getProviderRecommendations]);

  /**
   * Reset provider selection to default
   */
  const resetToDefaultProvider = useCallback(async (): Promise<ProviderSwitchResult> => {
    const recommendations = getProviderRecommendations();
    const defaultProvider = recommendations[0];

    if (!defaultProvider) {
      return {
        success: false,
        previousProvider: state.currentProvider,
        newProvider: 'none',
        preservedContext: false,
        error: 'No available providers found'
      };
    }

    return switchProvider(defaultProvider.providerId);
  }, [getProviderRecommendations, switchProvider, state.currentProvider]);

  // Initialize providers on mount
  useEffect(() => {
    fetchProviders();

    // Set up periodic refresh every 30 seconds
    const interval = setInterval(fetchProviders, 30000);
    return () => clearInterval(interval);
  }, [fetchProviders]);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const onlineProviders = state.availableProviders.filter(p => p.status === 'online');
    const degradedProviders = state.availableProviders.filter(p => p.status === 'degraded');
    const offlineProviders = state.availableProviders.filter(p => p.status === 'offline');

    const currentProviderInfo = state.currentProvider 
      ? state.availableProviders.find(p => p.id === state.currentProvider)
      : null;

    const recommendations = getProviderRecommendations();
    const recommendedProvider = recommendations[0];

    return {
      onlineProviders,
      degradedProviders,
      offlineProviders,
      currentProviderInfo,
      recommendedProvider,
      hasHealthyProviders: onlineProviders.length > 0,
      totalProviders: state.availableProviders.length
    };
  }, [state.availableProviders, state.currentProvider, getProviderRecommendations]);

  return {
    // State
    ...state,
    ...computedValues,

    // Actions
    fetchProviders,
    switchProvider,
    resetToDefaultProvider,

    // Queries
    getProviderRecommendations,
    getBestProviderForCapability,
    canSwitchProvider,
    getProviderComparison,

    // History
    switchHistory,

    // Utilities
    refreshProviders: fetchProviders,
    isProviderAvailable: (providerId: string) => {
      const provider = state.availableProviders.find(p => p.id === providerId);
      return provider?.status !== 'offline';
    },
    getProviderById: (providerId: string) => {
      return state.availableProviders.find(p => p.id === providerId);
    }
  };
}