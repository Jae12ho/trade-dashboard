'use client';

import { useEffect, useState, useRef } from 'react';
import { MarketPrediction } from '@/lib/api/gemini';
import { DashboardData } from '@/lib/types/indicators';
import {
  GEMINI_MODELS,
  GeminiModelName,
  DEFAULT_GEMINI_MODEL
} from '@/lib/constants/gemini-models';

const STORAGE_KEY = 'gemini-model-preference';

interface AIPredictionProps {
  dashboardData: DashboardData;
}

export default function AIPrediction({ dashboardData }: AIPredictionProps) {
  const [prediction, setPrediction] = useState<MarketPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dots, setDots] = useState(1);
  const [selectedModel, setSelectedModel] = useState<GeminiModelName>(DEFAULT_GEMINI_MODEL);
  const isInitialMount = useRef(true);

  const fetchPrediction = async (modelOverride?: GeminiModelName) => {
    const modelToUse = modelOverride || selectedModel;

    try {
      setLoading(true);
      setError(null);

      console.log(`[AIPrediction] Fetching with model: ${modelToUse}`);

      const response = await fetch('/api/ai-prediction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardData,
          modelName: modelToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if it's a quota error
        if (errorData.isQuotaError || response.status === 429) {
          throw new Error(errorData.message || 'API 사용 한도가 초과되었습니다.');
        }

        throw new Error(errorData.message || 'Failed to fetch AI prediction');
      }

      const data: MarketPrediction = await response.json();
      setPrediction(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Load model preference from localStorage on mount and fetch prediction
  useEffect(() => {
    let modelToUse = DEFAULT_GEMINI_MODEL;

    try {
      if (typeof window !== 'undefined') {
        const savedModel = localStorage.getItem(STORAGE_KEY) as GeminiModelName | null;
        if (savedModel && GEMINI_MODELS.some(m => m.value === savedModel)) {
          console.log(`[AIPrediction] Loaded model from localStorage: ${savedModel}`);
          modelToUse = savedModel;
          setSelectedModel(savedModel);
        } else {
          console.log(`[AIPrediction] No valid saved model, using default: ${DEFAULT_GEMINI_MODEL}`);
        }
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    // Fetch initial prediction with the determined model
    console.log(`[AIPrediction] Initial fetch with model: ${modelToUse}`);
    fetchPrediction(modelToUse);  // Pass the model directly!
  }, []);

  // Save to localStorage when model changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, selectedModel);
        console.log(`[AIPrediction] Saved model to localStorage: ${selectedModel}`);
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }
  }, [selectedModel]);

  // Fetch prediction when model changes (after initial mount)
  useEffect(() => {
    // Only fetch after localStorage is loaded
    if (isInitialMount.current) {
      return;
    }

    console.log(`[AIPrediction] Fetching prediction with model: ${selectedModel}`);
    fetchPrediction();
  }, [selectedModel]);

  // 점(...) 애니메이션 효과
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setDots(prev => (prev % 3) + 1); // 1 -> 2 -> 3 -> 1
      }, 500);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/60';
      case 'bearish':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/60';
      case 'neutral':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/60';
      default:
        return 'text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return '📈';
      case 'bearish':
        return '📉';
      case 'neutral':
        return '➡️';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🤖</div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            AI Market Analysis
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as GeminiModelName)}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {GEMINI_MODELS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => fetchPrediction()}
            disabled={loading}
            className="px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            {/* 꿈틀거리는 검은 원 */}
            <div
              className="w-14 h-14 bg-zinc-900 dark:bg-zinc-50 rounded-full"
              style={{ animation: 'wiggle 2s ease-in-out infinite' }}
            ></div>

            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Analyzing market conditions{'.'.repeat(dots)}
            </p>
          </div>
        </div>
      ) : error || !prediction ? (
        <div className="text-center py-4">
          <div className="text-red-500 text-3xl mb-2">⚠️</div>
          <p className="text-sm text-zinc-500 dark:text-zinc-300 mb-4">
            {error || 'Failed to generate prediction'}
          </p>
          <button
            onClick={() => fetchPrediction()}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {prediction.isFallback && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                  {prediction.fallbackMessage}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <span className="text-2xl">{getSentimentIcon(prediction.sentiment)}</span>
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-300 mb-1">
                Market Sentiment
              </p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${getSentimentColor(
                  prediction.sentiment
                )}`}
              >
                {prediction.sentiment}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
              Analysis
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {prediction.reasoning}
            </p>
          </div>

          {prediction.risks && prediction.risks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
                Key Risks to Watch
              </h3>
              <ul className="space-y-2">
                {prediction.risks.map((risk, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    <span className="text-red-500 mt-0.5">⚠️</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs text-zinc-400 dark:text-zinc-400">
              Model: {GEMINI_MODELS.find(m => m.value === selectedModel)?.label} |{' '}
              Generated: {new Date(prediction.timestamp).toLocaleString()}
              {prediction.isFallback && (
                <span className="ml-1 text-yellow-600 dark:text-yellow-400">(과거 분석)</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
