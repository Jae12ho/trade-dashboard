import { NextResponse } from 'next/server';
import { attachAIComments } from '@/lib/api/indicators';
import { DashboardData } from '@/lib/types/indicators';

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

    // Generate AI comments (modifies indicators in place)
    await attachAIComments(indicators);

    // Extract comments from indicators
    const comments: Record<string, string | undefined> = {
      US10Y: indicators.us10yYield.aiComment,
      DXY: indicators.dxy.aiComment,
      HYS: indicators.highYieldSpread.aiComment,
      M2: indicators.m2MoneySupply.aiComment,
      CPI: indicators.cpi.aiComment,
      PAYEMS: indicators.payems.aiComment,
      OIL: indicators.crudeOil.aiComment,
      'Cu/Au': indicators.copperGoldRatio.aiComment,
      MFG: indicators.pmi.aiComment,
      VIX: indicators.putCallRatio.aiComment,
      BTC: indicators.bitcoin.aiComment,
    };

    console.log('[API indicator-comments] Completed');

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[API indicator-comments] Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate indicator comments' },
      { status: 500 }
    );
  }
}
