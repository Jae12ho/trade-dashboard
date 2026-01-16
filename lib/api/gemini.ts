import { GoogleGenAI } from '@google/genai';
import { DashboardData, IndicatorData } from '../types/indicators';
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

// =============================================================================
// Helper Functions (리팩토링된 공통 유틸리티)
// =============================================================================

/**
 * 기간별 변화율 포맷팅 (일별/월별 데이터 통합)
 * @param indicator - 지표 데이터
 * @param isMonthly - 월별 데이터 여부 (true: 1M/2M/3M, false: 1D/7D/30D)
 */
function formatPeriodChanges(
  indicator: { changePercent: number; changePercent7d?: number; changePercent30d?: number },
  isMonthly: boolean = false
): string {
  const labels = isMonthly
    ? ['1M', '2M', '3M']
    : ['1D', '7D', '30D'];

  const formatChange = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;

  const changes = [`${labels[0]}: ${formatChange(indicator.changePercent)}`];

  if (indicator.changePercent7d !== undefined) {
    changes.push(`${labels[1]}: ${formatChange(indicator.changePercent7d)}`);
  }
  if (indicator.changePercent30d !== undefined) {
    changes.push(`${labels[2]}: ${formatChange(indicator.changePercent30d)}`);
  }

  return changes.join(', ');
}

/**
 * Gemini API 응답에서 텍스트 추출
 */
function extractTextFromOutputs(outputs: Array<{ type?: string; text?: string }> | undefined): string {
  let text = '';
  for (const output of outputs || []) {
    if (output.type === 'text' && output.text) {
      text += output.text;
    }
  }
  return text;
}

/**
 * 응답 텍스트에서 JSON 추출 및 파싱
 * @throws Error if no text or invalid JSON format
 */
function parseJsonFromResponse<T>(text: string): T {
  if (!text) {
    throw new Error('No text output from Gemini API');
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Invalid response format from Gemini API');
  }

  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Quota/Rate limit 에러 여부 확인
 */
function isQuotaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const errorMessage = error.message.toLowerCase();
  return errorMessage.includes('quota') ||
         errorMessage.includes('rate limit') ||
         errorMessage.includes('429') ||
         errorMessage.includes('resource exhausted');
}

/**
 * Quota 에러 처리 - quota 에러면 throw, 아니면 원본 에러 throw
 */
function handleApiError(error: unknown, quotaMessage: string): never {
  if (isQuotaError(error)) {
    throw createQuotaError(quotaMessage);
  }
  throw error;
}

// =============================================================================
// Main Functions
// =============================================================================

export async function generateMarketPrediction(
  dashboardData: DashboardData,
  modelName: GeminiModelName = DEFAULT_GEMINI_MODEL
): Promise<MarketPrediction> {
  const {
    us10yYield,
    dxy,
    highYieldSpread,
    m2MoneySupply,
    cpi,
    payems,
    crudeOil,
    copperGoldRatio,
    pmi,
    putCallRatio,
    bitcoin,
  } = dashboardData.indicators;

  const prompt = `You are a professional financial market analyst. Provide a comprehensive market outlook by analyzing the following 11 economic indicators.

=== Economic Indicators ===

**Macro Indicators (Daily Data - 1D/7D/30D periods):**
1. US 10-Year Treasury Yield: ${us10yYield.value.toFixed(2)}% (${formatPeriodChanges(us10yYield)})
2. US Dollar Index (DXY): ${dxy.value.toFixed(2)} (${formatPeriodChanges(dxy)})
3. High Yield Spread: ${highYieldSpread.value.toFixed(2)} bps (${formatPeriodChanges(highYieldSpread)})

**Macro Indicators (Monthly Data - 1M/2M/3M periods):**
4. M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (${formatPeriodChanges(m2MoneySupply, true)})
5. Consumer Price Index (CPI): ${cpi.value.toFixed(2)} (Index, Base 1982-1984=100) - (${formatPeriodChanges(cpi, true)})
   → 인플레이션 추세 및 연준 통화정책 방향성의 핵심 지표
6. Total Nonfarm Employment: ${payems.value.toFixed(2)}M persons - (1M change: ${payems.change >= 0 ? '+' : ''}${payems.change.toFixed(2)}M / ${payems.changePercent.toFixed(2)}%, 2M: ${payems.change7d && payems.change7d >= 0 ? '+' : ''}${payems.change7d?.toFixed(2)}M / ${payems.changePercent7d?.toFixed(2)}%, 3M: ${payems.change30d && payems.change30d >= 0 ? '+' : ''}${payems.change30d?.toFixed(2)}M / ${payems.changePercent30d?.toFixed(2)}%)
   → 전체 비농업 고용자 수. 1M change는 월간 일자리 증감 (예: +0.05M = 50,000명 증가)
   → 노동시장 건전성 및 경제 성장 모멘텀의 핵심 지표

**Commodity & Asset Indicators (Daily Data - 1D/7D/30D periods):**
7. Crude Oil (WTI): $${crudeOil.value.toFixed(2)}/barrel (${formatPeriodChanges(crudeOil)})
8. Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(2)}×10000 (${formatPeriodChanges(copperGoldRatio)})
9. Bitcoin (BTC/USD): $${bitcoin.value.toFixed(2)} (${formatPeriodChanges(bitcoin)})

**Market Sentiment Indicators:**
10. Manufacturing Confidence - OECD (Monthly Data - 1M/2M/3M periods): ${pmi.value.toFixed(2)} (${formatPeriodChanges(pmi, true)})
11. VIX - Fear Index (Daily Data - 1D/7D/30D periods): ${putCallRatio.value.toFixed(2)} (${formatPeriodChanges(putCallRatio)})

=== Analysis Priority (CRITICAL) ===

Your analysis MUST follow this strict priority order:

**1. PRIMARY (50% weight): Economic Indicators**
   - Base your core analysis on the 11 indicators' multi-period trends (1D/7D/30D or 1M/2M/3M)
   - Indicator movements are the foundation of your market outlook
   - Compare timeframes to identify momentum, trend reversals, and structural changes
   - **CPI와 NFP는 연준 정책 결정의 핵심 변수이므로 특별히 주목**:
     * CPI: 인플레이션 목표(2%) 대비 현황 평가
     * NFP: 고용시장 과열/냉각 여부 판단
   - 지표 간 상관관계 고려 (예: CPI↑ + NFP강세 → 긴축 압력 증가)

**2. SECONDARY (25% weight): Official Announcements**
   - Fed policy statements, FOMC decisions, interest rate announcements
   - Major political/policy decisions (Trump statements, executive orders, trade policies, tariffs)
   - Official economic data releases (CPI, PPI, unemployment, GDP, NFP)
   - Government fiscal/regulatory policy changes
   - Use these to explain WHY indicators are moving

**3. TERTIARY (25% weight): Expert Opinions & Analyst Consensus**

   **REQUIRED: Search and categorize expert opinions into three groups:**

   🟢 **BULLISH/BUY Opinions:**
   - Analysts recommending buying, increasing exposure, overweight positions
   - Forecasts predicting market/index gains with specific price targets
   - Optimistic outlooks from major investment banks

   🔴 **BEARISH/SELL Opinions:**
   - Analysts recommending selling, reducing exposure, underweight positions
   - Forecasts predicting market/index declines with downside targets
   - Cautious/pessimistic outlooks, recession warnings

   ⚪ **NEUTRAL/HOLD Opinions:**
   - Analysts recommending holding current positions
   - Mixed or uncertain outlooks, wait-and-see recommendations

   **Synthesis Method:**
   - Count opinions in each category (e.g., "5 bullish, 2 bearish, 3 neutral")
   - Identify consensus direction and confidence level
   - Weight by source credibility: Major Investment Banks (Goldman Sachs, Morgan Stanley, JPMorgan) > Research Firms (Morningstar) > Independent Analysts
   - Note significant contrarian views from credible sources

=== Google Search Instructions ===

You have access to real-time web search capabilities. Use them strategically:

**REQUIRED SEARCHES - Official Announcements (25% weight):**
- Search for latest Fed announcements, FOMC decisions, or interest rate changes
- Search for recent Trump policy statements, executive orders, or trade policy changes
- Search for official U.S. economic data releases (CPI, PPI, unemployment, GDP) from the last 7 days
- Search for major geopolitical events affecting markets (tariffs, sanctions, conflicts)

**REQUIRED SEARCHES - Expert Opinions (25% weight):**
- Search for "S&P 500 analyst forecast 2026" or "stock market outlook 2026"
- Search for "Wall Street investment bank recommendation"
- Search for "Goldman Sachs market outlook" or "Morgan Stanley forecast"
- Search for "analyst buy sell rating stock market"

**Search Query Examples:**
- "Fed interest rate decision January 2026"
- "Trump tariff announcement this week"
- "US CPI inflation data latest"
- "FOMC statement recent"
- "Wall Street analyst stock market forecast January 2026"
- "Goldman Sachs S&P 500 target 2026"
- "investment bank bullish bearish outlook"

**Search Guidelines:**
1. Search for BOTH official announcements AND expert opinions
2. Focus on events/opinions from the **last 7 days** for maximum relevance
3. For official news: Verify source credibility (Fed.gov, WhiteHouse.gov, BLS.gov, Reuters, Bloomberg)
4. For expert opinions: Prioritize major investment banks and research firms
5. Categorize expert opinions as BULLISH/BEARISH/NEUTRAL

**CRITICAL**: You MUST search for both official announcements AND expert opinions before writing your analysis.

=== News Classification Guide ===

When evaluating news articles, classify them:

**HIGH PRIORITY (Official Announcements - 25% weight):**
- "Fed announces rate cut" → Official policy
- "Trump imposes new tariffs on China" → Political decision
- "U.S. inflation hits 3.2%" → Official data

**MEDIUM PRIORITY (Expert Opinions - 25% weight):**
Categorize each opinion as BULLISH, BEARISH, or NEUTRAL:

🟢 BULLISH examples:
- "Goldman Sachs raises S&P 500 target to 6,500" → Bullish
- "Morgan Stanley recommends overweight equities" → Bullish
- "JPMorgan sees 15% upside in stocks" → Bullish

🔴 BEARISH examples:
- "Bank of America warns of 20% correction" → Bearish
- "Deutsche Bank recommends underweight" → Bearish
- "Analyst predicts recession in Q2" → Bearish

⚪ NEUTRAL examples:
- "Citi maintains market-weight rating" → Neutral
- "UBS sees mixed outlook, recommends hold" → Neutral

**Source Credibility Ranking:**
1. Major Investment Banks: Goldman Sachs, Morgan Stanley, JPMorgan, Bank of America, Citi, UBS
2. Research Firms: Morningstar, S&P Global, Moody's
3. Financial Media Analysts: Bloomberg, Reuters contributors
4. Independent Analysts: Lower weight within the 25%

=== Analysis Requirements ===
1. **Multi-Period Indicator Analysis** (PRIMARY - 50%):
   - For DAILY indicators (#1-3, #7-9, #11): Use 1D/7D/30D periods to identify short-term vs long-term trends
   - For MONTHLY indicators (#4-6, #10): Use 1M/2M/3M periods to identify monthly trends
   - Compare different timeframes to assess momentum and trend reversals
   - Analyze cross-indicator relationships (e.g., yields vs dollar, VIX vs equities)

2. **Official News Integration** (SECONDARY - 25%):
   - Reference official announcements to explain indicator movements
   - When citing, mention ACTUAL CONTENT and SOURCE, not index numbers
   - Good example: "연준의 긴축 기조 유지 발언(FOMC 성명서)에 따라 10년물 국채 수익률이 상승..."
   - Bad example: "뉴스1에 따르면...", "(뉴스2)"

3. **Expert Opinion Synthesis** (TERTIARY - 25%):
   - MUST search for and report expert opinions from major investment banks
   - Categorize opinions: Count BULLISH vs BEARISH vs NEUTRAL
   - Report consensus: "월가 주요 IB 중 X개사 매수, Y개사 매도, Z개사 중립 의견"
   - Include specific analyst names and price targets when available
   - Note significant contrarian views from credible sources
   - Good example: "Goldman Sachs는 S&P 500 목표가를 6,500으로 상향하며 매수 의견을 유지한 반면, Morgan Stanley는 단기 조정 가능성을 경고했습니다."

4. **Balanced Reasoning**:
   - Start with indicator analysis (50%)
   - Integrate official announcements (25%)
   - Synthesize expert consensus with opinion distribution (25%)
   - All three factors should be reflected in your reasoning

5. **Market Sentiment**: Determine sentiment ("bullish"/"bearish"/"neutral") based on:
   - Economic indicators (50%)
   - Official announcements (25%)
   - Expert consensus direction (25%)

6. **Specific Risks**: Identify 3-4 concrete risks based on indicator trends, official policy, AND contrarian expert views

Respond ONLY with the following JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "5-6 sentences including indicator analysis, official news, AND expert opinion consensus (e.g., 'X bullish, Y bearish, Z neutral')",
  "risks": ["risk 1", "risk 2", "risk 3"]
}

CRITICAL:
- The "reasoning" and "risks" fields MUST be written in Korean language
- You MUST include expert opinion consensus in your reasoning (e.g., "주요 IB 5곳 중 3곳 매수, 1곳 매도, 1곳 중립")
- When citing sources, mention the actual institution/analyst name (e.g., "Goldman Sachs", "Morgan Stanley"), NOT generic terms`;

  try {
    const interaction = await genAI.interactions.create({
      model: modelName,
      input: prompt,
      tools: [{ type: 'google_search' }],
      response_modalities: ['text'],
    });

    const text = extractTextFromOutputs(interaction.outputs);
    const prediction = parseJsonFromResponse<{ sentiment: string; reasoning: string; risks?: string[] }>(text);

    return {
      sentiment: prediction.sentiment as 'bullish' | 'bearish' | 'neutral',
      reasoning: prediction.reasoning,
      risks: prediction.risks || [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating market prediction:', error);
    handleApiError(error, 'API 사용 한도가 초과되었습니다. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * Generate AI comments for multiple indicators in a single API call (2-3 sentences each)
 *
 * Batch processing:
 * - Takes array of indicators with cache misses
 * - Sends all indicators in one prompt
 * - Returns JSON object with comments per symbol
 *
 * Explains for each indicator:
 * 1. Why the indicator moved (reason for change)
 * 2. Expected impact of this change
 */
export async function generateBatchComments(
  indicators: Array<{ symbol: string; data: IndicatorData }>
): Promise<Record<string, string>> {
  // Build indicator descriptions for prompt
  const indicatorDescriptions = indicators.map(({ symbol, data }) => {
    const isMonthly = symbol === 'MFG' || symbol === 'M2' || symbol === 'CPI' || symbol === 'PAYEMS';
    const periodContext = formatPeriodChanges(data, isMonthly);
    return `${symbol} (${data.name}): ${data.value.toFixed(2)}${data.unit || ''} [${periodContext}]`;
  }).join('\n');

  const symbolList = indicators.map(({ symbol }) => symbol).join(', ');

  const prompt = `You are a financial market analyst. Analyze the following ${indicators.length} economic indicators and provide a brief comment for EACH indicator (2-3 sentences in Korean).

**Indicators:**
${indicatorDescriptions}

**Analysis Requirements:**
For EACH indicator, provide a 2-3 sentence analysis in Korean following this structure:

**Sentence 1 - Cause & Context (MUST BE SPECIFIC):**
Directly explain the reason for the change using ONLY concrete evidence. DO NOT start with descriptive statements like "지표가 X% 상승/하락했습니다".
- ✅ GOOD: "연준 파월 의장의 1월 7일 매파적 발언으로 금리 인상 기대감이 높아졌습니다."
- ✅ GOOD: "12월 비농업 고용이 30만명으로 예상치 25만명을 상회하며 강한 고용시장을 보였습니다."
- ✅ GOOD: "ECB의 50bp 금리 인상 결정으로 유로존 긴축 정책이 강화되었습니다."
- ✅ GOOD: "중동 지역 유가 공급 차질 우려가 확대되며 에너지 가격 상승 압력이 증가했습니다."
- ❌ BAD: "VIX 지수가 15.12로 전일 대비 4.35% 상승했습니다." (단순 현황 설명)
- ❌ BAD: "시장 불확실성", "투자자 심리 악화", "리스크 회피 심리" (추상적 표현)
- ❌ BAD: "경기 둔화 우려", "인플레이션 압력" (일반적 이유)

**Sentence 2 - Market Impact:**
Explain what this change means for specific markets, sectors, or assets.
- Example: "이로 인해 성장주 중심의 기술주 섹터에 조정 압력이 가해질 전망입니다."
- Example: "원자재 수출국 통화와 에너지 섹터가 수혜를 입을 것으로 예상됩니다."

**CRITICAL RULES:**
- NEVER start with descriptive statements about the indicator's current value or percentage change (e.g., "지표가 X로 Y% 상승했습니다")
- Start IMMEDIATELY with the causal explanation (WHY it changed)
- ALWAYS cite SPECIFIC, CONCRETE events or data (with dates/numbers if possible)
- NEVER use abstract/vague terms like "시장 불안", "투자자 심리", "불확실성 증가"
- NEVER make unsupported claims - only use verifiable facts
- If you cannot find specific evidence, state "명확한 단일 원인 없이 기술적 조정" instead of making up reasons
- Use concrete sector examples (e.g., "반도체", "신흥국 채권", "원자재 수출주")
- Respond ONLY in valid JSON format

**Evidence Priority:**
1. Official policy announcements (Fed, ECB, government statements)
2. Economic data releases (employment, CPI, GDP, etc.)
3. Corporate earnings/guidance
4. Geopolitical events with clear market impact
5. Technical factors (if no fundamental catalyst exists)

**Response Format:**
{
  "US10Y": "Korean comment here...",
  "DXY": "Korean comment here...",
  "HYS": "Korean comment here...",
  ...
}

Generate comments for these symbols: ${symbolList}`;

  try {
    const response = await genAI.interactions.create({
      model: 'gemini-2.5-flash-lite',
      input: prompt,
      response_modalities: ['text'],
    });

    const text = extractTextFromOutputs(response.outputs);
    const comments = parseJsonFromResponse<Record<string, string>>(text);

    // Validate that all requested symbols have comments
    for (const { symbol } of indicators) {
      if (!comments[symbol]) {
        console.warn(`[generateBatchComments] Missing comment for ${symbol}`);
      }
    }

    return comments;
  } catch (error) {
    console.error('[generateBatchComments] Error:', error);
    handleApiError(error, 'API 사용 한도가 초과되었습니다.');
  }
}
