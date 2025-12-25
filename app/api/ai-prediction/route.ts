import { NextResponse } from 'next/server';
import { getAllIndicators } from '@/lib/api/indicators';
import { generateMarketPrediction } from '@/lib/api/gemini';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch current indicators
    const indicators = await getAllIndicators();

    const dashboardData = {
      indicators,
      timestamp: new Date().toISOString(),
    };

    // Generate AI prediction
    const prediction = await generateMarketPrediction(dashboardData);

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
