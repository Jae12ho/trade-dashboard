import { NextResponse } from 'next/server';
import { generateMarketPrediction } from '@/lib/api/gemini';
import { geminiCache } from '@/lib/cache/gemini-cache-redis';
import { DashboardData } from '@/lib/types/indicators';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Get dashboard data from request body (sent by client)
  let dashboardData: DashboardData;
  try {
    dashboardData = await request.json();
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      {
        error: 'invalid_request',
        message: 'Invalid request body',
      },
      { status: 400 }
    );
  }

  try {
    // Check cache first
    const cachedPrediction = await geminiCache.getPrediction(dashboardData);
    if (cachedPrediction) {
      console.log('[API] Returning cached Gemini prediction');
      return NextResponse.json(cachedPrediction);
    }

    // Cache miss - generate new prediction
    console.log('[API] Cache miss - generating new Gemini prediction');
    const prediction = await generateMarketPrediction(dashboardData);

    // Store in cache
    await geminiCache.setPrediction(dashboardData, prediction);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error generating AI prediction:', error);

    // Check if it's a quota/rate limit error
    const isQuotaError = error instanceof Error && (error as any).isQuotaError === true;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If quota error, try to use similarity-based fallback cache
    if (isQuotaError) {
      const fallbackPrediction = await geminiCache.getBestMatchingPrediction(dashboardData);
      if (fallbackPrediction) {
        console.log('[API] Using similarity-based fallback prediction due to quota error');
        return NextResponse.json({
          ...fallbackPrediction,
          isFallback: true,
          fallbackMessage: 'API 사용 한도가 초과되었습니다. 이전 분석에서 가장 유사한 시장 상황의 분석을 표시합니다.',
        });
      }
      console.log('[API] No fallback available, returning quota error');
    }

    return NextResponse.json(
      {
        error: isQuotaError ? 'quota_exceeded' : 'prediction_failed',
        message: errorMessage,
        isQuotaError,
      },
      { status: isQuotaError ? 429 : 500 }
    );
  }
}
