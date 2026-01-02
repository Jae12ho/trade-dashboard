import { NextResponse } from 'next/server';
import { generateMarketPrediction } from '@/lib/api/gemini';
import { geminiCache } from '@/lib/cache/gemini-cache-redis';
import { DashboardData, NewsData } from '@/lib/types/indicators';
import {
  GeminiModelName,
  DEFAULT_GEMINI_MODEL,
  VALID_MODEL_NAMES
} from '@/lib/constants/gemini-models';
import { isQuotaError } from '@/lib/types/errors';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Get dashboard data, news data, and model from request body (sent by client)
  let dashboardData: DashboardData;
  let newsData: NewsData | undefined;
  let modelName: GeminiModelName = DEFAULT_GEMINI_MODEL;

  try {
    const body = await request.json();
    dashboardData = body.dashboardData || body;
    newsData = body.newsData;
    modelName = body.modelName || DEFAULT_GEMINI_MODEL;

    // Validate model name
    if (!VALID_MODEL_NAMES.includes(modelName)) {
      return NextResponse.json(
        { error: 'invalid_model', message: 'Invalid model name' },
        { status: 400 }
      );
    }
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
    const cachedPrediction = await geminiCache.getPrediction(dashboardData, modelName);
    if (cachedPrediction) {
      console.log(`[API] Returning cached Gemini prediction (model: ${modelName})`);
      return NextResponse.json(cachedPrediction);
    }

    // Cache miss - generate new prediction
    console.log(`[API] Cache miss - generating new Gemini prediction (model: ${modelName})`);
    const prediction = await generateMarketPrediction(dashboardData, newsData, modelName);

    // Store in cache
    await geminiCache.setPrediction(dashboardData, prediction, modelName);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error generating AI prediction:', error);

    // Check if it's a quota/rate limit error
    const isQuota = isQuotaError(error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // If quota error, try to use similarity-based fallback cache
    if (isQuota) {
      const fallbackPrediction = await geminiCache.getBestMatchingPrediction(
        dashboardData,
        modelName
      );
      if (fallbackPrediction) {
        console.log(`[API] Using similarity-based fallback prediction due to quota error (model: ${modelName})`);
        return NextResponse.json({
          ...fallbackPrediction,
          isFallback: true,
          fallbackMessage: 'API 사용 한도가 초과되었습니다. 금일 분석 내역에서 가장 유사한 시장 상황의 분석을 표시합니다.',
        });
      }
      console.log(`[API] No fallback available for model ${modelName}, returning quota error`);
    }

    return NextResponse.json(
      {
        error: isQuota ? 'quota_exceeded' : 'prediction_failed',
        message: errorMessage,
        isQuotaError: isQuota,
      },
      { status: isQuota ? 429 : 500 }
    );
  }
}
