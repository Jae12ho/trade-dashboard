'use client';

import { useEffect, useState } from 'react';
import { DashboardData } from '@/lib/types/indicators';
import IndicatorCard from './IndicatorCard';
import AIPrediction from './AIPrediction';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicators = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/indicators');

      if (!response.ok) {
        throw new Error('Failed to fetch indicators');
      }

      const dashboardData: DashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIndicators();

    const interval = setInterval(() => {
      fetchIndicators();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-50 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
            Failed to load data
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">{error}</p>
          <button
            onClick={fetchIndicators}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Trade Dashboard
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Market indicators updated at {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Core Indicators */}
        <IndicatorCard indicator={data.indicators.us10yYield} />
        <IndicatorCard indicator={data.indicators.dxy} />
        <IndicatorCard indicator={data.indicators.highYieldSpread} />

        {/* New Indicators (Phase 7) */}
        <IndicatorCard indicator={data.indicators.m2MoneySupply} />
        <IndicatorCard indicator={data.indicators.crudeOil} />
        <IndicatorCard indicator={data.indicators.copperGoldRatio} />

        {/* Market Sentiment Indicators */}
        <IndicatorCard indicator={data.indicators.pmi} />
        <IndicatorCard indicator={data.indicators.putCallRatio} />

        {/* Digital Asset Indicator (Phase 8) */}
        <IndicatorCard indicator={data.indicators.bitcoin} />
      </div>

      <AIPrediction />

      {loading && (
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Refreshing...</p>
        </div>
      )}
    </div>
  );
}
