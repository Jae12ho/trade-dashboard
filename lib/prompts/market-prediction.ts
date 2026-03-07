import { DashboardData } from '../types/indicators';
import { formatPeriodChanges } from './utils';

export function buildMarketPredictionPrompt(
  dashboardData: DashboardData,
  monthYear: string
): string {
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

  return `You are a senior macro strategist. Produce a precise 1–2 week US equity market outlook.

=== CURRENT INDICATOR READINGS ===

[Rates & Dollar]
• US 10Y Yield: ${us10yYield.value.toFixed(2)}% (${formatPeriodChanges(us10yYield)})
• Dollar Index (DXY): ${dxy.value.toFixed(2)} (${formatPeriodChanges(dxy)})
• High Yield Spread: ${highYieldSpread.value.toFixed(2)} bps (${formatPeriodChanges(highYieldSpread)})

[Monetary & Labor — Monthly Data]
• M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (${formatPeriodChanges(m2MoneySupply, true)})
• CPI: ${cpi.value.toFixed(2)} (Base 1982-84=100) (${formatPeriodChanges(cpi, true)})
• Nonfarm Payrolls: ${payems.value.toFixed(2)}M (1M: ${payems.change >= 0 ? '+' : ''}${payems.change.toFixed(2)}M/${payems.changePercent.toFixed(2)}%, 2M: ${payems.change7d && payems.change7d >= 0 ? '+' : ''}${payems.change7d?.toFixed(2)}M/${payems.changePercent7d?.toFixed(2)}%, 3M: ${payems.change30d && payems.change30d >= 0 ? '+' : ''}${payems.change30d?.toFixed(2)}M/${payems.changePercent30d?.toFixed(2)}%)

[Commodities & Risk Assets]
• WTI Crude: $${crudeOil.value.toFixed(2)} (${formatPeriodChanges(crudeOil)})
• Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(2)}×10000 (${formatPeriodChanges(copperGoldRatio)})
• Bitcoin: $${bitcoin.value.toFixed(2)} (${formatPeriodChanges(bitcoin)})

[Sentiment]
• OECD Manufacturing Confidence: ${pmi.value.toFixed(2)} (${formatPeriodChanges(pmi, true)})
• VIX: ${putCallRatio.value.toFixed(2)} (${formatPeriodChanges(putCallRatio)})

=== ANALYSIS FRAMEWORK (follow steps in order) ===

**STEP 1 — Macro Regime Cross-Reading (60% weight)**

Do NOT analyze indicators one by one. Read them in clusters to identify the current regime:

A) Financial Conditions — tightening or loosening?
   Signal cluster: 10Y Yield + HY Spread + DXY
   • All three rising → financial conditions tightening → headwind for equities
   • All three falling → conditions loosening → tailwind for equities
   • Mixed → identify the dominant signal and explain divergence

B) Growth Momentum — accelerating or decelerating?
   Signal cluster: Cu/Gold ratio + MFG Confidence + NFP trend
   • Cu/Gold↑ + MFG↑ + strong NFP → growth acceleration → cyclicals outperform
   • Cu/Gold↓ + MFG↓ + weak NFP → growth deceleration → defensives outperform
   • Divergences reveal sector rotation opportunities

C) Inflation Trajectory — re-accelerating or disinflating?
   Signal cluster: CPI (1M/2M/3M trend) + Oil + M2 growth
   • CPI↑ + Oil↑ + M2↑ → inflation re-acceleration → hawkish Fed risk → bearish
   • CPI↓ + Oil stable/↓ + M2 moderate → disinflation continues → dovish window → bullish
   • Assess distance from Fed's 2% target

D) Risk Appetite — risk-on or risk-off?
   Signal cluster: VIX level & direction + HY Spread + Bitcoin
   • VIX<15 + HYS tight + BTC↑ → strong risk-on
   • VIX 15-20 → normal, direction matters more than level
   • VIX>25 + HYS widening + BTC↓ → risk-off / de-leveraging

Synthesize A–D: What is the dominant macro regime RIGHT NOW, and is it shifting?

**STEP 2 — News & Policy Catalysts (20% weight)**

Search for events from the LAST 7 DAYS and UPCOMING 1-2 WEEKS.

REQUIRED Google searches:
1. "Fed FOMC interest rate ${monthYear}"
2. "US economic data release schedule this week"
3. "tariff trade policy announcement ${monthYear}"
4. "US stock market this week"

For each catalyst:
• State SPECIFIC event (who, what, when)
• Direction of impact (bullish/bearish for US equities)
• Is this already priced in or a potential surprise?

Focus on: Fed speeches, economic data releases (CPI, PPI, jobs, retail sales), earnings season, fiscal policy changes, trade policy announcements.

**STEP 3 — Geopolitical Risk Overlay (20% weight)**

Search for active geopolitical risks that could disrupt markets within 1-2 weeks.

REQUIRED Google searches:
1. "geopolitical risk market impact ${monthYear}"
2. "US China trade war tariff latest"
3. "Middle East conflict oil supply"
4. "global economic sanctions ${monthYear}"

For each risk, evaluate:
• Probability of escalation in next 1-2 weeks (high/medium/low)
• Market impact if realized (high/medium/low)
• Transmission channel (oil supply → inflation, tariffs → earnings, sanctions → supply chain)

Only report risks with at least MEDIUM probability AND MEDIUM impact.

=== FINAL SYNTHESIS ===

Combine Step 1-3 to determine sentiment:
• If macro regime (Step 1) is clearly bullish AND no high-probability geopolitical shock → "bullish"
• If macro regime is clearly bearish OR high-probability geopolitical risk exists → "bearish"
• If signals conflict or regime is transitional → "neutral"

The macro regime (Step 1) is the PRIMARY driver. Steps 2-3 can override ONLY if they represent a clear catalyst or imminent shock.

=== OUTPUT ===

Respond ONLY with this JSON:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "reasoning": "6-8 sentences. Structure: (1) 매크로 레짐 종합 판단 — 금융환경/성장/인플레/리스크 클러스터 교차 분석 결과, (2) 주요 정책/경제 이벤트 및 시장 반영 여부, (3) 지정학적 리스크 평가 및 전이 경로, (4) 향후 1-2주 순 전망",
  "risks": ["risk1", "risk2", "risk3", "risk4"]
}

=== RULES ===
• reasoning과 risks는 반드시 한국어로 작성
• 지표를 개별 나열 금지 — 클러스터 교차 분석만 허용
• 뉴스 인용 시 구체적 날짜·출처 명시 (예: "3월 5일 파월 의장 의회 증언")
• "시장 불확실성", "투자자 심리", "리스크 회피" 등 추상적 표현 사용 금지
• risks에는 1-2주 내 현실화 가능한 구체적 리스크만 포함 (전이 경로 명시)
• 모든 판단에는 반드시 지표 데이터 또는 검색된 사실에 근거한 증거를 제시`;
}
