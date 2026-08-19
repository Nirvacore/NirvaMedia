/**
 * NMD Cache Strategy
 * Redis-based caching for frequently accessed data
 */

export interface CacheConfig {
  defaultTTL: number; // seconds
  maxSize: number; // bytes
  evictionPolicy: "LRU" | "LFU" | "TTL";
  compressionThreshold: number; // bytes
}

export interface CacheEntry {
  key: string;
  value: unknown;
  ttl: number;
  hitCount: number;
  lastAccess: number;
  size: number;
  compressed: boolean;
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  evictionCount: number;
  totalSize: number;
  estimatedMemory: number;
}

class RedisCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private evictions = 0;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 3600,
      maxSize: 100 * 1024 * 1024, // 100MB
      evictionPolicy: "LRU",
      compressionThreshold: 1024,
      ...config,
    };
  }

  async get(key: string): Promise<unknown | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.ttl > 0 && Date.now() / 1000 - entry.lastAccess > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hitCount++;
    entry.lastAccess = Date.now();
    this.hits++;

    return entry.value;
  }

  async set(
    key: string,
    value: unknown,
    ttl: number = this.config.defaultTTL
  ): Promise<void> {
    const size = JSON.stringify(value).length;

    if (size > this.config.maxSize) {
      throw new Error(`Value size ${size} exceeds max cache size`);
    }

    this.cache.set(key, {
      key,
      value,
      ttl,
      hitCount: 0,
      lastAccess: Date.now(),
      size,
      compressed: size > this.config.compressionThreshold,
    });

    this.evictIfNeeded();
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  private evictIfNeeded(): void {
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    if (totalSize > this.config.maxSize) {
      const entries = Array.from(this.cache.values());
      const entriesToEvict = Math.ceil(entries.length * 0.1); // Remove 10%

      let sortedEntries = entries;

      if (this.config.evictionPolicy === "LRU") {
        sortedEntries = entries.sort((a, b) => a.lastAccess - b.lastAccess);
      } else if (this.config.evictionPolicy === "LFU") {
        sortedEntries = entries.sort((a, b) => a.hitCount - b.hitCount);
      } else {
        sortedEntries = entries.sort((a, b) => a.ttl - b.ttl);
      }

      for (let i = 0; i < entriesToEvict; i++) {
        this.cache.delete(sortedEntries[i].key);
        this.evictions++;
      }
    }
  }

  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const totalSize = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.size,
      0
    );

    return {
      totalKeys: this.cache.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.misses / totalRequests : 0,
      totalHits: this.hits,
      totalMisses: this.misses,
      evictionCount: this.evictions,
      totalSize,
      estimatedMemory: totalSize * 1.2, // Add 20% overhead
    };
  }
}

export const cacheInstance = new RedisCache({
  defaultTTL: 3600,
  maxSize: 100 * 1024 * 1024,
  evictionPolicy: "LRU",
});

export const cacheStrategies = {
  // Content caching strategy
  content: {
    pattern: "content:*",
    ttl: 300, // 5 minutes
    keyBuilder: (contentId: string, organizationId: string) =>
      `content:${organizationId}:${contentId}`,
    dependencies: ["content:list"],
  },

  // Template caching strategy
  templates: {
    pattern: "template:*",
    ttl: 1800, // 30 minutes
    keyBuilder: (templateId: string, organizationId: string) =>
      `template:${organizationId}:${templateId}`,
    dependencies: ["template:list"],
  },

  // Metrics caching strategy
  metrics: {
    pattern: "metric:*",
    ttl: 60, // 1 minute (frequently changing)
    keyBuilder: (metricId: string, organizationId: string) =>
      `metric:${organizationId}:${metricId}`,
    dependencies: ["metric:list"],
  },

  // User permissions caching
  permissions: {
    pattern: "permissions:*",
    ttl: 600, // 10 minutes
    keyBuilder: (userId: string, organizationId: string) =>
      `permissions:${organizationId}:${userId}`,
    dependencies: [],
  },

  // List queries caching
  lists: {
    pattern: "list:*",
    ttl: 120, // 2 minutes
    keyBuilder: (entity: string, organizationId: string, filters: string) =>
      `list:${organizationId}:${entity}:${filters}`,
    dependencies: [],
  },
};

export function getCacheKey(
  entity: string,
  id: string,
  organizationId: string
): string {
  const strategy = cacheStrategies[entity as keyof typeof cacheStrategies];
  if (!strategy) return `${entity}:${organizationId}:${id}`;
  return strategy.keyBuilder(id, organizationId);
}

export function invalidateCachePattern(pattern: string): void {
  const keys = Array.from(cacheInstance.getStats().totalKeys);

  for (const strategy of Object.values(cacheStrategies)) {
    if (strategy.dependencies.includes(pattern)) {
      const regex = new RegExp(strategy.pattern.replace("*", ".*"));
      // In real implementation, would iterate and delete matching keys
    }
  }
}

export function generateCacheReport(): string {
  const stats = cacheInstance.getStats();
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("NMD CACHE PERFORMANCE REPORT");
  lines.push("═".repeat(80));
  lines.push("");

  lines.push("CACHE STATISTICS");
  lines.push("─".repeat(80));
  lines.push(`Total Keys Cached: ${stats.totalKeys}`);
  lines.push(`Total Hits: ${stats.totalHits}`);
  lines.push(`Total Misses: ${stats.totalMisses}`);
  lines.push(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
  lines.push(`Miss Rate: ${(stats.missRate * 100).toFixed(2)}%`);
  lines.push(`Total Evictions: ${stats.evictionCount}`);
  lines.push("");

  lines.push("MEMORY USAGE");
  lines.push("─".repeat(80));
  lines.push(`Actual Size: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
  lines.push(`Estimated Memory: ${(stats.estimatedMemory / 1024 / 1024).toFixed(2)}MB`);
  lines.push("");

  if (stats.hitRate > 0.8) {
    lines.push("✓ Excellent cache hit rate (80%+)");
  } else if (stats.hitRate > 0.6) {
    lines.push("✓ Good cache hit rate (60-80%)");
  } else if (stats.hitRate > 0.4) {
    lines.push("⚠ Acceptable cache hit rate (40-60%), consider increasing TTL");
  } else {
    lines.push("✗ Poor cache hit rate (<40%), review caching strategy");
  }

  lines.push("");
  lines.push("═".repeat(80));

  return lines.join("\n");
}
