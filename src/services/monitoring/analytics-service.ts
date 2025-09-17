/**
 * Analytics Service
 * Handles analytics tracking and monitoring
 */

import { logger } from '@/lib/logger';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private events: AnalyticsEvent[] = [];

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  track(event: string, properties?: Record<string, any>): void {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties,
      timestamp: Date.now()
    };

    this.events.push(analyticsEvent);
    logger.info(`Analytics event tracked: ${event}`, 'AnalyticsService', properties);
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;