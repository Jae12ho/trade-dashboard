# 📊 Trade Dashboard

실시간 금융 시장 지표 모니터링 및 AI 기반 시장 분석 대시보드

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

- 🤖 **AI 기반 시장 분석**
  - Google Gemini API (gemini-2.5-flash)를 활용한 종합 시장 분석
  - Upstash Redis 기반 24시간 영구 캐싱으로 API 효율성 향상
  - 서버리스 환경에서 모든 인스턴스 간 캐시 공유
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

# Upstash Redis (for persistent Gemini cache in serverless environment)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token_here
```

**API 키 발급 방법:**
- **GEMINI_API_KEY**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급
- **FRED_API_KEY**: [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html)에서 무료 발급
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
| Copper/Gold Ratio | 구리/금 비율 (×100) | Yahoo Finance | HG=F / GC=F | 일별 |
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
│   │   └── indicators.ts         # TypeScript 타입 정의
│   ├── api/
│   │   ├── indicators.ts         # 외부 API 연동 함수
│   │   └── gemini.ts             # Gemini AI API 연동
│   └── cache/
│       └── gemini-cache-redis.ts # Upstash Redis 캐시 (24h TTL)
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
│  └─ /api/ai-prediction 호출                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js API Routes (서버)                               │
│  ├─ getAllIndicators() - 9개 지표 병렬 조회                 │
│  └─ generateMarketPrediction() - AI 분석 생성             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  외부 API                                                │
│  ├─ FRED API (매크로 지표)                                 │
│  ├─ Yahoo Finance API (자산 가격)                         │
│  ├─ CoinGecko API (암호화폐)                              │
│  └─ Google Gemini API (AI 분석)                          │
└─────────────────────────────────────────────────────────┘
```

## 캐싱 전략

### 외부 API 캐싱
- **지표 데이터**: Next.js ISR 5분 캐싱 (`revalidate: 300`)
- **히스토리 데이터**: 1시간 캐싱 (변동이 적은 과거 데이터)
- **API 라우트**: 강제 동적 렌더링 (`dynamic = 'force-dynamic'`)
- **클라이언트 폴링**: 5분마다 자동 새로고침

### Gemini AI 캐싱 (lib/cache/gemini-cache-redis.ts)
- **저장 방식**: Upstash Redis (영구적, 서버리스 최적화)
- **TTL**: 24시간 (일별 데이터 업데이트 주기에 맞춤, Redis가 자동 관리)
- **캐시 키 전략**:
  - Primary: `gemini:prediction:{hash}` (정확한 데이터 매칭)
  - Fallback: `gemini:fallback:{timestamp}` (최신 예측 조회)
- **장점**:
  - 모든 서버리스 인스턴스 간 캐시 공유
  - Cold start 후에도 캐시 유지
  - 프로덕션 환경에서 Fallback 메커니즘 안정적 작동
  - HTTPS REST API로 연결 풀 불필요
- **Fallback 메커니즘**: API 한도 초과 시 최근 24시간 내 캐시 자동 사용
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
Copper/Gold Ratio = (Copper Price / Gold Price) × 100
```

가독성을 위해 100을 곱하여 표시 (예: 0.001238 → 0.124×100)

### AI 분석 (한국어)

Google Gemini API (gemini-2.5-flash)를 활용하여 9개 지표를 종합 분석:
- **심리 분석**: 강세(Bullish), 약세(Bearish), 중립(Neutral)
- **분석 내용**: 시장 상황에 대한 3-4문장 요약 (한국어)
- **리스크**: 주요 위험 요소 3-4개 나열
- **캐싱**: 동일한 지표 값에 대해 24시간 캐시 재사용 (일별 데이터 주기에 맞춤)
- **Fallback 메커니즘**:
  - API 한도 초과 시 최근 24시간 내 캐시된 분석 자동 제공
  - UI에 노란색 경고 배너로 Fallback 상태 표시
  - 타임스탬프에 "(과거 분석)" 라벨 추가
- **에러 처리**:
  - Fallback 캐시가 없을 경우 명확한 한국어 에러 메시지 표시
  - Retry 버튼으로 재시도 가능

## 알려진 이슈 및 제한사항

### API 제한
1. **Yahoo Finance 속도 제한**: 과도한 요청 시 제한될 수 있음 (Next.js 캐싱으로 완화)
2. **Gemini API 무료 할당량**:
   - 분당 15회 요청 제한
   - 일일 1,500회 요청 제한
   - 한도 초과 시 자동으로 최근 24시간 내 캐시 사용 (Fallback)
   - Fallback 캐시가 없을 경우 "API 사용 한도가 초과되었습니다" 에러 메시지 표시
3. **CoinGecko 무료 티어**: 분당 10-50회 호출 제한 (5분 갱신으로 충분)

### 데이터 특성
4. **캐시 영구성**: Gemini AI 캐시는 Upstash Redis를 사용하여 서버 재시작/배포 후에도 24시간 동안 유지됨
5. **월별 데이터 지연**: M2와 Manufacturing Confidence는 월 단위로 업데이트되어 최신성이 떨어질 수 있음
6. **거래일 vs 달력일**: 일별 지표는 거래일만 데이터가 존재하므로 주말/공휴일은 공백

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 기여

버그 리포트 및 기능 제안은 이슈를 통해 제출해주세요.

---

**최종 업데이트**: 2025-12-27
