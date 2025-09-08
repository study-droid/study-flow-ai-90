/**
 * Provider Comparison Component
 * Shows detailed side-by-side comparison of AI providers
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Clock,
  Zap,
  Brain,
  Code,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { useProviderSelection } from '../hooks/useProviderSelection';
import type { ProviderInfo } from '../hooks/useProviderSelection';

interface ProviderComparisonProps {
  selectedProviders?: string[];
  onProviderSelect?: (providerId: string) => void;
  showRecommendations?: boolean;
  className?: string;
}

type SortField = 'name' | 'status' | 'responseTime' | 'errorRate' | 'capabilities' | 'score';
type SortDirection = 'asc' | 'desc';

interface ComparisonMetric {
  key: string;
  label: string;
  icon: React.ReactNode;
  getValue: (provider: ProviderInfo) => number | string;
  format: (value: any) => string;
  higher_is_better?: boolean;
}

export const ProviderComparison: React.FC<ProviderComparisonProps> = ({
  selectedProviders = [],
  onProviderSelect,
  showRecommendations = true,
  className = ''
}) => {
  const {
    availableProviders,
    getProviderRecommendations,
    currentProvider,
    isLoading
  } = useProviderSelection();

  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');
  const [showOnlyCapable, setShowOnlyCapable] = useState<string[]>([]);

  // Define comparison metrics
  const metrics: ComparisonMetric[] = [
    {
      key: 'status',
      label: 'Status',
      icon: <CheckCircle className="w-4 h-4" />,
      getValue: (provider) => provider.status,
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
      higher_is_better: true
    },
    {
      key: 'responseTime',
      label: 'Response Time',
      icon: <Clock className="w-4 h-4" />,
      getValue: (provider) => provider.responseTime || 0,
      format: (value) => value > 0 ? `${value.toFixed(0)}ms` : 'N/A',
      higher_is_better: false
    },
    {
      key: 'errorRate',
      label: 'Error Rate',
      icon: <TrendingDown className="w-4 h-4" />,
      getValue: (provider) => provider.errorRate || 0,
      format: (value) => `${(value * 100).toFixed(1)}%`,
      higher_is_better: false
    },
    {
      key: 'capabilities',
      label: 'Capabilities',
      icon: <Brain className="w-4 h-4" />,
      getValue: (provider) => provider.capabilities.length,
      format: (value) => value.toString(),
      higher_is_better: true
    },
    {
      key: 'priority',
      label: 'Priority',
      icon: <Star className="w-4 h-4" />,
      getValue: (provider) => provider.priority,
      format: (value) => value.toString(),
      higher_is_better: false
    }
  ];

  // Get recommendations for scoring
  const recommendations = useMemo(() => {
    return getProviderRecommendations();
  }, [getProviderRecommendations]);

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    let filtered = [...availableProviders];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }

    // Filter by capabilities
    if (showOnlyCapable.length > 0) {
      filtered = filtered.filter(p =>
        showOnlyCapable.every(cap => p.capabilities.includes(cap))
      );
    }

    // Sort providers
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'status':
          const statusOrder = { 'online': 3, 'degraded': 2, 'offline': 1 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'responseTime':
          aValue = a.responseTime || 9999;
          bValue = b.responseTime || 9999;
          break;
        case 'errorRate':
          aValue = a.errorRate || 0;
          bValue = b.errorRate || 0;
          break;
        case 'capabilities':
          aValue = a.capabilities.length;
          bValue = b.capabilities.length;
          break;
        case 'score':
          const aRec = recommendations.find(r => r.providerId === a.id);
          const bRec = recommendations.find(r => r.providerId === b.id);
          aValue = aRec?.score || 0;
          bValue = bRec?.score || 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [availableProviders, filterStatus, showOnlyCapable, sortField, sortDirection, recommendations]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
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
      case 'streaming':
        return <Zap className="w-3 h-3" />;
      default:
        return <Minus className="w-3 h-3" />;
    }
  };

  // Get performance indicator
  const getPerformanceIndicator = (provider: ProviderInfo, metric: ComparisonMetric) => {
    const value = metric.getValue(provider);
    const allValues = filteredProviders.map(p => metric.getValue(p)).filter(v => typeof v === 'number' && v > 0) as number[];
    
    if (allValues.length === 0 || typeof value !== 'number') {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;
    
    if (range === 0) {
      return <Minus className="w-4 h-4 text-gray-400" />;
    }

    const normalized = (value - min) / range;
    const isGood = metric.higher_is_better ? normalized > 0.7 : normalized < 0.3;
    const isBad = metric.higher_is_better ? normalized < 0.3 : normalized > 0.7;

    if (isGood) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (isBad) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading provider comparison...</span>
      </div>
    );
  }

  return (
    <div className={`provider-comparison ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Provider Comparison</h3>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">All Status</option>
              <option value="online">Online Only</option>
              <option value="degraded">Degraded</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  Provider
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              {metrics.map((metric) => (
                <th key={metric.key} className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort(metric.key as SortField)}
                    className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                  >
                    {metric.icon}
                    {metric.label}
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  <Star className="w-4 h-4" />
                  Score
                  <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">Capabilities</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProviders.map((provider) => {
              const recommendation = recommendations.find(r => r.providerId === provider.id);
              const isSelected = selectedProviders.includes(provider.id);
              const isCurrent = provider.id === currentProvider;

              return (
                <tr
                  key={provider.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    isCurrent ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  } ${isSelected ? 'bg-yellow-50' : ''}`}
                  onClick={() => onProviderSelect?.(provider.id)}
                >
                  {/* Provider Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-medium text-gray-900">{provider.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{provider.type.replace('-', ' ')}</div>
                      </div>
                      {isCurrent && (
                        <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Current
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Metrics */}
                  {metrics.map((metric) => {
                    const value = metric.getValue(provider);
                    const formattedValue = metric.format(value);

                    return (
                      <td key={metric.key} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {metric.key === 'status' ? (
                            getStatusIcon(provider.status)
                          ) : (
                            getPerformanceIndicator(provider, metric)
                          )}
                          <span className="text-sm text-gray-900">{formattedValue}</span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Score */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${recommendation?.score || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {recommendation?.score || 0}
                      </span>
                    </div>
                  </td>

                  {/* Capabilities */}
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {provider.capabilities.slice(0, 4).map((capability) => (
                        <div
                          key={capability}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          title={capability.replace('-', ' ')}
                        >
                          {getCapabilityIcon(capability)}
                          <span className="hidden sm:inline capitalize">
                            {capability.replace('-', ' ').substring(0, 8)}
                          </span>
                        </div>
                      ))}
                      {provider.capabilities.length > 4 && (
                        <div className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                          +{provider.capabilities.length - 4}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec, index) => {
              const provider = availableProviders.find(p => p.id === rec.providerId);
              if (!provider) return null;

              return (
                <div key={rec.providerId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-blue-700">
                      <span className="font-medium">#{index + 1}</span>
                      <Star className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-blue-900">{provider.name}</div>
                      <div className="text-sm text-blue-700">
                        {rec.reasons.join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-blue-900">
                    {rec.score}/100
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProviders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No providers match the current filters</p>
          <button
            onClick={() => {
              setFilterStatus('all');
              setShowOnlyCapable([]);
            }}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProviderComparison;