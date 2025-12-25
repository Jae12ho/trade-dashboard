export interface HistoricalDataPoint {
  date: string;
  value: number;
}

export interface IndicatorData {
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
  unit?: string;
  history?: HistoricalDataPoint[];
}

export interface DashboardData {
  indicators: {
    // Core indicators
    us10yYield: IndicatorData;
    dxy: IndicatorData;
    highYieldSpread: IndicatorData;

    // New indicators (Phase 7)
    m2MoneySupply: IndicatorData;
    crudeOil: IndicatorData;
    copperGoldRatio: IndicatorData;

    // Market sentiment indicators
    pmi: IndicatorData;
    putCallRatio: IndicatorData;

    // Digital asset indicator (Phase 8)
    bitcoin: IndicatorData;
  };
  timestamp: string;
}

export interface FREDResponse {
  observations: Array<{
    date: string;
    value: string;
  }>;
}

export interface YahooFinanceQuote {
  chart: {
    result: Array<{
      meta: {
        regularMarketPrice: number;
        chartPreviousClose: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
        }>;
      };
    }>;
  };
}

export interface CoinGeckoSimplePrice {
  bitcoin: {
    usd: number;
    usd_24h_change: number;
    last_updated_at: number;
  };
}

export interface CoinGeckoMarketChart {
  prices: [number, number][]; // [timestamp, price]
}
