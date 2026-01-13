import { Redis } from '@upstash/redis';
import { IndicatorData } from '../types/indicators';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const COMMENT_PREFIX = 'indicator:comment:';
const FALLBACK_PREFIX = 'indicator:comment:fallback:';

interface CachedComment {
  comment: string;
  timestamp: number;
  symbol: string;
  value: number;
}

/**
 * Cache for individual indicator AI comments
 *
 * Strategy: Very aggressive rounding to maximize cache hit rate (50-70% target)
 * - BTC: $5,000 units ($96,500 → $95,000)
 * - US10Y/HYS: 0.5% units (4.52% → 4.5%)
 * - DXY/VIX: 5.0 units (103.47 → 105)
 * - OIL: $5 units ($56.6 → $55)
 * - Cu/Au: 0.5 units (13.32 → 13.5)
 * - M2: $500B units
 * - MFG: 0.5 units
 *
 * Cache key: Only uses indicator value (no date, no change percentages)
 * - AI comments describe general trends, not exact values
 * - Value-based caching sufficient for meaningful insights
 *
 * TTL: 12 hours (43,200 seconds)
 * - Aligns with daily indicator update cycle
 * - Covers weekends (Friday data available through Saturday)
 */
class IndicatorCommentCache {
  private readonly TTL = 43200; // 12 hours in seconds

  /**
   * Round indicator value based on symbol for cache key (5x more aggressive)
   */
  private roundValue(symbol: string, value: number): number {
    switch (symbol) {
      case 'BTC':
        return Math.round(value / 5000) * 5000; // $5,000 units ($96,500 → $95,000)
      case 'US10Y':
      case 'HYS':
        return Math.round(value * 2) / 2; // 0.5% units (4.52% → 4.5%)
      case 'DXY':
      case 'VIX':
        return Math.round(value / 5) * 5; // 5.0 units (103.47 → 105)
      case 'M2':
        return Math.round(value / 500) * 500; // $500B units
      case 'OIL':
        return Math.round(value / 5) * 5; // $5 units ($56.6 → $55)
      case 'Cu/Au':
        return Math.round(value * 2) / 2; // 0.5 units (13.32 → 13.5)
      case 'MFG':
        return Math.round(value * 2) / 2; // 0.5 units
      default:
        return Math.round(value); // Default: integer units
    }
  }

  /**
   * Generate cache key from indicator data (value-only strategy)
   */
  private getCacheKey(symbol: string, data: IndicatorData): string {
    const roundedValue = this.roundValue(symbol, data.value);
    return `${COMMENT_PREFIX}${symbol}:${roundedValue}`;
  }

  /**
   * Generate fallback key with timestamp
   */
  private getFallbackKey(symbol: string): string {
    return `${FALLBACK_PREFIX}${symbol}:${Date.now()}`;
  }

  /**
   * Get cached AI comment for indicator
   */
  async getComment(symbol: string, data: IndicatorData): Promise<string | null> {
    try {
      const key = this.getCacheKey(symbol, data);
      const cached = await redis.get<string>(key);

      if (cached) {
        console.log(`[IndicatorCommentCache] Cache hit: ${key}`);
      }

      return cached;
    } catch (error) {
      console.error('[IndicatorCommentCache] Error getting cache:', error);
      return null;
    }
  }

  /**
   * Set cached AI comment for indicator (with fallback storage)
   */
  async setComment(symbol: string, data: IndicatorData, comment: string): Promise<void> {
    try {
      const key = this.getCacheKey(symbol, data);
      const fallbackKey = this.getFallbackKey(symbol);

      const cached: CachedComment = {
        comment,
        timestamp: Date.now(),
        symbol,
        value: data.value,
      };

      // Store with value-based key (for exact match)
      await redis.setex(key, this.TTL, comment);

      // Also store with timestamp key (for fallback retrieval)
      await redis.set(fallbackKey, cached, { ex: this.TTL });

      console.log(`[IndicatorCommentCache] Cached: ${key}`);

      // Cleanup old fallback keys (keep last 5 per symbol)
      await this.cleanupFallbackKeys(symbol);
    } catch (error) {
      console.error('[IndicatorCommentCache] Error setting cache:', error);
    }
  }

  /**
   * Get latest cached comment for a symbol (fallback mechanism)
   */
  async getLatestComment(symbol: string): Promise<string | null> {
    try {
      // Get all fallback keys for this symbol
      const pattern = `${FALLBACK_PREFIX}${symbol}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length === 0) {
        console.log(`[IndicatorCommentCache] No fallback available for ${symbol}`);
        return null;
      }

      // Sort by timestamp (newest first)
      const sortedKeys = keys.sort((a, b) => {
        const tsA = parseInt(a.split(':').pop() || '0');
        const tsB = parseInt(b.split(':').pop() || '0');
        return tsB - tsA;
      });

      // Get the most recent one
      const latestKey = sortedKeys[0];
      const cached = await redis.get<CachedComment>(latestKey);

      if (!cached) {
        return null;
      }

      const age = Math.round((Date.now() - cached.timestamp) / 1000);
      console.log(
        `[IndicatorCommentCache] Fallback found for ${symbol}: value=${cached.value.toFixed(2)}, age=${age}s`
      );
      return cached.comment;
    } catch (error) {
      console.error(`[IndicatorCommentCache] Error getting fallback for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Cleanup old fallback keys (keep last 5 per symbol)
   */
  private async cleanupFallbackKeys(symbol: string): Promise<void> {
    try {
      const pattern = `${FALLBACK_PREFIX}${symbol}:*`;
      const keys = await redis.keys(pattern);

      if (keys.length <= 5) {
        return;
      }

      // Sort by timestamp (oldest first)
      const sortedKeys = keys.sort((a, b) => {
        const tsA = parseInt(a.split(':').pop() || '0');
        const tsB = parseInt(b.split(':').pop() || '0');
        return tsA - tsB;
      });

      // Delete oldest entries
      const toDelete = sortedKeys.slice(0, keys.length - 5);
      if (toDelete.length > 0) {
        await redis.del(...toDelete);
        console.log(`[IndicatorCommentCache] Cleaned up ${toDelete.length} old fallback keys for ${symbol}`);
      }
    } catch (error) {
      console.error(`[IndicatorCommentCache] Error cleaning up fallback for ${symbol}:`, error);
    }
  }
}

export const indicatorCommentCache = new IndicatorCommentCache();
