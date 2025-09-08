/**
 * Offline Mode Indicator Component
 * Shows offline status, sync status, and provides offline guidance
 */

import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'inline';
}

export function OfflineIndicator({ 
  className, 
  showDetails = false, 
  position = 'top' 
}: OfflineIndicatorProps) {
  const {
    offlineState,
    isSyncing,
    lastSyncTime,
    syncError,
    hasPendingSync,
    canSync,
    forceSyncNow,
    pendingSyncData,
  } = useOfflineMode();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getStatusIcon = () => {
    if (isSyncing) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    
    if (offlineState.isOffline) {
      return <WifiOff className="h-4 w-4" />;
    }
    
    if (syncError) {
      return <AlertCircle className="h-4 w-4" />;
    }
    
    if (hasPendingSync) {
      return <CloudOff className="h-4 w-4" />;
    }
    
    return offlineState.isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (isSyncing) return 'text-blue-500';
    if (offlineState.isOffline) return 'text-red-500';
    if (syncError) return 'text-red-500';
    if (hasPendingSync) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (isSyncing) return 'Syncing...';
    if (offlineState.isOffline) return 'Offline';
    if (syncError) return 'Sync Error';
    if (hasPendingSync) return 'Pending Sync';
    return 'Online';
  };

  const getConnectionQuality = () => {
    const { effectiveType } = offlineState;
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return { text: 'Slow', color: 'text-red-500' };
      case '3g':
        return { text: 'Good', color: 'text-yellow-500' };
      case '4g':
        return { text: 'Fast', color: 'text-green-500' };
      default:
        return { text: 'Unknown', color: 'text-gray-500' };
    }
  };

  if (!showDetails && offlineState.isOnline && !hasPendingSync && !syncError) {
    return null; // Hide when everything is working normally
  }

  const baseClasses = cn(
    'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
    getStatusColor(),
    {
      'bg-red-50 border-red-200': offlineState.isOffline || syncError,
      'bg-yellow-50 border-yellow-200': hasPendingSync && !syncError,
      'bg-blue-50 border-blue-200': isSyncing,
      'bg-green-50 border-green-200': offlineState.isOnline && !hasPendingSync && !syncError,
    },
    className
  );

  return (
    <div 
      className={baseClasses}
      data-testid="offline-indicator"
      role="status"
      aria-live="polite"
    >
      {getStatusIcon()}
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span>{getStatusText()}</span>
          
          {offlineState.isOnline && showDetails && (
            <span className={cn('text-xs', getConnectionQuality().color)}>
              ({getConnectionQuality().text})
            </span>
          )}
        </div>
        
        {showDetails && (
          <div className="text-xs text-gray-600 mt-1 space-y-1">
            {offlineState.isOffline && (
              <div>
                Offline for {formatDuration(offlineState.offlineDuration)}
              </div>
            )}
            
            {hasPendingSync && (
              <div>
                {pendingSyncData.messages.length} messages, {pendingSyncData.sessions.length} sessions pending
              </div>
            )}
            
            {syncError && (
              <div className="text-red-600">
                Sync failed: {syncError}
              </div>
            )}
            
            {lastSyncTime && (
              <div>
                Last sync: {formatLastSync(lastSyncTime)}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Action buttons */}
      {showDetails && (
        <div className="flex items-center gap-1">
          {hasPendingSync && canSync && (
            <button
              onClick={forceSyncNow}
              disabled={isSyncing}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Sync now"
            >
              <Cloud className="h-3 w-3" />
            </button>
          )}
          
          {syncError && (
            <button
              onClick={forceSyncNow}
              disabled={isSyncing || !canSync}
              className="p-1 rounded hover:bg-white/50 transition-colors"
              title="Retry sync"
            >
              <AlertCircle className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact offline indicator for status bars
 */
export function CompactOfflineIndicator({ className }: { className?: string }) {
  const { offlineState, hasPendingSync, isSyncing } = useOfflineMode();

  if (offlineState.isOnline && !hasPendingSync && !isSyncing) {
    return null;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium',
        {
          'bg-red-100 text-red-700': offlineState.isOffline,
          'bg-yellow-100 text-yellow-700': hasPendingSync,
          'bg-blue-100 text-blue-700': isSyncing,
        },
        className
      )}
      data-testid="compact-offline-indicator"
    >
      {offlineState.isOffline && <WifiOff className="h-3 w-3" />}
      {hasPendingSync && !offlineState.isOffline && <CloudOff className="h-3 w-3" />}
      {isSyncing && <Loader2 className="h-3 w-3 animate-spin" />}
      
      <span>
        {offlineState.isOffline ? 'Offline' : 
         isSyncing ? 'Syncing' : 
         hasPendingSync ? 'Pending' : ''}
      </span>
    </div>
  );
}