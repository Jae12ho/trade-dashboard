'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MarketPrediction, HorizonView } from '@/lib/api/gemini';
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
  const [selectedModel, setSelectedModel] = useState<GeminiModelName>(() => {
    // Load initial model from localStorage (runs only once)
    if (typeof window === 'undefined') {
      return DEFAULT_GEMINI_MODEL;
    }

    try {
      const savedModel = localStorage.getItem(STORAGE_KEY) as GeminiModelName | null;
      if (savedModel && GEMINI_MODELS.some(m => m.value === savedModel)) {
        console.log(`[AIPrediction] Loaded model from localStorage: ${savedModel}`);
        return savedModel;
      }
    } catch (error) {
      console.warn('localStorage not available:', error);
    }

    console.log(`[AIPrediction] Using default model: ${DEFAULT_GEMINI_MODEL}`);
    return DEFAULT_GEMINI_MODEL;
  });
  const isInitialMount = useRef(true);

  const fetchPrediction = useCallback(async (modelOverride?: GeminiModelName) => {
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
  }, [dashboardData, selectedModel]);

  // Fetch prediction when model changes (including initial mount)
  useEffect(() => {
    // Save model to localStorage (skip on initial mount)
    if (!isInitialMount.current) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, selectedModel);
          console.log(`[AIPrediction] Saved model to localStorage: ${selectedModel}`);
        }
      } catch (error) {
        console.warn('localStorage not available:', error);
      }
    } else {
      isInitialMount.current = false;
    }

    // Fetch prediction (always, including initial mount)
    console.log(`[AIPrediction] Fetching prediction with model: ${selectedModel}`);
    fetchPrediction();
  }, [selectedModel, fetchPrediction]);

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
    <div
      className="glass-card rounded-xl p-6 opacity-0"
      style={{
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: '600ms',
      }}
    >
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
            className="px-3 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all hover:scale-105 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            className="px-3 py-1.5 text-xs bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all hover:scale-105 backdrop-blur-sm disabled:opacity-50"
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
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-all hover:scale-105 backdrop-blur-sm text-sm"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {prediction.isFallback && (
            <div className="p-3 bg-yellow-50/80 dark:bg-yellow-900/30 border border-yellow-200/50 dark:border-yellow-800/50 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">⚠️</span>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed">
                  {prediction.fallbackMessage}
                </p>
              </div>
            </div>
          )}

          {(() => {
            // 3-horizon 카드 표시 여부: midTerm 또는 longTerm 중 하나라도 있으면 신규 형식
            const hasHorizons = !!(prediction.midTerm || prediction.longTerm);

            if (!hasHorizons) {
              // 구 형식 (단일 horizon) — 기존 inline 레이아웃 유지
              return (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-2xl">{getSentimentIcon(prediction.sentiment)}</span>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-300 mb-1">시장 sentiment</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${getSentimentColor(prediction.sentiment)}`}>
                      {prediction.sentiment}
                    </span>
                  </div>
                  {typeof prediction.confidence === 'number' && (
                    <div
                      className="ml-2 cursor-help"
                      title={`예측 신뢰도 ${Math.round(prediction.confidence * 100)}% — 모델이 본 전망에 대해 가지는 캘리브레이션된 확신도 (가능 범위 40–90%).`}
                    >
                      <p className="text-xs text-zinc-500 dark:text-zinc-300 mb-1">예측 신뢰도</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-700 dark:bg-zinc-200 rounded-full transition-all" style={{ width: `${Math.round(prediction.confidence * 100)}%` }} />
                        </div>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                  {prediction.expectedSpxMove && (
                    <div
                      className="ml-2 cursor-help"
                      title="1–2주 동안 S&P 500의 예상 변동폭 range입니다 (정확한 예측이 아닌 시나리오 추정치)."
                    >
                      <p className="text-xs text-zinc-500 dark:text-zinc-300 mb-1">예상 SPX 변동 (1–2주)</p>
                      <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 tabular-nums">
                        {prediction.expectedSpxMove}
                      </span>
                    </div>
                  )}
                </div>
              );
            }

            // 신규 형식: 단기/중기/장기 3-horizon 카드 그리드
            const shortTermView: HorizonView = {
              horizon: '1-2주',
              sentiment: prediction.sentiment,
              confidence: prediction.confidence ?? 0.5,
              expectedSpxMove: prediction.expectedSpxMove ?? '',
              keyDrivers: [],
            };

            const horizons: Array<{ label: string; view: HorizonView | undefined }> = [
              { label: '단기', view: shortTermView },
              { label: '중기', view: prediction.midTerm },
              { label: '장기', view: prediction.longTerm },
            ];

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {horizons.map(({ label, view }) =>
                  view ? (
                    <div
                      key={label}
                      className="p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-700/50 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            {label}
                          </span>
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                            {view.horizon}
                          </span>
                        </div>
                        <span className="text-lg leading-none">{getSentimentIcon(view.sentiment)}</span>
                      </div>

                      <div>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${getSentimentColor(view.sentiment)}`}>
                          {view.sentiment}
                        </span>
                      </div>

                      <div
                        title={`예측 신뢰도 ${Math.round(view.confidence * 100)}% — 모델이 이 ${label}(${view.horizon}) 전망에 대해 가지는 캘리브레이션된 확신도입니다. 가능한 범위는 40–90%이며, 90%에 가까울수록 신호 합치가 강하고 반대 시나리오가 약함을 의미합니다.`}
                        className="cursor-help"
                      >
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                          <span>예측 신뢰도</span>
                          <span className="font-semibold text-zinc-700 dark:text-zinc-200 tabular-nums">
                            {Math.round(view.confidence * 100)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-700 dark:bg-zinc-200 rounded-full transition-all"
                            style={{ width: `${Math.round(view.confidence * 100)}%` }}
                          />
                        </div>
                      </div>

                      {view.expectedSpxMove && (
                        <div
                          className="text-xs text-zinc-600 dark:text-zinc-300 cursor-help"
                          title={`${view.horizon} 동안 S&P 500 지수의 예상 변동폭 range입니다. 모델이 추정한 가격 움직임의 중심 범위로, 정확한 예측이 아닌 시나리오 추정치입니다.`}
                        >
                          <span className="text-zinc-400 dark:text-zinc-500">예상 SPX 변동: </span>
                          <span className="font-semibold tabular-nums">{view.expectedSpxMove}</span>
                        </div>
                      )}

                      {view.keyDrivers && view.keyDrivers.length > 0 && (
                        <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-0.5 mt-1">
                          {view.keyDrivers.slice(0, 5).map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-zinc-400 dark:text-zinc-500 mt-0.5">•</span>
                              <span className="leading-snug">{d}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div
                      key={label}
                      className="p-3 rounded-xl border border-dashed border-zinc-200/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 flex items-center justify-center"
                    >
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {label} 데이터 없음
                      </span>
                    </div>
                  )
                )}
              </div>
            );
          })()}

          {(prediction.midTerm || prediction.longTerm) && (
            <div className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed -mt-2">
              <span className="font-semibold">예측 신뢰도</span>: 각 horizon 전망에 대한 모델의 캘리브레이션된 확신도 (가능 범위 40–90%). Hard Tripwire 발동·신호 합치 강함 → 높음, 반대 시나리오 강함·신호 혼재 → 낮음.
              <span className="mx-1">·</span>
              <span className="font-semibold">예상 SPX 변동</span>: 해당 horizon 내 S&amp;P 500 예상 가격 변동폭 range (정확한 예측이 아닌 시나리오 추정치).
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
              Analysis
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {prediction.reasoning}
            </p>
          </div>

          {prediction.counterNarrative && (
            <div className="p-3 bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-lg backdrop-blur-sm">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1 uppercase tracking-wide">
                Counter-Narrative · 반대 시나리오
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {prediction.counterNarrative}
              </p>
            </div>
          )}

          {prediction.invalidationTriggers && prediction.invalidationTriggers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-2">
                Invalidation Triggers · 반증 조건
              </h3>
              <ul className="space-y-2">
                {prediction.invalidationTriggers.map((trigger, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300"
                  >
                    <span className="text-orange-500 mt-0.5">⚑</span>
                    <span>{trigger}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5">
                위 조건은 단기/중기/장기 전망별로 발효됩니다 — 해당 horizon 내 발생 시 그 전망 무효화.
              </p>
            </div>
          )}

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
