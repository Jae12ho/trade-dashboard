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
   * Parse hash string back to numeric values
   */
  private parseHash(hash: string): Record<string, number> {
    const parsed = JSON.parse(hash);
    return {
      us10y: parseFloat(parsed.us10y),
      dxy: parseFloat(parsed.dxy),
      spread: parseFloat(parsed.spread),
      m2: parseFloat(parsed.m2),
      oil: parseFloat(parsed.oil),
      ratio: parseFloat(parsed.ratio),
      pmi: parseFloat(parsed.pmi),
      vix: parseFloat(parsed.vix),
      btc: parseFloat(parsed.btc),
    };
  }

  /**
   * Calculate dynamic ranges (min-max) for each indicator across all cached predictions
   * Used for adaptive similarity calculation based on actual 24h cache data distribution
   */
  private calculateDynamicRanges(
    allCachedPredictions: CachedPrediction[]
  ): Record<string, number> {
    // Parse all cached hashes to numeric values
    const allValues = allCachedPredictions.map(p => this.parseHash(p.dataHash));

    const keys = ['us10y', 'dxy', 'spread', 'm2', 'oil', 'ratio', 'pmi', 'vix', 'btc'];
    const ranges: Record<string, number> = {};

    // Calculate min-max range for each indicator
    for (const key of keys) {
      const values = allValues.map(v => v[key]);
      const min = Math.min(...values);
      const max = Math.max(...values);
      ranges[key] = max - min;
    }

    return ranges;
  }

  /**
   * Calculate similarity score using Hybrid Min-Max approach
   * Combines dynamic ranges (from actual cache data) with minimum thresholds
   * Returns 0-1 score (1 = identical, 0 = very different)
   *
   * @param currentData - Current dashboard data to compare
   * @param cachedHash - Hash of cached prediction to compare against
   * @param dynamicRanges - Min-max ranges calculated from all cached predictions
   */
  private calculateSimilarityHybrid(
    currentData: DashboardData,
    cachedHash: string,
    dynamicRanges: Record<string, number>
  ): number {
    const current = this.parseHash(this.hashData(currentData));
    const cached = this.parseHash(cachedHash);

    // Minimum thresholds: 1% of historical range (safety net to prevent division by zero)
    const minThresholds: Record<string, number> = {
      us10y: 0.16,    // 16 * 0.01
      dxy: 1.0,       // 100 * 0.01
      spread: 25,     // 2500 * 0.01
      m2: 100,        // 10000 * 0.01
      oil: 1.5,       // 150 * 0.01
      ratio: 0.05,    // 5 * 0.01
      pmi: 0.15,      // 15 * 0.01
      vix: 0.9,       // 90 * 0.01
      btc: 1000,      // 100000 * 0.01
    };

    let sumSquaredDiffs = 0;
    const keys = Object.keys(minThresholds);

    for (const key of keys) {
      // Effective range: max(dynamic range, minimum threshold)
      // Uses dynamic range when cache data varies, falls back to threshold for stability
      const effectiveRange = Math.max(
        dynamicRanges[key] || 0,
        minThresholds[key]
      );

      const diff = Math.abs(current[key] - cached[key]) / effectiveRange;
      sumSquaredDiffs += diff * diff;
    }

    // Average distance across all dimensions
    const distance = Math.sqrt(sumSquaredDiffs / keys.length);

    // Convert distance to similarity score (0-1, where 1 is most similar)
    // Using exponential decay: e^(-distance)
    return Math.exp(-distance);
  }

  /**
   * Calculate recency score based on timestamp
   * Returns 0-1 score (1 = just now, 0 = 24 hours old)
   */
  private calculateRecencyScore(timestamp: number): number {
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    const maxAgeHours = 24; // TTL duration

    // Linear decay: 0 hours = 1.0, 24 hours = 0.0
    return Math.max(0, 1 - (ageHours / maxAgeHours));
  }

  /**
   * Get best matching prediction based on similarity to current data
   * Uses Hybrid Min-Max approach: dynamic ranges + minimum thresholds
   * Weighted scoring: 90% similarity, 10% recency
   */
  async getBestMatchingPrediction(
    currentData: DashboardData
  ): Promise<MarketPrediction | null> {
    try {
      const keys = await this.redis.keys(`${FALLBACK_PREFIX}*`);

      if (keys.length === 0) {
        console.log('[GeminiCacheRedis] No fallback predictions available');
        return null;
      }

      // Fetch all cached predictions with their keys (maintain pairing)
      const keyPredictionPairs = await Promise.all(
        keys.map(async (key) => {
          const cached = await this.redis.get<CachedPrediction>(key);
          return { key, cached };
        })
      );

      // Filter out null predictions while keeping key-prediction pairing
      const validPairs = keyPredictionPairs.filter(
        (pair): pair is { key: string; cached: CachedPrediction } =>
          pair.cached !== null
      );

      if (validPairs.length === 0) return null;

      // Extract predictions for dynamic range calculation
      const validCachedPredictions = validPairs.map(p => p.cached);

      // Calculate dynamic ranges once for all comparisons
      const dynamicRanges = this.calculateDynamicRanges(validCachedPredictions);

      // Calculate scores for all cached predictions
      const scoredPredictions = validPairs.map(({ key, cached }) => {
        const similarityScore = this.calculateSimilarityHybrid(
          currentData,
          cached.dataHash,
          dynamicRanges
        );
        const recencyScore = this.calculateRecencyScore(cached.timestamp);

        // Weighted combination: 90% similarity, 10% recency
        const finalScore = similarityScore * 0.9 + recencyScore * 0.1;

        return {
          key,
          cached,
          similarityScore,
          recencyScore,
          finalScore,
        };
      });

      // Find best match
      const best = scoredPredictions.reduce((prev, curr) =>
        curr.finalScore > prev.finalScore ? curr : prev
      );

      const age = Math.round((Date.now() - best.cached.timestamp) / 1000);
      console.log(
        `[GeminiCacheRedis] Best match found (Hybrid Min-Max):`,
        `key=${best.key},`,
        `similarity=${best.similarityScore.toFixed(3)},`,
        `recency=${best.recencyScore.toFixed(3)},`,
        `final=${best.finalScore.toFixed(3)},`,
        `age=${age}s,`,
        `dynamic_ranges: us10y=${dynamicRanges.us10y.toFixed(3)}, dxy=${dynamicRanges.dxy.toFixed(1)}, btc=${dynamicRanges.btc.toFixed(0)}`
      );

      return best.cached.prediction;
    } catch (error) {
      console.error('[GeminiCacheRedis] Error getting best match:', error);
      return null;
    }
  }

  /**
   * @deprecated Use getBestMatchingPrediction instead
   * Get latest valid prediction for fallback (timestamp-based only)
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
