import type { NewsArticle, NewsData } from '@/lib/types/indicators';
import { newsCache } from '@/lib/cache/news-cache-redis';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

async function fetchFinnhubNews(category: string = 'general'): Promise<NewsArticle[]> {
  if (!FINNHUB_API_KEY) {
    console.error('[Finnhub] API key not configured');
    throw new Error('Finnhub API key is missing');
  }

  const url = `${FINNHUB_BASE_URL}/news?category=${category}&token=${FINNHUB_API_KEY}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 600 }, // 10분 ISR
    });

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
    }

    const data: NewsArticle[] = await response.json();
    return data;
  } catch (error) {
    console.error('[Finnhub] Fetch error:', error);
    throw error;
  }
}

export async function getLatestNews(): Promise<NewsData> {
  const category = 'general';

  // 1. Redis 캐시 조회
  const cached = await newsCache.getNews(category);
  if (cached) {
    return cached;
  }

  // 2. API 호출
  try {
    const articles = await fetchFinnhubNews(category);

    // 3. 필터링: 24시간 이내, 최신순, 최대 10개
    const now = Date.now() / 1000;
    const oneDayAgo = now - 24 * 60 * 60;

    const filtered = articles
      .filter((article) => article.datetime >= oneDayAgo)
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 10);

    console.log(`[Finnhub] Fetched ${filtered.length} articles (from ${articles.length} total)`);

    // 4. 캐시 저장
    await newsCache.setNews(filtered, category);

    return {
      articles: filtered,
      lastUpdated: new Date().toISOString(),
      source: 'api',
    };
  } catch (error) {
    console.error('[Finnhub] Failed to fetch news:', error);

    // 5. 에러 시 빈 배열 반환 (Graceful degradation)
    return {
      articles: [],
      lastUpdated: new Date().toISOString(),
      source: 'api',
    };
  }
}
