import { NextResponse } from 'next/server';
import { generateAIComments } from '@/lib/api/indicators';
import { DashboardData, IndicatorCommentsResponse } from '@/lib/types/indicators';

export const dynamic = 'force-dynamic';

/**
 * POST /api/indicator-comments
 *
 * Generates AI comments for all 11 indicators using batch processing
 *
 * Request body: { indicators: DashboardData['indicators'] }
 * Response: { comments: Record<symbol, string | undefined> }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { indicators } = body as { indicators: DashboardData['indicators'] };

    if (!indicators) {
      return NextResponse.json(
        { error: 'Missing indicators in request body' },
        { status: 400 }
      );
    }

    console.log('[API indicator-comments] Generating batch AI comments...');

    // Generate AI comments and get comments record directly
    const comments = await generateAIComments(indicators);

    console.log('[API indicator-comments] Completed');

    return NextResponse.json<IndicatorCommentsResponse>({ comments });
  } catch (error) {
    console.error('[API indicator-comments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate indicator comments' },
      { status: 500 }
    );
  }
}
