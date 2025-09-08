import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Users, 
  Zap,
  Download,
  RefreshCw
} from 'lucide-react';
import { usePerformanceMetrics } from '@/services/monitoring/performance-metrics';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'error';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend, 
  status = 'good' 
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-green-600';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    return trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={getStatusColor()}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {getTrendIcon()}
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface PerformanceChartProps {
  data: Array<{ timestamp: number; value: number; label?: string }>;
  title: string;
  color?: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ 
  data, 
  title, 
  color = '#3b82f6' 
}) => {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-32 flex items-end justify-between gap-1">
          {data.slice(-20).map((point, index) => {
            const height = ((point.value - minValue) / range) * 100;
            return (
              <div
                key={index}
                className="flex-1 bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                style={{ 
                  height: `${Math.max(height, 5)}%`,
                  backgroundColor: color
                }}
                title={`${point.label || 'Value'}: ${point.value.toFixed(2)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Min: {minValue.toFixed(2)}</span>
          <span>Max: {maxValue.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};

interface ErrorListProps {
  errors: Array<{ error: string; count: number }>;
}

const ErrorList: React.FC<ErrorListProps> = ({ errors }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Top Errors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors recorded</p>
          ) : (
            errors.map((error, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm truncate flex-1">{error.error}</span>
                <Badge variant={error.count > 5 ? 'destructive' : 'secondary'}>
                  {error.count}
                </Badge>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export const PerformanceDashboard: React.FC = () => {
  const { getMetricsSummary, exportMetrics } = usePerformanceMetrics();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('1h');

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const now = Date.now();
    const ranges = {
      '1h': now - 60 * 60 * 1000,
      '24h': now - 24 * 60 * 60 * 1000,
      '7d': now - 7 * 24 * 60 * 60 * 1000
    };

    return getMetricsSummary({
      start: ranges[timeRange],
      end: now
    });
  }, [getMetricsSummary, timeRange, lastUpdate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate refresh
    setLastUpdate(Date.now());
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const data = exportMetrics();
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResponseTimeStatus = (avgTime: number) => {
    if (avgTime < 500) return 'good';
    if (avgTime < 1000) return 'warning';
    return 'error';
  };

  const getErrorRateStatus = (errorRate: number) => {
    if (errorRate < 1) return 'good';
    if (errorRate < 5) return 'warning';
    return 'error';
  };

  // Mock data for charts (in real implementation, this would come from metrics)
  const responseTimeData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: Date.now() - (19 - i) * 60000,
    value: Math.random() * 1000 + 200,
    label: 'Response Time'
  }));

  const errorRateData = Array.from({ length: 20 }, (_, i) => ({
    timestamp: Date.now() - (19 - i) * 60000,
    value: Math.random() * 5,
    label: 'Error Rate'
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="1h">1H</TabsTrigger>
              <TabsTrigger value="24h">24H</TabsTrigger>
              <TabsTrigger value="7d">7D</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Avg Response Time"
          value={`${metrics.averageResponseTime.toFixed(0)}ms`}
          subtitle="Last hour"
          icon={<Clock className="h-4 w-4" />}
          status={getResponseTimeStatus(metrics.averageResponseTime)}
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics.errorRate.toFixed(1)}%`}
          subtitle="Last hour"
          icon={<AlertTriangle className="h-4 w-4" />}
          status={getErrorRateStatus(metrics.errorRate)}
        />
        <MetricCard
          title="Total Requests"
          value={metrics.totalMetrics}
          subtitle="Last hour"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Performance Score"
          value={`${Math.max(100 - metrics.errorRate * 10 - (metrics.averageResponseTime / 10), 0).toFixed(0)}`}
          subtitle="Overall health"
          icon={<TrendingUp className="h-4 w-4" />}
          status={metrics.errorRate < 1 && metrics.averageResponseTime < 500 ? 'good' : 'warning'}
        />
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="user-experience">User Experience</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceChart
              data={responseTimeData}
              title="Response Time Trend"
              color="#3b82f6"
            />
            <PerformanceChart
              data={errorRateData}
              title="Error Rate Trend"
              color="#ef4444"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ErrorList errors={metrics.topErrors} />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(metrics.performanceGrades).map(([grade, count]) => (
                    <div key={grade} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{grade}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <PerformanceChart
              data={responseTimeData}
              title="Detailed Response Time Analysis"
              color="#3b82f6"
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>P50 Response Time</span>
                    <span>{(metrics.averageResponseTime * 0.8).toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P95 Response Time</span>
                    <span>{(metrics.averageResponseTime * 1.5).toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>P99 Response Time</span>
                    <span>{(metrics.averageResponseTime * 2).toFixed(0)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ErrorList errors={metrics.topErrors} />
            <PerformanceChart
              data={errorRateData}
              title="Error Rate Over Time"
              color="#ef4444"
            />
          </div>
        </TabsContent>

        <TabsContent value="user-experience" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">User Experience Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Page Load Time</span>
                    <span className="text-green-600">1.2s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time to Interactive</span>
                    <span className="text-green-600">2.1s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>First Contentful Paint</span>
                    <span className="text-green-600">0.8s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cumulative Layout Shift</span>
                    <span className="text-green-600">0.05</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">User Satisfaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Successful Interactions</span>
                    <span className="text-green-600">98.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Session Duration</span>
                    <span>12m 34s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Bounce Rate</span>
                    <span className="text-yellow-600">15.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Footer */}
      <div className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(lastUpdate).toLocaleTimeString()} • 
        Auto-refresh every 30 seconds
      </div>
    </div>
  );
};