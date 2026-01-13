import { Redis } from '@upstash/redis';
import { IndicatorData } from '../types/indicators';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

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
 * TTL: 24 hours (86,400 seconds)
 * - Aligns with daily indicator update cycle
 * - Covers weekends (Friday data available through Saturday)
 */
class IndicatorCommentCache {
  private readonly TTL = 86400; // 24 hours in seconds

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
    return `indicator:comment:${symbol}:${roundedValue}`;
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
   * Set cached AI comment for indicator
   */
  async setComment(symbol: string, data: IndicatorData, comment: string): Promise<void> {
    try {
      const key = this.getCacheKey(symbol, data);
      await redis.setex(key, this.TTL, comment);
      console.log(`[IndicatorCommentCache] Cached: ${key}`);
    } catch (error) {
      console.error('[IndicatorCommentCache] Error setting cache:', error);
    }
  }
}

export const indicatorCommentCache = new IndicatorCommentCache();
