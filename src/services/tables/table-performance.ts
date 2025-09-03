/**
 * Table Performance Optimization Service
 * Handles virtualization, caching, memory management, and performance monitoring
 */

import { logger } from '../logging/logger';
import { performanceMonitor } from '../performance/performance-monitor';
import type { 
  TableConfig,
  TableColumn,
  TableRow,
  TablePerformance,
  TablePerformanceMetrics
} from '@/types/table-types';

/**
 * Virtualization configuration
 */
export interface VirtualizationConfig {
  enabled: boolean;
  rowHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number;
  useVariableHeight: boolean;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  strategy: 'lru' | 'fifo' | 'lfu';
}

/**
 * Performance monitoring data
 */
export interface PerformanceData {
  renderTime: number;
  scrollPerformance: number;
  memoryUsage: number;
  cacheHitRate: number;
  visibleRows: number;
  totalRows: number;
  timestamp: number;
}

/**
 * Virtualized row data
 */
export interface VirtualizedRow {
  index: number;
  data: TableRow;
  top: number;
  height: number;
  visible: boolean;
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Performance optimization thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  LARGE_DATASET: 1000,
  VIRTUALIZATION_THRESHOLD: 500,
  MEMORY_WARNING: 50 * 1024 * 1024, // 50MB
  RENDER_TIME_WARNING: 100, // ms
  MAX_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
  DEBOUNCE_DELAY: 150,
  BATCH_SIZE: 50
};

class TablePerformanceOptimizer {
  private static instance: TablePerformanceOptimizer;
  private cache = new Map<string, CacheEntry<any>>();
  private performanceData: PerformanceData[] = [];
  private observers = new Set<(data: PerformanceData) => void>();
  private memoryUsage = 0;
  private renderTimings: number[] = [];
  
  private constructor() {}
  
  static getInstance(): TablePerformanceOptimizer {
    if (!TablePerformanceOptimizer.instance) {
      TablePerformanceOptimizer.instance = new TablePerformanceOptimizer();
    }
    return TablePerformanceOptimizer.instance;
  }
  
  /**
   * Optimize table configuration for performance
   */
  optimizeTableConfig(
    config: TableConfig,
    dataSize: { rows: number; columns: number }
  ): TableConfig {
    const startTime = performance.now();
    
    logger.info('Starting table configuration optimization', 'TablePerformanceOptimizer', dataSize);
    
    const optimizedConfig = { ...config };
    
    // Enable virtualization for large datasets
    if (dataSize.rows > PERFORMANCE_THRESHOLDS.VIRTUALIZATION_THRESHOLD) {
      optimizedConfig.performance = {
        ...config.performance,
        enableVirtualization: true,
        virtualizationThreshold: PERFORMANCE_THRESHOLDS.VIRTUALIZATION_THRESHOLD,
        rowHeight: config.performance?.rowHeight || 40,
        estimatedRowHeight: config.performance?.estimatedRowHeight || 40
      };
      
      logger.info('Enabled virtualization for large dataset', 'TablePerformanceOptimizer', {
        rows: dataSize.rows,
        threshold: PERFORMANCE_THRESHOLDS.VIRTUALIZATION_THRESHOLD
      });
    }
    
    // Optimize pagination for very large datasets
    if (dataSize.rows > PERFORMANCE_THRESHOLDS.LARGE_DATASET) {
      optimizedConfig.pagination = {
        ...config.pagination,
        enabled: true,
        pageSize: Math.min(config.pagination?.pageSize || 50, 100),
        serverSide: dataSize.rows > 10000 // Recommend server-side pagination
      };
    }
    
    // Enable debouncing for interactive features
    optimizedConfig.performance = {
      ...optimizedConfig.performance,
      searchDebounce: config.performance?.searchDebounce || PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY,
      filterDebounce: config.performance?.filterDebounce || PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY,
      resizeDebounce: config.performance?.resizeDebounce || PERFORMANCE_THRESHOLDS.DEBOUNCE_DELAY
    };
    
    // Optimize memory settings
    optimizedConfig.performance = {
      ...optimizedConfig.performance,
      maxCachedRows: Math.min(dataSize.rows, config.performance?.maxCachedRows || 1000),
      enableRowRecycling: dataSize.rows > 1000,
      batchSize: config.performance?.batchSize || PERFORMANCE_THRESHOLDS.BATCH_SIZE
    };
    
    const optimizationTime = performance.now() - startTime;
    
    logger.info('Table configuration optimization completed', 'TablePerformanceOptimizer', {
      optimizationTime,
      virtualizationEnabled: optimizedConfig.performance?.enableVirtualization,
      paginationEnabled: optimizedConfig.pagination?.enabled
    });
    
    return optimizedConfig;
  }
  
  /**
   * Calculate virtual rows for rendering
   */
  calculateVirtualRows(
    data: TableRow[],
    config: VirtualizationConfig,
    scrollTop: number
  ): VirtualizedRow[] {
    if (!config.enabled) {
      return data.map((row, index) => ({
        index,
        data: row,
        top: index * config.rowHeight,
        height: config.rowHeight,
        visible: true
      }));
    }
    
    const totalHeight = data.length * config.rowHeight;
    const visibleStart = Math.floor(scrollTop / config.rowHeight);
    const visibleEnd = Math.min(
      data.length,
      visibleStart + Math.ceil(config.containerHeight / config.rowHeight) + config.overscan
    );
    
    const virtualRows: VirtualizedRow[] = [];
    
    // Add buffer rows before visible area
    const startIndex = Math.max(0, visibleStart - config.overscan);
    const endIndex = Math.min(data.length, visibleEnd + config.overscan);
    
    for (let i = startIndex; i < endIndex; i++) {
      virtualRows.push({
        index: i,
        data: data[i],
        top: i * config.rowHeight,
        height: config.rowHeight,
        visible: i >= visibleStart && i < visibleEnd
      });
    }
    
    return virtualRows;
  }
  
  /**
   * Optimize data processing with batching
   */
  async processBatchedData<T, R>(
    data: T[],
    processor: (batch: T[]) => Promise<R[]>,
    batchSize: number = PERFORMANCE_THRESHOLDS.BATCH_SIZE
  ): Promise<R[]> {
    const results: R[] = [];
    const startTime = performance.now();
    
    logger.info('Starting batched data processing', 'TablePerformanceOptimizer', {
      totalItems: data.length,
      batchSize
    });
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
      
      // Allow event loop to process other tasks
      if (i % (batchSize * 5) === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    const processingTime = performance.now() - startTime;
    
    logger.info('Batched data processing completed', 'TablePerformanceOptimizer', {
      processingTime,
      itemsProcessed: results.length,
      averageTimePerItem: processingTime / results.length
    });
    
    return results;
  }
  
  /**
   * Cache management with LRU strategy
   */
  setCache<T>(key: string, value: T, ttl: number = 300000): void { // 5 minutes default
    // Check memory usage
    if (this.getEstimatedCacheSize() > PERFORMANCE_THRESHOLDS.MAX_CACHE_SIZE) {
      this.evictLRU();
    }
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };
    
    this.cache.set(key, entry);
    
    // Set TTL cleanup
    setTimeout(() => {
      if (this.cache.has(key)) {
        const cachedEntry = this.cache.get(key)!;
        if (cachedEntry.timestamp === entry.timestamp) {
          this.cache.delete(key);
        }
      }
    }, ttl);
  }
  
  /**
   * Get cached value
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.value as T;
  }
  
  /**
   * Evict least recently used items
   */
  private evictLRU(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
    
    logger.info('Cache LRU eviction completed', 'TablePerformanceOptimizer', {
      entriesRemoved: toRemove,
      remainingEntries: this.cache.size
    });
  }
  
  /**
   * Estimate cache size in bytes
   */
  private getEstimatedCacheSize(): number {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // UTF-16 characters
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Overhead for entry metadata
    }
    
    return totalSize;
  }
  
  /**
   * Monitor render performance
   */
  trackRenderPerformance(renderTime: number): void {
    this.renderTimings.push(renderTime);
    
    // Keep only last 100 measurements
    if (this.renderTimings.length > 100) {
      this.renderTimings.shift();
    }
    
    // Alert if render time is too high
    if (renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      logger.warn('Slow render performance detected', 'TablePerformanceOptimizer', {
        renderTime,
        threshold: PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING
      });
    }
    
    // Update performance data
    const avgRenderTime = this.renderTimings.reduce((sum, time) => sum + time, 0) / this.renderTimings.length;
    
    const performanceData: PerformanceData = {
      renderTime: avgRenderTime,
      scrollPerformance: this.calculateScrollPerformance(),
      memoryUsage: this.estimateMemoryUsage(),
      cacheHitRate: this.calculateCacheHitRate(),
      visibleRows: 0, // Will be set by caller
      totalRows: 0, // Will be set by caller
      timestamp: Date.now()
    };
    
    this.performanceData.push(performanceData);
    if (this.performanceData.length > 1000) {
      this.performanceData.shift();
    }
    
    // Notify observers
    this.observers.forEach(observer => observer(performanceData));
  }
  
  /**
   * Calculate scroll performance metric
   */
  private calculateScrollPerformance(): number {
    // This would be implemented with actual scroll event timing
    // For now, return a baseline value
    return 60; // Target 60fps
  }
  
  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    let usage = this.getEstimatedCacheSize();
    
    // Add estimated DOM element memory usage
    const avgElementSize = 200; // bytes per DOM element
    const visibleElements = document.querySelectorAll('[data-table-row]').length;
    usage += visibleElements * avgElementSize;
    
    this.memoryUsage = usage;
    return usage;
  }
  
  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(): number {
    if (this.cache.size === 0) return 0;
    
    let totalAccesses = 0;
    let totalHits = 0;
    
    for (const [_, entry] of this.cache.entries()) {
      totalAccesses += entry.accessCount;
      if (entry.accessCount > 1) {
        totalHits += entry.accessCount - 1;
      }
    }
    
    return totalAccesses > 0 ? (totalHits / totalAccesses) * 100 : 0;
  }
  
  /**
   * Debounce function for performance optimization
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }
  
  /**
   * Throttle function for scroll events
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(null, args);
      }
    };
  }
  
  /**
   * Optimize column rendering order
   */
  optimizeColumnOrder(columns: TableColumn[]): TableColumn[] {
    // Prioritize visible columns first
    const visibleColumns = columns.filter(col => col.visible !== false);
    const hiddenColumns = columns.filter(col => col.visible === false);
    
    // Sort visible columns by priority (if set)
    visibleColumns.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    
    return [...visibleColumns, ...hiddenColumns];
  }
  
  /**
   * Memory cleanup
   */
  cleanup(): void {
    this.cache.clear();
    this.performanceData = [];
    this.renderTimings = [];
    this.observers.clear();
    
    logger.info('Performance optimizer cleanup completed', 'TablePerformanceOptimizer');
  }
  
  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (data: PerformanceData) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): TablePerformanceMetrics {
    const avgRenderTime = this.renderTimings.length > 0 
      ? this.renderTimings.reduce((sum, time) => sum + time, 0) / this.renderTimings.length
      : 0;
    
    return {
      renderTime: avgRenderTime,
      dataProcessingTime: 0, // Would be tracked separately
      filterTime: 0,
      sortTime: 0,
      exportTime: 0,
      memoryUsage: this.memoryUsage,
      rowsPerSecond: avgRenderTime > 0 ? Math.round(1000 / avgRenderTime) : 0,
      totalRows: 0, // Would be provided by caller
      visibleRows: 0, // Would be provided by caller
      timestamp: Date.now()
    };
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    memoryUsage: number;
    entries: number;
  } {
    return {
      size: this.getEstimatedCacheSize(),
      hitRate: this.calculateCacheHitRate(),
      memoryUsage: this.memoryUsage,
      entries: this.cache.size
    };
  }
  
  /**
   * Performance recommendations
   */
  getPerformanceRecommendations(
    config: TableConfig,
    metrics: TablePerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    // Render performance
    if (metrics.renderTime > PERFORMANCE_THRESHOLDS.RENDER_TIME_WARNING) {
      recommendations.push('Consider enabling virtualization for better render performance');
      
      if (!config.performance?.enableVirtualization && config.data.length > 500) {
        recommendations.push('Enable virtualization for large datasets');
      }
    }
    
    // Memory usage
    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.MEMORY_WARNING) {
      recommendations.push('High memory usage detected - consider pagination or data filtering');
      
      if (!config.pagination?.enabled) {
        recommendations.push('Enable pagination to reduce memory usage');
      }
    }
    
    // Cache performance
    const cacheStats = this.getCacheStats();
    if (cacheStats.hitRate < 50) {
      recommendations.push('Low cache hit rate - review caching strategy');
    }
    
    // Column optimization
    const visibleColumns = config.columns.filter(col => col.visible !== false);
    if (visibleColumns.length > 10) {
      recommendations.push('Consider hiding some columns to improve performance');
    }
    
    // Data size optimization
    if (config.data.length > 10000 && !config.pagination?.serverSide) {
      recommendations.push('Consider server-side pagination for large datasets');
    }
    
    return recommendations;
  }
}

export const tablePerformanceOptimizer = TablePerformanceOptimizer.getInstance();