/**
 * Service Status Indicator Example Usage
 * Demonstrates different ways to use the ServiceStatusIndicator component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ServiceStatusIndicator } from '../components/ServiceStatusIndicator';
import { useServiceStatus } from '../hooks/useServiceStatus';
import { useToast } from '@/hooks/use-toast';

export const ServiceStatusExample: React.FC = () => {
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [showDetails, setShowDetails] = useState(true);
  const [compact, setCompact] = useState(false);
  const { toast } = useToast();

  // Example of using the hook directly
  const serviceStatus = useServiceStatus({
    refreshInterval: 10000,
    onHealthChange: (health) => {
      console.log('Service health changed:', health.overall);
    },
    onServiceReset: () => {
      toast({
        title: '✅ Services Reset',
        description: 'All AI services have been successfully reset.',
        duration: 3000
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Service Error',
        description: error,
        variant: 'destructive',
        duration: 5000
      });
    }
  });

  const handleServiceReset = () => {
    toast({
      title: '🔄 Resetting Services',
      description: 'Please wait while we reset all AI services...',
      duration: 2000
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Service Status Indicator Examples</h1>
        <p className="text-muted-foreground">
          Demonstrations of the ServiceStatusIndicator component in different configurations
        </p>
      </div>

      {/* Configuration Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Refresh Interval</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 border rounded-md"
              >
                <option value={1000}>1 second</option>
                <option value={5000}>5 seconds</option>
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Options</label>
              <div className="flex gap-2">
                <Button
                  variant={showDetails ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  Show Details
                </Button>
                <Button
                  variant={compact ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCompact(!compact)}
                >
                  Compact Mode
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standard Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Standard Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Full-featured service status indicator with all details and reset functionality
          </p>
        </CardHeader>
        <CardContent>
          <ServiceStatusIndicator
            showDetails={showDetails}
            showResetButton={true}
            refreshInterval={refreshInterval}
            compact={false}
            onServiceReset={handleServiceReset}
          />
        </CardContent>
      </Card>

      {/* Compact Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Compact Configuration</CardTitle>
          <p className="text-sm text-muted-foreground">
            Minimal service status indicator for space-constrained layouts
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ServiceStatusIndicator
              compact={true}
              showResetButton={false}
              refreshInterval={refreshInterval}
            />
            <span className="text-sm text-muted-foreground">
              Hover over the indicator to see detailed information
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Header Integration Example */}
      <Card>
        <CardHeader>
          <CardTitle>Header Integration Example</CardTitle>
          <p className="text-sm text-muted-foreground">
            How the service status indicator might appear in an application header
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">AI Tutor Dashboard</h2>
              <Badge variant="secondary">v2.1.0</Badge>
            </div>
            
            <div className="flex items-center gap-4">
              <ServiceStatusIndicator
                compact={true}
                showResetButton={false}
                refreshInterval={refreshInterval}
              />
              <Button variant="outline" size="sm">
                Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hook Usage Example */}
      <Card>
        <CardHeader>
          <CardTitle>Direct Hook Usage</CardTitle>
          <p className="text-sm text-muted-foreground">
            Using the useServiceStatus hook directly for custom implementations
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {serviceStatus.onlineProviders}
              </div>
              <div className="text-sm text-muted-foreground">Online Providers</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {serviceStatus.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {serviceStatus.averageResponseTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground">Avg Response</div>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">
                <Badge 
                  variant={
                    serviceStatus.isHealthy ? "default" : 
                    serviceStatus.isDegraded ? "secondary" : 
                    "destructive"
                  }
                >
                  {serviceStatus.getOverallStatusText()}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">Overall Status</div>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button
              onClick={() => serviceStatus.refresh()}
              disabled={serviceStatus.isLoading}
              size="sm"
            >
              {serviceStatus.isLoading ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            
            <Button
              onClick={() => serviceStatus.resetServices()}
              disabled={serviceStatus.isResetting}
              variant="outline"
              size="sm"
            >
              {serviceStatus.isResetting ? 'Resetting...' : 'Reset Services'}
            </Button>
            
            <Button
              onClick={() => serviceStatus.isMonitoring ? serviceStatus.stopMonitoring() : serviceStatus.startMonitoring()}
              variant="outline"
              size="sm"
            >
              {serviceStatus.isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </Button>
          </div>

          {serviceStatus.error && (
            <div className="p-3 border border-red-200 bg-red-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-800">{serviceStatus.error}</span>
                <Button
                  onClick={() => serviceStatus.clearError()}
                  variant="ghost"
                  size="sm"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {serviceStatus.lastUpdate && (
            <div className="text-xs text-muted-foreground">
              Last updated: {serviceStatus.lastUpdate.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Details Example */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Individual provider status information from the hook
          </p>
        </CardHeader>
        <CardContent>
          {serviceStatus.health?.providers.map((provider) => (
            <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  provider.status === 'online' ? 'bg-green-500' :
                  provider.status === 'degraded' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
                <div>
                  <div className="font-medium">{provider.id}</div>
                  <div className="text-sm text-muted-foreground">
                    {provider.responseTime}ms • {provider.errorRate.toFixed(1)}% errors
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={
                  provider.circuitBreakerState === 'closed' ? 'default' :
                  provider.circuitBreakerState === 'half-open' ? 'secondary' :
                  'destructive'
                }>
                  {provider.circuitBreakerState.toUpperCase()}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integration Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Component Props:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code>showDetails</code> - Show/hide provider details and metrics</li>
              <li><code>showResetButton</code> - Show/hide manual reset functionality</li>
              <li><code>refreshInterval</code> - Auto-refresh interval in milliseconds</li>
              <li><code>compact</code> - Use compact mode for space-constrained layouts</li>
              <li><code>onServiceReset</code> - Callback when services are reset</li>
            </ul>
          </div>
          
          <div className="text-sm space-y-2">
            <h4 className="font-medium">Hook Options:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li><code>autoStart</code> - Start monitoring automatically (default: true)</li>
              <li><code>onHealthChange</code> - Callback when service health changes</li>
              <li><code>onError</code> - Callback when errors occur</li>
              <li><code>onServiceReset</code> - Callback when services are reset</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceStatusExample;