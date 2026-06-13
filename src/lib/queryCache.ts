/**
 * A lightweight query cache for deduplicating API requests in Nemesis.
 * Helps reduce Supabase quota consumption and improves UI responsiveness.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class QueryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();

  /**
   * Fetches data with caching and request deduplication.
   * @param key Unique key for the query
   * @param fetcher Function that returns a promise of the data
   * @param ttl Time to live in milliseconds (default 30s)
   */
  async fetch<T>(key: string, fetcher: () => Promise<T>, ttl: number = 30000): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // 1. Return cached data if not expired
    if (cached && now - cached.timestamp < ttl) {
      return cached.data;
    }

    // 2. Return pending request if one is already in flight for this key
    const inFlight = this.pendingRequests.get(key);
    if (inFlight) {
      return inFlight;
    }

    // 3. Initiate new request
    const requestPromise = fetcher().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, requestPromise);

    try {
      const data = await requestPromise;
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      // Don't cache errors
      this.cache.delete(key);
      throw error;
    }
  }

  /**
   * Manually invalidate a cache key (e.g., after an update)
   */
  invalidate(key: string) {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

export const queryCache = new QueryCache();

/**
 * ⚡ Shared helper: fetches and caches the current user's group IDs.
 * Used by Home, Planner, and any other page that needs the membership list.
 * Deduplicates parallel calls — only one network request fires even if
 * multiple components call this at the same time.
 *
 * TTL: 60 seconds (matches useDataStore CACHE_TTL)
 */
import { supabase } from './supabase';

export async function getCachedGroupIds(userId: string): Promise<string[]> {
  const memberData = await queryCache.fetch(
    `user-group-ids-${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      if (error) throw error;
      return data ?? [];
    },
    60_000 // 60-second TTL
  ).catch(() => [] as { group_id: string }[]);

  return memberData.map((m: { group_id: string }) => m.group_id);
}
