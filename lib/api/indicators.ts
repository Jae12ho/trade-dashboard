import { IndicatorData, FREDResponse, YahooFinanceQuote, HistoricalDataPoint, CoinGeckoSimplePrice, CoinGeckoMarketChart } from '../types/indicators';

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * Calculate change and change percentage for a given period
 * @param current - Current value
 * @param history - Historical data points (sorted chronologically, oldest first)
 * @param daysAgo - Number of days to look back
 * @returns Object with change and changePercent, or undefined if data unavailable
 */
function calculatePeriodChange(
  current: number,
  history: HistoricalDataPoint[],
  daysAgo: number
): { change: number | undefined; changePercent: number | undefined } {
  // Data validation
  if (!history || history.length === 0) {
    return { change: undefined, changePercent: undefined };
  }

  // Find the closest data point to daysAgo
  // history is sorted chronologically (oldest first)
  const targetIndex = Math.max(0, history.length - 1 - daysAgo);
  const pastDataPoint = history[targetIndex];

  if (!pastDataPoint || pastDataPoint.value === undefined) {
    return { change: undefined, changePercent: undefined };
  }

  const pastValue = pastDataPoint.value;
  const change = current - pastValue;
  const changePercent = (change / pastValue) * 100;

  return { change, changePercent };
}

async function fetchFREDData(seriesId: string, limit: number = 30): Promise<{ current: number; previous: number; history: HistoricalDataPoint[] }> {
  const url = new URL(FRED_BASE_URL);
  url.searchParams.append('series_id', seriesId);
  url.searchParams.append('api_key', FRED_API_KEY || '');
  url.searchParams.append('file_type', 'json');
  url.searchParams.append('sort_order', 'desc');
  url.searchParams.append('limit', limit.toString());

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`FRED API error: ${response.statusText}`);
  }

  const data: FREDResponse = await response.json();

  if (!data.observations || data.observations.length < 2) {
    throw new Error('Insufficient data from FRED API');
  }

  const current = parseFloat(data.observations[0].value);
  const previous = parseFloat(data.observations[1].value);

  const history: HistoricalDataPoint[] = data.observations
    .reverse()
    .filter(obs => obs.value !== '.')
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
    }));

  return { current, previous, history };
}

async function fetchYahooFinanceData(symbol: string): Promise<{ current: number; previous: number; history: HistoricalDataPoint[] }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;

  const response = await fetch(url, { next: { revalidate: 300 } });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.statusText}`);
  }

  const data: YahooFinanceQuote = await response.json();

  if (!data.chart?.result?.[0]) {
    throw new Error('Invalid response from Yahoo Finance API');
  }

  const result = data.chart.result[0];
  const current = result.meta.regularMarketPrice;
  const previous = result.meta.chartPreviousClose;

  // Extract historical data
  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  const history: HistoricalDataPoint[] = timestamps
    .map((timestamp, index) => {
      const close = closes[index];
      if (close === null || close === undefined) return null;

      return {
        date: new Date(timestamp * 1000).toISOString().split('T')[0],
        value: close,
      };
    })
    .filter((point): point is HistoricalDataPoint => point !== null);

  return { current, previous, history };
}

export async function getUS10YYield(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchFREDData('DGS10');
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'US 10Y Yield',
      symbol: 'US10Y',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: '%',
      history,
    };
  } catch (error) {
    console.error('Error fetching US 10Y Yield:', error);
    throw error;
  }
}

export async function getDXY(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchYahooFinanceData('DX-Y.NYB');
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'US Dollar Index',
      symbol: 'DXY',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      history,
    };
  } catch (error) {
    console.error('Error fetching DXY:', error);
    throw error;
  }
}

export async function getHighYieldSpread(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchFREDData('BAMLH0A0HYM2');
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'High Yield Spread',
      symbol: 'HYS',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: 'bps',
      history,
    };
  } catch (error) {
    console.error('Error fetching High Yield Spread:', error);
    throw error;
  }
}

export async function getM2MoneySupply(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchFREDData('M2SL', 30);
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'M2 Money Supply',
      symbol: 'M2',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: 'Billion $',
      history,
    };
  } catch (error) {
    console.error('Error fetching M2 Money Supply:', error);
    throw error;
  }
}

export async function getCrudeOil(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchYahooFinanceData('CL=F');
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'Crude Oil (WTI)',
      symbol: 'OIL',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: '$/barrel',
      history,
    };
  } catch (error) {
    console.error('Error fetching Crude Oil:', error);
    throw error;
  }
}

export async function getCopperGoldRatio(): Promise<IndicatorData> {
  try {
    // Fetch both copper and gold futures data in parallel
    const [copper, gold] = await Promise.all([
      fetchYahooFinanceData('HG=F'), // Copper Futures
      fetchYahooFinanceData('GC=F'), // Gold Futures
    ]);

    // Calculate current ratio (multiply by 100 for readability)
    // Standard practice: (Copper price / Gold price) × 100
    const currentRatio = copper.current / gold.current;
    const previousRatio = copper.previous / gold.previous;

    const current = currentRatio * 100;
    const previous = previousRatio * 100;
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // Calculate historical ratio by matching dates
    const history: HistoricalDataPoint[] = [];
    if (copper.history && gold.history) {
      const minLength = Math.min(copper.history.length, gold.history.length);
      for (let i = 0; i < minLength; i++) {
        // Match dates to ensure accurate ratio calculation
        if (copper.history[i].date === gold.history[i].date) {
          history.push({
            date: copper.history[i].date,
            value: (copper.history[i].value / gold.history[i].value) * 100,
          });
        }
      }
    }

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'Copper/Gold Ratio',
      symbol: 'Cu/Au',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: '×100',
      history,
    };
  } catch (error) {
    console.error('Error fetching Copper/Gold Ratio:', error);
    throw error;
  }
}

async function fetchCoinGeckoPrice(): Promise<{
  current: number;
  previous: number;
  history: HistoricalDataPoint[];
}> {
  // Fetch current price with 24h change
  const priceUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true';

  const priceResponse = await fetch(priceUrl, {
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!priceResponse.ok) {
    throw new Error(`CoinGecko API error: ${priceResponse.statusText}`);
  }

  const priceData: CoinGeckoSimplePrice = await priceResponse.json();

  const current = priceData.bitcoin.usd;
  const changePercent = priceData.bitcoin.usd_24h_change;

  // Calculate previous price from 24h change
  const previous = current / (1 + changePercent / 100);

  // Fetch 30-day historical data
  const chartUrl = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily';

  const chartResponse = await fetch(chartUrl, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!chartResponse.ok) {
    throw new Error(`CoinGecko chart API error: ${chartResponse.statusText}`);
  }

  const chartData: CoinGeckoMarketChart = await chartResponse.json();

  // Convert to our HistoricalDataPoint format
  const history: HistoricalDataPoint[] = chartData.prices.map(([timestamp, price]) => ({
    date: new Date(timestamp).toISOString().split('T')[0],
    value: price,
  }));

  return { current, previous, history };
}

export async function getBitcoin(): Promise<IndicatorData> {
  try {
    const { current, previous, history } = await fetchCoinGeckoPrice();
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'Bitcoin (BTC/USD)',
      symbol: 'BTC',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: '$',
      history,
    };
  } catch (error) {
    console.error('Error fetching Bitcoin:', error);
    throw error;
  }
}

export async function getPMI(): Promise<IndicatorData> {
  try {
    // Note: Using OECD Business Confidence Indicator as ISM PMI alternative
    // ISM PMI removed from FRED in 2016, DBnomics has corrupted data (showing 10 vs actual ~48)
    // BSCICP02USM460S is OECD Manufacturing Confidence Indicator for US
    const { current, previous, history } = await fetchFREDData('BSCICP02USM460S', 30);
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'Manufacturing Confidence (OECD)',
      symbol: 'MFG',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      history,
    };
  } catch (error) {
    console.error('Error fetching PMI:', error);
    throw error;
  }
}

export async function getPutCallRatio(): Promise<IndicatorData> {
  try {
    // Note: Using VIX as market sentiment proxy
    // CBOE Put/Call Ratio CSV data only available until 2019-10-04
    // Current P/C data requires paid CBOE DataShop subscription
    // VIX (fear index) serves as good sentiment indicator alternative
    // High VIX (~30+) = high fear/put buying, Low VIX (~15-) = low fear/call buying
    const { current, previous, history } = await fetchYahooFinanceData('^VIX');
    const change = current - previous;
    const changePercent = (change / previous) * 100;

    // 7-day change
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 7);

    // 30-day change
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 30);

    return {
      name: 'VIX (Market Fear Index)',
      symbol: 'VIX',
      value: current,
      change,
      changePercent,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      history,
    };
  } catch (error) {
    console.error('Error fetching VIX:', error);
    throw error;
  }
}

export async function getAllIndicators() {
  const [
    us10yYield,
    dxy,
    highYieldSpread,
    m2MoneySupply,
    crudeOil,
    copperGoldRatio,
    pmi,
    putCallRatio,
    bitcoin,
  ] = await Promise.all([
    getUS10YYield(),
    getDXY(),
    getHighYieldSpread(),
    getM2MoneySupply(),
    getCrudeOil(),
    getCopperGoldRatio(),
    getPMI(),
    getPutCallRatio(),
    getBitcoin(),
  ]);

  return {
    us10yYield,
    dxy,
    highYieldSpread,
    m2MoneySupply,
    crudeOil,
    copperGoldRatio,
    pmi,
    putCallRatio,
    bitcoin,
  };
}
