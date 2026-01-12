'use client';

import { useEffect, useState, useCallback } from 'react';
import { DashboardData } from '@/lib/types/indicators';
import IndicatorCard from './IndicatorCard';
import AIPrediction from './AIPrediction';

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const fetchComments = useCallback(async (indicators: DashboardData['indicators']) => {
    try {
      setIsLoadingComments(true);

      const commentsRes = await fetch('/api/indicator-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicators }),
      });

      if (!commentsRes.ok) {
        console.error('Failed to fetch AI comments');
        return;
      }

      const { comments } = await commentsRes.json() as { comments: Record<string, string | undefined> };

      // Update data with AI comments
      setData((prevData) => {
        if (!prevData) return null;

        return {
          ...prevData,
          indicators: {
            us10yYield: { ...prevData.indicators.us10yYield, aiComment: comments.US10Y },
            dxy: { ...prevData.indicators.dxy, aiComment: comments.DXY },
            highYieldSpread: { ...prevData.indicators.highYieldSpread, aiComment: comments.HYS },
            m2MoneySupply: { ...prevData.indicators.m2MoneySupply, aiComment: comments.M2 },
            crudeOil: { ...prevData.indicators.crudeOil, aiComment: comments.OIL },
            copperGoldRatio: { ...prevData.indicators.copperGoldRatio, aiComment: comments['Cu/Au'] },
            pmi: { ...prevData.indicators.pmi, aiComment: comments.MFG },
            putCallRatio: { ...prevData.indicators.putCallRatio, aiComment: comments.VIX },
            bitcoin: { ...prevData.indicators.bitcoin, aiComment: comments.BTC },
          },
        };
      });
    } catch (err) {
      console.error('Error fetching AI comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, []);

  const fetchIndicators = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const indicatorsRes = await fetch('/api/indicators');

      if (!indicatorsRes.ok) {
        throw new Error('Failed to fetch indicators');
      }

      const dashboardData: DashboardData = await indicatorsRes.json();
      setData(dashboardData);

      // Fetch AI comments in background after indicators are loaded
      fetchComments(dashboardData.indicators);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [fetchComments]);

  useEffect(() => {
    fetchIndicators();

    const interval = setInterval(() => {
      fetchIndicators();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [fetchIndicators]);

  // Generate filename with timestamp: trade-dashboard-YYYY-MM-DD-HH-MM.json
  const generateFileName = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    return `trade-dashboard-${year}-${month}-${day}-${hours}-${minutes}.json`;
  };

  // Download dashboard data as JSON file
  const downloadJSON = () => {
    if (!data) return;

    try {
      // Create JSON string with formatting
      const jsonString = JSON.stringify(data, null, 2);

      // Create Blob
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Create download URL
      const url = URL.createObjectURL(blob);

      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = generateFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download JSON:', error);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Market indicators updated at {new Date(data.timestamp).toLocaleString()}
          </p>
          <button
            onClick={downloadJSON}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 text-sm font-medium"
            title="Download all indicator data as JSON file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Indicators JSON</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Core Indicators */}
        <IndicatorCard indicator={data.indicators.us10yYield} isLoadingComments={isLoadingComments} />
        <IndicatorCard indicator={data.indicators.dxy} isLoadingComments={isLoadingComments} />
        <IndicatorCard indicator={data.indicators.highYieldSpread} isLoadingComments={isLoadingComments} />

        {/* New Indicators (Phase 7) */}
        <IndicatorCard indicator={data.indicators.m2MoneySupply} isLoadingComments={isLoadingComments} />
        <IndicatorCard indicator={data.indicators.crudeOil} isLoadingComments={isLoadingComments} />
        <IndicatorCard indicator={data.indicators.copperGoldRatio} isLoadingComments={isLoadingComments} />

        {/* Market Sentiment Indicators */}
        <IndicatorCard indicator={data.indicators.pmi} isLoadingComments={isLoadingComments} />
        <IndicatorCard indicator={data.indicators.putCallRatio} isLoadingComments={isLoadingComments} />

        {/* Digital Asset Indicator (Phase 8) */}
        <IndicatorCard indicator={data.indicators.bitcoin} isLoadingComments={isLoadingComments} />
      </div>

      <AIPrediction dashboardData={data} />

      {loading && (
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">Refreshing...</p>
        </div>
      )}

      {/* GitHub Repository Link */}
      <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-center gap-2">
          <a
            href="https://github.com/Jae12ho/trade-dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>View on GitHub</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
