import { type LucideIcon } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { type KpiDelta } from '@/hooks/admin/useKpiDashboard';

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  accentColor: string;
  delta: KpiDelta;
  formatValue: (v: number) => string;
  sparklineData: { value: number }[];
  sparklineColor: string;
  index: number;
}

export function KpiCard({
  label,
  icon: Icon,
  accentColor,
  delta,
  formatValue,
  sparklineData,
  sparklineColor,
  index,
}: KpiCardProps) {
  const trendIcon = delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : '→';
  const trendColorClass =
    delta.trend === 'up'
      ? 'bg-emerald-500/15 text-emerald-400'
      : delta.trend === 'down'
        ? 'bg-red-500/15 text-red-400'
        : 'bg-gray-500/15 text-gray-400';

  return (
    <div
      className="kpi-card-enter h-36 rounded-xl p-4 flex flex-col justify-between hover:-translate-y-0.5 transition-transform duration-200 cursor-default"
      style={{
        background: '#111827',
        border: '1px solid #1F2937',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)',
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
        <span className="text-xs font-medium" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
          {label}
        </span>
      </div>

      <div
        className="text-4xl font-bold tracking-tight"
        style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
      >
        {formatValue(delta.value)}
      </div>

      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${trendColorClass}`}>
          {trendIcon} {delta.deltaPercent >= 0 ? '+' : ''}{delta.deltaPercent.toFixed(1)}% vs sem. préc.
        </span>

        <div className="w-24 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={sparklineColor}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
