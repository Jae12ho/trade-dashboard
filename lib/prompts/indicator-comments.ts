import { IndicatorData } from '../types/indicators';
import { formatPeriodChanges, recentDateQualifier } from './utils';

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
  const recent7d = recentDateQualifier(7);

  return `You are a financial market analyst. Today is ${dateStr}.

Analyze the following ${indicators.length} economic indicators and provide a brief comment for EACH indicator (2-3 sentences in Korean).

**Indicators:**
${indicatorDescriptions}

**Search Instructions:**
- Use Google Search with date qualifier ${recent7d} to find news from the LAST 7 DAYS only
- Prioritize: Fed announcements, economic data releases, geopolitical events
- For each indicator, attempt at least one search before writing the comment

**Analysis Requirements:**
For EACH indicator, provide a 2-3 sentence analysis in Korean following this structure:

**Sentence 1 — Cause & Context (MUST BE SPECIFIC):**
Directly explain the reason for the change using ONLY concrete evidence. DO NOT start with descriptive statements like "지표가 X% 상승/하락했습니다".
- ✅ GOOD: "연준 파월 의장의 1월 7일 매파적 발언으로 금리 인상 기대감이 높아졌습니다."
- ✅ GOOD: "12월 비농업 고용이 30만명 (컨센서스 25만명)으로 예상치 상회하며 강한 고용시장을 보였습니다."
- ✅ GOOD: "ECB의 50bp 금리 인상 결정으로 유로존 긴축 정책이 강화되었습니다."
- ❌ BAD: "VIX 지수가 15.12로 전일 대비 4.35% 상승했습니다." (단순 현황 설명)
- ❌ BAD: "시장 불확실성", "투자자 심리 악화", "리스크 회피 심리" (추상적 표현)
- ❌ BAD: "예상치를 상회했습니다" — 숫자 없이 (consensus 숫자 누락)

**Sentence 2 — Market Impact:**
Explain what this change means for specific markets, sectors, or assets.
- Example: "이로 인해 성장주 중심의 기술주 섹터에 조정 압력이 가해질 전망입니다."
- Example: "원자재 수출국 통화와 에너지 섹터가 수혜를 입을 것으로 예상됩니다."

**MANDATORY EVIDENCE RULES:**
1. **Numerical specificity**: 경제 데이터 발표를 인용할 때 actual 값 AND consensus(예상치) 값을 둘 다 명시 필수
   - 예: "CPI 3.1% (컨센서스 3.0%)", "비농업 고용 30만 (예상 25만)"
   - consensus를 모르면 그 데이터 발표를 인용하지 말고 다른 근거 사용
2. **Date specificity**: 사건 인용 시 날짜 명시 ("1월 7일 파월 발언", "12월 14일 FOMC")
3. **Source citation**: Fed/ECB/정부 발표는 발표 주체와 날짜 함께 ("연준 12월 SEP 점도표")

**STRICT FALLBACK RULE (반드시 준수):**
검색 결과 7일 이내에 다음 중 하나라도 직접 인용 가능한 사실이 발견되지 않으면, 인과 설명을 시도하지 말고 즉시 fallback 문구를 사용하라:
- 공식 정책 발표 (Fed/ECB/정부)
- 경제 데이터 발표 (구체 숫자 포함)
- 명확한 지정학적 사건 (날짜·당사자 식별 가능)
- 기업 실적/가이던스 (구체 회사·수치)

**Fallback 문구 (선택):**
- 단기 변동: "해당 기간 명확한 단일 catalyst 없이 기술적·수급 요인에 따른 조정으로 보입니다."
- 추세 지속: "특정 단일 사건보다 [기존 추세/매크로 흐름] 연장선상의 움직임으로 판단됩니다."

가짜 인과를 만드는 것은 fallback 문구보다 훨씬 나쁘다. 의심스러우면 fallback을 사용하라.

**CRITICAL FORMAT RULES:**
- **NEVER include citation markers** like "[provided data, cite: 32]", "[cite: N]", "[source: N]", "[1]" — these are auto-inserted by Google Search grounding and must be stripped from output. To cite a source, write it directly in Korean prose (예: "5월 13일 BLS 발표 자료에 따르면", "FOMC 5월 7일 성명에서").
- NEVER start with descriptive statements about the indicator's current value or percentage change
- Start IMMEDIATELY with the causal explanation (WHY it changed)
- ALWAYS cite SPECIFIC, CONCRETE events with dates AND numbers
- NEVER use abstract/vague terms like "시장 불안", "투자자 심리", "불확실성 증가"
- NEVER fabricate consensus figures — if unknown, omit that data point
- Use concrete sector examples (e.g., "반도체", "신흥국 채권", "원자재 수출주")
- Respond ONLY in valid JSON format

**Evidence Priority:**
1. Official policy announcements (Fed, ECB, government statements) — date + 발언자/기관 명시
2. Economic data releases (employment, CPI, GDP, etc.) — actual + consensus 둘 다
3. Corporate earnings/guidance — 회사명 + 구체 수치
4. Geopolitical events with clear market impact — 날짜 + 당사자
5. (이상이 모두 없으면) 위 fallback 문구 사용

**Response Format:**
{
  "US10Y": "Korean comment here...",
  "DXY": "Korean comment here...",
  "HYS": "Korean comment here...",
  ...
}

Generate comments for these symbols: ${symbolList}`;
}
