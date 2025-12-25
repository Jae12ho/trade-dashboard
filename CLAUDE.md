# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a real-time financial market dashboard built with Next.js 16 (App Router) + React 19 + TypeScript. It aggregates 9 economic indicators from multiple external APIs (FRED, Yahoo Finance, CoinGecko) and provides AI-powered market analysis in Korean using Google Gemini.

**Key Technologies:**
- Next.js 16.1.1 with App Router (file-based routing)
- React 19.2.3 with client/server component split
- TypeScript 5 (strict mode)
- Tailwind CSS 4 (with dark mode support)
- Google Gemini API (gemini-2.5-flash-lite) for AI analysis
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
GEMINI_API_KEY=<your-key>     # https://makersuite.google.com/app/apikey
FRED_API_KEY=<your-key>       # https://fred.stlouisfed.org/docs/api/api_key.html
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

/lib
  /types
    indicators.ts             # TypeScript interfaces (single source of truth)
  /api
    indicators.ts             # External API fetch functions (FRED, Yahoo, CoinGecko)
    gemini.ts                 # Google Gemini API integration

/ai
  PLAN.md                     # Development plans (Phase 7, Phase 8 docs)
```

## The 9 Indicators

**Macro Indicators (4):**
1. US 10Y Yield - FRED: `DGS10`
2. US Dollar Index (DXY) - Yahoo Finance: `DX-Y.NYB`
3. High Yield Spread - FRED: `BAMLH0A0HYM2`
4. M2 Money Supply - FRED: `M2SL`

**Commodity & Asset Indicators (3):**
5. Crude Oil (WTI) - Yahoo Finance: `CL=F`
6. Copper/Gold Ratio - Yahoo Finance calculated: `HG=F / GC=F × 100`
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
- Query: `?range=1mo&interval=1d`
- Response: Nested structure with `chart.result[0].meta` and `indicators.quote[0]`
- Current price: `meta.regularMarketPrice`
- Previous close: `meta.chartPreviousClose`
- Historical: Match `timestamp[]` with `close[]` arrays
- Cache: 5-minute ISR
- **Known issue**: Rate limiting can occur, mitigated by Next.js caching

### CoinGecko API
- Current Price: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true`
- Historical: `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily`
- Auth: None required
- Cache: Current 5-min, historical 1-hour
- Calculate `previous` from `current / (1 + usd_24h_change / 100)`

### Google Gemini API
- Model: `gemini-2.5-flash-lite`
- Response language: Korean (specified in prompt)
- Output format: JSON with `{ sentiment, reasoning, risks }`
- Parse response: Extract JSON via regex `/{[\s\S]*}/`
- Include all 9 indicators in formatted prompt

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
- Gemini: 20 requests/day on free tier (monitor usage)

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

## Development History

See `/ai/PLAN.md` for detailed development plans:
- Phase 7: Added M2 Money Supply, Crude Oil, Copper/Gold Ratio, PMI, VIX
- Phase 8: Added Bitcoin (BTC/USD) via CoinGecko API

## Quirks & Known Issues

1. **Yahoo Finance rate limiting**: Can occur during heavy testing, mitigated by caching
2. **A/D Line removed**: NYSE Advance-Decline Line not available via free APIs
3. **PMI data**: Uses OECD Manufacturing Confidence instead of ISM PMI (DBnomics data was corrupted)
4. **Put/Call Ratio**: VIX used as proxy (CBOE data requires paid subscription)
5. **Copper/Gold display**: Multiplied by 100 for readability (0.124 instead of 0.001238)
