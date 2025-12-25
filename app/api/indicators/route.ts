import { NextResponse } from 'next/server';
import { getAllIndicators } from '@/lib/api/indicators';
import { DashboardData } from '@/lib/types/indicators';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const indicators = await getAllIndicators();

    const data: DashboardData = {
      indicators,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching indicators:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch market indicators',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
