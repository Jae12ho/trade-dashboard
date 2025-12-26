import { IndicatorData } from '@/lib/types/indicators';
import MiniChart from './MiniChart';

interface IndicatorCardProps {
  indicator: IndicatorData;
}

export default function IndicatorCard({ indicator }: IndicatorCardProps) {
  const isPositive = indicator.change >= 0;
  const changeColor = isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  const bgColor = isPositive ? 'bg-green-50 dark:bg-green-900/60' : 'bg-red-50 dark:bg-red-900/60';
  const arrow = isPositive ? '↑' : '↓';

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
          <div className={`${bgColor} px-2 py-1 rounded`}>
            <span className={`text-xs font-semibold ${changeColor}`}>
              {arrow} {Math.abs(indicator.changePercent).toFixed(2)}%
            </span>
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
          <p className={`text-sm font-medium ${changeColor} mt-1`}>
            {isPositive ? '+' : ''}
            {indicator.change.toFixed(2)}
            {indicator.unit && ` ${indicator.unit}`}
          </p>
        </div>

        {indicator.history && indicator.history.length > 0 && (
          <div className="pt-2">
            <p className="text-xs text-zinc-400 dark:text-zinc-400 mb-2">
              Last 30 days
            </p>
            <MiniChart data={indicator.history} isPositive={isPositive} />
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
