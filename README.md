# 📊 Trade Dashboard

실시간 미국 금융 시장 지표 모니터링 및 AI 기반 시장 분석 대시보드

## 프로젝트 소개

Trade Dashboard는 9개의 핵심 경제 지표를 실시간으로 모니터링하고, Google Gemini AI를 활용한 시장 분석을 제공하는 웹 애플리케이션입니다. 매크로 경제 지표, 원자재 가격, 시장 심리 지표를 한눈에 파악할 수 있으며, 각 지표의 30일 추세를 시각화하여 제공합니다.

## 주요 기능

- ✅ **9개 핵심 지표 실시간 모니터링**
  - 매크로 경제 지표 4개 (US 10Y 국채 수익률, 달러 인덱스, 하이일드 스프레드, M2 통화량)
  - 원자재 및 자산 지표 3개 (원유, 구리/금 비율, 비트코인)
  - 시장 심리 지표 2개 (제조업 신뢰도, VIX 공포 지수)

- 📊 **다기간 변화율 분석**
  - 일별 지표: 1일, 7일, 30일 변화율 제공
  - 월별 지표 (M2, 제조업 신뢰도): 1개월, 2개월, 3개월 변화율
  - 달력 기반 정확한 계산 (거래일이 아닌 실제 날짜 기준)

- 📈 **추세 차트**
  - 일별 지표: 최근 30 달력일 데이터를 라인 차트로 시각화
  - 월별 지표: 최근 12개월 데이터 시각화
  - 30일(또는 3개월) 변화율에 따른 색상 구분 (상승=녹색, 하락=빨간색)

- 📰 **실시간 금융 뉴스 통합**
  - Finnhub API를 통한 최근 24시간 금융 뉴스 자동 수집
  - 최대 10개 주요 기사 (Reuters, Bloomberg 등)
  - Redis 기반 10분 캐싱으로 신선한 뉴스 제공
  - AI 분석에 뉴스 컨텍스트 자동 반영 (UI에는 미표시)

- 🤖 **AI 기반 시장 분석**
  - **모델 선택 기능**: 3개의 Google Gemini 모델 중 선택 가능
    - gemini-2.5-flash (기본값, 균형잡힌 성능)
    - gemini-2.5-flash-lite (빠른 응답)
    - gemini-2.5-pro (고급 분석)
  - localStorage 기반 모델 선택 지속성 (페이지 새로고침 후에도 유지)
  - API 할당량 초과 시 다른 모델로 즉시 전환 가능
  - Upstash Redis 기반 24시간 영구 캐싱 (모델별 독립 캐시)
  - 서버리스 환경에서 모든 인스턴스 간 캐시 공유
  - **뉴스 기반 분석**: 실시간 금융 뉴스를 반영한 시장 전망 (연준 정책, 기업 실적, 지정학적 이슈 등)
  - 한국어로 제공되는 시장 전망 및 리스크 분석
  - 강세(Bullish) / 약세(Bearish) / 중립(Neutral) 심리 분석
  - **Fallback 메커니즘**: API 한도 초과 시 최근 24시간 내 캐시된 분석 자동 제공 (프로덕션 환경에서 안정적으로 작동)
  - 실시간 Refresh 버튼으로 수동 갱신 가능

- 🌓 **다크 모드 지원**
  - 시스템 설정에 따른 자동 다크 모드 전환

## 기술 스택

### Frontend
- **Next.js 16.1.1** - React 기반 풀스택 프레임워크 (App Router)
- **React 19.2.3** - UI 라이브러리
- **TypeScript 5** - 정적 타입 언어 (strict mode)
- **Tailwind CSS 4** - 유틸리티 기반 CSS 프레임워크
- **Recharts 3.6.0** - 데이터 시각화 라이브러리

### Backend & APIs
- **Next.js API Routes** - 서버사이드 API 엔드포인트
- **Upstash Redis** - 서버리스 최적화된 영구 캐시 저장소
- **FRED API** - 미국 연방준비은행 경제 데이터
- **Yahoo Finance API** - 금융 시장 데이터
- **CoinGecko API** - 암호화폐 시장 데이터
- **Finnhub API** - 실시간 금융 뉴스
- **Google Gemini API** - AI 기반 시장 분석

## 설치 및 실행

### 1. 저장소 클론

```bash
git clone <repository-url>
cd trade-dashboard
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 API 키를 추가하세요:

```bash
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# FRED API (Federal Reserve Economic Data)
FRED_API_KEY=your_fred_api_key_here

# Finnhub API (Market News)
FINNHUB_API_KEY=your_finnhub_api_key_here

# Upstash Redis (for persistent caching in serverless environment)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
```

**API 키 발급 방법:**
- **GEMINI_API_KEY**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급
- **FRED_API_KEY**: [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html)에서 무료 발급
- **FINNHUB_API_KEY**: [Finnhub](https://finnhub.io)에서 무료 발급 (60 calls/min)
- **UPSTASH_REDIS_REST_URL & TOKEN**:
  1. [Upstash Console](https://console.upstash.com)에서 계정 생성
  2. Redis 데이터베이스 생성 (Global, 무료 티어 사용 가능)
  3. REST API 탭에서 URL과 Token 복사

**참고:** Yahoo Finance와 CoinGecko는 인증이 필요하지 않습니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 5. 프로덕션 빌드

```bash
npm run build
npm run start
```

## 모니터링 지표

### 📌 매크로 경제 지표 (4개)

| 지표 | 설명 | 데이터 출처 | API 심볼 | 데이터 빈도 |
|------|------|-------------|----------|-------------|
| US 10Y Yield | 미국 10년물 국채 수익률 | FRED | DGS10 | 일별 |
| DXY | 미국 달러 인덱스 | Yahoo Finance | DX-Y.NYB | 일별 |
| High Yield Spread | 하이일드 채권 스프레드 | FRED | BAMLH0A0HYM2 | 일별 |
| M2 Money Supply | M2 통화 공급량 | FRED | M2SL | **월별** |

### 🛢️ 원자재 및 자산 지표 (3개)

| 지표 | 설명 | 데이터 출처 | API 심볼 | 데이터 빈도 |
|------|------|-------------|----------|-------------|
| Crude Oil (WTI) | 서부 텍사스유 현물 가격 | Yahoo Finance | CL=F | 일별 |
| Copper/Gold Ratio | 구리/금 비율 (×10000) | Yahoo Finance | HG=F / GC=F | 일별 |
| Bitcoin (BTC/USD) | 비트코인 가격 | CoinGecko | bitcoin | 일별 (24/7) |

### 📊 시장 심리 지표 (2개)

| 지표 | 설명 | 데이터 출처 | API 심볼 | 데이터 빈도 |
|------|------|-------------|----------|-------------|
| Manufacturing Confidence | OECD 제조업 신뢰도 지수 | FRED | BSCICP02USM460S | **월별** |
| VIX (Fear Index) | 변동성 지수 (공포 지수) | Yahoo Finance | ^VIX | 일별 |

## 프로젝트 구조

```
trade-dashboard/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 홈 페이지 (대시보드 렌더링)
│   ├── layout.tsx                # 루트 레이아웃
│   ├── globals.css               # 전역 스타일
│   └── api/                      # API 라우트
│       ├── indicators/
│       │   └── route.ts          # 9개 지표 데이터 API
│       ├── news/
│       │   └── route.ts          # 금융 뉴스 API
│       └── ai-prediction/
│           └── route.ts          # AI 시장 분석 API
│
├── components/                   # React 컴포넌트
│   ├── Dashboard.tsx             # 메인 대시보드 컴포넌트
│   ├── IndicatorCard.tsx         # 개별 지표 카드
│   ├── MiniChart.tsx             # 30일 추세 차트
│   ├── AIPrediction.tsx          # AI 분석 표시
│   └── ThemeScript.tsx           # 다크 모드 스크립트
│
├── lib/                          # 유틸리티 및 API
│   ├── types/
│   │   ├── indicators.ts         # TypeScript 타입 정의
│   │   └── errors.ts             # 에러 타입 정의 (QuotaError)
│   ├── api/
│   │   ├── indicators.ts         # 외부 API 연동 함수
│   │   ├── news.ts               # Finnhub 뉴스 API 연동
│   │   └── gemini.ts             # Gemini AI API 연동
│   ├── cache/
│   │   ├── gemini-cache-redis.ts # Upstash Redis 캐시 (24h TTL, 모델별 분리)
│   │   └── news-cache-redis.ts   # 뉴스 캐시 (1h TTL)
│   └── constants/
│       └── gemini-models.ts      # Gemini 모델 설정 (중앙 관리)
│
├── public/                       # 정적 파일
├── .env.local                    # 환경 변수 (git에 포함되지 않음)
├── package.json                  # 프로젝트 의존성
├── tsconfig.json                 # TypeScript 설정
├── next.config.ts                # Next.js 설정
└── README.md                     # 프로젝트 문서 (이 파일)
```

## 개발 명령어

```bash
# 개발 서버 실행 (http://localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# ESLint 코드 검사
npm run lint
```

## 데이터 흐름

```
┌─────────────────────────────────────────────────────────┐
│  클라이언트 (브라우저)                                       │
│  Dashboard 컴포넌트                                       │
│  ├─ /api/indicators 호출 (5분마다)                         │
│  ├─ /api/news 호출 (5분마다)                              │
│  └─ /api/ai-prediction 호출                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js API Routes (서버)                               │
│  ├─ getAllIndicators() - 9개 지표 병렬 조회                 │
│  ├─ getLatestNews() - 최근 24시간 뉴스 조회                 │
│  └─ generateMarketPrediction() - AI 분석 생성             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  외부 API                                                │
│  ├─ FRED API (매크로 지표)                                 │
│  ├─ Yahoo Finance API (자산 가격)                         │
│  ├─ CoinGecko API (암호화폐)                              │
│  ├─ Finnhub API (금융 뉴스)                               │
│  └─ Google Gemini API (AI 분석)                          │
└─────────────────────────────────────────────────────────┘
```

## 캐싱 전략

### 외부 API 캐싱
- **지표 데이터**: Next.js ISR 5분 캐싱 (`revalidate: 300`)
- **히스토리 데이터**: 1시간 캐싱 (변동이 적은 과거 데이터)
- **뉴스 데이터**: Upstash Redis 10분 캐싱 + Next.js ISR 10분 (신선도와 효율성 균형)
- **API 라우트**: 강제 동적 렌더링 (`dynamic = 'force-dynamic'`)
- **클라이언트 폴링**: 5분마다 자동 새로고침

### Gemini AI 캐싱 (lib/cache/gemini-cache-redis.ts)
- **저장 방식**: Upstash Redis (영구적, 서버리스 최적화)
- **TTL**: 24시간 (일별 데이터 업데이트 주기에 맞춤, Redis가 자동 관리)
- **모델별 캐시 분리**: 각 Gemini 모델별로 독립적인 캐시 유지 (교차 오염 방지)
- **캐시 키 전략**:
  - Primary: `gemini:prediction:{hash}` (모델명 + 지표 값으로 해싱)
  - Fallback: `gemini:fallback:{timestamp}` (유사도 기반 최적 예측 조회)
- **장점**:
  - 모든 서버리스 인스턴스 간 캐시 공유
  - Cold start 후에도 캐시 유지
  - 프로덕션 환경에서 Fallback 메커니즘 안정적 작동
  - HTTPS REST API로 연결 풀 불필요
  - 모델 전환 시 각 모델의 독립적인 예측 유지
- **Fallback 메커니즘 (Hybrid Min-Max 유사도 측정)**:
  - API 한도 초과 시 **현재 지표와 가장 유사한** 24시간 내 캐시 자동 선택
  - **동적 범위**: 실제 24시간 캐시 데이터의 변동폭 기반 정규화
  - **최소 임계값**: Division by zero 방지 (역사적 범위의 1%)
  - **가중치**: 유사도 90% + 최신성 10% (지표 유사성 우선)
  - 9개 지표 모두 유클리드 거리 기반 종합 평가
- **무료 티어**: Upstash 무료 10,000 commands/day (월 300,000)

## 주요 특징

### 다기간 변화율 계산

**일별 지표** (US10Y, DXY, HYS, OIL, Cu/Au, VIX, BTC):
- **1D**: 마지막 거래일 대비 (항목 기반)
- **7D**: 정확히 7 달력일 전 대비 (달력 기반)
- **30D**: 정확히 30 달력일 전 대비 (달력 기반)

**월별 지표** (M2, Manufacturing Confidence):
- **1M**: 1개월 전 대비
- **2M**: 2개월 전 대비
- **3M**: 3개월 전 대비

달력 기반 계산은 주말/공휴일을 고려하여 가장 가까운 거래일 데이터를 사용합니다 (±3일 범위).

### 계산 지표: 구리/금 비율

구리 선물 (HG=F)과 금 선물 (GC=F)을 각각 조회하여 비율을 계산합니다:

```
Copper/Gold Ratio = (Copper Price / Gold Price) × 10000
```

가독성을 위해 10000을 곱하여 표시 (예: 0.001238 → 12.4×10000)

### Hybrid Min-Max 유사도 측정 (Fallback 메커니즘)

API 할당량 초과 시, 단순히 최신 캐시를 반환하는 대신 **현재 지표와 가장 유사한 캐시**를 선택하여 더 관련성 높은 AI 분석을 제공합니다.

#### 핵심 원리

1. **동적 범위 계산**:
   - 24시간 내 모든 캐시 데이터의 실제 변동폭(min-max) 계산
   - 각 지표별로 독립적인 범위 산출

2. **최소 임계값 (안전장치)**:
   - 역사적 범위의 1%를 최소값으로 설정
   - Division by zero 방지 및 극단적 상황 대응
   - 예: US10Y (16 * 0.01 = 0.16), BTC (100000 * 0.01 = 1000)

3. **효과적 범위 선택**:
   ```
   effectiveRange = max(동적 범위, 최소 임계값)
   ```
   - 정상적인 날: 최소 임계값 사용 (24시간 내 미세한 차이도 구분)
   - 변동성 큰 날: 동적 범위 사용 (실제 변동폭 반영)

4. **유클리드 거리 계산**:
   - 9개 지표의 정규화된 차이를 제곱합한 평균의 제곱근
   - 모든 지표가 동등하게 기여

5. **유사도 점수 변환**:
   ```
   similarity = e^(-distance)
   ```
   - 거리 0 → 유사도 1.0 (완전 동일)
   - 거리 증가 → 유사도 지수적 감소

6. **최종 점수**:
   ```
   finalScore = similarity × 0.9 + recency × 0.1
   ```
   - 유사도 90% 가중치 (시장 상황 일치 우선)
   - 최신성 10% 가중치 (타이브레이커)

#### 장점

- ✅ **관련성 높은 분석**: 현재 시장 상황과 유사한 과거 분석 제공
- ✅ **24시간 적응**: 실제 캐시 데이터 분포에 맞춰 자동 조정
- ✅ **안전성**: Edge case (캐시 1개, 모든 값 동일) 안전 처리
- ✅ **성능**: O(n) 복잡도, 할당량 초과 시에만 실행 (< 1ms)

#### 예시

```
현재 지표: US10Y 4.50%, DXY 105.0, BTC $95,000

캐시 A (2시간 전):  US10Y 4.45%, DXY 104.0, BTC $94,200
  → 유사도: 0.81, 최신성: 0.92 → 최종: 0.82

캐시 B (10시간 전): US10Y 4.49%, DXY 104.9, BTC $94,800
  → 유사도: 0.96, 최신성: 0.58 → 최종: 0.92 ✓ 선택!

캐시 C (20시간 전): US10Y 4.35%, DXY 103.5, BTC $93,000
  → 유사도: 0.65, 최신성: 0.17 → 최종: 0.60

결과: 캐시 B 선택 (더 오래되었지만 현재 상황과 가장 유사)
```

### Gemini 모델 선택 및 전환

사용자가 UI에서 직접 Gemini 모델을 선택할 수 있는 기능:

#### 지원 모델
- **gemini-2.5-flash** (기본값): 균형잡힌 성능과 속도
- **gemini-2.5-flash-lite**: 빠른 응답 속도 (경량 분석)
- **gemini-2.5-pro**: 고급 분석 품질 (상세한 인사이트)

#### 주요 특징
- **localStorage 지속성**: 선택한 모델이 브라우저에 저장되어 페이지 새로고침 후에도 유지
- **모델별 독립 캐싱**: 각 모델의 예측 결과가 별도로 캐싱되어 교차 오염 방지

#### 기술 구현
- **중앙 관리**: `lib/constants/gemini-models.ts`에서 모든 모델 설정 관리
- **타입 안전성**: TypeScript 타입 추론으로 컴파일 타임 검증
- **레이스 컨디션 방지**: React 상태 비동기 업데이트 문제 해결 (modelOverride 패턴)
- **초기 마운트 최적화**: isInitialMount ref로 중복 API 호출 방지

### AI 분석 (한국어)

Google Gemini API를 활용하여 9개 지표와 최신 뉴스를 종합 분석:
- **뉴스 기반 분석**: 최근 24시간 금융 뉴스를 AI 프롬프트에 포함하여 실시간 시장 이벤트 반영
  - 연준 정책 발표, 기업 실적, 지정학적 이슈 등 실제 뉴스를 바탕으로 한 분석
  - 뉴스 출처 명시 (Reuters, Bloomberg 등 실제 출처 인용)
- **심리 분석**: 강세(Bullish), 약세(Bearish), 중립(Neutral)
- **분석 내용**: 시장 상황에 대한 2-3문장 요약 (한국어, 뉴스 기반 인사이트 포함)
- **리스크**: 주요 위험 요소 3-4개 나열 (뉴스 이벤트와 지표 연계)
- **캐싱**: 동일한 지표 값 + 동일한 모델에 대해 24시간 캐시 재사용 (일별 데이터 주기에 맞춤)
- **Fallback 메커니즘 (Hybrid Min-Max 유사도)**:
  - API 한도 초과 시 **현재 지표와 가장 유사한** 24시간 내 **동일 모델** 캐시 자동 선택
  - 단순 최신 캐시가 아닌, 9개 지표 종합 유사도 기반 최적 매칭
  - 동적 정규화로 24시간 내 변동폭에 맞춰 정확한 유사도 계산
  - 모델별로 독립적인 Fallback 처리 (Flash 모델 한도 초과 시 Flash 캐시만 검색)
  - UI에 노란색 경고 배너로 Fallback 상태 표시
  - 타임스탬프에 "(과거 분석)" 라벨 추가
  - 메시지: "API 사용 한도가 초과되었습니다. 유사한 시장 상황의 분석을 표시합니다."
- **에러 처리**:
  - Fallback 캐시가 없을 경우 명확한 한국어 에러 메시지 표시
  - 에러 화면에서도 모델 선택기 활성화 (다른 모델로 전환 가능)
  - Retry 버튼으로 재시도 가능

## 기여

버그 리포트 및 기능 제안은 이슈를 통해 제출해주세요.

---

**최종 업데이트**: 2025-12-31
