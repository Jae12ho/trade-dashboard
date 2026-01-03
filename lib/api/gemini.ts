import { GoogleGenAI } from '@google/genai';
import { DashboardData } from '../types/indicators';
import { GeminiModelName, DEFAULT_GEMINI_MODEL } from '../constants/gemini-models';
import { createQuotaError } from '../types/errors';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface MarketPrediction {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  risks: string[];
  timestamp: string;
  isFallback?: boolean;
  fallbackMessage?: string;
}

export async function generateMarketPrediction(
  dashboardData: DashboardData,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<MarketPrediction> {
  const {
    us10yYield,
    dxy,
    highYieldSpread,
    m2MoneySupply,
    crudeOil,
    copperGoldRatio,
    pmi,
    putCallRatio,
    bitcoin,
  } = dashboardData.indicators;

  // Format period changes for daily data (1D, 7D, 30D)
  const formatPeriodChanges = (indicator: typeof us10yYield) => {
    const changes = [`1D: ${indicator.changePercent >= 0 ? '+' : ''}${indicator.changePercent.toFixed(2)}%`];
    if (indicator.changePercent7d !== undefined) {
      changes.push(`7D: ${indicator.changePercent7d >= 0 ? '+' : ''}${indicator.changePercent7d.toFixed(2)}%`);
    }
    if (indicator.changePercent30d !== undefined) {
      changes.push(`30D: ${indicator.changePercent30d >= 0 ? '+' : ''}${indicator.changePercent30d.toFixed(2)}%`);
    }
    return changes.join(', ');
  };

  // Format period changes for monthly data (1M, 2M, 3M)
  const formatMonthlyPeriodChanges = (indicator: typeof m2MoneySupply) => {
    const changes = [`1M: ${indicator.changePercent >= 0 ? '+' : ''}${indicator.changePercent.toFixed(2)}%`];
    if (indicator.changePercent7d !== undefined) {
      changes.push(`2M: ${indicator.changePercent7d >= 0 ? '+' : ''}${indicator.changePercent7d.toFixed(2)}%`);
    }
    if (indicator.changePercent30d !== undefined) {
      changes.push(`3M: ${indicator.changePercent30d >= 0 ? '+' : ''}${indicator.changePercent30d.toFixed(2)}%`);
    }
    return changes.join(', ');
  };

  const prompt = `You are a professional financial market analyst. Provide a comprehensive market outlook by analyzing the following 9 economic indicators.

=== Economic Indicators ===

**Macro Indicators (Daily Data - 1D/7D/30D periods):**
1. US 10-Year Treasury Yield: ${us10yYield.value.toFixed(2)}% (${formatPeriodChanges(us10yYield)})
2. US Dollar Index (DXY): ${dxy.value.toFixed(2)} (${formatPeriodChanges(dxy)})
3. High Yield Spread: ${highYieldSpread.value.toFixed(2)} bps (${formatPeriodChanges(highYieldSpread)})

**Macro Indicators (Monthly Data - 1M/2M/3M periods):**
4. M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (${formatMonthlyPeriodChanges(m2MoneySupply)})

**Commodity & Asset Indicators (Daily Data - 1D/7D/30D periods):**
5. Crude Oil (WTI): $${crudeOil.value.toFixed(2)}/barrel (${formatPeriodChanges(crudeOil)})
6. Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(2)}×10000 (${formatPeriodChanges(copperGoldRatio)})
7. Bitcoin (BTC/USD): $${bitcoin.value.toFixed(2)} (${formatPeriodChanges(bitcoin)})

**Market Sentiment Indicators:**
8. Manufacturing Confidence - OECD (Monthly Data - 1M/2M/3M periods): ${pmi.value.toFixed(2)} (${formatMonthlyPeriodChanges(pmi)})
9. VIX - Fear Index (Daily Data - 1D/7D/30D periods): ${putCallRatio.value.toFixed(2)} (${formatPeriodChanges(putCallRatio)})

=== Analysis Priority (CRITICAL) ===

Your analysis MUST follow this strict priority order:

**1. PRIMARY (70% weight): Economic Indicators**
   - Base your core analysis on the 9 indicators' multi-period trends (1D/7D/30D or 1M/2M/3M)
   - Indicator movements are the foundation of your market outlook
   - Compare timeframes to identify momentum, trend reversals, and structural changes

**2. SECONDARY (25% weight): Official Announcements**
   - Fed policy statements, FOMC decisions, interest rate announcements
   - Major political/policy decisions (Trump statements, executive orders, trade policies, tariffs)
   - Official economic data releases (CPI, PPI, unemployment, GDP, NFP)
   - Government fiscal/regulatory policy changes
   - Use these to explain WHY indicators are moving

**3. TERTIARY (5% weight): Market Commentary & Analyst Opinions**
   - Individual analyst opinions, market forecasts, investment recommendations
   - Company-specific news and earnings predictions
   - General market commentary without official backing
   - Use only as supplementary context with minimal influence

=== Google Search Instructions ===

You have access to real-time web search capabilities. Use them strategically:

**REQUIRED SEARCHES (High Priority):**
- Search for latest Fed announcements, FOMC decisions, or interest rate changes
- Search for recent Trump policy statements, executive orders, or trade policy changes
- Search for official U.S. economic data releases (CPI, PPI, unemployment, GDP) from the last 7 days
- Search for major geopolitical events affecting markets (tariffs, sanctions, conflicts)

**Search Query Examples:**
- "Fed interest rate decision January 2026"
- "Trump tariff announcement this week"
- "US CPI inflation data latest"
- "FOMC statement recent"

**Search Guidelines:**
1. Prioritize searches for OFFICIAL ANNOUNCEMENTS (Fed, government, Trump)
2. Focus on events from the **last 7 days** for maximum relevance
3. Verify source credibility (Fed.gov, WhiteHouse.gov, BLS.gov, Reuters, Bloomberg)
4. If search returns analyst opinions, weight them at 5% (TERTIARY)
5. If no official announcements found: Base analysis on indicators only (70% weight on indicators increases)

**CRITICAL**: Always attempt to search for official policy/data announcements BEFORE writing your analysis. Use Google Search to find the most recent and credible official sources.

=== News Classification Guide ===

When evaluating news articles, classify them:

**HIGH PRIORITY (Official Announcements):**
- "Fed announces rate cut" → Official policy (25% weight)
- "Trump imposes new tariffs on China" → Political decision (25% weight)
- "U.S. inflation hits 3.2%" → Official data (25% weight)

**LOW PRIORITY (Analyst Opinions):**
- "Analyst predicts market rally" → Opinion (5% weight)
- "XYZ stock looks attractive" → Individual view (5% weight)
- "Economist forecasts recession" → Forecast/prediction (5% weight)

**If unsure about classification**: Default to LOW PRIORITY (5% weight)

=== Analysis Requirements ===
1. **Multi-Period Indicator Analysis** (PRIMARY - 70%):
   - For DAILY indicators (#1-3, #5-7, #9): Use 1D/7D/30D periods to identify short-term vs long-term trends
   - For MONTHLY indicators (#4, #8): Use 1M/2M/3M periods to identify monthly trends
   - Compare different timeframes to assess momentum and trend reversals
   - Analyze cross-indicator relationships (e.g., yields vs dollar, VIX vs equities)

2. **Official News Integration** (SECONDARY - 25%):
   - Reference official announcements to explain indicator movements
   - When citing, mention ACTUAL CONTENT and SOURCE, not index numbers
   - Good example: "연준의 긴축 기조 유지 발언(FOMC 성명서)에 따라 10년물 국채 수익률이 상승..."
   - Bad example: "뉴스1에 따르면...", "(뉴스2)"

3. **Market Commentary Context** (TERTIARY - 5%):
   - Use analyst opinions only as minor supplementary context
   - Never let opinions drive your core analysis
   - Example: "일부 시장 참여자들의 낙관론에도 불구하고, 지표는..."

4. **Indicator-Driven Reasoning**:
   - Always start with what the indicators show
   - Then add official announcements as context
   - Finally, mention market commentary briefly if relevant

5. **Market Sentiment**: Determine sentiment ("bullish"/"bearish"/"neutral") based primarily on indicators (70%), official news (25%), and commentary (5%)

6. **Specific Risks**: Identify 3-4 concrete risks based on indicator trends and official policy developments

Respond ONLY with the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "5-6 sentences of analysis with specific news references",
  "risks": ["risk 1", "risk 2", "risk 3"]
}

CRITICAL: The "reasoning" and "risks" fields MUST be written in Korean language. Provide detailed, news-driven insights rather than generic observations. When citing news, mention the actual event and source (e.g., "Reuters", "Bloomberg"), NOT index numbers like "(뉴스1)".`;

  try {
    const interaction = await genAI.interactions.create({
      model: modelName,
      input: prompt,
      tools: [{ type: 'google_search' }],
      response_modalities: ['text'],
    });

    // Extract text from outputs
    let text = '';
    for (const output of interaction.outputs || []) {
      if (output.type === 'text' && output.text) {
        text += output.text;
      }
    }

    if (!text) {
      throw new Error('No text output from Gemini API');
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from Gemini API');
    }

    const prediction = JSON.parse(jsonMatch[0]);

    return {
      sentiment: prediction.sentiment,
      reasoning: prediction.reasoning,
      risks: prediction.risks || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating market prediction:', error);

    // Check if it's a rate limit or quota exceeded error
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('quota') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('429') ||
          errorMessage.includes('resource exhausted')) {
        throw createQuotaError('API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }
    }

    throw error;
  }
}
