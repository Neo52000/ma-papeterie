import { type LucideIcon } from 'lucide-react';
import { type KpiDelta } from '@/hooks/admin/useKpiDashboard';

interface SecondaryKpiCardProps {
  label: string;
  icon: LucideIcon;
  accentColor: string;
  delta: KpiDelta;
  formatValue: (v: number) => string;
  index: number;
}

export function SecondaryKpiCard({
  label,
  icon: Icon,
  accentColor,
  delta,
  formatValue,
  index,
}: SecondaryKpiCardProps) {
  const trendIcon = delta.trend === 'up' ? '↑' : delta.trend === 'down' ? '↓' : '→';
  const trendColorClass =
    delta.trend === 'up'
      ? 'text-emerald-400'
      : delta.trend === 'down'
        ? 'text-red-400'
        : 'text-gray-400';

  return (
    <div
      className="kpi-card-enter rounded-2xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-default group"
      style={{
        background: `linear-gradient(135deg, ${accentColor}10, rgba(255, 255, 255, 0.03))`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: `${(index + 4) * 50}ms`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: accentColor }} />
        <span className="text-xs font-medium" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
          {label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
        >
          {formatValue(delta.value)}
        </span>
        <span className={`text-xs font-medium ${trendColorClass}`}>
          {trendIcon} {delta.deltaPercent >= 0 ? '+' : ''}{delta.deltaPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
