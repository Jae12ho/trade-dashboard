# 📊 Trade Dashboard

실시간 미국 금융 시장 지표 모니터링 및 AI 기반 시장 분석 대시보드

## 프로젝트 소개

11개의 핵심 경제 지표를 실시간으로 모니터링하고, Google Gemini AI를 활용한 시장 분석을 제공하는 웹 애플리케이션입니다.

## 주요 기능

### 📊 실시간 지표 모니터링
- **11개 핵심 지표**: 매크로 경제(6개) + 원자재/자산(3개) + 시장 심리(2개)
- **다기간 변화율**: 1D/7D/30D (일별), 1M/2M/3M (월별)
- **추세 차트**: 30일/12개월 히스토리 시각화
- **데이터 다운로드**: 지표 데이터 JSON 파일 내보내기

### 🤖 AI 시장 분석
- **Google Gemini 2.5/3 Flash**: 다층 프롬프트 엔지니어링 적용 (Hard Tripwire + 3-horizon)
- **Google Search 통합**: Fed, 정부 공식 발표, 지정학적 리스크, 실시간 시장 반응 자동 검색
- **🚨 Hard Tripwire**: VIX/HYS 결정론적 임계 충족 시 자동 risk-off bias (LLM 해석 무관)
- **3-Horizon 예측**: 단기(1-2주) / 중기(1-3개월) / 장기(6-12개월) 각각 독립적 sentiment + confidence + 예상 SPX 변동 + key drivers
- **신뢰도 캘리브레이션**: confidence 0.40-0.90, 예상 변동폭 range, falsifiable 반증 조건(invalidation triggers), counter-narrative
- **STEP 2 ESCALATION**: 컨센서스 대비 surprise(≥0.2%p), Fed 정책 surprise, 24h 내 SPX ±1.5% 반응 시 catalyst 가중치 격상 (20%→60%)
- **💬 지표별 AI 인사이트**: 각 지표의 변화 원인 및 예측 영향 분석 (2-3문장, actual+consensus 강제)
- **모델 선택**: gemini-2.5-flash / gemini-2.5-flash-lite / gemini-3.1-flash-lite / gemini-3-flash-preview (모두 무료 티어)
- **24시간 캐싱**: Upstash Redis 기반 영구 캐시 + 유사도 기반 Fallback 메커니즘

### 🎨 기타
- **다크 모드**: 시스템 설정 자동 연동
- **반응형 디자인**: 모바일/태블릿/데스크톱 최적화

## 기술 스택

- **Frontend**: Next.js 16.1, React 19.2, TypeScript 5, Tailwind CSS 4, Recharts 3.6
- **Backend**: Next.js API Routes, Upstash Redis
- **APIs**: FRED, Yahoo Finance, CoinGecko, Google Gemini

## 빠른 시작

### 1. 설치

```bash
git clone <repository-url>
cd trade-dashboard
npm install
```

### 2. 환경 변수 설정

`.env.local` 파일 생성:

```bash
GEMINI_API_KEY=your_key         # https://makersuite.google.com/app/apikey
FRED_API_KEY=your_key           # https://fred.stlouisfed.org/docs/api/api_key.html
UPSTASH_REDIS_REST_URL=your_url # https://console.upstash.com
UPSTASH_REDIS_REST_TOKEN=your_token
```

### 3. 실행

```bash
npm run dev  # http://localhost:3000
```

## 모니터링 지표

| 카테고리 | 지표 | 출처 | 빈도 |
|---------|------|------|------|
| **매크로 (6개)** |
| | US 10Y Yield | FRED | 일별 |
| | US Dollar Index (DXY) | Yahoo Finance | 일별 |
| | High Yield Spread | FRED | 일별 |
| | M2 Money Supply | FRED | 월별 |
| | **Consumer Price Index (CPI)** 🆕 | FRED | 월별 |
| | **비농업 고용자 수 (Total Nonfarm Employment)** 🆕 | FRED (PAYEMS) | 월별 |
| **원자재/자산 (3개)** |
| | Crude Oil (WTI) | Yahoo Finance | 일별 |
| | Copper/Gold Ratio | Yahoo Finance | 일별 |
| | Bitcoin (BTC/USD) | CoinGecko | 일별 |
| **시장 심리 (2개)** |
| | Manufacturing Confidence | FRED | 월별 |
| | VIX (Fear Index) | Yahoo Finance | 일별 |

## 개발 명령어

```bash
npm run dev    # 개발 서버 (localhost:3000)
npm run build  # 프로덕션 빌드
npm start      # 프로덕션 서버
npm run lint   # ESLint 검사
```

## 프로젝트 구조

```
trade-dashboard/
├── app/                  # Next.js App Router
│   ├── api/             # API 라우트 (indicators, ai-prediction)
│   └── page.tsx         # 메인 페이지
├── components/          # React 컴포넌트 (Dashboard, IndicatorCard, AIPrediction)
├── lib/
│   ├── api/            # 외부 API 연동 (indicators.ts, gemini.ts)
│   ├── prompts/        # AI 프롬프트 템플릿 (market-prediction, indicator-comments)
│   ├── cache/          # Redis 캐싱 (gemini-cache-redis.ts)
│   ├── constants/      # 설정 상수 (gemini-models.ts)
│   └── types/          # TypeScript 타입 정의
└── .env.local          # 환경 변수 (git 제외)
```

## 주요 특징

### AI 프롬프트 엔지니어링

**다층 프레임워크** — 3-Horizon × Hard Tripwire × STEP 2 ESCALATION

각 horizon은 다른 분석 프레임이 우세 (동일 시장 상태도 horizon에 따라 sentiment 다를 수 있음):

| Horizon | 우세 프레임 | Hard Tripwire | STEP 2 ESCALATION |
|---------|-------------|---------------|-------------------|
| 단기 (1-2주) | Catalyst + 포지셔닝 + 기술적 | **적용 (강제)** | **강하게 적용** |
| 중기 (1-3개월) | 매크로 레짐 클러스터 + Fed 경로 + 실적 사이클 | 미적용 | regime shift 시사 시만 |
| 장기 (6-12개월) | 구조적/세속적 추세 + 밸류에이션 + 부채 사이클 | 미적용 | 미적용 |

**분석 단계:**
- **🚨 Hard Tripwire** (TypeScript 결정론적 평가): VIX≥22, VIX 1D≥+15%, HYS 1D≥+20bps 중 하나 발동 시 단기 sentiment 강제 risk-off
- **STEP 1 — 매크로 레짐 교차 분석**: 11개 지표를 4개 클러스터로 교차 판독 (백분위·추세 활용)
  - 금융환경 (10Y+HYS+DXY) / 성장 모멘텀 (Cu/Gold+MFG+NFP)
  - 인플레이션 궤적 (CPI+Oil+M2) / 리스크 선호도 (VIX+HYS+BTC)
- **STEP 1.5 — Counter-Narrative**: 결론 뒤집을 수 있는 반대 시나리오 강제 구성 (confidence만 조정, 방향 전환 불가)
- **STEP 2 — 뉴스/정책 촉매**: 실시간 시장 반응 검색 최우선, ESCALATION 조건(surprise ≥0.2%p, Fed surprise, 24h SPX ±1.5%) 충족 시 가중치 60% 격상
- **STEP 3 — 지정학 리스크**: 무역분쟁, 에너지 공급, 제재 등 확률×영향 평가
- **STEP 4 — 장기 구조적 요인**: 수익 사이클, 밸류에이션(CAPE/forward P/E/ERP), AI capex 사이클, 재정 지속가능성, r* 균형금리

**출력 구조** (각 horizon마다):
- `sentiment`: bullish/bearish/neutral
- `confidence`: 0.40~0.90 (캘리브레이션됨)
- `expectedSpxMove`: "+X~Y%" range
- `keyDrivers`: horizon 우세 프레임에 맞는 driver 3-5개
- 공통: `reasoning`, `counterNarrative`, `invalidationTriggers` (falsifiable), `risks`

**프롬프트 파일 분리 관리** (`lib/prompts/`):
- `market-prediction.ts`: 시장 전망 프롬프트 (3-horizon × Hard Tripwire × ESCALATION)
- `indicator-comments.ts`: 지표별 AI 코멘트 프롬프트 (actual+consensus 강제, fabrication 금지 fallback)
- `utils.ts`: 공통 유틸리티 — 기간별 변화율 포맷팅, 6개월 percentile 계산, 추세 streak, 결정론적 Hard Tripwire 평가, 검색 날짜 한정자

**지표별 AI 인사이트**:
- 각 지표의 변화 원인과 예측 영향을 2-3문장으로 설명
- 경제 데이터 인용 시 actual + consensus 둘 다 명시 강제 (모르면 인용 금지)
- 7일 내 직접 인용 가능한 사실 없으면 fabrication 대신 "기술적 조정" fallback
- 단일 API 호출로 11개 지표 배치 분석, 한국어로 제공

### 캐싱 전략

- **지표 데이터**: Next.js Data Cache 5분 (fetch revalidation)
- **AI 분석**: Upstash Redis 24시간 캐싱 (모델별 독립)
- **Fallback**: API 한도 초과 시 유사도 기반 캐시 자동 선택

---

**최종 업데이트**: 2026-05-13
