/**
 * Queue Status Indicator Component
 * Shows real-time queue status and provides user feedback
 */

import React, { useEffect, useState } from 'react';
import { Clock, Users, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { requestQueueService, type QueueStatus } from '../services/request-queue.service';

interface QueueStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export const QueueStatusIndicator: React.FC<QueueStatusIndicatorProps> = ({
  className = '',
  showDetails = false,
  compact = false
}) => {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = requestQueueService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      
      // Show indicator when there's activity
      const hasActivity = newStatus.queueLength > 0 || 
                         newStatus.processingCount > 0 || 
                         newStatus.rateLimitActive;
      setIsVisible(hasActivity);
    });

    // Get initial status
    setStatus(requestQueueService.getStatus());

    return unsubscribe;
  }, []);

  if (!isVisible || !status) {
    return null;
  }

  const formatWaitTime = (ms: number): string => {
    if (ms < 1000) return 'Less than 1s';
    if (ms < 60000) return `${Math.ceil(ms / 1000)}s`;
    return `${Math.ceil(ms / 60000)}m`;
  };

  const getStatusColor = (): string => {
    if (status.rateLimitActive) return 'text-yellow-600';
    if (status.processingCount > 0) return 'text-blue-600';
    if (status.queueLength > 0) return 'text-orange-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (status.rateLimitActive) return <AlertCircle className="w-4 h-4" />;
    if (status.processingCount > 0) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (status.queueLength > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = (): string => {
    if (status.rateLimitActive) {
      return `Rate limited - ${formatWaitTime(status.nextAvailableSlot - Date.now())} wait`;
    }
    if (status.processingCount > 0 && status.queueLength > 0) {
      return `Processing ${status.processingCount}, ${status.queueLength} queued`;
    }
    if (status.processingCount > 0) {
      return `Processing ${status.processingCount} request${status.processingCount > 1 ? 's' : ''}`;
    }
    if (status.queueLength > 0) {
      return `${status.queueLength} request${status.queueLength > 1 ? 's' : ''} queued`;
    }
    return 'All requests processed';
  };

  return (
    <div className={`flex items-center space-x-2 text-sm ${getStatusColor()} ${className}`}>
      {getStatusIcon()}
      <span>{getStatusText()}</span>
      
      {showDetails && status.estimatedWaitTime > 0 && (
        <span className="text-xs text-gray-500">
          (~{formatWaitTime(status.estimatedWaitTime)})
        </span>
      )}
      
      {showDetails && (
        <div className="flex items-center space-x-1 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          <span>{status.requestsInLastMinute}/min</span>
        </div>
      )}
    </div>
  );
};

export default QueueStatusIndicator;