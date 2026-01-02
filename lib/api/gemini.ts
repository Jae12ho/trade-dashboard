import { GoogleGenerativeAI } from '@google/generative-ai';
import { DashboardData, NewsData } from '../types/indicators';
import { GeminiModelName, DEFAULT_GEMINI_MODEL } from '../constants/gemini-models';
import { createQuotaError } from '../types/errors';

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
  newsData: NewsData | undefined,
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

  // 뉴스 섹션 포맷팅
  let newsSection = '';
  if (newsData && newsData.articles.length > 0) {
    const formattedNews = newsData.articles
      .map((article, index) => {
        const date = new Date(article.datetime * 1000).toISOString().split('T')[0];
        const shortSummary = article.summary.length > 200
          ? article.summary.substring(0, 200) + '...'
          : article.summary;

        return `${index + 1}. [${date}] ${article.headline}
   Source: ${article.source}
   Summary: ${shortSummary}`;
      })
      .join('\n\n');

    newsSection = `\n\n=== Recent Financial News (Last 24 Hours) ===\n${formattedNews}`;
  } else {
    newsSection = '\n\n=== Recent Financial News ===\n(News data unavailable. Analysis based on indicators only.)';
  }

  const prompt = `You are a professional financial market analyst. Provide a comprehensive market outlook by analyzing the following 9 economic indicators and latest news.

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
${newsSection}

=== Analysis Requirements ===
1. **Multi-Period Analysis**:
   - For DAILY indicators (#1-3, #5-7, #9): Use 1D/7D/30D periods to identify short-term vs long-term trends
   - For MONTHLY indicators (#4, #8): Use 1M/2M/3M periods to identify monthly trends
   - Compare different timeframes to assess momentum and trend reversals

2. **News-Based Analysis**: Analyze how real events mentioned in the news (Fed policy, geopolitical issues, corporate earnings, etc.) specifically impact the indicators
   - IMPORTANT: When referencing news, cite the ACTUAL CONTENT and SOURCE, not index numbers
   - Good example: "연준이 금리 인하에 신중한 입장을 밝혔지만 (Reuters 보도)..."
   - Bad example: "뉴스1에 따르면...", "(뉴스2)", etc.

3. **In-Depth Analysis**: Don't just list numbers - explain WHY these movements are happening by connecting news events to indicator trends

4. **Market Sentiment**: Determine overall market sentiment as "bullish", "bearish", or "neutral" based on the holistic picture

5. **Specific Risks**: Identify 3-4 concrete risks that investors should monitor, grounded in both news and indicator data

Respond ONLY with the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "4-5 sentences of analysis with specific news references",
  "risks": ["risk 1", "risk 2", "risk 3"]
}

CRITICAL: The "reasoning" and "risks" fields MUST be written in Korean language. Provide detailed, news-driven insights rather than generic observations. When citing news, mention the actual event and source (e.g., "Reuters", "Bloomberg"), NOT index numbers like "(뉴스1)".`;

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
        throw createQuotaError('API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
      }
    }

    throw error;
  }
}
