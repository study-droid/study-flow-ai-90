/**
 * Service Status Indicator Component
 * Displays real-time service health with color coding, tooltips, and manual reset functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { unifiedAIService, type ServiceHealthStatus } from '@/services/ai/unified-ai-service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';
import { cn } from '@/lib/utils';

export interface ServiceStatusIndicatorProps {
  /** Whether to show detailed provider information */
  showDetails?: boolean;
  /** Whether to show manual reset button */
  showResetButton?: boolean;
  /** Refresh interval in milliseconds */
  refreshInterval?: number;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when service is reset */
  onServiceReset?: () => void;
}

interface ProviderStatusProps {
  providerId: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime: number;
  errorRate: number;
  lastSuccess: Date | null;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  compact?: boolean;
}

const ProviderStatus: React.FC<ProviderStatusProps> = ({
  providerId,
  status,
  responseTime,
  errorRate,
  lastSuccess,
  circuitBreakerState,
  compact = false
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getCircuitBreakerBadge = () => {
    const variants = {
      closed: 'default' as const,
      'half-open': 'secondary' as const,
      open: 'destructive' as const
    };

    return (
      <Badge variant={variants[circuitBreakerState]} className="text-xs">
        {circuitBreakerState.toUpperCase()}
      </Badge>
    );
  };

  const formatProviderName = (id: string) => {
    return id
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatLastSuccess = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", getStatusColor())} />
              <span className="text-xs font-medium">{formatProviderName(providerId)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-medium">{formatProviderName(providerId)}</div>
              <div className="text-sm">Status: {status}</div>
              <div className="text-sm">Response: {responseTime}ms</div>
              <div className="text-sm">Error Rate: {errorRate.toFixed(1)}%</div>
              <div className="text-sm">Last Success: {formatLastSuccess(lastSuccess)}</div>
              <div className="text-sm">Circuit: {circuitBreakerState}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className="font-medium text-sm">{formatProviderName(providerId)}</div>
          <div className="text-xs text-muted-foreground">
            {responseTime}ms • {errorRate.toFixed(1)}% errors
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {getCircuitBreakerBadge()}
        <div className="text-xs text-muted-foreground">
          {formatLastSuccess(lastSuccess)}
        </div>
      </div>
    </div>
  );
};

const ServiceStatusIndicator: React.FC<ServiceStatusIndicatorProps> = ({
  showDetails = true,
  showResetButton = true,
  refreshInterval = 5000,
  compact = false,
  className,
  onServiceReset
}) => {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthStatus | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch service health status
  const fetchServiceHealth = useCallback(async () => {
    try {
      const health = unifiedAIService.getServiceHealth();
      setServiceHealth(health);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch service health:', error);
    }
  }, []);

  // Handle manual service reset
  const handleServiceReset = useCallback(async () => {
    setIsResetting(true);
    try {
      // Reset unified AI service
      unifiedAIService.resetServices();
      
      // Reset circuit breakers
      circuitBreakerManager.resetFailingCircuits();
      
      // Refresh health status
      await fetchServiceHealth();
      
      onServiceReset?.();
    } catch (error) {
      console.error('Failed to reset services:', error);
    } finally {
      setIsResetting(false);
    }
  }, [fetchServiceHealth, onServiceReset]);

  // Set up polling for health status
  useEffect(() => {
    fetchServiceHealth();
    
    const interval = setInterval(fetchServiceHealth, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchServiceHealth, refreshInterval]);

  // Get overall status color and icon
  const getOverallStatusDisplay = () => {
    if (!serviceHealth) {
      return {
        icon: <Clock className="h-4 w-4 text-gray-400" />,
        color: 'bg-gray-400',
        text: 'Unknown',
        variant: 'secondary' as const
      };
    }

    switch (serviceHealth.overall) {
      case 'healthy':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-500" />,
          color: 'bg-green-500',
          text: 'Healthy',
          variant: 'default' as const
        };
      case 'degraded':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          color: 'bg-yellow-500',
          text: 'Degraded',
          variant: 'secondary' as const
        };
      case 'unhealthy':
        return {
          icon: <XCircle className="h-4 w-4 text-red-500" />,
          color: 'bg-red-500',
          text: 'Unhealthy',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-400" />,
          color: 'bg-gray-400',
          text: 'Unknown',
          variant: 'secondary' as const
        };
    }
  };

  const statusDisplay = getOverallStatusDisplay();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-2 px-2 py-1 rounded-md", className)}>
              <div className={cn("w-2 h-2 rounded-full", statusDisplay.color)} />
              <Zap className="h-3 w-3" />
              <span className="text-xs font-medium">AI Services</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-2">
              <div className="font-medium">AI Service Status: {statusDisplay.text}</div>
              {serviceHealth && (
                <>
                  <div className="text-sm">
                    Providers: {serviceHealth.providers.filter(p => p.status === 'online').length}/
                    {serviceHealth.providers.length} online
                  </div>
                  <div className="text-sm">
                    Avg Response: {serviceHealth.metrics.averageResponseTime.toFixed(0)}ms
                  </div>
                  <div className="text-sm">
                    Success Rate: {
                      serviceHealth.metrics.totalRequests > 0
                        ? ((serviceHealth.metrics.successfulRequests / serviceHealth.metrics.totalRequests) * 100).toFixed(1)
                        : 0
                    }%
                  </div>
                </>
              )}
              <div className="text-xs text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {statusDisplay.icon}
            AI Service Status
            <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
          </CardTitle>
          {showResetButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleServiceReset}
              disabled={isResetting}
              className="h-8"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", isResetting && "animate-spin")} />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {serviceHealth && (
          <>
            {/* Overall Metrics */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Success Rate</div>
                <div className="font-medium">
                  {serviceHealth.metrics.totalRequests > 0
                    ? ((serviceHealth.metrics.successfulRequests / serviceHealth.metrics.totalRequests) * 100).toFixed(1)
                    : 0}%
                </div>
                <Progress 
                  value={
                    serviceHealth.metrics.totalRequests > 0
                      ? (serviceHealth.metrics.successfulRequests / serviceHealth.metrics.totalRequests) * 100
                      : 0
                  } 
                  className="h-1 mt-1"
                />
              </div>
              <div>
                <div className="text-muted-foreground">Avg Response</div>
                <div className="font-medium">{serviceHealth.metrics.averageResponseTime.toFixed(0)}ms</div>
              </div>
            </div>

            {/* Provider Details */}
            {showDetails && serviceHealth.providers.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Providers</div>
                <div className="space-y-2">
                  {serviceHealth.providers.map((provider) => (
                    <ProviderStatus
                      key={provider.id}
                      providerId={provider.id}
                      status={provider.status}
                      responseTime={provider.responseTime}
                      errorRate={provider.errorRate}
                      lastSuccess={provider.lastSuccess}
                      circuitBreakerState={provider.circuitBreakerState}
                      compact={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Last Update */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </>
        )}

        {!serviceHealth && (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2" />
            <div>Loading service status...</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { ServiceStatusIndicator };
export default ServiceStatusIndicator;