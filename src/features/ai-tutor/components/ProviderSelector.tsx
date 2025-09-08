/**
 * AI Provider Selection Interface
 * Allows users to select and switch between AI providers with capability indicators
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  Zap, 
  Brain, 
  Code, 
  Sparkles, 
  Clock, 
  DollarSign,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Star,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useAITutor } from '../hooks/useAITutor';
import { aiTutorService } from '../services/ai-tutor.service';

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  capabilities: string[];
  status: 'online' | 'degraded' | 'offline';
  priority: number;
  responseTime?: number;
  errorRate?: number;
  lastSuccess?: Date;
}

interface ProviderSelectorProps {
  currentProvider?: string;
  onProviderChange?: (providerId: string) => void;
  showComparison?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  currentProvider,
  onProviderChange,
  showComparison = false,
  compact = false,
  className = ''
}) => {
  const { serviceHealth, errorRecovery } = useAITutor();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>(currentProvider || '');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Fetch available providers
  useEffect(() => {
    const fetchProviders = () => {
      try {
        const availableProviders = aiTutorService.getAvailableProviders();
        setProviders(availableProviders);
        
        // Set default provider if none selected
        if (!selectedProvider && availableProviders.length > 0) {
          const onlineProvider = availableProviders.find(p => p.status === 'online');
          const defaultProvider = onlineProvider || availableProviders[0];
          setSelectedProvider(defaultProvider.id);
        }
      } catch (error) {
        console.error('Failed to fetch providers:', error);
      }
    };

    fetchProviders();
    
    // Refresh providers every 30 seconds
    const interval = setInterval(fetchProviders, 30000);
    return () => clearInterval(interval);
  }, [selectedProvider]);

  // Update selected provider when prop changes
  useEffect(() => {
    if (currentProvider && currentProvider !== selectedProvider) {
      setSelectedProvider(currentProvider);
    }
  }, [currentProvider, selectedProvider]);

  // Handle provider selection
  const handleProviderSelect = async (providerId: string) => {
    try {
      const success = aiTutorService.switchProvider(providerId);
      if (success) {
        setSelectedProvider(providerId);
        onProviderChange?.(providerId);
      } else {
        console.error('Failed to switch to provider:', providerId);
      }
    } catch (error) {
      console.error('Error switching provider:', error);
    }
  };

  // Refresh provider health
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await errorRecovery.resetServices();
      // Refetch providers after reset
      const availableProviders = aiTutorService.getAvailableProviders();
      setProviders(availableProviders);
    } catch (error) {
      console.error('Failed to refresh providers:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get capability icon
  const getCapabilityIcon = (capability: string) => {
    switch (capability) {
      case 'text-generation':
        return <Sparkles className="w-3 h-3" />;
      case 'code-generation':
        return <Code className="w-3 h-3" />;
      case 'reasoning':
        return <Brain className="w-3 h-3" />;
      case 'creative-writing':
        return <Sparkles className="w-3 h-3" />;
      case 'streaming':
        return <Zap className="w-3 h-3" />;
      case 'math':
        return <span className="text-xs font-mono">∑</span>;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  // Get provider recommendation score
  const getProviderScore = (provider: ProviderInfo): number => {
    let score = 0;
    
    // Status score
    if (provider.status === 'online') score += 40;
    else if (provider.status === 'degraded') score += 20;
    
    // Priority score (lower priority number = higher score)
    score += (10 - provider.priority) * 5;
    
    // Capability score
    score += provider.capabilities.length * 2;
    
    // Performance score
    if (provider.responseTime && provider.responseTime < 1000) score += 10;
    if (provider.errorRate !== undefined && provider.errorRate < 0.1) score += 10;
    
    return Math.min(100, score);
  };

  // Sort providers by recommendation score
  const sortedProviders = useMemo(() => {
    return [...providers].sort((a, b) => {
      const scoreA = getProviderScore(a);
      const scoreB = getProviderScore(b);
      return scoreB - scoreA;
    });
  }, [providers]);

  // Get recommended provider
  const recommendedProvider = sortedProviders[0];

  if (compact && !isExpanded) {
    return (
      <div className={`provider-selector-compact ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            {providers.find(p => p.id === selectedProvider)?.name || 'Select Provider'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className={`provider-selector ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Provider Selection</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh provider status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Provider List */}
      <div className="space-y-3">
        {sortedProviders.map((provider) => {
          const isSelected = provider.id === selectedProvider;
          const isRecommended = provider.id === recommendedProvider?.id;
          const score = getProviderScore(provider);

          return (
            <div
              key={provider.id}
              className={`provider-card border rounded-lg p-4 transition-all cursor-pointer ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
              onClick={() => handleProviderSelect(provider.id)}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(provider.status)}
                    <h4 className="font-medium text-gray-900">{provider.name}</h4>
                    {isRecommended && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        <Star className="w-3 h-3" />
                        <span>Recommended</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">
                    Score: {score}/100
                  </div>
                  {isSelected && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>

              {/* Provider Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                {/* Status */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">Status:</div>
                  <div className={`text-xs font-medium ${
                    provider.status === 'online' ? 'text-green-600' :
                    provider.status === 'degraded' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                  </div>
                </div>

                {/* Response Time */}
                {provider.responseTime !== undefined && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <div className="text-xs text-gray-600">
                      {provider.responseTime.toFixed(0)}ms
                    </div>
                  </div>
                )}

                {/* Type */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">Type:</div>
                  <div className="text-xs text-gray-600 capitalize">
                    {provider.type.replace('-', ' ')}
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-2">Capabilities:</div>
                <div className="flex flex-wrap gap-2">
                  {provider.capabilities.map((capability) => (
                    <div
                      key={capability}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {getCapabilityIcon(capability)}
                      <span className="capitalize">{capability.replace('-', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetails(showDetails === provider.id ? null : provider.id);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showDetails === provider.id ? 'Hide Details' : 'Show Details'}
              </button>

              {/* Expanded Details */}
              {showDetails === provider.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-gray-500">Priority:</span>
                      <span className="ml-2 text-gray-700">{provider.priority}</span>
                    </div>
                    {provider.errorRate !== undefined && (
                      <div>
                        <span className="text-gray-500">Error Rate:</span>
                        <span className="ml-2 text-gray-700">
                          {(provider.errorRate * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {provider.lastSuccess && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Last Success:</span>
                        <span className="ml-2 text-gray-700">
                          {provider.lastSuccess.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Provider Comparison */}
      {showComparison && providers.length > 1 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Provider Comparison</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Provider</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Response Time</th>
                  <th className="text-left py-2">Capabilities</th>
                  <th className="text-left py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedProviders.map((provider) => (
                  <tr key={provider.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium">{provider.name}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(provider.status)}
                        <span className="capitalize">{provider.status}</span>
                      </div>
                    </td>
                    <td className="py-2">
                      {provider.responseTime ? `${provider.responseTime.toFixed(0)}ms` : 'N/A'}
                    </td>
                    <td className="py-2">{provider.capabilities.length}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${getProviderScore(provider)}%` }}
                          ></div>
                        </div>
                        <span>{getProviderScore(provider)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Providers Message */}
      {providers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No AI providers available</p>
          <button
            onClick={handleRefresh}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Refresh to check again
          </button>
        </div>
      )}

      {/* Footer Info */}
      {providers.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Provider Selection Tips:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Recommended providers offer the best balance of speed, quality, and reliability</li>
                <li>• Switching providers preserves your conversation context</li>
                <li>• The system automatically falls back to other providers if one becomes unavailable</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSelector;