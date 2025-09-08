/**
 * Provider Selection Interface Example
 * Demonstrates the complete provider selection functionality
 */

import React, { useState } from 'react';
import { ProviderSelector } from '../components/ProviderSelector';
import { ProviderComparison } from '../components/ProviderComparison';
import { ProviderSelectionModal } from '../components/ProviderSelectionModal';
import { useProviderSelection } from '../hooks/useProviderSelection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  BarChart3, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Star,
  Clock,
  Brain
} from 'lucide-react';

export function ProviderSelectionExample() {
  const {
    currentProviderInfo,
    availableProviders,
    recommendedProvider,
    onlineProviders,
    degradedProviders,
    offlineProviders,
    switchProvider,
    getProviderRecommendations,
    isLoading,
    error
  } = useProviderSelection();

  const [showModal, setShowModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const handleProviderChange = async (providerId: string) => {
    try {
      const result = await switchProvider(providerId);
      if (result.success) {
        console.log('Provider switched successfully:', result);
      } else {
        console.error('Provider switch failed:', result.error);
      }
    } catch (error) {
      console.error('Error switching provider:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading provider selection example...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-900 font-medium mb-2">Error Loading Providers</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI Provider Selection Interface
        </h1>
        <p className="text-gray-600">
          Complete example of the provider selection system with all features
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Provider */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Current Provider</h3>
            {currentProviderInfo ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Zap className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="font-medium text-blue-900">{currentProviderInfo.name}</div>
                  <div className="text-sm text-blue-700 capitalize">
                    {currentProviderInfo.type.replace('-', ' ')}
                  </div>
                </div>
                {getStatusIcon(currentProviderInfo.status)}
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                No provider selected
              </div>
            )}
          </div>

          {/* Recommended Provider */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Recommended</h3>
            {recommendedProvider ? (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="font-medium text-yellow-900">
                    {availableProviders.find(p => p.id === recommendedProvider.providerId)?.name}
                  </div>
                  <div className="text-sm text-yellow-700">
                    Score: {recommendedProvider.score}/100
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-gray-500">
                No recommendations available
              </div>
            )}
          </div>

          {/* Provider Stats */}
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Provider Statistics</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Online:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {onlineProviders.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Degraded:</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  {degradedProviders.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Offline:</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  {offlineProviders.length}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Open Provider Selection Modal
        </Button>
        
        <Button
          variant="outline"
          onClick={() => setShowComparison(!showComparison)}
          className="flex items-center gap-2"
        >
          <BarChart3 className="w-4 h-4" />
          {showComparison ? 'Hide' : 'Show'} Comparison
        </Button>
      </div>

      {/* Provider Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Selector</h2>
        <ProviderSelector
          currentProvider={currentProviderInfo?.id}
          onProviderChange={handleProviderChange}
          showComparison={false}
          compact={false}
        />
      </div>

      {/* Provider Comparison */}
      {showComparison && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Comparison</h2>
          <ProviderComparison
            selectedProviders={currentProviderInfo ? [currentProviderInfo.id] : []}
            onProviderSelect={setSelectedProvider}
            showRecommendations={true}
          />
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Provider Recommendations</h2>
        
        <div className="grid gap-4">
          {getProviderRecommendations().slice(0, 3).map((rec, index) => {
            const provider = availableProviders.find(p => p.id === rec.providerId);
            if (!provider) return null;

            return (
              <div
                key={rec.providerId}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => handleProviderChange(rec.providerId)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">#{index + 1}</span>
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900">{provider.name}</div>
                    <div className="text-sm text-gray-600">
                      {rec.reasons.slice(0, 2).join(', ')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(provider.status)}
                    {provider.responseTime && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {provider.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{rec.score}/100</div>
                  <div className="text-xs text-gray-500">Score</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Capabilities Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Capability Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(new Set(availableProviders.flatMap(p => p.capabilities))).map(capability => {
            const providersWithCapability = availableProviders.filter(p => 
              p.capabilities.includes(capability)
            );
            
            return (
              <div key={capability} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <h3 className="font-medium text-gray-900 capitalize">
                    {capability.replace('-', ' ')}
                  </h3>
                </div>
                
                <div className="space-y-1">
                  {providersWithCapability.map(provider => (
                    <div key={provider.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{provider.name}</span>
                      {getStatusIcon(provider.status)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider Selection Modal */}
      <ProviderSelectionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onProviderChange={handleProviderChange}
        currentProvider={currentProviderInfo?.id}
        preserveContext={true}
      />
    </div>
  );
}

export default ProviderSelectionExample;