/**
 * Cache Performance Monitor
 * Monitors cache performance and provides analytics
 */

import { CacheManager, GlobalCacheMetrics } from './cache-manager';
import { CacheMetrics } from './ai-response-cache';

export interface CachePerformanceReport {
  timestamp: number;
  period: string;
  summary: {
    totalRequests: number;
    hitRate: number;
    averageResponseTime: number;
    memoryEfficiency: number;
    topPerformingPolicy: string;
  };
  trends: {
    hitRateTrend: 'improving' | 'declining' | 'stable';
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    requestVolumeTrend: 'increasing' | 'decreasing' | 'stable';
  };
  recommendations: string[];
  alerts: CacheAlert[];
}

export interface CacheAlert {
  level: 'info' | 'warning' | 'error';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface CacheMonitorConfig {
  alertThresholds: {
    lowHitRate: number;
    highMemoryUsage: number;
    highEvictionRate: number;
  };
  reportingInterval: number;
  historyRetention: number;
}

/**
 * Monitors cache performance and generates reports
 */
export class CacheMonitor {
  private cacheManager: CacheManager;
  private config: CacheMonitorConfig;
  private metricsHistory: GlobalCacheMetrics[] = [];
  private alerts: CacheAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(cacheManager: CacheManager, config: Partial<CacheMonitorConfig> = {}) {
    this.cacheManager = cacheManager;
    this.config = {
      alertThresholds: {
        lowHitRate: 0.3,
        highMemoryUsage: 80, // MB
        highEvictionRate: 0.1 // 10% of entries evicted
      },
      reportingInterval: 5 * 60 * 1000, // 5 minutes
      historyRetention: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.startMonitoring();
  }

  /**
   * Generate performance report
   */
  generateReport(period: '1h' | '6h' | '24h' = '1h'): CachePerformanceReport {
    const now = Date.now();
    const periodMs = this.getPeriodMs(period);
    const startTime = now - periodMs;
    
    const recentMetrics = this.metricsHistory.filter(m => 
      m.totalRequests > 0 && (now - periodMs) <= startTime
    );

    const currentMetrics = this.cacheManager.getGlobalMetrics();
    
    return {
      timestamp: now,
      period,
      summary: this.generateSummary(currentMetrics, recentMetrics),
      trends: this.analyzeTrends(recentMetrics),
      recommendations: this.generateRecommendations(currentMetrics, recentMetrics),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Get real-time cache statistics
   */
  getRealTimeStats() {
    const metrics = this.cacheManager.getGlobalMetrics();
    const stats = this.cacheManager.getStats();
    
    return {
      current: metrics,
      detailed: stats,
      alerts: this.alerts.filter(a => (Date.now() - a.timestamp) < 60000), // Last minute
      performance: {
        hitRateGrade: this.gradeHitRate(metrics.globalHitRate),
        memoryEfficiency: this.calculateMemoryEfficiency(metrics),
        responseTimeGrade: this.gradeResponseTime(stats)
      }
    };
  }

  /**
   * Get cache health score (0-100)
   */
  getHealthScore(): number {
    const metrics = this.cacheManager.getGlobalMetrics();
    let score = 100;
    
    // Hit rate impact (40% of score)
    const hitRateScore = Math.min(metrics.globalHitRate * 100, 100);
    score = score * 0.4 + hitRateScore * 0.4;
    
    // Memory efficiency impact (30% of score)
    const memoryEfficiency = this.calculateMemoryEfficiency(metrics);
    score = score * 0.7 + memoryEfficiency * 0.3;
    
    // Alert impact (30% of score)
    const activeAlerts = this.getActiveAlerts();
    const alertPenalty = activeAlerts.reduce((penalty, alert) => {
      switch (alert.level) {
        case 'error': return penalty + 20;
        case 'warning': return penalty + 10;
        case 'info': return penalty + 2;
        default: return penalty;
      }
    }, 0);
    
    return Math.max(0, Math.min(100, score - alertPenalty));
  }

  /**
   * Get performance trends over time
   */
  getTrends(hours: number = 6) {
    const now = Date.now();
    const startTime = now - (hours * 60 * 60 * 1000);
    
    const relevantMetrics = this.metricsHistory.filter(m => 
      m.totalRequests > 0 && (now - startTime) >= 0
    );

    if (relevantMetrics.length < 2) {
      return null;
    }

    const timePoints = relevantMetrics.map(m => ({
      timestamp: now - (this.metricsHistory.length - this.metricsHistory.indexOf(m)) * this.config.reportingInterval,
      hitRate: m.globalHitRate,
      memoryUsage: m.totalMemoryUsage,
      requests: m.totalRequests
    }));

    return {
      hitRate: timePoints,
      memoryUsage: timePoints,
      requestVolume: timePoints,
      analysis: this.analyzeTrends(relevantMetrics)
    };
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json') {
    const data = {
      config: this.config,
      currentMetrics: this.cacheManager.getGlobalMetrics(),
      history: this.metricsHistory,
      alerts: this.alerts,
      exportTimestamp: Date.now()
    };

    if (format === 'csv') {
      return this.convertToCSV(data);
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Stop monitoring and cleanup
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.metricsHistory = [];
    this.alerts = [];
  }

  /**
   * Private helper methods
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupHistory();
    }, this.config.reportingInterval);

    // Initial collection
    this.collectMetrics();
  }

  private collectMetrics(): void {
    const metrics = this.cacheManager.getGlobalMetrics();
    this.metricsHistory.push({
      ...metrics,
      // Add timestamp for tracking
      timestamp: Date.now()
    } as GlobalCacheMetrics & { timestamp: number });
  }

  private checkAlerts(): void {
    const metrics = this.cacheManager.getGlobalMetrics();
    const now = Date.now();

    // Check hit rate
    if (metrics.globalHitRate < this.config.alertThresholds.lowHitRate) {
      this.addAlert({
        level: 'warning',
        message: `Cache hit rate is low: ${(metrics.globalHitRate * 100).toFixed(1)}%`,
        metric: 'hitRate',
        value: metrics.globalHitRate,
        threshold: this.config.alertThresholds.lowHitRate,
        timestamp: now
      });
    }

    // Check memory usage
    if (metrics.totalMemoryUsage > this.config.alertThresholds.highMemoryUsage) {
      this.addAlert({
        level: 'warning',
        message: `High memory usage: ${metrics.totalMemoryUsage.toFixed(1)}MB`,
        metric: 'memoryUsage',
        value: metrics.totalMemoryUsage,
        threshold: this.config.alertThresholds.highMemoryUsage,
        timestamp: now
      });
    }

    // Check for no cache activity
    if (metrics.totalRequests === 0 && this.metricsHistory.length > 2) {
      this.addAlert({
        level: 'info',
        message: 'No cache activity detected',
        metric: 'requests',
        value: 0,
        threshold: 1,
        timestamp: now
      });
    }
  }

  private addAlert(alert: CacheAlert): void {
    // Avoid duplicate alerts
    const existingAlert = this.alerts.find(a => 
      a.metric === alert.metric && 
      a.level === alert.level &&
      (alert.timestamp - a.timestamp) < 60000 // Within 1 minute
    );

    if (!existingAlert) {
      this.alerts.push(alert);
      
      // Keep only recent alerts
      this.alerts = this.alerts.filter(a => 
        (alert.timestamp - a.timestamp) < (60 * 60 * 1000) // Last hour
      );
    }
  }

  private cleanupHistory(): void {
    const cutoff = Date.now() - this.config.historyRetention;
    this.metricsHistory = this.metricsHistory.filter(m => 
      (m as any).timestamp > cutoff
    );
  }

  private generateSummary(current: GlobalCacheMetrics, history: GlobalCacheMetrics[]) {
    const policies = Object.keys(current.policiesStats);
    const topPolicy = policies.reduce((best, policy) => {
      const currentHitRate = current.policiesStats[policy]?.hitRate || 0;
      const bestHitRate = current.policiesStats[best]?.hitRate || 0;
      return currentHitRate > bestHitRate ? policy : best;
    }, policies[0] || 'none');

    return {
      totalRequests: current.totalRequests,
      hitRate: current.globalHitRate,
      averageResponseTime: this.calculateAverageResponseTime(current),
      memoryEfficiency: this.calculateMemoryEfficiency(current),
      topPerformingPolicy: topPolicy
    };
  }

  private analyzeTrends(history: GlobalCacheMetrics[]) {
    if (history.length < 2) {
      return {
        hitRateTrend: 'stable' as const,
        memoryTrend: 'stable' as const,
        requestVolumeTrend: 'stable' as const
      };
    }

    const recent = history.slice(-3);
    const older = history.slice(0, Math.max(1, history.length - 3));

    const recentAvgHitRate = recent.reduce((sum, m) => sum + m.globalHitRate, 0) / recent.length;
    const olderAvgHitRate = older.reduce((sum, m) => sum + m.globalHitRate, 0) / older.length;

    const recentAvgMemory = recent.reduce((sum, m) => sum + m.totalMemoryUsage, 0) / recent.length;
    const olderAvgMemory = older.reduce((sum, m) => sum + m.totalMemoryUsage, 0) / older.length;

    const recentAvgRequests = recent.reduce((sum, m) => sum + m.totalRequests, 0) / recent.length;
    const olderAvgRequests = older.reduce((sum, m) => sum + m.totalRequests, 0) / older.length;

    return {
      hitRateTrend: this.determineTrend(recentAvgHitRate, olderAvgHitRate, 0.05),
      memoryTrend: this.determineTrend(recentAvgMemory, olderAvgMemory, 5),
      requestVolumeTrend: this.determineTrend(recentAvgRequests, olderAvgRequests, 10)
    };
  }

  private determineTrend(recent: number, older: number, threshold: number): 'improving' | 'declining' | 'stable' {
    const diff = recent - older;
    if (Math.abs(diff) < threshold) return 'stable';
    return diff > 0 ? 'improving' : 'declining';
  }

  private generateRecommendations(current: GlobalCacheMetrics, history: GlobalCacheMetrics[]): string[] {
    const recommendations: string[] = [];

    if (current.globalHitRate < 0.4) {
      recommendations.push('Consider increasing cache TTL or adjusting similarity thresholds');
    }

    if (current.totalMemoryUsage > 50) {
      recommendations.push('Memory usage is high, consider enabling compression or reducing cache sizes');
    }

    if (current.totalEntries < 100 && current.totalRequests > 1000) {
      recommendations.push('Cache utilization is low relative to request volume');
    }

    const trends = this.analyzeTrends(history);
    if (trends.hitRateTrend === 'declining') {
      recommendations.push('Hit rate is declining, review cache policies and request patterns');
    }

    return recommendations;
  }

  private getActiveAlerts(): CacheAlert[] {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    return this.alerts.filter(a => a.timestamp > oneHourAgo);
  }

  private calculateMemoryEfficiency(metrics: GlobalCacheMetrics): number {
    if (metrics.totalMemoryUsage === 0) return 100;
    
    // Efficiency = (hit rate * 100) / (memory usage in MB)
    const efficiency = (metrics.globalHitRate * 100) / Math.max(1, metrics.totalMemoryUsage);
    return Math.min(100, efficiency * 10); // Scale to 0-100
  }

  private calculateAverageResponseTime(metrics: GlobalCacheMetrics): number {
    const policies = Object.values(metrics.policiesStats);
    if (policies.length === 0) return 0;
    
    return policies.reduce((sum, policy) => sum + policy.averageResponseTime, 0) / policies.length;
  }

  private gradeHitRate(hitRate: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (hitRate >= 0.8) return 'A';
    if (hitRate >= 0.6) return 'B';
    if (hitRate >= 0.4) return 'C';
    if (hitRate >= 0.2) return 'D';
    return 'F';
  }

  private gradeResponseTime(stats: any): 'A' | 'B' | 'C' | 'D' | 'F' {
    // This would need to be implemented based on actual response time data
    return 'B'; // Placeholder
  }

  private getPeriodMs(period: string): number {
    switch (period) {
      case '1h': return 60 * 60 * 1000;
      case '6h': return 6 * 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion for metrics history
    const headers = ['timestamp', 'totalRequests', 'hitRate', 'memoryUsage', 'totalEntries'];
    const rows = data.history.map((m: any) => [
      m.timestamp || Date.now(),
      m.totalRequests,
      m.globalHitRate,
      m.totalMemoryUsage,
      m.totalEntries
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// Export factory function instead of singleton to avoid initialization issues
export const createCacheMonitor = (cacheManager: CacheManager, config?: Partial<CacheMonitorConfig>) => {
  return new CacheMonitor(cacheManager, config);
};