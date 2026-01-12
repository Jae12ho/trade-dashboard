'use client';

import { HistoricalDataPoint } from '@/lib/types/indicators';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid } from 'recharts';

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
    <div className="h-20 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 1, right: 0, bottom: 0, left: 0 }}
        >
          {/* Optional: Subtle grid */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            className="dark:stroke-zinc-800"
            vertical={false}
          />

          {/* X-Axis: Date labels */}
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#a1a1aa' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value: string) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            interval="preserveStartEnd"
          />

          {/* Y-Axis: Hidden */}
          <YAxis
            domain={['auto', 'auto']}
            hide
          />

          {/* Tooltip: Hover interaction */}
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
            }}
            labelStyle={{
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
            }}
            itemStyle={{
              color: '#fff',
              fontSize: '11px',
            }}
            formatter={(value: number | undefined) => [(value ?? 0).toFixed(2), 'Value']}
            labelFormatter={(label: string) => {
              const date = new Date(label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }}
          />

          {/* Line: Main chart line */}
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
