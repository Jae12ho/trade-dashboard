import { NextResponse } from 'next/server';
import { getLatestNews } from '@/lib/api/news';
import type { NewsData } from '@/lib/types/indicators';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const newsData: NewsData = await getLatestNews();

    return NextResponse.json(newsData, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('[API /news] Error:', error);

    // 에러 시에도 빈 뉴스 반환 (fallback)
    const fallbackNewsData: NewsData = {
      articles: [],
      lastUpdated: new Date().toISOString(),
      source: 'api',
    };

    return NextResponse.json(fallbackNewsData, { status: 200 });
  }
}
