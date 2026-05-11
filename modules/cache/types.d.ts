/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose TypeScript type definitions for the cache module.
 * @sidecar types.d.ts.header.md
 * @layer module | @hex _none_ | @ctx cache
 * @public false
 * @edit careful
 */

/**
 * Core type definitions for the cache module.
 *
 * SpecRefs: TPL-142
 */

export interface CacheEntry {
  value: unknown;
  createdAt: number;
  accessedAt: number;
  ttl?: number;
  size?: number;
}

export interface CacheSetOptions {
  ttl?: number;
  size?: number;
}

export interface CachePortOptions {
  maxEntries?: number;
  maxSize?: number;
  defaultTtl?: number;
}

export interface CachePort {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, options?: CacheSetOptions): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
}

export interface LruTracker {
  touch(key: string): void;
  evictNext(): string | undefined;
  getOrder(): string[];
  remove(key: string): void;
}

export interface LocalStorageCacheOptions extends CachePortOptions {
  namespace?: string;
}

export interface IndexedDBCacheOptions extends CachePortOptions {
  dbName?: string;
}

export function assertCachePort(adapter: unknown): asserts adapter is CachePort;
export function isExpired(entry: CacheEntry, now?: number): boolean;
export function createLruTracker(maxEntries: number): LruTracker;
export function createMemoryLruAdapter(options?: CachePortOptions): CachePort;
export function createLocalStorageCacheAdapter(options?: LocalStorageCacheOptions): CachePort;
export function createIndexedDBCacheAdapter(options?: IndexedDBCacheOptions): Promise<CachePort & { destroy(): void }>;
