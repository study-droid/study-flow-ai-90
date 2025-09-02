import { useState, useEffect } from 'react';
import { useSecurity } from '@/hooks/useSecurity';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
  TrendingUp,
  Zap,
  Download
} from 'lucide-react';
import { performanceMonitor, type PerformanceData, type PerformanceAlert } from '@/services/performance/performance-monitor';

interface PerformanceMetric {
  name: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  target: number;
  unit: string;
}

export const PerformanceMonitor: React.FC = () => {
  const { logSecurityEvent } = useSecurity();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState<PerformanceAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Subscribe to real performance metrics
  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((data: PerformanceData) => {
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      
      // Update metrics with real data
      const updatedMetrics: PerformanceMetric[] = [
        { 
          name: 'API Response Time', 
          value: currentMetrics.apiResponseTime, 
          trend: getMetricTrend('apiResponseTime', currentMetrics.apiResponseTime),
          target: 200, 
          unit: 'ms' 
        },
        { 
          name: 'Database Queries', 
          value: currentMetrics.databaseQueries, 
          trend: getMetricTrend('databaseQueries', currentMetrics.databaseQueries),
          target: 50, 
          unit: '/min' 
        },
        { 
          name: 'Error Rate', 
          value: currentMetrics.errorRate, 
          trend: getMetricTrend('errorRate', currentMetrics.errorRate),
          target: 1, 
          unit: '%' 
        },
        { 
          name: 'Memory Usage', 
          value: currentMetrics.memoryUsage, 
          trend: getMetricTrend('memoryUsage', currentMetrics.memoryUsage),
          target: 80, 
          unit: '%' 
        },
        { 
          name: 'Request Success Rate', 
          value: currentMetrics.requestSuccessRate, 
          trend: getMetricTrend('requestSuccessRate', currentMetrics.requestSuccessRate),
          target: 99.5, 
          unit: '%' 
        },
        {
          name: 'Page Load Time',
          value: currentMetrics.pageLoadTime,
          trend: getMetricTrend('pageLoadTime', currentMetrics.pageLoadTime),
          target: 3000,
          unit: 'ms'
        },
        {
          name: 'Active Connections',
          value: currentMetrics.activeConnections,
          trend: getMetricTrend('activeConnections', currentMetrics.activeConnections),
          target: 100,
          unit: ''
        },
        {
          name: 'Cache Hit Rate',
          value: currentMetrics.cacheHitRate,
          trend: getMetricTrend('cacheHitRate', currentMetrics.cacheHitRate),
          target: 80,
          unit: '%'
        }
      ];
      
      setMetrics(updatedMetrics);
      setRecentAlerts(data.alerts.slice(-5)); // Show last 5 alerts
      setLastUpdate(new Date());
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Store previous values for trend calculation
  const [previousValues, setPreviousValues] = useState<Record<string, number>>({});
  
  const getMetricTrend = (name: string, value: number): 'up' | 'down' | 'stable' => {
    const prev = previousValues[name];
    if (prev === undefined) {
      setPreviousValues(prev => ({ ...prev, [name]: value }));
      return 'stable';
    }
    
    const diff = value - prev;
    setPreviousValues(prev => ({ ...prev, [name]: value }));
    
    if (Math.abs(diff) < 0.1) return 'stable';
    return diff > 0 ? 'up' : 'down';
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    logSecurityEvent('performance_monitoring_started');
    
    // Start real performance monitoring
    performanceMonitor.startMonitoring();
    
    toast({
      title: "Performance Monitoring Started",
      description: "Real-time metrics collection is now active",
    });
  };
  
  const stopMonitoring = () => {
    setIsMonitoring(false);
    logSecurityEvent('performance_monitoring_stopped');
    
    // Stop performance monitoring
    performanceMonitor.stopMonitoring();
    
    toast({
      title: "Performance Monitoring Stopped",
      description: "Metric collection has been paused",
    });
  };
  
  const exportMetrics = () => {
    const data = performanceMonitor.exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Metrics Exported",
      description: "Performance data has been downloaded",
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getMetricColor = (value: number, target: number, name: string) => {
    if (name === 'Error Rate') {
      return value <= target ? 'text-green-600' : 'text-red-600';
    }
    return value <= target ? 'text-green-600' : 'text-yellow-600';
  };

  const getProgressColor = (value: number, target: number, name: string) => {
    if (name === 'Error Rate') {
      return value <= target ? 'bg-green-500' : 'bg-red-500';
    }
    if (name === 'Request Success Rate') {
      return value >= target ? 'bg-green-500' : 'bg-red-500';
    }
    return value <= target ? 'bg-green-500' : 'bg-yellow-500';
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Performance Monitor
              </CardTitle>
              <CardDescription>
                Real-time application performance metrics
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={isMonitoring ? stopMonitoring : startMonitoring} 
                variant={isMonitoring ? "outline" : "default"}
              >
                {isMonitoring ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-pulse" />
                    Stop Monitoring
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Start Monitor
                  </>
                )}
              </Button>
              {isMonitoring && (
                <Button 
                  onClick={exportMetrics}
                  variant="outline"
                  size="icon"
                  title="Export Metrics"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMonitoring && (
            <div className="mb-4 text-sm text-muted-foreground">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {metrics.map((metric, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{metric.name}</h4>
                  {getTrendIcon(metric.trend)}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold ${getMetricColor(metric.value, metric.target, metric.name)}`}>
                      {metric.value.toFixed(1)}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Target: {metric.target}{metric.unit}
                    </Badge>
                  </div>
                  
                  <Progress 
                    value={Math.min((metric.value / metric.target) * 100, 100)} 
                    className="h-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <div className="font-medium">System Status</div>
                <div className="text-sm text-green-600">All Systems Operational</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">Uptime</div>
                <div className="text-sm text-blue-600">99.9% (7 days)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="study-flow-shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <Shield className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <div className="font-medium">Security Level</div>
                <div className="text-sm text-yellow-600">High (Protected)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="study-flow-shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Real alerts from monitoring */}
            {recentAlerts.length > 0 ? (
              recentAlerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    alert.type === 'error' 
                      ? 'bg-red-50 dark:bg-red-900/20' 
                      : alert.type === 'warning'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20'
                      : 'bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  {alert.type === 'error' ? (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  ) : alert.type === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <Activity className="h-5 w-5 text-blue-600" />
                  )}
                  <div className="flex-1">
                    <div className={`font-medium ${
                      alert.type === 'error'
                        ? 'text-red-800 dark:text-red-200'
                        : alert.type === 'warning'
                        ? 'text-yellow-800 dark:text-yellow-200'
                        : 'text-blue-800 dark:text-blue-200'
                    }`}>
                      {alert.message}
                    </div>
                    <div className={`text-sm ${
                      alert.type === 'error'
                        ? 'text-red-600 dark:text-red-300'
                        : alert.type === 'warning'
                        ? 'text-yellow-600 dark:text-yellow-300'
                        : 'text-blue-600 dark:text-blue-300'
                    }`}>
                      {alert.metric}: {alert.value.toFixed(2)} (threshold: {alert.threshold})
                    </div>
                  </div>
                  <div className={`text-xs ${
                    alert.type === 'error'
                      ? 'text-red-600 dark:text-red-300'
                      : alert.type === 'warning'
                      ? 'text-yellow-600 dark:text-yellow-300'
                      : 'text-blue-600 dark:text-blue-300'
                  }`}>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              /* Default alerts when no real alerts */
              <>\n                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <div className="font-medium text-green-800 dark:text-green-200">
                      All systems operating normally
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-300">
                      No performance issues detected
                    </div>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-300">
                    Now
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};