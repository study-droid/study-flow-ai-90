/**
 * Response Cache Service
 * 
 * Multi-tier caching system for AI responses to improve performance
 * and reduce API calls.
 */

import { logger } from './logging/logger';

interface CacheEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl: number;
  hits: number;
  responseType?: string;
  metadata?: {
    subject?: string;
    topic?: string;
    userLevel?: string;
    qualityScore?: number;
  };
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
  oldestEntry: number;
}

type CacheTier = 'memory' | 'localStorage' | 'indexedDB';

export class ResponseCache {
  private static instance: ResponseCache;
  
  // Memory cache for active session
  private memoryCache: Map<string, CacheEntry> = new Map();
  
  // Cache configuration
  private readonly config = {
    memory: {
      maxSize: 50, // Maximum entries in memory
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000 // Clean every minute
    },
    localStorage: {
      maxSize: 100, // Maximum entries in localStorage
      defaultTTL: 60 * 60 * 1000, // 1 hour
      keyPrefix: 'ai_cache_'
    },
    indexedDB: {
      dbName: 'AIResponseCache',
      storeName: 'responses',
      version: 1,
      defaultTTL: 24 * 60 * 60 * 1000 // 24 hours
    }
  };
  
  // Cache statistics
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
    size: 0,
    oldestEntry: Date.now()
  };
  
  private cleanupTimer: NodeJS.Timeout | null = null;
  private db: IDBDatabase | null = null;

  private constructor() {
    this.initializeCache();
  }

  static getInstance(): ResponseCache {
    if (!this.instance) {
      this.instance = new ResponseCache();
    }
    return this.instance;
  }

  /**
   * Initialize cache and set up cleanup
   */
  private async initializeCache(): Promise<void> {
    // Set up periodic cleanup for memory cache
    this.cleanupTimer = setInterval(
      () => this.cleanupMemoryCache(),
      this.config.memory.cleanupInterval
    );
    
    // Initialize IndexedDB
    await this.initializeIndexedDB();
    
    // Clean up old localStorage entries
    this.cleanupLocalStorage();
    
    logger.info('Response cache initialized', 'ResponseCache');
  }

  /**
   * Initialize IndexedDB for large response storage
   */
  private async initializeIndexedDB(): Promise<void> {
    if (!('indexedDB' in window)) {
      logger.warn('IndexedDB not supported', 'ResponseCache');
      return;
    }

    try {
      const request = indexedDB.open(
        this.config.indexedDB.dbName,
        this.config.indexedDB.version
      );

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', 'ResponseCache', request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        logger.info('IndexedDB initialized', 'ResponseCache');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.config.indexedDB.storeName)) {
          const store = db.createObjectStore(this.config.indexedDB.storeName, {
            keyPath: 'key'
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('responseType', 'responseType', { unique: false });
        }
      };
    } catch (error) {
      logger.error('Error initializing IndexedDB', 'ResponseCache', error);
    }
  }

  /**
   * Generate cache key from input and context
   */
  async generateCacheKey(
    input: string,
    context?: any
  ): Promise<string> {
    const keyData = JSON.stringify({
      input: input.toLowerCase().trim(),
      subject: context?.subject || '',
      topic: context?.topic || '',
      responseType: context?.responseType || '',
      userLevel: context?.userLevel || ''
    });

    // Use Web Crypto API for consistent hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(keyData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex.substring(0, 16); // Use first 16 chars for brevity
  }

  /**
   * Get cached response
   */
  async get(
    key: string,
    tier?: CacheTier
  ): Promise<any | null> {
    // Check memory cache first
    if (!tier || tier === 'memory') {
      const memoryResult = this.getFromMemory(key);
      if (memoryResult !== null) {
        this.stats.hits++;
        this.updateHitRate();
        return memoryResult;
      }
    }

    // Check localStorage
    if (!tier || tier === 'localStorage') {
      const localResult = await this.getFromLocalStorage(key);
      if (localResult !== null) {
        this.stats.hits++;
        this.updateHitRate();
        // Promote to memory cache
        this.setInMemory(key, localResult, this.config.memory.defaultTTL);
        return localResult;
      }
    }

    // Check IndexedDB
    if (!tier || tier === 'indexedDB') {
      const indexedResult = await this.getFromIndexedDB(key);
      if (indexedResult !== null) {
        this.stats.hits++;
        this.updateHitRate();
        // Promote to memory cache
        this.setInMemory(key, indexedResult, this.config.memory.defaultTTL);
        return indexedResult;
      }
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set cached response
   */
  async set(
    key: string,
    value: any,
    ttl?: number,
    metadata?: any
  ): Promise<void> {
    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.memory.defaultTTL,
      hits: 0,
      metadata
    };

    // Determine storage tier based on response size
    const size = JSON.stringify(value).length;
    
    if (size < 10000) {
      // Small responses go to memory and localStorage
      this.setInMemory(key, entry, ttl);
      await this.setInLocalStorage(key, entry);
    } else {
      // Large responses go to IndexedDB
      await this.setInIndexedDB(key, entry);
      // Keep reference in memory
      this.setInMemory(key, { ...entry, value: '[Stored in IndexedDB]' }, ttl);
    }

    logger.debug('Response cached', 'ResponseCache', {
      key,
      size,
      ttl: entry.ttl
    });
  }

  /**
   * Get from memory cache
   */
  private getFromMemory(key: string): any | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.value;
  }

  /**
   * Set in memory cache
   */
  private setInMemory(key: string, value: any, ttl?: number): void {
    // Evict oldest entries if cache is full
    if (this.memoryCache.size >= this.config.memory.maxSize) {
      this.evictOldestEntry();
    }

    const entry: CacheEntry = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.config.memory.defaultTTL,
      hits: 0
    };

    this.memoryCache.set(key, entry);
    this.stats.size = this.memoryCache.size;
  }

  /**
   * Get from localStorage
   */
  private async getFromLocalStorage(key: string): Promise<any | null> {
    try {
      const stored = localStorage.getItem(this.config.localStorage.keyPrefix + key);
      if (!stored) return null;

      const entry: CacheEntry = JSON.parse(stored);
      
      // Check if entry has expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.config.localStorage.keyPrefix + key);
        return null;
      }

      return entry.value;
    } catch (error) {
      logger.error('Error reading from localStorage', 'ResponseCache', error);
      return null;
    }
  }

  /**
   * Set in localStorage
   */
  private async setInLocalStorage(key: string, entry: CacheEntry): Promise<void> {
    try {
      // Check localStorage size and clean if needed
      if (this.getLocalStorageSize() > this.config.localStorage.maxSize) {
        this.cleanupLocalStorage();
      }

      localStorage.setItem(
        this.config.localStorage.keyPrefix + key,
        JSON.stringify(entry)
      );
    } catch (error) {
      logger.error('Error writing to localStorage', 'ResponseCache', error);
    }
  }

  /**
   * Get from IndexedDB
   */
  private async getFromIndexedDB(key: string): Promise<any | null> {
    if (!this.db) return null;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.config.indexedDB.storeName], 'readonly');
        const store = transaction.objectStore(this.config.indexedDB.storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          const entry = request.result;
          if (!entry) {
            resolve(null);
            return;
          }

          // Check if entry has expired
          if (Date.now() - entry.timestamp > entry.ttl) {
            this.deleteFromIndexedDB(key);
            resolve(null);
            return;
          }

          resolve(entry.value);
        };

        request.onerror = () => {
          logger.error('Error reading from IndexedDB', 'ResponseCache', request.error);
          resolve(null);
        };
      } catch (error) {
        logger.error('Error accessing IndexedDB', 'ResponseCache', error);
        resolve(null);
      }
    });
  }

  /**
   * Set in IndexedDB
   */
  private async setInIndexedDB(key: string, entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.config.indexedDB.storeName], 'readwrite');
        const store = transaction.objectStore(this.config.indexedDB.storeName);
        const request = store.put(entry);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          logger.error('Error writing to IndexedDB', 'ResponseCache', request.error);
          resolve();
        };
      } catch (error) {
        logger.error('Error accessing IndexedDB', 'ResponseCache', error);
        resolve();
      }
    });
  }

  /**
   * Delete from IndexedDB
   */
  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction([this.config.indexedDB.storeName], 'readwrite');
    const store = transaction.objectStore(this.config.indexedDB.storeName);
    store.delete(key);
  }

  /**
   * Clean up expired entries from memory cache
   */
  private cleanupMemoryCache(): void {
    const now = Date.now();
    let evicted = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.stats.evictions += evicted;
      this.stats.size = this.memoryCache.size;
      logger.debug(`Evicted ${evicted} expired entries from memory cache`, 'ResponseCache');
    }
  }

  /**
   * Clean up localStorage
   */
  private cleanupLocalStorage(): void {
    const keysToRemove: string[] = [];
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.localStorage.keyPrefix)) {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          if (now - entry.timestamp > entry.ttl) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key!);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      logger.debug(`Cleaned ${keysToRemove.length} expired entries from localStorage`, 'ResponseCache');
    }
  }

  /**
   * Evict oldest entry from memory cache
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Get localStorage size
   */
  private getLocalStorageSize(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.localStorage.keyPrefix)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();
    
    // Clear localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.config.localStorage.keyPrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear IndexedDB
    if (this.db) {
      const transaction = this.db.transaction([this.config.indexedDB.storeName], 'readwrite');
      const store = transaction.objectStore(this.config.indexedDB.storeName);
      store.clear();
    }
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
      oldestEntry: Date.now()
    };
    
    logger.info('All caches cleared', 'ResponseCache');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Destroy cache and clean up
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.memoryCache.clear();
    
    logger.info('Response cache destroyed', 'ResponseCache');
  }
}

// Export singleton instance
export const responseCache = ResponseCache.getInstance();