'use client';

import { HistoricalDataPoint } from '@/lib/types/indicators';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: HistoricalDataPoint[];
  isPositive: boolean;
}

export default function MiniChart({ data, isPositive }: MiniChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const color = isPositive ? '#16a34a' : '#dc2626';

  return (
    <div className="h-16 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <YAxis domain={['auto', 'auto']} hide />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
