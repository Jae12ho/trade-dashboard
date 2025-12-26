import { IndicatorData } from '@/lib/types/indicators';
import MiniChart from './MiniChart';

interface IndicatorCardProps {
  indicator: IndicatorData;
}

export default function IndicatorCard({ indicator }: IndicatorCardProps) {
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  };

  const getBgColor = (change: number) => {
    return change >= 0 ? 'bg-green-50 dark:bg-green-900/60' : 'bg-red-50 dark:bg-red-900/60';
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

        {/* Period changes: 1D, 7D, 30D */}
        <div className="space-y-2">
          {/* 1-day change */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">1D</span>
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

          {/* 7-day change */}
          {indicator.changePercent7d !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">7D</span>
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

          {/* 30-day change */}
          {indicator.changePercent30d !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">30D</span>
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
              Last 30 days
            </p>
            <MiniChart data={indicator.history} isPositive={indicator.change >= 0} />
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
