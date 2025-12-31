import { GoogleGenerativeAI } from '@google/generative-ai';
import { DashboardData } from '../types/indicators';
import { GeminiModelName, DEFAULT_GEMINI_MODEL } from '../constants/gemini-models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
  const model = genAI.getGenerativeModel({ model: modelName });

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

  const prompt = `You are a professional financial market analyst. Based on the following 9 economic indicators with multi-period changes, provide a comprehensive market analysis.

**Macro Indicators:**
1. US 10-Year Treasury Yield: ${us10yYield.value.toFixed(2)}% (${formatPeriodChanges(us10yYield)})
2. US Dollar Index (DXY): ${dxy.value.toFixed(2)} (${formatPeriodChanges(dxy)})
3. High Yield Spread: ${highYieldSpread.value.toFixed(2)} bps (${formatPeriodChanges(highYieldSpread)})
4. M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (${formatPeriodChanges(m2MoneySupply)})

**Commodity & Asset Indicators:**
5. Crude Oil (WTI): $${crudeOil.value.toFixed(2)}/barrel (${formatPeriodChanges(crudeOil)})
6. Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(2)}×10000 (${formatPeriodChanges(copperGoldRatio)})
7. Bitcoin (BTC/USD): $${bitcoin.value.toFixed(2)} (${formatPeriodChanges(bitcoin)})

**Market Sentiment Indicators:**
8. Manufacturing Confidence (OECD): ${pmi.value.toFixed(2)} (${formatPeriodChanges(pmi)})
9. VIX (Fear Index): ${putCallRatio.value.toFixed(2)} (${formatPeriodChanges(putCallRatio)})

Please provide your analysis in the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "3-4 sentences explaining the overall market direction based on these 9 indicators",
  "risks": ["risk 1", "risk 2", "risk 3", "risk 4"]
}

Guidelines:
- **Multi-Period Analysis**: Consider short-term (1D), medium-term (7D), and long-term (30D) trends for each indicator
- **Macro Analysis**: Evaluate yields, dollar strength, credit spreads, and money supply (liquidity) across different timeframes
- **Asset Signals**: Analyze Oil/inflation, Copper-Gold/growth, Bitcoin/risk appetite & digital asset adoption with trend context
- **Market Sentiment**: Assess Manufacturing confidence and VIX fear/greed levels and their momentum
- **Trend Divergence**: Identify when short-term and long-term trends diverge (e.g., 1D positive but 30D negative)
- **Bitcoin Context**: Analyze BTC movement vs M2 (liquidity), DXY (dollar strength), and risk assets across periods
- Synthesize all 9 indicators with their multi-period trends into a coherent market outlook
- Keep reasoning concise but comprehensive (3-4 sentences)
- List 3-4 key risks to watch based on trend analysis

IMPORTANT: Respond in Korean language. The "reasoning" and "risks" fields must be written in Korean.
Respond ONLY with the JSON object, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

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
        const quotaError = new Error('API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
        (quotaError as any).isQuotaError = true;
        throw quotaError;
      }
    }

    throw error;
  }
}
