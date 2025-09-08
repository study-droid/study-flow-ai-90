/**
 * Provider Selection Modal
 * Complete modal interface for selecting and comparing AI providers
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  BarChart3,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  ArrowRight,
  Star
} from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { ProviderComparison } from './ProviderComparison';
import { useProviderSelection } from '../hooks/useProviderSelection';
import type { ProviderSwitchResult } from '../hooks/useProviderSelection';

interface ProviderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProviderChange?: (providerId: string) => void;
  currentProvider?: string;
  preserveContext?: boolean;
}

type ViewMode = 'selector' | 'comparison' | 'recommendations';

export const ProviderSelectionModal: React.FC<ProviderSelectionModalProps> = ({
  isOpen,
  onClose,
  onProviderChange,
  currentProvider,
  preserveContext = true
}) => {
  const {
    availableProviders,
    currentProviderInfo,
    recommendedProvider,
    switchProvider,
    getProviderRecommendations,
    isLoading,
    error,
    refreshProviders
  } = useProviderSelection();

  const [viewMode, setViewMode] = useState<ViewMode>('selector');
  const [selectedProvider, setSelectedProvider] = useState<string>(currentProvider || '');
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchResult, setSwitchResult] = useState<ProviderSwitchResult | null>(null);
  const [showSwitchConfirmation, setShowSwitchConfirmation] = useState(false);

  // Update selected provider when prop changes
  useEffect(() => {
    if (currentProvider && currentProvider !== selectedProvider) {
      setSelectedProvider(currentProvider);
    }
  }, [currentProvider, selectedProvider]);

  // Handle provider selection
  const handleProviderSelect = (providerId: string) => {
    if (providerId === selectedProvider) return;
    
    setSelectedProvider(providerId);
    setShowSwitchConfirmation(true);
  };

  // Handle provider switch confirmation
  const handleConfirmSwitch = async () => {
    if (!selectedProvider) return;

    setIsSwitching(true);
    setShowSwitchConfirmation(false);

    try {
      const result = await switchProvider(selectedProvider, preserveContext);
      setSwitchResult(result);

      if (result.success) {
        onProviderChange?.(selectedProvider);
        
        // Auto-close modal after successful switch
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to switch provider:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (isSwitching) return; // Prevent closing during switch
    
    setSwitchResult(null);
    setShowSwitchConfirmation(false);
    onClose();
  };

  // Get recommendations
  const recommendations = getProviderRecommendations();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-gray-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AI Provider Selection</h2>
                <p className="text-sm text-gray-600">
                  Choose the best AI provider for your needs
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('selector')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'selector'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Select
                </button>
                <button
                  onClick={() => setViewMode('comparison')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'comparison'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Compare
                </button>
                <button
                  onClick={() => setViewMode('recommendations')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'recommendations'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Recommendations
                </button>
              </div>

              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                <span className="text-gray-600">Loading providers...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-red-900">Error loading providers</span>
                </div>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={refreshProviders}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Switch Result */}
            {switchResult && (
              <div className={`border rounded-lg p-4 mb-6 ${
                switchResult.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {switchResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    switchResult.success ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {switchResult.success ? 'Provider switched successfully!' : 'Failed to switch provider'}
                  </span>
                </div>
                {switchResult.success ? (
                  <p className={`mt-1 ${switchResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    Now using {availableProviders.find(p => p.id === switchResult.newProvider)?.name}
                    {switchResult.preservedContext && ' (conversation context preserved)'}
                  </p>
                ) : (
                  <p className="text-red-700 mt-1">{switchResult.error}</p>
                )}
              </div>
            )}

            {/* Content based on view mode */}
            {!isLoading && !error && (
              <>
                {viewMode === 'selector' && (
                  <ProviderSelector
                    currentProvider={selectedProvider}
                    onProviderChange={handleProviderSelect}
                    showComparison={false}
                    compact={false}
                  />
                )}

                {viewMode === 'comparison' && (
                  <ProviderComparison
                    selectedProviders={[selectedProvider]}
                    onProviderSelect={handleProviderSelect}
                    showRecommendations={true}
                  />
                )}

                {viewMode === 'recommendations' && (
                  <div className="space-y-6">
                    {/* Top Recommendations */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Recommended Providers
                      </h3>
                      <div className="grid gap-4">
                        {recommendations.slice(0, 3).map((rec, index) => {
                          const provider = availableProviders.find(p => p.id === rec.providerId);
                          if (!provider) return null;

                          return (
                            <div
                              key={rec.providerId}
                              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                selectedProvider === rec.providerId
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleProviderSelect(rec.providerId)}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1 text-yellow-600">
                                    <Star className="w-5 h-5" />
                                    <span className="font-medium">#{index + 1}</span>
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-gray-900">{provider.name}</h4>
                                    <p className="text-sm text-gray-600 capitalize">
                                      {provider.type.replace('-', ' ')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    {rec.score}/100
                                  </div>
                                  <div className="text-xs text-gray-500">Score</div>
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm text-gray-600 mb-2">Why recommended:</div>
                                <ul className="text-sm text-gray-700 space-y-1">
                                  {rec.reasons.map((reason, idx) => (
                                    <li key={idx} className="flex items-center gap-2">
                                      <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {rec.capabilities.map((cap) => (
                                  <div
                                    key={cap}
                                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                                  >
                                    {cap.replace('-', ' ')}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Recommendation Criteria */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">How we recommend providers:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Current availability and health status</li>
                        <li>• Response time and reliability metrics</li>
                        <li>• Capability match for your use case</li>
                        <li>• Cost-effectiveness and performance balance</li>
                        <li>• Recent success rate and error patterns</li>
                      </ul>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="w-4 h-4" />
              <span>
                {currentProviderInfo ? (
                  <>Currently using: <strong>{currentProviderInfo.name}</strong></>
                ) : (
                  'No provider selected'
                )}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                disabled={isSwitching}
              >
                Cancel
              </button>

              {selectedProvider && selectedProvider !== currentProvider && (
                <button
                  onClick={() => setShowSwitchConfirmation(true)}
                  disabled={isSwitching}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSwitching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    <>
                      Switch Provider
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Switch Confirmation Modal */}
      {showSwitchConfirmation && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Confirm Provider Switch
                </h3>
                <p className="text-gray-600 mb-6">
                  Switch from <strong>{currentProviderInfo?.name || 'current provider'}</strong> to{' '}
                  <strong>{availableProviders.find(p => p.id === selectedProvider)?.name}</strong>?
                  {preserveContext && (
                    <span className="block mt-2 text-sm text-green-600">
                      ✓ Your conversation context will be preserved
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSwitchConfirmation(false)}
                    className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSwitch}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Switch
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderSelectionModal;