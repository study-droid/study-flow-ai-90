/**
 * Offline Guidance Component
 * Provides user guidance and available actions when offline
 */

import React, { useState } from 'react';
import { 
  WifiOff, 
  MessageSquare, 
  Download, 
  Settings, 
  HardDrive,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { cn } from '@/lib/utils';

interface OfflineGuidanceProps {
  className?: string;
  showStorageInfo?: boolean;
}

export function OfflineGuidance({ className, showStorageInfo = true }: OfflineGuidanceProps) {
  const {
    offlineState,
    capabilities,
    pendingSyncData,
    getStorageInfo,
    clearOfflineData,
    forceSyncNow,
    canSync,
  } = useOfflineMode();

  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    quota: number;
    available: number;
    percentage: number;
  } | null>(null);

  const [showStorageDetails, setShowStorageDetails] = useState(false);

  // Load storage info
  React.useEffect(() => {
    if (showStorageInfo) {
      getStorageInfo().then(setStorageInfo);
    }
  }, [showStorageInfo, getStorageInfo]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStorageStatus = () => {
    if (!storageInfo) return null;
    
    if (storageInfo.percentage > 90) {
      return { level: 'critical', color: 'text-red-600', bg: 'bg-red-50' };
    } else if (storageInfo.percentage > 75) {
      return { level: 'warning', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    } else {
      return { level: 'good', color: 'text-green-600', bg: 'bg-green-50' };
    }
  };

  const availableActions = [
    {
      id: 'view-cached',
      title: 'View Cached Sessions',
      description: 'Access your previously loaded chat sessions',
      icon: MessageSquare,
      available: capabilities.canViewCachedSessions,
      action: () => {
        // This would typically navigate to cached sessions
        console.log('Navigate to cached sessions');
      },
    },
    {
      id: 'create-offline',
      title: 'Create Offline Messages',
      description: 'Write messages that will sync when online',
      icon: MessageSquare,
      available: capabilities.canCreateOfflineMessages,
      action: () => {
        // This would enable offline message creation
        console.log('Enable offline message creation');
      },
    },
    {
      id: 'export-data',
      title: 'Export Data',
      description: 'Download your chat history and settings',
      icon: Download,
      available: capabilities.canExportData,
      action: () => {
        // This would trigger data export
        console.log('Export offline data');
      },
    },
    {
      id: 'access-settings',
      title: 'Access Settings',
      description: 'Modify app settings and preferences',
      icon: Settings,
      available: capabilities.canAccessSettings,
      action: () => {
        // This would navigate to settings
        console.log('Navigate to settings');
      },
    },
  ];

  if (offlineState.isOnline) {
    return null; // Don't show guidance when online
  }

  const storageStatus = getStorageStatus();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Offline Status Header */}
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <WifiOff className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">You're Currently Offline</h3>
          <p className="text-sm text-red-700 mt-1">
            Some features are limited, but you can still access cached content and create offline messages.
          </p>
          {offlineState.offlineDuration > 0 && (
            <p className="text-xs text-red-600 mt-1">
              Offline for {Math.floor(offlineState.offlineDuration / 60000)} minutes
            </p>
          )}
        </div>
      </div>

      {/* Pending Sync Info */}
      {(pendingSyncData.messages.length > 0 || pendingSyncData.sessions.length > 0) && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900">Pending Sync</h4>
              <p className="text-sm text-yellow-700 mt-1">
                You have {pendingSyncData.messages.length} messages and {pendingSyncData.sessions.length} sessions 
                waiting to sync when you're back online.
              </p>
              {canSync && (
                <button
                  onClick={forceSyncNow}
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-sm font-medium rounded transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Try Sync Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Available Actions */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-3">What You Can Do Offline</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {availableActions.map((action) => (
            <button
              key={action.id}
              onClick={action.action}
              disabled={!action.available}
              className={cn(
                'p-4 text-left border rounded-lg transition-colors',
                action.available
                  ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <action.icon className={cn(
                  'h-5 w-5 flex-shrink-0 mt-0.5',
                  action.available ? 'text-gray-600' : 'text-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <h5 className={cn(
                    'font-medium',
                    action.available ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {action.title}
                  </h5>
                  <p className={cn(
                    'text-sm mt-1',
                    action.available ? 'text-gray-600' : 'text-gray-400'
                  )}>
                    {action.description}
                  </p>
                </div>
                {action.available && (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Storage Information */}
      {showStorageInfo && storageInfo && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Storage Usage</h4>
            <button
              onClick={() => setShowStorageDetails(!showStorageDetails)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showStorageDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          <div className={cn(
            'p-4 border rounded-lg',
            storageStatus?.bg || 'bg-gray-50',
            'border-gray-200'
          )}>
            <div className="flex items-center gap-3 mb-3">
              <HardDrive className={cn('h-5 w-5', storageStatus?.color || 'text-gray-600')} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    {formatBytes(storageInfo.used * 1024 * 1024)} used
                  </span>
                  <span className="text-sm text-gray-600">
                    {storageInfo.percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      storageStatus?.level === 'critical' ? 'bg-red-500' :
                      storageStatus?.level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {showStorageDetails && (
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Available:</span>
                  <span>{formatBytes(storageInfo.available * 1024 * 1024)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quota:</span>
                  <span>{formatBytes(storageInfo.quota * 1024 * 1024)}</span>
                </div>
              </div>
            )}

            {storageStatus?.level === 'critical' && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Storage Almost Full</span>
                </div>
                <p className="text-red-700 mt-1">
                  Consider clearing offline data or exporting important conversations.
                </p>
                <button
                  onClick={clearOfflineData}
                  className="mt-2 px-2 py-1 bg-red-200 hover:bg-red-300 text-red-800 text-xs font-medium rounded transition-colors"
                >
                  Clear Offline Data
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Offline Tips</h4>
            <ul className="text-sm text-blue-700 mt-2 space-y-1">
              <li>• Messages created offline will sync automatically when you're back online</li>
              <li>• Cached sessions remain available for viewing and reference</li>
              <li>• Settings changes are saved locally and will sync later</li>
              <li>• Export important data regularly to avoid loss</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}