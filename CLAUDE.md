# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time financial market dashboard built with Next.js 16 (App Router) + React 19 + TypeScript. It aggregates 9 economic indicators from multiple external APIs (FRED, Yahoo Finance, CoinGecko) and provides AI-powered market analysis in Korean using Google Gemini.

**Key Technologies:**
- Next.js 16.1.1 with App Router (file-based routing)
- React 19.2.3 with client/server component split
- TypeScript 5 (strict mode)
- Tailwind CSS 4 (with dark mode support)
- Google Gemini API (gemini-2.5-flash) for AI analysis
- Recharts 3.6.0 for data visualization

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build production bundle
npm run build

# Run production server
npm start

# Run ESLint type checking
npm run lint
```

## Environment Setup

Create `.env.local` in project root with required API keys:

```bash
GEMINI_API_KEY=<your-key>              # https://makersuite.google.com/app/apikey
FRED_API_KEY=<your-key>                # https://fred.stlouisfed.org/docs/api/api_key.html
UPSTASH_REDIS_REST_URL=<your-url>      # https://console.upstash.com (Redis database)
UPSTASH_REDIS_REST_TOKEN=<your-token>  # REST API credentials from Upstash
```

Yahoo Finance and CoinGecko APIs require no authentication.

## Architecture Overview

### Data Flow Pattern

```
Client (Dashboard.tsx)
  ↓ fetch('/api/indicators')
Server API Route (/app/api/indicators/route.ts)
  ↓ getAllIndicators()
Indicator Fetch Functions (lib/api/indicators.ts)
  ↓ parallel Promise.all() for 9 indicators
External APIs (FRED, Yahoo Finance, CoinGecko)
  ↓ raw data responses
Data Transformation & Normalization
  ↓ IndicatorData with current/previous/history
Return to Client
  ↓ render in 3x3 grid
IndicatorCard + MiniChart components
```

### Key Design Patterns

1. **Server/Client Split**: Pages are server components, Dashboard is client component (`'use client'`)
2. **Adapter Factory**: Each external API has dedicated fetch function that returns normalized `{ current, previous, history }` format
3. **Parallel Aggregation**: `getAllIndicators()` uses `Promise.all()` to fetch 9 indicators concurrently
4. **Polling Pattern**: Dashboard auto-refreshes every 5 minutes via `setInterval`
5. **Force Dynamic**: API routes export `dynamic = 'force-dynamic'` to prevent caching

### Directory Structure

```
/app
  page.tsx                    # Home page (renders Dashboard)
  layout.tsx                  # Root layout with fonts & metadata
  globals.css                 # Tailwind imports + CSS variables
  /api
    /indicators
      route.ts                # GET endpoint - returns all 9 indicators
    /ai-prediction
      route.ts                # GET endpoint - returns Gemini AI analysis

/components
  Dashboard.tsx               # Main client component (state, fetching, layout)
  IndicatorCard.tsx           # Individual metric card display
  MiniChart.tsx               # Recharts line chart for 30-day trend
  AIPrediction.tsx            # AI sentiment & analysis display
  ThemeScript.tsx             # Dark mode initialization script

/lib
  /types
    indicators.ts             # TypeScript interfaces (single source of truth)
  /api
    indicators.ts             # External API fetch functions (FRED, Yahoo, CoinGecko)
    gemini.ts                 # Google Gemini API integration
  /cache
    gemini-cache-redis.ts     # Upstash Redis cache for Gemini responses (24h TTL)

/ai
  PLAN.md                     # Development plans (Phase 7, 8, 9)
  TO_DO.md                    # Task tracking
```

## The 9 Indicators

**Macro Indicators (4):**
1. US 10Y Yield - FRED: `DGS10`
2. US Dollar Index (DXY) - Yahoo Finance: `DX-Y.NYB`
3. High Yield Spread - FRED: `BAMLH0A0HYM2`
4. M2 Money Supply - FRED: `M2SL`

**Commodity & Asset Indicators (3):**
5. Crude Oil (WTI) - Yahoo Finance: `CL=F`
6. Copper/Gold Ratio - Yahoo Finance calculated: `HG=F / GC=F × 10000`
7. Bitcoin (BTC/USD) - CoinGecko: `bitcoin`

**Market Sentiment Indicators (2):**
8. Manufacturing Confidence - FRED: `BSCICP02USM460S` (OECD)
9. VIX (Fear Index) - Yahoo Finance: `^VIX`

## Adding New Indicators

To add a new indicator, follow this pattern:

1. **Add TypeScript interface** (if new API source):
   - Edit `lib/types/indicators.ts`
   - Add response type interface (e.g., `NewAPIResponse`)

2. **Create fetch function** in `lib/api/indicators.ts`:
   ```typescript
   async function fetchNewAPI(params): Promise<{
     current: number;
     previous: number;
     history: HistoricalDataPoint[];
   }> {
     // API call with Next.js caching
     const response = await fetch(url, {
       next: { revalidate: 300 } // 5-min cache
     });
     // Parse response and return normalized format
   }
   ```

3. **Create indicator getter**:
   ```typescript
   export async function getNewIndicator(): Promise<IndicatorData> {
     const { current, previous, history } = await fetchNewAPI();
     const change = current - previous;
     const changePercent = (change / previous) * 100;

     return {
       name: 'Display Name',
       symbol: 'SYMBOL',
       value: current,
       change,
       changePercent,
       lastUpdated: new Date().toISOString(),
       unit: 'unit', // optional
       history,
     };
   }
   ```

4. **Update `getAllIndicators()`**:
   - Add to `Promise.all()` array
   - Add to return object

5. **Update TypeScript interface**:
   - Edit `lib/types/indicators.ts`
   - Add new property to `DashboardData.indicators`

6. **Update Dashboard UI**:
   - Edit `components/Dashboard.tsx`
   - Add `<IndicatorCard indicator={data.indicators.newIndicator} />`

7. **Update AI prompt** (if relevant):
   - Edit `lib/api/gemini.ts`
   - Add indicator to prompt template

## API Integration Notes

### FRED API
- Endpoint: `https://api.stlouisfed.org/fred/series/observations`
- Auth: URL query param `?api_key=XXX`
- Response: `{ observations: [{ date, value }, ...] }`
- Sorted descending, latest first
- Cache: 5-minute ISR revalidation
- Handle missing data: Filter out `value === '.'`

### Yahoo Finance API
- Endpoint: `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}`
- Auth: None required
- Query: `?range=3mo&interval=1d`
- Response: Nested structure with `chart.result[0].meta` and `indicators.quote[0]`
- Current price: `meta.regularMarketPrice`
- Previous close: `meta.chartPreviousClose`
- Historical: Match `timestamp[]` with `close[]` arrays
- Cache: 5-minute ISR
- **Known issue**: Rate limiting can occur, mitigated by Next.js caching

### CoinGecko API
- Current Price: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
- Historical: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=40&interval=daily`
- Auth: None required
- Cache: Current 5-min, historical 1-hour
- Calculate `previous` from `current / (1 + usd_24h_change / 100)`

### Google Gemini API
- SDK: `@google/genai` (new unified SDK)
- Model: `gemini-2.5-flash`
- **Google Search Integration**: AI automatically searches for official announcements (Fed, Trump, economic data)
- Response language: Korean (specified in prompt)
- Output format: JSON with `{ sentiment, reasoning, risks }`
- Parse response: Extract JSON via regex `/{[\s\S]*}/`
- Include all 9 indicators in formatted prompt
- Rate limits: 15 requests/min, 1,500 requests/day (free tier)

## Calculated Indicators

**Copper/Gold Ratio:**
- Requires fetching both `HG=F` (Copper Futures) and `GC=F` (Gold Futures)
- Formula: `(copper / gold) × 100`
- Apply to both current/previous and historical data
- Match historical dates when calculating ratio arrays
- Display unit: `×100`

## Caching Strategy

- **External API calls**: 5-minute ISR via `{ next: { revalidate: 300 } }`
- **Historical data**: 1-hour ISR for less frequent updates
- **API routes**: Force dynamic (`export const dynamic = 'force-dynamic'`)
- **Client polling**: Dashboard refetches every 5 minutes

## TypeScript Patterns

- All interfaces centralized in `lib/types/indicators.ts`
- Strict null checking enabled
- Path alias `@/*` maps to project root
- Use type inference where possible
- Export interfaces that cross file boundaries
- Use `Promise<Type>` for async functions

## UI/UX Patterns

- **Responsive grid**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (mobile → tablet → desktop)
- **Loading states**: Spinner with descriptive text
- **Error states**: Icon + message + retry button
- **Color coding**: Green for positive changes, red for negative
- **Dark mode**: Use `dark:` prefix for all Tailwind classes
- **Charts**: 30-day trend lines, color matches change direction
- **Updates**: Display last update timestamp in human-readable format

## AI Prediction Component

- Fetches from `/api/ai-prediction` after Dashboard renders
- Independent loading/error states (don't block indicator display)
- Sentiment badge: 📈 bullish (green), 📉 bearish (red), ➡️ neutral (gray)
- Reasoning: Multi-sentence analysis in Korean
- Risks: Bulleted list of 3-4 key concerns
- Manual refresh button available
- Generated timestamp shown in footer

## Common Tasks

### Debugging API Issues

1. Check server logs in terminal running `npm run dev`
2. Verify environment variables in `.env.local`
3. Test external API directly with curl/browser
4. Check Next.js cache: delete `.next` folder and rebuild
5. Inspect Network tab in browser DevTools for API responses

### Handling API Rate Limits

- Yahoo Finance: Increase `revalidate` time or switch to alternative data source
- CoinGecko: Free tier limits ~10-50 calls/min (should be sufficient)
- FRED: 120 requests/60 seconds (generous, unlikely to hit)
- Gemini: 15 requests/min, 1,500 requests/day on free tier (monitor usage)

### Testing Changes

1. Run `npm run dev` and verify in browser
2. Test both light and dark modes
3. Test responsive layouts (mobile, tablet, desktop)
4. Check all 9 indicators load successfully
5. Verify AI prediction generates properly
6. Monitor console for errors or warnings
7. Run `npm run lint` before committing

## Important Notes

- **Language**: AI analysis responses are in Korean (hardcoded in prompt)
- **Historical data**: 30-day lookback for all indicators
- **Calculated indicators**: Copper/Gold ratio requires matching date arrays
- **Error handling**: All fetch functions use try-catch with console.error logging
- **No test suite**: Project currently has no automated tests
- **No deployment config**: Deployment strategy not yet defined

## Multi-Period Change Calculations

**Critical Implementation Detail**: The dashboard displays 1D, 7D, and 30D (or 1M, 2M, 3M for monthly data) change percentages.

### Calculation Functions (lib/api/indicators.ts)

1. **`calculatePeriodChange`** - Entry-based calculation
   - Used for: 1D changes (last trading day)
   - Used for: Monthly data (M2, MFG) - 1M/2M/3M periods
   - Logic: `history[length - 1 - periodsAgo]` (index-based)

2. **`calculateCalendarDayChange`** - Calendar-based calculation
   - Used for: 7D and 30D changes for daily trading data
   - Logic: Finds data point closest to exact calendar date N days ago
   - Handles weekends/holidays by finding nearest trading day (±3 day tolerance)

### Data Frequency Handling

| Indicator | Data Frequency | Periods | Chart Display |
|-----------|----------------|---------|---------------|
| US10Y, HYS | Daily (trading days) | 1D, 7D, 30D | Last 30 calendar days |
| DXY, OIL, Cu/Au, VIX | Daily (trading days) | 1D, 7D, 30D | Last 30 calendar days |
| BTC | Daily (all days) | 1D, 7D, 30D | Last 30 calendar days |
| M2 | Monthly | 1M, 2M, 3M | Last 12 months |
| MFG | Monthly | 1M, 2M, 3M | Last 12 months |

### Chart Filtering (components/IndicatorCard.tsx)

The `getFilteredHistory` function ensures chart data matches the period labels:
- **Daily indicators**: Filters by calendar date (last 30 days)
- **Monthly indicators**: Uses `.slice(-12)` for last 12 entries

**Important**: Chart color is determined by 30D (or 3M) change direction, ensuring visual consistency with the displayed trend.

## Gemini API Caching (Market Analysis Only)

**Cache Implementation** (lib/cache/gemini-cache-redis.ts):
- **Type**: Upstash Redis (persistent, serverless-optimized)
- **Storage**: Global distributed cache shared across all function instances
- **TTL**: 24 hours (86,400 seconds)
  - Aligns with daily indicator update cycle
  - 7 of 9 indicators update daily (trading days only)
  - Maximizes fallback stability for quota errors
  - Covers weekends (Friday data available through Saturday)
- **Key Strategy**:
  - Primary: `gemini:prediction:{hash}` (exact data match)
  - Fallback: `gemini:fallback:{timestamp}` (latest prediction retrieval)
  - Hash: JSON of rounded indicator values (improves cache hit rate)
- **Behavior**:
  - Cache persists across serverless cold starts
  - All Vercel function instances share same Redis cache
  - Automatic TTL management by Redis
  - Automatic cleanup keeps last 10 fallback entries
  - HTTPS REST API (no connection pooling needed)

**Why Upstash Redis Instead of In-Memory**:
- **Problem**: Vercel serverless functions run in isolated containers
- **Issue**: In-memory Map only exists within single instance
- **Result**: Cache not shared between instances, fallback fails in production
- **Solution**: Upstash Redis provides persistent, globally accessible cache
- **Benefit**: Fallback works reliably in production environment

**Fallback Mechanism**:
- When Gemini API quota is exceeded:
  1. `getLatestValidPrediction()` searches all `gemini:fallback:*` keys
  2. Sorts by timestamp (newest first)
  3. Returns most recent prediction within TTL (24 hours)
  4. UI displays with `isFallback: true` and yellow warning banner
- **Advantages over in-memory**:
  - Works across all serverless instances
  - Survives cold starts and deployments
  - Persists even when no traffic for hours
- **Important**: Fallback requires at least one successful API call within 24h

**Error Handling**:
- API quota/rate limit errors detected by keywords: `quota`, `rate limit`, `429`, `resource exhausted`
- Returns HTTP 429 with Korean message: "API 사용 한도가 초과되었습니다."
- If fallback cache available: Returns cached prediction with warning (HTTP 200)
- If no fallback: Returns error response (HTTP 429)
- UI displays specific quota exceeded message vs generic errors

**Environment Variables**:
```bash
UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

**Free Tier Limits** (Upstash):
- 10,000 commands/day (300,000/month)
- 256 MB storage
- Sufficient for ~2,000-3,000 user requests/day

## Data Collection Limits

To ensure accurate multi-period calculations, APIs fetch more data than displayed:

| API | Parameter | Data Points | Reason |
|-----|-----------|-------------|--------|
| FRED | `limit=40` | 40 trading days | Need 31+ for 30D calculation |
| Yahoo Finance | `range=3mo` | ~60-90 days | Trading days only, need buffer |
| CoinGecko | `days=40` | 40 days | All days, need buffer for 30D |
| M2 (FRED) | `limit=40` | 40 months | Monthly data, need 4+ for 3M |
| MFG (FRED) | `limit=60` | 60 months | Monthly data, extended history |

## Development History

See `/ai/PLAN.md` for detailed development plans:
- Phase 7: Added M2 Money Supply, Crude Oil, Copper/Gold Ratio, PMI, VIX
- Phase 8: Added Bitcoin (BTC/USD) via CoinGecko API
- Phase 9: Multi-period change percentages (1D/7D/30D) with calendar-based calculation
- Phase 10: Migrated Gemini cache to Upstash Redis for serverless persistence

## Quirks & Known Issues

1. **Yahoo Finance rate limiting**: Can occur during heavy testing, mitigated by caching
2. **A/D Line removed**: NYSE Advance-Decline Line not available via free APIs
3. **PMI data**: Uses OECD Manufacturing Confidence instead of ISM PMI (DBnomics data was corrupted)
4. **Put/Call Ratio**: VIX used as proxy (CBOE data requires paid subscription)
5. **Copper/Gold display**: Multiplied by 10000 for readability (1.24 instead of 0.000124)
6. **Negative value percentages**: M2 and MFG can have negative base values; `Math.abs(pastValue)` used in denominator to ensure correct sign
7. **Cache persistence**: Gemini cache uses Upstash Redis; persists across deployments and serverless cold starts with 24h TTL
