import { IndicatorData, FREDResponse, YahooFinanceQuote, HistoricalDataPoint, CoinGeckoSimplePrice, CoinGeckoMarketChart } from '../types/indicators';

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

/**
 * Calculate change and change percentage for a given period (entry-based)
 * Used for: 1D changes and monthly data (M2, MFG)
 * @param current - Current value
 * @param history - Historical data points (sorted chronologically, oldest first)
 * @param periodsAgo - Number of entries to look back
 * @returns Object with change and changePercent, or undefined if data unavailable
 */
function calculatePeriodChange(
  current: number,
  history: HistoricalDataPoint[],
  periodsAgo: number
): { change: number | undefined; changePercent: number | undefined } {
  // Data validation
  if (!history || history.length === 0) {
    return { change: undefined, changePercent: undefined };
  }

  // Check if we have enough data for the requested period
  if (history.length <= periodsAgo) {
    return { change: undefined, changePercent: undefined };
  }

  // Find the data point from periodsAgo entries back
  const targetIndex = history.length - 1 - periodsAgo;
  const pastDataPoint = history[targetIndex];

  if (!pastDataPoint || pastDataPoint.value === undefined) {
    return { change: undefined, changePercent: undefined };
  }

  const pastValue = pastDataPoint.value;
  const change = current - pastValue;
  // Use absolute value of pastValue to ensure changePercent has correct sign
  // when dealing with negative values (e.g., Manufacturing Confidence)
  const changePercent = (change / Math.abs(pastValue)) * 100;

  return { change, changePercent };
}

/**
 * Calculate change and change percentage based on calendar days
 * Used for: 7D and 30D changes for daily trading data
 * @param current - Current value
 * @param history - Historical data points (sorted chronologically, oldest first)
 * @param calendarDays - Number of calendar days to look back
 * @returns Object with change and changePercent, or undefined if data unavailable
 */
function calculateCalendarDayChange(
  current: number,
  history: HistoricalDataPoint[],
  calendarDays: number
): { change: number | undefined; changePercent: number | undefined } {
  // Data validation
  if (!history || history.length === 0) {
    return { change: undefined, changePercent: undefined };
  }

  // Calculate the target date (calendarDays ago)
  const lastDate = new Date(history[history.length - 1].date);
  const targetDate = new Date(lastDate);
  targetDate.setDate(targetDate.getDate() - calendarDays);

  // Find the closest data point to the target date
  // Prefer the data point on or before the target date
  let closestPoint: HistoricalDataPoint | null = null;
  let minDiff = Infinity;

  for (const point of history) {
    const pointDate = new Date(point.date);
    const diff = lastDate.getTime() - pointDate.getTime();
    const diffDays = diff / (1000 * 60 * 60 * 24);

    // Look for data point around the target (within ±3 days)
    if (Math.abs(diffDays - calendarDays) < Math.abs(minDiff - calendarDays)) {
      closestPoint = point;
      minDiff = diffDays;
    }
  }

  if (!closestPoint || closestPoint.value === undefined) {
    return { change: undefined, changePercent: undefined };
  }

  const pastValue = closestPoint.value;
  const change = current - pastValue;
  const changePercent = (change / Math.abs(pastValue)) * 100;

  return { change, changePercent };
}

async function fetchFREDData(seriesId: string, limit: number = 40): Promise<{ current: number; previous: number; history: HistoricalDataPoint[] }> {
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
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`;

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
    const { current, history } = await fetchFREDData('DGS10');

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'US 10Y Yield',
      symbol: 'US10Y',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    const { current, history } = await fetchYahooFinanceData('DX-Y.NYB');

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'US Dollar Index',
      symbol: 'DXY',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    const { current, history } = await fetchFREDData('BAMLH0A0HYM2');

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'High Yield Spread',
      symbol: 'HYS',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    // Note: M2SL is monthly data, published on the 1st of each month
    // So we use 1M, 2M, 3M periods instead of 1D, 7D, 30D
    const { current, history } = await fetchFREDData('M2SL', 40);

    // Use calculatePeriodChange for all periods for consistency
    // 1-month change (use as "1D" field for consistency)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 2-month change (use as "7D" field)
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 2);

    // 3-month change (use as "30D" field)
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 3);

    return {
      name: 'M2 Money Supply',
      symbol: 'M2',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    const { current, history } = await fetchYahooFinanceData('CL=F');

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'Crude Oil (WTI)',
      symbol: 'OIL',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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

    // Calculate current ratio (multiply by 10000 for readability)
    // Standard practice: (Copper price / Gold price) × 10000
    const currentRatio = copper.current / gold.current;
    const current = currentRatio * 10000;

    // Calculate historical ratio by matching dates
    const history: HistoricalDataPoint[] = [];
    if (copper.history && gold.history) {
      const minLength = Math.min(copper.history.length, gold.history.length);
      for (let i = 0; i < minLength; i++) {
        // Match dates to ensure accurate ratio calculation
        if (copper.history[i].date === gold.history[i].date) {
          history.push({
            date: copper.history[i].date,
            value: (copper.history[i].value / gold.history[i].value) * 10000,
          });
        }
      }
    }

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'Copper/Gold Ratio',
      symbol: 'Cu/Au',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
      change7d,
      changePercent7d,
      change30d,
      changePercent30d,
      lastUpdated: new Date().toISOString(),
      unit: '×10000',
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

  const changePercent = priceData.bitcoin.usd_24h_change;

  // Fetch 40-day historical data (need buffer for 30-day calculation)
  const chartUrl = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=40&interval=daily';

  const chartResponse = await fetch(chartUrl, {
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!chartResponse.ok) {
    throw new Error(`CoinGecko chart API error: ${chartResponse.statusText}`);
  }

  const chartData: CoinGeckoMarketChart = await chartResponse.json();

  // Use the latest price from market_chart (includes decimals, unlike simple/price)
  const current = chartData.prices[chartData.prices.length - 1][1];

  // Calculate previous price from 24h change
  const previous = current / (1 + changePercent / 100);

  // Convert to our HistoricalDataPoint format
  const history: HistoricalDataPoint[] = chartData.prices.map(([timestamp, price]) => ({
    date: new Date(timestamp).toISOString().split('T')[0],
    value: price,
  }));

  return { current, previous, history };
}

export async function getBitcoin(): Promise<IndicatorData> {
  try {
    const { current, history } = await fetchCoinGeckoPrice();

    // 1-day change (entry-based: yesterday)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'Bitcoin (BTC/USD)',
      symbol: 'BTC',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    // This is monthly data, so we use 1M, 2M, 3M periods instead of 1D, 7D, 30D
    const { current, history } = await fetchFREDData('BSCICP02USM460S', 60);

    // 1-month change (use as "1D" field for consistency)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 2-month change (use as "7D" field)
    const { change: change7d, changePercent: changePercent7d } =
      calculatePeriodChange(current, history, 2);

    // 3-month change (use as "30D" field)
    const { change: change30d, changePercent: changePercent30d } =
      calculatePeriodChange(current, history, 3);

    return {
      name: 'Manufacturing Confidence (OECD)',
      symbol: 'MFG',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
    const { current, history } = await fetchYahooFinanceData('^VIX');

    // 1-day change (entry-based: last trading day)
    const { change, changePercent } = calculatePeriodChange(current, history, 1);

    // 7-day change (calendar-based: 7 calendar days ago)
    const { change: change7d, changePercent: changePercent7d } =
      calculateCalendarDayChange(current, history, 7);

    // 30-day change (calendar-based: 30 calendar days ago)
    const { change: change30d, changePercent: changePercent30d } =
      calculateCalendarDayChange(current, history, 30);

    return {
      name: 'VIX (Market Fear Index)',
      symbol: 'VIX',
      value: current,
      change: change ?? 0,
      changePercent: changePercent ?? 0,
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
