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
- **Google Gemini 2.5 Flash**: 고도화된 프롬프트 엔지니어링 적용
- **Google Search 통합**: Fed, 정부 공식 발표 자동 검색
- **3-Tier 가중치 시스템**: 지표(70%) + 공식발표(25%) + 논평(5%)
- **💬 지표별 AI 인사이트**: 각 지표의 변화 원인 및 예측 영향 분석 (1-2문장)
- **모델 선택**: gemini-2.5-flash / gemini-2.5-flash-lite 중 선택
- **24시간 캐싱**: Upstash Redis 기반 영구 캐시 + Fallback 메커니즘

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
│   ├── cache/          # Redis 캐싱 (gemini-cache-redis.ts)
│   └── types/          # TypeScript 타입 정의
└── .env.local          # 환경 변수 (git 제외)
```

## 주요 특징

### AI 프롬프트 엔지니어링

**3-Tier 가중치 시스템**으로 분석 품질 향상:
- **PRIMARY (70%)**: 9개 지표의 다기간 트렌드 분석
- **SECONDARY (25%)**: Fed/정부 공식 발표 (Google Search 자동 검색)
- **TERTIARY (5%)**: 애널리스트 의견

**지표별 AI 인사이트**:
- 각 지표의 변화 원인과 예측 영향을 1-2문장으로 설명
- 단일 API 호출로 9개 지표 모두 분석 (추가 비용 없음)
- 한국어로 제공, 차트 하단에 표시

### 캐싱 전략

- **지표 데이터**: Next.js Data Cache 5분 (fetch revalidation)
- **AI 분석**: Upstash Redis 25시간 캐싱 (모델별 독립)
- **Fallback**: API 한도 초과 시 유사도 기반 캐시 자동 선택

---

**최종 업데이트**: 2026-01-22
