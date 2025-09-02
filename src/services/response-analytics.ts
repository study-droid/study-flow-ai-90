/**
 * Response Analytics Service
 * 
 * Tracks and analyzes AI response optimization metrics, quality scores,
 * and user satisfaction to improve the system over time.
 */

import { logger } from './logging/logger';

interface AnalyticsEvent {
  eventType: 'response_generated' | 'response_cached' | 'response_filtered' | 'response_optimized' | 'user_feedback';
  timestamp: number;
  metadata: {
    sessionId?: string;
    responseType?: string;
    subject?: string;
    topic?: string;
    userLevel?: string;
    qualityScore?: number;
    optimizationTime?: number;
    cacheHit?: boolean;
    brandMentionsRemoved?: number;
    enhancementsApplied?: string[];
    userSatisfaction?: 'helpful' | 'not_helpful';
    responseLength?: number;
    error?: string;
  };
}

interface AnalyticsMetrics {
  totalResponses: number;
  averageQualityScore: number;
  cacheHitRate: number;
  averageOptimizationTime: number;
  brandMentionsFiltered: number;
  userSatisfactionRate: number;
  errorRate: number;
  responseTypeDistribution: Record<string, number>;
  enhancementUsage: Record<string, number>;
  peakUsageHours: number[];
}

interface PerformanceMetrics {
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  averageResponseTime: number;
  slowestResponse: number;
  fastestResponse: number;
}

export class ResponseAnalytics {
  private static instance: ResponseAnalytics;
  
  private events: AnalyticsEvent[] = [];
  private metrics: AnalyticsMetrics = {
    totalResponses: 0,
    averageQualityScore: 0,
    cacheHitRate: 0,
    averageOptimizationTime: 0,
    brandMentionsFiltered: 0,
    userSatisfactionRate: 0,
    errorRate: 0,
    responseTypeDistribution: {},
    enhancementUsage: {},
    peakUsageHours: new Array(24).fill(0)
  };
  
  private performanceData: number[] = [];
  private readonly maxEventsInMemory = 1000;
  private readonly analyticsInterval = 5 * 60 * 1000; // 5 minutes
  private analyticsTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeAnalytics();
  }

  static getInstance(): ResponseAnalytics {
    if (!this.instance) {
      this.instance = new ResponseAnalytics();
    }
    return this.instance;
  }

  /**
   * Initialize analytics and set up periodic reporting
   */
  private initializeAnalytics(): void {
    // Load stored analytics data
    this.loadStoredAnalytics();
    
    // Set up periodic analytics computation
    this.analyticsTimer = setInterval(
      () => this.computeAnalytics(),
      this.analyticsInterval
    );
    
    logger.info('Response Analytics initialized', 'ResponseAnalytics');
  }

  /**
   * Track an analytics event
   */
  trackEvent(
    eventType: AnalyticsEvent['eventType'],
    metadata: AnalyticsEvent['metadata']
  ): void {
    const event: AnalyticsEvent = {
      eventType,
      timestamp: Date.now(),
      metadata
    };

    // Add to events array
    this.events.push(event);

    // Trim events if exceeding limit
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(-this.maxEventsInMemory);
    }

    // Update real-time metrics
    this.updateRealTimeMetrics(event);

    // Log significant events
    if (eventType === 'response_filtered' && metadata.brandMentionsRemoved && metadata.brandMentionsRemoved > 0) {
      logger.info('Brand mentions filtered', 'ResponseAnalytics', {
        count: metadata.brandMentionsRemoved,
        sessionId: metadata.sessionId
      });
    }
  }

  /**
   * Track response generation
   */
  trackResponseGeneration(
    sessionId: string,
    responseType: string,
    metadata: {
      subject?: string;
      topic?: string;
      userLevel?: string;
      qualityScore?: number;
      optimizationTime?: number;
      responseLength?: number;
      enhancementsApplied?: string[];
    }
  ): void {
    this.trackEvent('response_generated', {
      sessionId,
      responseType,
      ...metadata
    });

    // Track performance
    if (metadata.optimizationTime) {
      this.performanceData.push(metadata.optimizationTime);
      if (this.performanceData.length > 1000) {
        this.performanceData = this.performanceData.slice(-1000);
      }
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit(
    sessionId: string,
    responseType: string,
    cached: boolean
  ): void {
    this.trackEvent('response_cached', {
      sessionId,
      responseType,
      cacheHit: cached
    });
  }

  /**
   * Track filtering
   */
  trackFiltering(
    sessionId: string,
    brandMentionsRemoved: number,
    filterTime: number
  ): void {
    this.trackEvent('response_filtered', {
      sessionId,
      brandMentionsRemoved,
      optimizationTime: filterTime
    });
  }

  /**
   * Track user feedback
   */
  trackUserFeedback(
    sessionId: string,
    satisfaction: 'helpful' | 'not_helpful'
  ): void {
    this.trackEvent('user_feedback', {
      sessionId,
      userSatisfaction: satisfaction
    });
  }

  /**
   * Update real-time metrics
   */
  private updateRealTimeMetrics(event: AnalyticsEvent): void {
    const { eventType, metadata } = event;

    switch (eventType) {
      case 'response_generated':
        this.metrics.totalResponses++;
        
        // Update response type distribution
        if (metadata.responseType) {
          this.metrics.responseTypeDistribution[metadata.responseType] = 
            (this.metrics.responseTypeDistribution[metadata.responseType] || 0) + 1;
        }
        
        // Update enhancement usage
        if (metadata.enhancementsApplied) {
          metadata.enhancementsApplied.forEach(enhancement => {
            this.metrics.enhancementUsage[enhancement] = 
              (this.metrics.enhancementUsage[enhancement] || 0) + 1;
          });
        }
        
        // Update peak usage hours
        const hour = new Date().getHours();
        this.metrics.peakUsageHours[hour]++;
        break;

      case 'response_filtered':
        if (metadata.brandMentionsRemoved) {
          this.metrics.brandMentionsFiltered += metadata.brandMentionsRemoved;
        }
        break;

      case 'user_feedback':
        // Will be computed in computeAnalytics
        break;
    }
  }

  /**
   * Compute analytics from events
   */
  private computeAnalytics(): void {
    if (this.events.length === 0) return;

    const recentEvents = this.events.filter(
      e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    // Calculate average quality score
    const qualityScores = recentEvents
      .filter(e => e.eventType === 'response_generated' && e.metadata.qualityScore)
      .map(e => e.metadata.qualityScore!);
    
    if (qualityScores.length > 0) {
      this.metrics.averageQualityScore = 
        qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    }

    // Calculate cache hit rate
    const cacheEvents = recentEvents.filter(e => e.eventType === 'response_cached');
    const cacheHits = cacheEvents.filter(e => e.metadata.cacheHit).length;
    if (cacheEvents.length > 0) {
      this.metrics.cacheHitRate = (cacheHits / cacheEvents.length) * 100;
    }

    // Calculate average optimization time
    const optimizationTimes = recentEvents
      .filter(e => e.eventType === 'response_generated' && e.metadata.optimizationTime)
      .map(e => e.metadata.optimizationTime!);
    
    if (optimizationTimes.length > 0) {
      this.metrics.averageOptimizationTime = 
        optimizationTimes.reduce((sum, time) => sum + time, 0) / optimizationTimes.length;
    }

    // Calculate user satisfaction rate
    const feedbackEvents = recentEvents.filter(e => e.eventType === 'user_feedback');
    const helpfulFeedback = feedbackEvents.filter(e => e.metadata.userSatisfaction === 'helpful').length;
    if (feedbackEvents.length > 0) {
      this.metrics.userSatisfactionRate = (helpfulFeedback / feedbackEvents.length) * 100;
    }

    // Calculate error rate
    const errorEvents = recentEvents.filter(e => e.metadata.error);
    if (recentEvents.length > 0) {
      this.metrics.errorRate = (errorEvents.length / recentEvents.length) * 100;
    }

    // Store analytics
    this.storeAnalytics();

    logger.info('Analytics computed', 'ResponseAnalytics', {
      totalResponses: this.metrics.totalResponses,
      averageQualityScore: this.metrics.averageQualityScore.toFixed(2),
      cacheHitRate: this.metrics.cacheHitRate.toFixed(2) + '%',
      userSatisfactionRate: this.metrics.userSatisfactionRate.toFixed(2) + '%'
    });
  }

  /**
   * Get current metrics
   */
  getMetrics(): AnalyticsMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    if (this.performanceData.length === 0) {
      return {
        p50ResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        averageResponseTime: 0,
        slowestResponse: 0,
        fastestResponse: 0
      };
    }

    const sorted = [...this.performanceData].sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50ResponseTime: sorted[Math.floor(len * 0.5)],
      p95ResponseTime: sorted[Math.floor(len * 0.95)],
      p99ResponseTime: sorted[Math.floor(len * 0.99)],
      averageResponseTime: sorted.reduce((sum, t) => sum + t, 0) / len,
      slowestResponse: sorted[len - 1],
      fastestResponse: sorted[0]
    };
  }

  /**
   * Get insights and recommendations
   */
  getInsights(): string[] {
    const insights: string[] = [];
    const metrics = this.getMetrics();

    // Quality insights
    if (metrics.averageQualityScore < 70) {
      insights.push('Response quality is below target. Consider enhancing optimization rules.');
    } else if (metrics.averageQualityScore > 85) {
      insights.push('Excellent response quality maintained.');
    }

    // Cache insights
    if (metrics.cacheHitRate < 20) {
      insights.push('Low cache hit rate. Consider extending cache TTL or improving cache key generation.');
    } else if (metrics.cacheHitRate > 50) {
      insights.push('Good cache utilization reducing API calls.');
    }

    // User satisfaction insights
    if (metrics.userSatisfactionRate < 70) {
      insights.push('User satisfaction needs improvement. Review response quality and relevance.');
    } else if (metrics.userSatisfactionRate > 90) {
      insights.push('Outstanding user satisfaction rate.');
    }

    // Brand filtering insights
    if (metrics.brandMentionsFiltered > 100) {
      insights.push(`Filtered ${metrics.brandMentionsFiltered} brand mentions. Filter is working effectively.`);
    }

    // Error rate insights
    if (metrics.errorRate > 5) {
      insights.push('High error rate detected. Review error logs for patterns.');
    }

    // Usage pattern insights
    const peakHour = metrics.peakUsageHours.indexOf(Math.max(...metrics.peakUsageHours));
    insights.push(`Peak usage occurs at ${peakHour}:00. Consider pre-caching popular responses.`);

    // Enhancement insights
    const mostUsedEnhancement = Object.entries(metrics.enhancementUsage)
      .sort(([, a], [, b]) => b - a)[0];
    if (mostUsedEnhancement) {
      insights.push(`Most used enhancement: ${mostUsedEnhancement[0]} (${mostUsedEnhancement[1]} times)`);
    }

    return insights;
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): {
    metrics: AnalyticsMetrics;
    performance: PerformanceMetrics;
    insights: string[];
    events: AnalyticsEvent[];
  } {
    return {
      metrics: this.getMetrics(),
      performance: this.getPerformanceMetrics(),
      insights: this.getInsights(),
      events: this.events.slice(-100) // Last 100 events
    };
  }

  /**
   * Load stored analytics from localStorage
   */
  private loadStoredAnalytics(): void {
    try {
      const stored = localStorage.getItem('ai_response_analytics');
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = { ...this.metrics, ...data.metrics };
        this.events = data.events || [];
        logger.info('Loaded stored analytics', 'ResponseAnalytics');
      }
    } catch (error) {
      logger.error('Error loading stored analytics', 'ResponseAnalytics', error);
    }
  }

  /**
   * Store analytics to localStorage
   */
  private storeAnalytics(): void {
    try {
      const data = {
        metrics: this.metrics,
        events: this.events.slice(-100), // Store only recent events
        timestamp: Date.now()
      };
      localStorage.setItem('ai_response_analytics', JSON.stringify(data));
    } catch (error) {
      logger.error('Error storing analytics', 'ResponseAnalytics', error);
    }
  }

  /**
   * Reset analytics
   */
  reset(): void {
    this.events = [];
    this.performanceData = [];
    this.metrics = {
      totalResponses: 0,
      averageQualityScore: 0,
      cacheHitRate: 0,
      averageOptimizationTime: 0,
      brandMentionsFiltered: 0,
      userSatisfactionRate: 0,
      errorRate: 0,
      responseTypeDistribution: {},
      enhancementUsage: {},
      peakUsageHours: new Array(24).fill(0)
    };
    
    localStorage.removeItem('ai_response_analytics');
    logger.info('Analytics reset', 'ResponseAnalytics');
  }

  /**
   * Destroy analytics and clean up
   */
  destroy(): void {
    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer);
      this.analyticsTimer = null;
    }
    
    this.storeAnalytics();
    logger.info('Response Analytics destroyed', 'ResponseAnalytics');
  }
}

// Export singleton instance
export const responseAnalytics = ResponseAnalytics.getInstance();