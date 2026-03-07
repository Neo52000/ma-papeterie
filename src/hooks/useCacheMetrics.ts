import { useCallback, useEffect, useState } from 'react';
import { cacheGet, cacheSet, CACHE_KEYS, CACHE_TTL } from '@/lib/redis-client';

/**
 * Performance tracking for cache operations
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  queries: number;
  hitRate: number;
  avgResponseTime: number;
}

const METRICS_KEY = 'cache:metrics:daily';

export function useCacheMetrics() {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    hits: 0,
    misses: 0,
    queries: 0,
    hitRate: 0,
    avgResponseTime: 0,
  });

  // Load metrics from cache on mount
  useEffect(() => {
    const loadMetrics = async () => {
      const cached = await cacheGet<CacheMetrics>(METRICS_KEY);
      if (cached) {
        setMetrics(cached);
      }
    };
    loadMetrics();
  }, []);

  // Save metrics to cache whenever they change
  useEffect(() => {
    const saveMetrics = async () => {
      await cacheSet(METRICS_KEY, metrics, { ttl: CACHE_TTL.VERY_LONG });
    };
    saveMetrics();
  }, [metrics]);

  const recordHit = useCallback(async (responseTime: number = 0) => {
    setMetrics((prev) => {
      const newHits = prev.hits + 1;
      const newQueries = prev.queries + 1;
      const newHitRate = (newHits / newQueries) * 100;
      const newAvgTime =
        (prev.avgResponseTime * (prev.queries - 1) + responseTime) / newQueries;

      return {
        ...prev,
        hits: newHits,
        queries: newQueries,
        hitRate: parseFloat(newHitRate.toFixed(2)),
        avgResponseTime: parseFloat(newAvgTime.toFixed(2)),
      };
    });
  }, []);

  const recordMiss = useCallback(async (responseTime: number = 0) => {
    setMetrics((prev) => {
      const newMisses = prev.misses + 1;
      const newQueries = prev.queries + 1;
      const newHitRate = (prev.hits / newQueries) * 100;
      const newAvgTime =
        (prev.avgResponseTime * (prev.queries - 1) + responseTime) / newQueries;

      return {
        ...prev,
        misses: newMisses,
        queries: newQueries,
        hitRate: parseFloat(newHitRate.toFixed(2)),
        avgResponseTime: parseFloat(newAvgTime.toFixed(2)),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setMetrics({
      hits: 0,
      misses: 0,
      queries: 0,
      hitRate: 0,
      avgResponseTime: 0,
    });
  }, []);

  return {
    metrics,
    recordHit,
    recordMiss,
    reset,
  };
}

/**
 * Hook to track cache performance for blog articles
 */
export function useBlogCacheMetrics() {
  const { metrics, recordHit, recordMiss } = useCacheMetrics();

  const trackArticleQuery = useCallback(
    async (operation: 'hit' | 'miss', responseTime?: number) => {
      if (operation === 'hit') {
        await recordHit(responseTime);
      } else {
        await recordMiss(responseTime);
      }
    },
    [recordHit, recordMiss]
  );

  return {
    metrics,
    trackArticleQuery,
  };
}

/**
 * Hook to estimate cache efficiency
 */
export function useCacheEfficiency() {
  const [efficiency, setEfficiency] = useState({
    memoryUsed: '~2.4 MB', // Estimated
    requestsServed: 0,
    requestsSaved: 0,
    costSavings: 0, // Estimated in API calls
  });

  useEffect(() => {
    // Estimate efficiency metrics
    const calculate = async () => {
      const metrics = await cacheGet<CacheMetrics>(METRICS_KEY);
      if (metrics) {
        const requestsSaved = metrics.hits;
        const requestsServed = metrics.queries;
        // Rough estimate: each DB query would cost ~0.1ms in database time
        const estimatedTimeSaved = requestsSaved * 0.1;
        const estimatedCostSaved = requestsSaved * 0.0001; // Rough API cost estimate

        setEfficiency({
          memoryUsed: `~${(requestsServed * 0.5).toFixed(1)} MB`,
          requestsServed,
          requestsSaved,
          costSavings: estimatedCostSaved,
        });
      }
    };

    calculate();
    const interval = setInterval(calculate, 60000); // Recalculate every minute
    return () => clearInterval(interval);
  }, []);

  return efficiency;
}
