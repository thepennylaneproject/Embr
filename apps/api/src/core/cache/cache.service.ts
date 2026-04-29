/**
 * Cache Service
 * Provides caching layer with Redis support or fallback to an LRU-bounded in-memory cache
 * (see CACHE_IN_MEMORY_MAX_KEYS).
 */

import { Injectable, Logger, Optional } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

interface CacheEntry {
  data: any;
  expiresAt: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries: number) {}

  set(key: string, value: any, ttl?: number): void {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : Date.now() + 60 * 1000; // Default 60s
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    while (this.cache.size >= this.maxEntries) {
      const oldest = this.cache.keys().next().value as string | undefined;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { data: value, expiresAt });
  }

  get(key: string): any {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // LRU touch: move to end of insertion order
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  del(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cleanup expired entries (run periodically)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Redis-backed cache with in-memory fallback.
 * On Redis connection or command errors, reads fall back to the in-memory layer
 * where possible; writes populate in-memory so callers still get cache semantics.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private inMemoryCache: InMemoryCache;
  private useRedis = false;
  private redisClient: any; // Redis client, typed as any for flexibility

  constructor(@Optional() redisClient?: any) {
    const raw = process.env.CACHE_IN_MEMORY_MAX_KEYS;
    const parsed = raw ? Number.parseInt(raw, 10) : 5000;
    const maxEntries =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 1_000_000) : 5000;
    this.inMemoryCache = new InMemoryCache(maxEntries);
    if (redisClient) {
      this.redisClient = redisClient;
      this.useRedis = true;
    }
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    if (this.useRedis && this.redisClient) {
      try {
        const value = await this.redisClient.get(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        this.logger.warn(
          `Redis get failed for key "${key}"; using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
        );
        return this.inMemoryCache.get(key);
      }
    }

    return this.inMemoryCache.get(key);
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    const ttl = options?.ttl || 300; // Default 5 minutes

    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.setex(key, ttl, JSON.stringify(value));
        return;
      } catch (error) {
        this.logger.warn(
          `Redis set failed for key "${key}"; using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.inMemoryCache.set(key, value, ttl);
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<boolean> {
    if (this.useRedis && this.redisClient) {
      try {
        const deleted = await this.redisClient.del(key);
        return deleted > 0;
      } catch (error) {
        this.logger.warn(
          `Redis del failed for key "${key}"; using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
        );
        return this.inMemoryCache.del(key);
      }
    }

    return this.inMemoryCache.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: string[]): Promise<number> {
    if (this.useRedis && this.redisClient) {
      try {
        return await this.redisClient.del(...keys);
      } catch (error) {
        this.logger.warn(
          `Redis delMany failed; using in-memory fallback: ${error instanceof Error ? error.message : String(error)}`,
        );
        let deleted = 0;
        for (const key of keys) {
          if (this.inMemoryCache.del(key)) deleted++;
        }
        return deleted;
      }
    }

    let deleted = 0;
    for (const key of keys) {
      if (this.inMemoryCache.del(key)) deleted++;
    }
    return deleted;
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (this.useRedis && this.redisClient) {
      try {
        await this.redisClient.flushdb();
        return;
      } catch (error) {
        this.logger.warn(
          `Redis flushdb failed; clearing in-memory cache only: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.inMemoryCache.clear();
  }

  /**
   * Get or set pattern - fetch from cache or execute fn
   */
  async getOrSet<T = any>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) return cached;

    const value = await fn();
    await this.set(key, value, options);
    return value;
  }
}
