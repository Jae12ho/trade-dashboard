import { IndicatorData } from '@/lib/types/indicators';
import MiniChart from './MiniChart';

interface IndicatorCardProps {
  indicator: IndicatorData;
  isLoadingComments?: boolean;
}

export default function IndicatorCard({ indicator, isLoadingComments = false }: IndicatorCardProps) {
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getBgColor = (change: number) => {
    return change >= 0 ? 'bg-green-50 dark:bg-green-900/60' : 'bg-red-50 dark:bg-red-900/60';
  };

  // Filter history to show only last N calendar days (not just N entries)
  const getFilteredHistory = (history: typeof indicator.history, days: number) => {
    if (!history || history.length === 0) return [];

    const lastDate = new Date(history[history.length - 1].date);
    const cutoffDate = new Date(lastDate);
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return history.filter(point => new Date(point.date) >= cutoffDate);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-300">
              {indicator.name}
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-400 mt-1">
              {indicator.symbol}
            </p>
          </div>
        </div>

        <div>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {indicator.value.toFixed(2)}
            {indicator.unit && (
              <span className="text-lg font-normal text-zinc-500 dark:text-zinc-300 ml-1">
                {indicator.unit}
              </span>
            )}
          </p>
        </div>

        {/* Period changes: 1D, 7D, 30D (or 1M, 2M, 3M for monthly data) */}
        <div className="space-y-2">
          {/* Period 1 change */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {indicator.symbol === 'MFG' || indicator.symbol === 'M2' ? '1M' : '1D'}
            </span>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${getBgColor(indicator.change)}`}>
              <span className={`text-xs font-semibold ${getChangeColor(indicator.change)}`}>
                {indicator.change >= 0 ? '↑' : '↓'}
              </span>
              <span className={`text-xs font-semibold ${getChangeColor(indicator.change)}`}>
                {indicator.change >= 0 ? '+' : ''}{indicator.change.toFixed(2)}
              </span>
              <span className={`text-xs font-semibold ${getChangeColor(indicator.change)}`}>
                ({indicator.change >= 0 ? '+' : ''}{indicator.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Period 2 change */}
          {indicator.changePercent7d !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {indicator.symbol === 'MFG' || indicator.symbol === 'M2' ? '2M' : '7D'}
              </span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${getBgColor(indicator.change7d!)}`}>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change7d!)}`}>
                  {indicator.change7d! >= 0 ? '↑' : '↓'}
                </span>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change7d!)}`}>
                  {indicator.change7d! >= 0 ? '+' : ''}{indicator.change7d!.toFixed(2)}
                </span>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change7d!)}`}>
                  ({indicator.change7d! >= 0 ? '+' : ''}{indicator.changePercent7d!.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* Period 3 change */}
          {indicator.changePercent30d !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {indicator.symbol === 'MFG' || indicator.symbol === 'M2' ? '3M' : '30D'}
              </span>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${getBgColor(indicator.change30d!)}`}>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change30d!)}`}>
                  {indicator.change30d! >= 0 ? '↑' : '↓'}
                </span>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change30d!)}`}>
                  {indicator.change30d! >= 0 ? '+' : ''}{indicator.change30d!.toFixed(2)}
                </span>
                <span className={`text-xs font-semibold ${getChangeColor(indicator.change30d!)}`}>
                  ({indicator.change30d! >= 0 ? '+' : ''}{indicator.changePercent30d!.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {indicator.history && indicator.history.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-zinc-400 dark:text-zinc-400 mb-2">
              {indicator.symbol === 'MFG' || indicator.symbol === 'M2' ? 'Last 12 months' : 'Last 30 days'}
            </p>
            <MiniChart
              data={
                indicator.symbol === 'MFG' || indicator.symbol === 'M2'
                  ? indicator.history.slice(-12) // Monthly data: show last 12 entries (12 months)
                  : getFilteredHistory(indicator.history, 30) // Daily data: show last 30 calendar days
              }
              isPositive={indicator.change30d !== undefined ? indicator.change30d >= 0 : indicator.change >= 0}
            />

            {/* AI Comment - 차트 바로 아래에 배치 */}
            {isLoadingComments && !indicator.aiComment ? (
              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                    AI 분석
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 bg-purple-600 dark:bg-purple-400 rounded-full"
                      style={{ animation: 'wiggle 2s ease-in-out infinite' }}
                    ></div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      분석 중...
                    </p>
                  </div>
                </div>
              </div>
            ) : indicator.aiComment ? (
              <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-100 dark:border-purple-800">
                <div className="flex items-start gap-2">
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                    AI 분석
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed">
                    {indicator.aiComment}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-400">
            Updated: {new Date(indicator.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
}
