import { GoogleGenerativeAI } from '@google/generative-ai';
import { DashboardData } from '../types/indicators';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface MarketPrediction {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  risks: string[];
  timestamp: string;
}

export async function generateMarketPrediction(
  dashboardData: DashboardData
): Promise<MarketPrediction> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

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

  const prompt = `You are a professional financial market analyst. Based on the following 9 economic indicators, provide a comprehensive market analysis.

**Macro Indicators:**
1. US 10-Year Treasury Yield: ${us10yYield.value.toFixed(2)}% (Change: ${us10yYield.changePercent >= 0 ? '+' : ''}${us10yYield.changePercent.toFixed(2)}%)
2. US Dollar Index (DXY): ${dxy.value.toFixed(2)} (Change: ${dxy.changePercent >= 0 ? '+' : ''}${dxy.changePercent.toFixed(2)}%)
3. High Yield Spread: ${highYieldSpread.value.toFixed(2)} bps (Change: ${highYieldSpread.changePercent >= 0 ? '+' : ''}${highYieldSpread.changePercent.toFixed(2)}%)
4. M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (Change: ${m2MoneySupply.changePercent >= 0 ? '+' : ''}${m2MoneySupply.changePercent.toFixed(2)}%)

**Commodity & Asset Indicators:**
5. Crude Oil (WTI): $${crudeOil.value.toFixed(2)}/barrel (Change: ${crudeOil.changePercent >= 0 ? '+' : ''}${crudeOil.changePercent.toFixed(2)}%)
6. Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(3)}×100 (Change: ${copperGoldRatio.changePercent >= 0 ? '+' : ''}${copperGoldRatio.changePercent.toFixed(2)}%)
7. Bitcoin (BTC/USD): $${bitcoin.value.toFixed(2)} (Change: ${bitcoin.changePercent >= 0 ? '+' : ''}${bitcoin.changePercent.toFixed(2)}%)

**Market Sentiment Indicators:**
8. Manufacturing Confidence (OECD): ${pmi.value.toFixed(2)} (Change: ${pmi.changePercent >= 0 ? '+' : ''}${pmi.changePercent.toFixed(2)}%)
9. VIX (Fear Index): ${putCallRatio.value.toFixed(2)} (Change: ${putCallRatio.changePercent >= 0 ? '+' : ''}${putCallRatio.changePercent.toFixed(2)}%)

Please provide your analysis in the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "3-4 sentences explaining the overall market direction based on these 9 indicators",
  "risks": ["risk 1", "risk 2", "risk 3", "risk 4"]
}

Guidelines:
- **Macro Analysis**: Consider yields, dollar strength, credit spreads, and money supply (liquidity)
- **Asset Signals**: Oil/inflation, Copper-Gold/growth, Bitcoin/risk appetite & digital asset adoption
- **Market Sentiment**: Manufacturing confidence, VIX fear/greed
- **Bitcoin Context**: Analyze BTC movement vs M2 (liquidity), DXY (dollar strength), and risk assets
- Synthesize all 9 indicators into a coherent market outlook
- Keep reasoning concise but comprehensive
- List 3-4 key risks to watch

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
    throw error;
  }
}
