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

    return NextResponse.json(
      {
        error: 'Failed to generate market prediction',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
