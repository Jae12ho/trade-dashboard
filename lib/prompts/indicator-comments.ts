import { IndicatorData } from '../types/indicators';
import { formatPeriodChanges } from './utils';

export function buildIndicatorCommentsPrompt(
  indicators: Array<{ symbol: string; data: IndicatorData }>,
  dateStr: string
): string {
  const indicatorDescriptions = indicators.map(({ symbol, data }) => {
    const isMonthly = symbol === 'MFG' || symbol === 'M2' || symbol === 'CPI' || symbol === 'PAYEMS';
    const periodContext = formatPeriodChanges(data, isMonthly);
    return `${symbol} (${data.name}): ${data.value.toFixed(2)}${data.unit || ''} [${periodContext}]`;
  }).join('\n');

  const symbolList = indicators.map(({ symbol }) => symbol).join(', ');

  return `You are a financial market analyst. Today is ${dateStr}.

Analyze the following ${indicators.length} economic indicators and provide a brief comment for EACH indicator (2-3 sentences in Korean).

**Indicators:**
${indicatorDescriptions}

**Search Instructions:**
- Use Google Search to find the ACTUAL cause of today's indicator movement
- Search for news from the last 7 days only
- Prioritize: Fed announcements, economic data releases, geopolitical events
- If no specific news found, state "명확한 단일 원인 없이 기술적 조정"

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
}
