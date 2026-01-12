import { Redis } from '@upstash/redis';
import { IndicatorData } from '../types/indicators';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Cache for individual indicator AI comments
 *
 * Strategy: Aggressive rounding to maximize cache hit rate
 * - BTC: $1,000 units ($96,500 → $97,000)
 * - US10Y: 0.1% units (4.52% → 4.5%)
 * - DXY: Integer units (103.47 → 103)
 * - Change%: Integer units (1.23% → 1%)
 *
 * TTL: 24 hours (86,400 seconds)
 * - Aligns with daily indicator update cycle
 * - Covers weekends (Friday data available through Saturday)
 */
class IndicatorCommentCache {
  private readonly TTL = 86400; // 24 hours in seconds

  /**
   * Round indicator value based on symbol for cache key
   */
  private roundValue(symbol: string, value: number): number {
    switch (symbol) {
      case 'BTC':
        return Math.round(value / 1000) * 1000; // $1,000 units
      case 'US10Y':
      case 'HYS':
        return Math.round(value * 10) / 10; // 0.1% units
      case 'DXY':
      case 'VIX':
        return Math.round(value); // Integer units
      case 'M2':
        return Math.round(value / 100) * 100; // $100B units
      case 'OIL':
        return Math.round(value); // $1 units (more aggressive: $56.6 → $57)
      case 'Cu/Au':
        return Math.round(value * 10) / 10; // 0.1 units (more aggressive: 13.32 → 13.3)
      case 'MFG':
        return Math.round(value * 10) / 10; // 0.1 units
      default:
        return Math.round(value * 100) / 100; // Default: 2 decimal places
    }
  }

  /**
   * Round change percentage for cache key
   */
  private roundChangePercent(changePercent: number): number {
    return Math.round(changePercent); // Integer units (1.23% → 1%)
  }

  /**
   * Generate cache key from indicator data
   */
  private getCacheKey(symbol: string, data: IndicatorData): string {
    const roundedValue = this.roundValue(symbol, data.value);
    const roundedChange = this.roundChangePercent(data.changePercent);
    const roundedChange7d = data.changePercent7d !== undefined
      ? this.roundChangePercent(data.changePercent7d)
      : 'na';
    const roundedChange30d = data.changePercent30d !== undefined
      ? this.roundChangePercent(data.changePercent30d)
      : 'na';

    const date = new Date(data.lastUpdated).toISOString().split('T')[0]; // YYYY-MM-DD

    return `indicator:comment:${symbol}:${roundedValue}:${roundedChange}_${roundedChange7d}_${roundedChange30d}:${date}`;
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
