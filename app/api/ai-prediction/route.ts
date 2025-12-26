import { NextResponse } from 'next/server';
import { getAllIndicators } from '@/lib/api/indicators';
import { generateMarketPrediction } from '@/lib/api/gemini';
import { geminiCache } from '@/lib/cache/gemini-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch current indicators
    const indicators = await getAllIndicators();

    const dashboardData = {
      indicators,
      timestamp: new Date().toISOString(),
    };

    // Check cache first
    const cachedPrediction = geminiCache.getPrediction(dashboardData);
    if (cachedPrediction) {
      console.log('[API] Returning cached Gemini prediction');
      return NextResponse.json(cachedPrediction);
    }

    // Cache miss - generate new prediction
    console.log('[API] Cache miss - generating new Gemini prediction');
    const prediction = await generateMarketPrediction(dashboardData);

    // Store in cache
    geminiCache.setPrediction(dashboardData, prediction);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error generating AI prediction:', error);

    // Check if it's a quota/rate limit error
    const isQuotaError = error instanceof Error && (error as any).isQuotaError === true;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If quota error, try to use fallback cache
    if (isQuotaError) {
      const fallbackPrediction = geminiCache.getLatestValidPrediction();
      if (fallbackPrediction) {
        console.log('[API] Using fallback prediction due to quota error');
        return NextResponse.json({
          ...fallbackPrediction,
          isFallback: true,
          fallbackMessage: 'API 사용 한도가 초과되었습니다. 최근 분석을 표시합니다.',
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
