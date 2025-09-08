/**
 * Offline Mode Detection and Management Hook
 * Provides offline detection, cached functionality, and data synchronization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface OfflineState {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineTime: Date | null;
  offlineDuration: number;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
}

export interface OfflineCapabilities {
  canViewCachedSessions: boolean;
  canCreateOfflineMessages: boolean;
  canExportData: boolean;
  canAccessSettings: boolean;
}

export interface PendingSyncData {
  messages: Array<{
    id: string;
    sessionId: string;
    content: string;
    role: 'user' | 'assistant';
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
  sessions: Array<{
    id: string;
    title: string;
    metadata?: Record<string, any>;
    timestamp: Date;
  }>;
  settings: Record<string, any> | null;
}

export interface UseOfflineModeOptions {
  enableAutoSync?: boolean;
  syncInterval?: number;
  maxOfflineStorage?: number; // MB
  onSyncStart?: () => void;
  onSyncComplete?: (success: boolean, synced: number) => void;
  onOfflineDetected?: () => void;
  onOnlineDetected?: () => void;
}

export function useOfflineMode(options: UseOfflineModeOptions = {}) {
  const {
    enableAutoSync = true,
    syncInterval = 30000, // 30 seconds
    maxOfflineStorage = 50, // 50MB
    onSyncStart,
    onSyncComplete,
    onOfflineDetected,
    onOnlineDetected,
  } = options;

  const auth = useAuth();
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const lastOnlineTimeRef = useRef<Date | null>(null);
  const offlineStartTimeRef = useRef<Date | null>(null);

  // Core offline state
  const [offlineState, setOfflineState] = useState<OfflineState>(() => ({
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnlineTime: navigator.onLine ? new Date() : null,
    offlineDuration: 0,
    connectionType: 'unknown',
    effectiveType: 'unknown',
  }));

  // Pending sync data
  const [pendingSyncData, setPendingSyncData] = useState<PendingSyncData>(() => {
    try {
      const stored = localStorage.getItem('offline-sync-data');
      return stored ? JSON.parse(stored) : { messages: [], sessions: [], settings: null };
    } catch {
      return { messages: [], sessions: [], settings: null };
    }
  });

  // Sync status
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * Get connection information from Network Information API
   */
  const getConnectionInfo = useCallback(() => {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
      };
    }
    
    return {
      connectionType: 'unknown' as const,
      effectiveType: 'unknown' as const,
    };
  }, []);

  /**
   * Update offline state
   */
  const updateOfflineState = useCallback(() => {
    const isOnline = navigator.onLine;
    const now = new Date();
    const connectionInfo = getConnectionInfo();

    setOfflineState(prev => {
      const wasOffline = prev.isOffline;
      const isNowOffline = !isOnline;

      // Track offline duration
      let offlineDuration = prev.offlineDuration;
      if (isNowOffline && offlineStartTimeRef.current) {
        offlineDuration = now.getTime() - offlineStartTimeRef.current.getTime();
      }

      // Update refs
      if (isOnline && wasOffline) {
        lastOnlineTimeRef.current = now;
        offlineStartTimeRef.current = null;
      } else if (isNowOffline && !wasOffline) {
        offlineStartTimeRef.current = now;
      }

      return {
        isOnline,
        isOffline: isNowOffline,
        lastOnlineTime: isOnline ? now : prev.lastOnlineTime,
        offlineDuration,
        connectionType: connectionInfo.connectionType,
        effectiveType: connectionInfo.effectiveType,
      };
    });

    // Trigger callbacks
    if (isOnline && offlineState.isOffline) {
      onOnlineDetected?.();
    } else if (!isOnline && offlineState.isOnline) {
      onOfflineDetected?.();
    }
  }, [offlineState.isOnline, offlineState.isOffline, getConnectionInfo, onOnlineDetected, onOfflineDetected]);

  /**
   * Get offline capabilities based on current state
   */
  const getOfflineCapabilities = useCallback((): OfflineCapabilities => {
    return {
      canViewCachedSessions: true, // Always available from localStorage
      canCreateOfflineMessages: true, // Can store locally
      canExportData: true, // Local data export
      canAccessSettings: true, // Settings are cached locally
    };
  }, []);

  /**
   * Store data for offline sync
   */
  const storeForSync = useCallback((type: 'message' | 'session' | 'settings', data: any) => {
    setPendingSyncData(prev => {
      const updated = { ...prev };
      
      switch (type) {
        case 'message':
          updated.messages = [...prev.messages, {
            ...data,
            timestamp: new Date(),
          }];
          break;
        case 'session':
          updated.sessions = [...prev.sessions, {
            ...data,
            timestamp: new Date(),
          }];
          break;
        case 'settings':
          updated.settings = data;
          break;
      }

      // Persist to localStorage
      try {
        localStorage.setItem('offline-sync-data', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to store offline sync data:', error);
      }

      return updated;
    });
  }, []);

  /**
   * Sync pending data when online
   */
  const syncPendingData = useCallback(async () => {
    if (!offlineState.isOnline || !auth.user || isSyncing) {
      return { success: false, synced: 0 };
    }

    if (pendingSyncData.messages.length === 0 && 
        pendingSyncData.sessions.length === 0 && 
        !pendingSyncData.settings) {
      return { success: true, synced: 0 };
    }

    setIsSyncing(true);
    setSyncError(null);
    onSyncStart?.();

    try {
      let syncedCount = 0;

      // Sync messages
      for (const message of pendingSyncData.messages) {
        try {
          // Import AI tutor repository for syncing
          const { AITutorRepository } = await import('@/features/ai-tutor/services/ai-tutor.repo');
          const repo = new AITutorRepository();
          
          await repo.insertMessage(message.sessionId, {
            role: message.role,
            content: message.content,
            sessionId: message.sessionId,
            metadata: message.metadata || {},
            createdAt: message.timestamp,
          } as any);
          
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync message:', error);
        }
      }

      // Sync sessions
      for (const session of pendingSyncData.sessions) {
        try {
          const { AITutorRepository } = await import('@/features/ai-tutor/services/ai-tutor.repo');
          const repo = new AITutorRepository();
          
          await repo.touchSession(session.id, { metadata: session.metadata });
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync session:', error);
        }
      }

      // Clear synced data
      setPendingSyncData({ messages: [], sessions: [], settings: null });
      localStorage.removeItem('offline-sync-data');
      
      setLastSyncTime(new Date());
      onSyncComplete?.(true, syncedCount);
      
      return { success: true, synced: syncedCount };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSyncError(errorMessage);
      onSyncComplete?.(false, 0);
      
      return { success: false, synced: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [offlineState.isOnline, auth.user, isSyncing, pendingSyncData, onSyncStart, onSyncComplete]);

  /**
   * Get storage usage information
   */
  const getStorageInfo = useCallback(async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage || 0) / (1024 * 1024);
        const quotaMB = (estimate.quota || 0) / (1024 * 1024);
        
        return {
          used: usedMB,
          quota: quotaMB,
          available: quotaMB - usedMB,
          percentage: quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0,
        };
      }
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
    }
    
    return {
      used: 0,
      quota: 0,
      available: 0,
      percentage: 0,
    };
  }, []);

  /**
   * Clear offline data
   */
  const clearOfflineData = useCallback(() => {
    setPendingSyncData({ messages: [], sessions: [], settings: null });
    localStorage.removeItem('offline-sync-data');
    setSyncError(null);
  }, []);

  /**
   * Force sync now
   */
  const forceSyncNow = useCallback(async () => {
    if (offlineState.isOnline) {
      return await syncPendingData();
    }
    return { success: false, synced: 0 };
  }, [offlineState.isOnline, syncPendingData]);

  // Set up event listeners for online/offline detection
  useEffect(() => {
    const handleOnline = () => updateOfflineState();
    const handleOffline = () => updateOfflineState();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Also listen for connection changes
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateOfflineState);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', updateOfflineState);
      }
    };
  }, [updateOfflineState]);

  // Set up auto-sync interval
  useEffect(() => {
    if (enableAutoSync && offlineState.isOnline && auth.user) {
      syncIntervalRef.current = setInterval(() => {
        syncPendingData();
      }, syncInterval);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    }
  }, [enableAutoSync, offlineState.isOnline, auth.user, syncInterval, syncPendingData]);

  // Initial sync when coming online
  useEffect(() => {
    if (offlineState.isOnline && auth.user && pendingSyncData.messages.length > 0) {
      // Delay initial sync to avoid race conditions
      const timer = setTimeout(() => {
        syncPendingData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [offlineState.isOnline, auth.user, pendingSyncData.messages.length, syncPendingData]);

  return {
    // State
    offlineState,
    pendingSyncData,
    isSyncing,
    lastSyncTime,
    syncError,
    
    // Capabilities
    capabilities: getOfflineCapabilities(),
    
    // Actions
    storeForSync,
    syncPendingData,
    forceSyncNow,
    clearOfflineData,
    getStorageInfo,
    
    // Computed
    hasPendingSync: pendingSyncData.messages.length > 0 || 
                   pendingSyncData.sessions.length > 0 || 
                   !!pendingSyncData.settings,
    canSync: offlineState.isOnline && auth.user && !isSyncing,
  };
}