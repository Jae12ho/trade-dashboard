# 📊 Trade Dashboard

실시간 금융 시장 지표 모니터링 및 AI 기반 시장 분석 대시보드

## 프로젝트 소개

Trade Dashboard는 9개의 핵심 경제 지표를 실시간으로 모니터링하고, Google Gemini AI를 활용한 시장 분석을 제공하는 웹 애플리케이션입니다. 매크로 경제 지표, 원자재 가격, 시장 심리 지표를 한눈에 파악할 수 있으며, 각 지표의 30일 추세를 시각화하여 제공합니다.

## 주요 기능

- ✅ **9개 핵심 지표 실시간 모니터링**
  - 매크로 경제 지표 4개 (US 10Y 국채 수익률, 달러 인덱스, 하이일드 스프레드, M2 통화량)
  - 원자재 및 자산 지표 3개 (원유, 구리/금 비율, 비트코인)
  - 시장 심리 지표 2개 (제조업 신뢰도, VIX 공포 지수)

- 📈 **30일 추세 차트**
  - 각 지표의 최근 30일 데이터를 라인 차트로 시각화
  - 상승/하락 추세에 따른 색상 구분 (녹색/빨간색)

- 🤖 **AI 기반 시장 분석**
  - Google Gemini API를 활용한 종합 시장 분석
  - 한국어로 제공되는 시장 전망 및 리스크 분석
  - 강세(Bullish) / 약세(Bearish) / 중립(Neutral) 심리 분석

### 구현 예정
- 🔄 **자동 업데이트**
  - 5분마다 자동으로 최신 데이터 갱신
  - 수동 새로고침 기능 제공

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
GEMINI_API_KEY=your_gemini_api_key_here
FRED_API_KEY=your_fred_api_key_here
```

**API 키 발급 방법:**
- **GEMINI_API_KEY**: [Google AI Studio](https://makersuite.google.com/app/apikey)에서 발급
- **FRED_API_KEY**: [FRED API](https://fred.stlouisfed.org/docs/api/api_key.html)에서 무료 발급

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

| 지표 | 설명 | 데이터 출처 | API 심볼 |
|------|------|-------------|----------|
| US 10Y Yield | 미국 10년물 국채 수익률 | FRED | DGS10 |
| DXY | 미국 달러 인덱스 | Yahoo Finance | DX-Y.NYB |
| High Yield Spread | 하이일드 채권 스프레드 | FRED | BAMLH0A0HYM2 |
| M2 Money Supply | M2 통화 공급량 | FRED | M2SL |

### 🛢️ 원자재 및 자산 지표 (3개)

| 지표 | 설명 | 데이터 출처 | API 심볼 |
|------|------|-------------|----------|
| Crude Oil (WTI) | 서부 텍사스유 현물 가격 | Yahoo Finance | CL=F |
| Copper/Gold Ratio | 구리/금 비율 (×100) | Yahoo Finance | HG=F / GC=F |
| Bitcoin (BTC/USD) | 비트코인 가격 | CoinGecko | bitcoin |

### 📊 시장 심리 지표 (2개)

| 지표 | 설명 | 데이터 출처 | API 심볼 |
|------|------|-------------|----------|
| Manufacturing Confidence | OECD 제조업 신뢰도 지수 | FRED | BSCICP02USM460S |
| VIX (Fear Index) | 변동성 지수 (공포 지수) | Yahoo Finance | ^VIX |

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
│   └── AIPrediction.tsx          # AI 분석 표시
│
├── lib/                          # 유틸리티 및 API
│   ├── types/
│   │   └── indicators.ts         # TypeScript 타입 정의
│   └── api/
│       ├── indicators.ts         # 외부 API 연동 함수
│       └── gemini.ts             # Gemini AI API 연동
│
├── ai/
│   └── PLAN.md                   # 개발 계획 문서
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
│  클라이언트 (브라우저)                                    │
│  Dashboard 컴포넌트                                      │
│  ├─ /api/indicators 호출 (5분마다)                       │
│  └─ /api/ai-prediction 호출                             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Next.js API Routes (서버)                              │
│  ├─ getAllIndicators() - 9개 지표 병렬 조회             │
│  └─ generateMarketPrediction() - AI 분석 생성           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  외부 API                                                │
│  ├─ FRED API (매크로 지표)                              │
│  ├─ Yahoo Finance API (자산 가격)                       │
│  ├─ CoinGecko API (암호화폐)                            │
│  └─ Google Gemini API (AI 분석)                         │
└─────────────────────────────────────────────────────────┘
```

## 캐싱 전략

- **외부 API 호출**: Next.js ISR 5분 캐싱 (`revalidate: 300`)
- **히스토리 데이터**: 1시간 캐싱 (변동이 적은 과거 데이터)
- **API 라우트**: 강제 동적 렌더링 (`dynamic = 'force-dynamic'`)
- **클라이언트 폴링**: 5분마다 자동 새로고침

## 주요 특징

### 계산 지표: 구리/금 비율

구리 선물 (HG=F)과 금 선물 (GC=F)을 각각 조회하여 비율을 계산합니다:

```
Copper/Gold Ratio = (Copper Price / Gold Price) × 100
```

가독성을 위해 100을 곱하여 표시 (예: 0.001238 → 0.124×100)

### AI 분석 (한국어)

Google Gemini API를 활용하여 9개 지표를 종합 분석:
- **심리 분석**: 강세(Bullish), 약세(Bearish), 중립(Neutral)
- **분석 내용**: 시장 상황에 대한 3-4문장 요약 (한국어)
- **리스크**: 주요 위험 요소 3-4개 나열

## 알려진 이슈 및 제한사항

1. **Yahoo Finance 속도 제한**: 과도한 요청 시 제한될 수 있음 (Next.js 캐싱으로 완화)
2. **Gemini API 무료 할당량**: 하루 20회 요청 제한 (모니터링 필요)
3. **CoinGecko 무료 티어**: 분당 10-50회 호출 제한 (5분 갱신으로 충분)

## 라이선스

이 프로젝트는 개인 프로젝트입니다.

## 기여

버그 리포트 및 기능 제안은 이슈를 통해 제출해주세요.

---

**개발자**: 양재호
**최종 업데이트**: 2025-12-25
