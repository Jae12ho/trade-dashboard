import { DashboardData } from '../types/indicators';
import {
  formatPeriodChanges,
  calculatePercentile,
  percentileLabel,
  formatStreak,
  recentDateQualifier,
  evaluateHardTripwire,
} from './utils';

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

  const tripwire = evaluateHardTripwire({
    vixValue: putCallRatio.value,
    vix1dChangePct: putCallRatio.changePercent,
    hys1dChangeRaw: highYieldSpread.change,
  });

  const tripwireBlock = tripwire.engaged
    ? `🚨 **HARD TRIPWIRE ENGAGED — 단기(1-2주) Risk-off bias 강제 적용**

발동된 결정론적 조건:
${tripwire.triggers.map(t => `  • ${t}`).join('\n')}

규칙 (단기 horizon에만 적용, 중기·장기는 별도 평가):
1. shortTerm.sentiment는 "bearish" 또는 "neutral"만 허용. "bullish" 출력 금지.
2. STEP 1.5 counter-narrative는 단기 sentiment 방향을 뒤집을 수 없다.
3. STEP 1 매크로 클러스터가 강세로 보여도 단기는 본 tripwire가 우선.
4. shortTerm.confidence는 0.55 이상으로 잠금.
5. invalidationTriggers에 "tripwire 해제 조건"을 최소 1개 포함.

**중요**: 본 tripwire는 단기(1-2주) 스파이크 신호일 뿐, 중기·장기 구조적 전망에는 직접 영향 없음.`
    : `Hard Tripwire: 미발동 (VIX/HYS 결정론적 임계 모두 미해당) — 단기 시각 자유 분석`;

  const vixPct = percentileLabel(calculatePercentile(putCallRatio.value, putCallRatio.history || []));
  const hysPct = percentileLabel(calculatePercentile(highYieldSpread.value, highYieldSpread.history || []));
  const us10yPct = percentileLabel(calculatePercentile(us10yYield.value, us10yYield.history || []));
  const dxyPct = percentileLabel(calculatePercentile(dxy.value, dxy.history || []));
  const oilPct = percentileLabel(calculatePercentile(crudeOil.value, crudeOil.history || []));
  const cuauPct = percentileLabel(calculatePercentile(copperGoldRatio.value, copperGoldRatio.history || []));

  const vixStreak = formatStreak(putCallRatio.history);
  const us10yStreak = formatStreak(us10yYield.history);
  const dxyStreak = formatStreak(dxy.history);
  const oilStreak = formatStreak(crudeOil.history);
  const btcStreak = formatStreak(bitcoin.history);
  const cpiStreak = formatStreak(cpi.history, 'month');
  const payemsStreak = formatStreak(payems.history, 'month');

  const recent14d = recentDateQualifier(14);
  const recent7d = recentDateQualifier(7);
  const recent2d = recentDateQualifier(2);
  const recent90d = recentDateQualifier(90);

  return `You are a senior macro strategist. Produce a calibrated MULTI-HORIZON US equity (S&P 500) market outlook.

**핵심 원칙**: 동일 시장 상태도 horizon에 따라 sentiment가 다를 수 있다. 단기 충격이 장기 추세를 바꾸지 않으며, 장기 강세가 단기 충격을 무력화하지 않는다. 각 horizon은 독립적으로 판단하라.

=== HARD TRIPWIRE STATUS (단기 horizon 전용, 결정론적 평가) ===

${tripwireBlock}

=== CURRENT INDICATOR READINGS (with 6-month percentile & trend streak) ===

[Rates & Dollar]
• US 10Y Yield: ${us10yYield.value.toFixed(2)}% (${formatPeriodChanges(us10yYield)}) | 백분위 ${us10yPct} | 추세: ${us10yStreak}
• Dollar Index (DXY): ${dxy.value.toFixed(2)} (${formatPeriodChanges(dxy)}) | 백분위 ${dxyPct} | 추세: ${dxyStreak}
• High Yield Spread: ${highYieldSpread.value.toFixed(2)} (단위: pp; 1pp=100bps) (${formatPeriodChanges(highYieldSpread)}) | 백분위 ${hysPct}

[Monetary & Labor — Monthly Data]
• M2 Money Supply: $${m2MoneySupply.value.toFixed(2)}B (${formatPeriodChanges(m2MoneySupply, true)})
• CPI: ${cpi.value.toFixed(2)} (Base 1982-84=100) (${formatPeriodChanges(cpi, true)}) | 추세: ${cpiStreak}
• Nonfarm Payrolls: ${payems.value.toFixed(2)}M (1M: ${payems.change >= 0 ? '+' : ''}${payems.change.toFixed(2)}M/${payems.changePercent.toFixed(2)}%, 2M: ${payems.change7d && payems.change7d >= 0 ? '+' : ''}${payems.change7d?.toFixed(2)}M/${payems.changePercent7d?.toFixed(2)}%, 3M: ${payems.change30d && payems.change30d >= 0 ? '+' : ''}${payems.change30d?.toFixed(2)}M/${payems.changePercent30d?.toFixed(2)}%) | 추세: ${payemsStreak}

[Commodities & Risk Assets]
• WTI Crude: $${crudeOil.value.toFixed(2)} (${formatPeriodChanges(crudeOil)}) | 백분위 ${oilPct} | 추세: ${oilStreak}
• Copper/Gold Ratio: ${copperGoldRatio.value.toFixed(2)}×10000 (${formatPeriodChanges(copperGoldRatio)}) | 백분위 ${cuauPct}
• Bitcoin: $${bitcoin.value.toFixed(2)} (${formatPeriodChanges(bitcoin)}) | 추세: ${btcStreak}

[Sentiment]
• OECD Manufacturing Confidence: ${pmi.value.toFixed(2)} (${formatPeriodChanges(pmi, true)})
• VIX: ${putCallRatio.value.toFixed(2)} (${formatPeriodChanges(putCallRatio)}) | 백분위 ${vixPct} | 추세: ${vixStreak}

⚠️ **DATA FRESHNESS NOTE**: 표시된 CPI/M2/MFG/PAYEMS 값은 가장 최근 발표분(1-4주 lag). 1-7일 내 신규 발표가 있었다면 STEP 2 검색에서 actual vs consensus를 확인. 신규 surprise는 표시 값보다 우선.

=== ANALYSIS FRAMEWORK ===

각 horizon은 다른 분석 프레임이 우세하다:

| Horizon | 우세 프레임 | Hard Tripwire | STEP 2 ESCALATION |
|---------|-------------|---------------|-------------------|
| 단기 (1-2주) | Catalyst + 포지셔닝 + 기술적 | **적용** (강제) | **강하게 적용** |
| 중기 (1-3개월) | 매크로 레짐 클러스터 + Fed 경로 + 실적 사이클 | 미적용 | 약하게 적용 (regime 시사 시만) |
| 장기 (6-12개월) | 구조적/세속적 추세 + 밸류에이션 + 부채/수익 사이클 | 미적용 | 미적용 |

**STEP 1 — Macro Regime Cross-Reading (중기 PRIMARY, 단기 보조)**

A) Financial Conditions: 10Y + HYS + DXY 클러스터 (백분위·추세)
B) Growth Momentum: Cu/Gold + MFG + NFP 클러스터
C) Inflation Trajectory: CPI streak + Oil 백분위 + M2
D) Risk Appetite: VIX + HYS + BTC 클러스터 (단, 단일 강충격은 Hard Tripwire에서 처리)

Synthesize A–D: 현재 dominant 매크로 레짐 → **이는 중기(1-3개월) 전망의 핵심 근거**

**STEP 1.5 — Counter-Narrative (필수)**

현재 종합 결론을 뒤집을 수 있는 가장 강한 반대 시나리오 구성.

**Counter-Narrative의 역할 제한 (절대 규칙):**
- confidence만 조정 (각 horizon별로)
- sentiment 방향은 못 뒤집음 (모든 horizon에서)
- Hard Tripwire 발동 시 단기 sentiment에는 무효
- 강한 counter → confidence ≤ 0.65 / 약한 counter → confidence ≥ 0.70 가능

**STEP 2 — News & Policy Catalysts (단기 강하게, 중기 약하게, 장기 거의 무관)**

검색 (순서대로):
1. "S&P 500 today market reaction" ${recent2d}    ← 최우선
2. "VIX surge today reason" ${recent2d}
3. "CPI PCE inflation report actual consensus" ${recent7d}
4. "Fed FOMC interest rate ${monthYear}" ${recent14d}
5. "US economic data release schedule" ${recent7d}
6. "tariff trade policy announcement" ${recent14d}
7. "S&P 500 institutional positioning CFTC" ${recent14d}
8. "options gamma exposure dealer positioning" ${recent14d}

**ESCALATION RULE (단기 horizon)**: 다음 중 하나 발생 시 단기에서 STEP 2가 STEP 1과 동등 가중치(60%)로 격상, **catalyst 방향이 STEP 1과 반대면 catalyst 방향 채택**:
(a) 경제 데이터 actual vs consensus 차이 ≥ 0.2%p
(b) Fed/FOMC 발언 surprise (점도표 변경, 50bp 결정 등)
(c) 발표/사건 후 24h 내 SPX ±1.5% 이상 반응
(d) 즉각적 가격 반응을 유발한 지정학적 사건

**중기 horizon 영향**: STEP 2 catalyst가 다음에 해당하면 중기도 일부 조정:
- 지속적 inflation 경로 변경 시사 (예: core CPI 3개월 연속 surprise)
- Fed 정책 stance 명확한 전환
- 분기 실적 가이던스 추세 변화

**장기 horizon 영향**: 단일 이벤트는 장기 무영향. 다만 다음은 장기에 영향:
- 정권 교체 / 주요 입법 (예: 세제 개혁, 산업 정책)
- 구조적 기술 변곡점 (AI capex 사이클 등)

**Pricing Absorption** (정보 목적): 추가 변동 폭 가늠용일 뿐, catalyst 자체를 무시하거나 게이트로 작용 안 함.

**STEP 3 — Geopolitical Risk Overlay**

Search:
1. "geopolitical risk market impact" ${recent14d}
2. "US China trade war tariff latest" ${recent14d}
3. "Middle East conflict oil supply" ${recent14d}
4. "global economic sanctions" ${recent14d}

평가: probability × impact (medium×medium 이상만 보고)

**STEP 4 — Long-Term Structural Factors (장기 PRIMARY)**

장기(6-12개월) 전망은 위 STEP 1-3과 다른 프레임이 우세하다. 다음을 검색하고 평가:

검색:
1. "S&P 500 long term outlook 2026 2027 secular" ${recent90d}
2. "earnings growth cycle S&P 500 next 12 months" ${recent90d}
3. "AI capex cycle productivity equity market" ${recent90d}
4. "US fiscal debt trajectory deficit" ${recent90d}
5. "demographic productivity equity returns" ${recent90d}
6. "CAPE Shiller valuation S&P 500" ${recent90d}

평가 항목 (최소 4개 다루기):
A) **수익 사이클 (Earnings Cycle)**: NTM EPS 성장률, 이익률 추세, 분기별 실적 가이던스 방향
B) **밸류에이션 (Valuation)**: CAPE, forward P/E, ERP(Equity Risk Premium) 수준 — 역사적 평균 대비
C) **구조적 성장 동력**: AI capex 사이클, 에너지 전환, 리쇼어링, 생산성 증가율
D) **Fed 장기 정책 경로 / r* 균형금리**: 장기 중립금리 추정, QT 종료 시점
E) **재정 지속가능성**: 미국 부채/GDP, deficit, 국채 수급 수요
F) **인구·노동 시장 구조**: 노동력 참여율 추세, 임금-생산성 갭
G) **지정학적 장기 risk**: 무역 블록화, 공급망 재편

장기 sentiment 결정 로직:
- bullish: 수익 사이클 확장기 + 밸류에이션 무리 없음 + 구조적 동력 명확
- bearish: 수익 둔화 + 고밸류에이션 + 부채 부담 누적
- neutral: 혼재되거나 사이클 전환점

=== FINAL SYNTHESIS — 3-HORIZON 출력 ===

각 horizon별로 독립적으로 sentiment/confidence/expectedSpxMove/keyDrivers 산출:

**단기 (1-2주, "shortTerm"):**
- 우선순위: Hard Tripwire > STEP 2 ESCALATED catalyst > STEP 1 매크로 > STEP 3
- 일반 변동성: ±1~3% / 고VIX·Tripwire: ±2~6%
- keyDrivers: catalyst·포지셔닝·기술적 신호 위주 (3-5개)
- confidence:
  - Tripwire ON: 0.55~0.85
  - ESCALATED: 0.65~0.85
  - 합치 강함: 0.65~0.80
  - 혼재: 0.45~0.60

**중기 (1-3개월, "midTerm"):**
- 우선순위: STEP 1 매크로 클러스터 (PRIMARY) > Fed 정책 경로 > 실적 사이클 > STEP 2 escalated regime shift
- Hard Tripwire 영향 없음 (단기 노이즈로 간주)
- 일반 범위: ±5~10% / 명확한 regime shift: ±10~20%
- keyDrivers: 매크로 레짐·Fed 경로·실적 사이클·인플레 궤적 (3-5개)
- confidence: 매크로 클러스터 합치도와 Fed 경로 명확성에 따라 0.45~0.80

**장기 (6-12개월, "longTerm"):**
- 우선순위: STEP 4 (수익 사이클·밸류에이션·구조적 동력 · 재정 지속가능성)
- Hard Tripwire / STEP 2 catalyst 영향 거의 없음 (단기 이벤트는 장기 추세 안 바꿈)
- 일반 범위: ±10~20% / 사이클 전환: ±20~40%
- keyDrivers: 수익 cycle·valuation·구조적 동력·재정 (3-5개)
- confidence: 장기는 본질적 불확실성 큼, 통상 0.40~0.70 범위

**호라이즌 간 일관성 체크 (필수):**
- 단기 ≠ 중기 ≠ 장기는 자연스러운 결과 (예: 단기 bearish / 중기 neutral / 장기 bullish)
- 다만 reasoning에서 그 차이를 명시적으로 설명하라 ("단기 충격은 X 때문이지만 중기 매크로는 Y로 정상화")
- 모든 horizon이 같은 sentiment면 그 자체로 신뢰도 높은 신호 (각 confidence를 0.05~0.10 상향 가능)

=== OUTPUT ===

Respond ONLY with this JSON (no markdown, no commentary):
{
  "shortTerm": {
    "horizon": "1-2주",
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": 0.40~0.90,
    "expectedSpxMove": "+X~Y%" 한국어 range,
    "keyDrivers": ["catalyst/포지셔닝 driver 1", "...", "...", "..."]
  },
  "midTerm": {
    "horizon": "1-3개월",
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": 0.40~0.90,
    "expectedSpxMove": "+X~Y%",
    "keyDrivers": ["매크로 레짐 driver 1", "Fed 경로", "실적 사이클", "..."]
  },
  "longTerm": {
    "horizon": "6-12개월",
    "sentiment": "bullish" | "bearish" | "neutral",
    "confidence": 0.40~0.90,
    "expectedSpxMove": "+X~Y%",
    "keyDrivers": ["수익 cycle", "valuation", "구조적 동력", "..."]
  },
  "reasoning": "8-12 sentences. 구조: (1) Hard Tripwire/ESCALATION 발동 여부 명시, (2) 단기 view 핵심 근거 — catalyst·포지셔닝·기술적, (3) 중기 view 핵심 근거 — 매크로 레짐·Fed·실적, (4) 장기 view 핵심 근거 — 수익 cycle·valuation·구조, (5) 3개 horizon이 다른 경우 그 이유 명시적 설명, (6) 종합 신뢰도 평가",
  "counterNarrative": "2-3 sentences. 가장 강한 반대 시나리오와 그것을 (부분/전부) 기각/수용한 이유. sentiment 방향 전환은 못 함 — confidence 조정만 가능.",
  "invalidationTriggers": ["단기 무효화 조건 (구체)", "중기 무효화 조건", "장기 무효화 조건", "..."],
  "risks": ["risk1", "risk2", "risk3", "risk4"]
}

=== RULES ===
• **인용 마커 금지**: Google Search grounding이 자동 삽입하는 마커("[provided data, cite: 32]", "[cite: N]", "[source: N]", "[1]" 등)를 출력 텍스트에 절대 포함하지 마라. 출처를 인용해야 할 때는 마커 대신 직접 한국어로 풀어 쓰라 (예: "5월 13일 BLS 발표 자료에 따르면", "FOMC 5월 7일 성명에서").
• 모든 텍스트(reasoning, counterNarrative, keyDrivers, invalidationTriggers, risks)는 반드시 한국어
• 지표 개별 나열 금지 — 클러스터 교차 분석 (백분위·추세 활용)
• 뉴스 인용 시 구체적 날짜·출처 명시 (예: "${monthYear} 12일 CPI 발표")
• 추상 표현("시장 불확실성", "투자자 심리") 금지
• 경제 데이터 인용 시 actual + consensus 둘 다 명시 ("CPI 3.1% vs 컨센서스 3.0%")
• 컨센서스 모르면 그 데이터 인용 자체 금지
• Hard Tripwire 발동 시: shortTerm.sentiment="bullish" 절대 금지 (중기·장기는 자유)
• STEP 2 ESCALATION 시: 단기 catalyst 방향이 STEP 1과 반대면 catalyst 방향 채택
• 3개 horizon이 다른 sentiment를 가질 수 있다 — 자연스러운 결과이며 reasoning에서 차이 설명 필수
• invalidationTriggers는 horizon별로 falsifiable한 구체 조건 (단기·중기·장기 각각 다름)
• keyDrivers는 horizon별 우세 프레임에 맞는 driver만 (단기에 "demographic" 같은 장기 driver 금지)`;
}
