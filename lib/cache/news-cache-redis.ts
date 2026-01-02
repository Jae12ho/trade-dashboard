import { Redis } from '@upstash/redis';
import type { NewsData, NewsArticle } from '@/lib/types/indicators';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const CACHE_TTL = 3600; // 1시간
const CACHE_KEY_PREFIX = 'news:finnhub';

class NewsCache {
  private getCacheKey(category: string): string {
    return `${CACHE_KEY_PREFIX}:${category}`;
  }

  async getNews(category: string = 'general'): Promise<NewsData | null> {
    try {
      const key = this.getCacheKey(category);
      const cached = await redis.get<NewsData>(key);

      if (cached) {
        console.log(`[NewsCache] Cache HIT for category: ${category}`);
        return { ...cached, source: 'cache' };
      }

      console.log(`[NewsCache] Cache MISS for category: ${category}`);
      return null;
    } catch (error) {
      console.error('[NewsCache] Redis get error:', error);
      return null;
    }
  }

  async setNews(articles: NewsArticle[], category: string = 'general'): Promise<void> {
    try {
      const key = this.getCacheKey(category);
      const newsData: NewsData = {
        articles,
        lastUpdated: new Date().toISOString(),
        source: 'api',
      };

      await redis.setex(key, CACHE_TTL, newsData);
      console.log(`[NewsCache] Cached ${articles.length} articles for category: ${category}`);
    } catch (error) {
      console.error('[NewsCache] Redis set error:', error);
    }
  }
}

export const newsCache = new NewsCache();
