import { Redis } from '@upstash/redis';
import { DashboardData } from '../types/indicators';
import { MarketPrediction } from '../api/gemini';

interface CachedPrediction {
  prediction: MarketPrediction;
  timestamp: number;
  dataHash: string;
}

const CACHE_PREFIX = 'gemini:prediction:';
const FALLBACK_PREFIX = 'gemini:fallback:';
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Upstash Redis-based Gemini cache
 * - Persistent across serverless instances
 * - Automatic TTL management
 * - Global replication for low latency
 */
class GeminiCacheRedis {
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  /**
   * Get cached prediction by data hash
   */
  async getPrediction(dashboardData: DashboardData): Promise<MarketPrediction | null> {
    const hash = this.hashData(dashboardData);
    const key = `${CACHE_PREFIX}${hash}`;

    try {
      const cached = await this.redis.get<CachedPrediction>(key);

      if (!cached) {
        console.log('[GeminiCacheRedis] Cache miss:', hash);
        return null;
      }

      const age = Math.round((Date.now() - cached.timestamp) / 1000);
      console.log(`[GeminiCacheRedis] Cache hit: ${hash} (age: ${age}s)`);
      return cached.prediction;
    } catch (error) {
      console.error('[GeminiCacheRedis] Error getting prediction:', error);
      return null;
    }
  }

  /**
   * Store prediction in cache with TTL
   */
  async setPrediction(
    dashboardData: DashboardData,
    prediction: MarketPrediction
  ): Promise<void> {
    const hash = this.hashData(dashboardData);
    const key = `${CACHE_PREFIX}${hash}`;
    const fallbackKey = `${FALLBACK_PREFIX}${Date.now()}`;

    const cached: CachedPrediction = {
      prediction,
      timestamp: Date.now(),
      dataHash: hash,
    };

    try {
      // Store with hash key (for exact match)
      await this.redis.set(key, cached, { ex: TTL_SECONDS });

      // Also store with timestamp key (for fallback retrieval)
      await this.redis.set(fallbackKey, cached, { ex: TTL_SECONDS });

      console.log(`[GeminiCacheRedis] Cached prediction: ${hash}`);

      // Cleanup old fallback keys (keep last 10)
      await this.cleanupFallbackKeys();
    } catch (error) {
      console.error('[GeminiCacheRedis] Error setting prediction:', error);
    }
  }

  /**
   * Get latest valid prediction for fallback
   */
  async getLatestValidPrediction(): Promise<MarketPrediction | null> {
    try {
      // Get all fallback keys
      const keys = await this.redis.keys(`${FALLBACK_PREFIX}*`);

      if (keys.length === 0) {
        console.log('[GeminiCacheRedis] No fallback predictions available');
        return null;
      }

      // Sort by timestamp (newest first)
      const sortedKeys = keys.sort((a, b) => {
        const tsA = parseInt(a.replace(FALLBACK_PREFIX, ''));
        const tsB = parseInt(b.replace(FALLBACK_PREFIX, ''));
        return tsB - tsA;
      });

      // Get the most recent one
      const latestKey = sortedKeys[0];
      const cached = await this.redis.get<CachedPrediction>(latestKey);

      if (!cached) {
        return null;
      }

      const age = Math.round((Date.now() - cached.timestamp) / 1000);
      console.log(`[GeminiCacheRedis] Fallback found: ${cached.dataHash} (age: ${age}s)`);
      return cached.prediction;
    } catch (error) {
      console.error('[GeminiCacheRedis] Error getting fallback:', error);
      return null;
    }
  }

  /**
   * Hash dashboard data for cache key
   */
  private hashData(data: DashboardData): string {
    const rounded = {
      us10y: data.indicators.us10yYield.value.toFixed(2),
      dxy: data.indicators.dxy.value.toFixed(1),
      spread: data.indicators.highYieldSpread.value.toFixed(1),
      m2: data.indicators.m2MoneySupply.value.toFixed(0),
      oil: data.indicators.crudeOil.value.toFixed(1),
      ratio: data.indicators.copperGoldRatio.value.toFixed(2),
      pmi: data.indicators.pmi.value.toFixed(1),
      vix: data.indicators.putCallRatio.value.toFixed(1),
      btc: (Math.round(data.indicators.bitcoin.value / 500) * 500).toFixed(0),
    };

    return JSON.stringify(rounded);
  }

  /**
   * Cleanup old fallback keys (keep last 10)
   */
  private async cleanupFallbackKeys(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${FALLBACK_PREFIX}*`);

      if (keys.length <= 10) {
        return;
      }

      // Sort by timestamp (oldest first)
      const sortedKeys = keys.sort((a, b) => {
        const tsA = parseInt(a.replace(FALLBACK_PREFIX, ''));
        const tsB = parseInt(b.replace(FALLBACK_PREFIX, ''));
        return tsA - tsB;
      });

      // Delete oldest entries
      const toDelete = sortedKeys.slice(0, keys.length - 10);
      if (toDelete.length > 0) {
        await this.redis.del(...toDelete);
        console.log(`[GeminiCacheRedis] Cleaned up ${toDelete.length} old fallback keys`);
      }
    } catch (error) {
      console.error('[GeminiCacheRedis] Error cleaning up:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ predictionKeys: number; fallbackKeys: number }> {
    try {
      const predictionKeys = await this.redis.keys(`${CACHE_PREFIX}*`);
      const fallbackKeys = await this.redis.keys(`${FALLBACK_PREFIX}*`);

      return {
        predictionKeys: predictionKeys.length,
        fallbackKeys: fallbackKeys.length,
      };
    } catch (error) {
      console.error('[GeminiCacheRedis] Error getting stats:', error);
      return { predictionKeys: 0, fallbackKeys: 0 };
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await this.redis.keys('gemini:*');
      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
        console.log(`[GeminiCacheRedis] Cleared ${allKeys.length} keys`);
      }
    } catch (error) {
      console.error('[GeminiCacheRedis] Error clearing cache:', error);
    }
  }
}

// Singleton instance
export const geminiCache = new GeminiCacheRedis();
