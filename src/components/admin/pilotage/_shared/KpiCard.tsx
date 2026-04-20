import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DATA_NOIR } from './colors';
import { formatDelta } from './formatters';

interface KpiCardProps {
  label: string;
  value: string;
  secondary?: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: LucideIcon;
  intent?: 'default' | 'positive' | 'negative' | 'warning' | 'critical' | 'info';
  onClick?: () => void;
  isLoading?: boolean;
}

export function KpiCard({
  label,
  value,
  secondary,
  delta,
  deltaLabel = 'vs période précédente',
  icon: Icon,
  intent = 'default',
  onClick,
  isLoading,
}: KpiCardProps) {
  const deltaInfo = formatDelta(delta);

  const intentBorder = {
    default: DATA_NOIR.bgBorder,
    positive: DATA_NOIR.positiveBorder,
    negative: DATA_NOIR.negativeBorder,
    warning: DATA_NOIR.warningBorder,
    critical: DATA_NOIR.criticalBorder,
    info: DATA_NOIR.infoBorder,
  }[intent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'w-full text-left rounded-xl border p-4 transition-all',
        DATA_NOIR.bgCard,
        intentBorder,
        onClick && 'hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer',
        !onClick && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={cn('text-xs uppercase tracking-wider', DATA_NOIR.textMuted)}>
          {label}
        </span>
        {Icon && <Icon className={cn('h-4 w-4', DATA_NOIR.textMuted)} />}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
          <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
        </div>
      ) : (
        <>
          <div className={cn('text-2xl font-semibold tabular-nums', DATA_NOIR.textPrimary)}>
            {value}
          </div>
          {secondary && (
            <div className={cn('text-xs mt-1', DATA_NOIR.textMuted)}>{secondary}</div>
          )}
          {delta !== null && delta !== undefined && (
            <div className="flex items-center gap-1.5 mt-2">
              {deltaInfo.neutral ? (
                <Minus className={cn('h-3.5 w-3.5', DATA_NOIR.neutral)} />
              ) : deltaInfo.positive ? (
                <ArrowUpRight className={cn('h-3.5 w-3.5', DATA_NOIR.positive)} />
              ) : (
                <ArrowDownRight className={cn('h-3.5 w-3.5', DATA_NOIR.negative)} />
              )}
              <span
                className={cn(
                  'text-xs font-medium tabular-nums',
                  deltaInfo.neutral
                    ? DATA_NOIR.neutral
                    : deltaInfo.positive
                    ? DATA_NOIR.positive
                    : DATA_NOIR.negative
                )}
              >
                {deltaInfo.label}
              </span>
              <span className={cn('text-xs', DATA_NOIR.textMuted)}>{deltaLabel}</span>
            </div>
          )}
        </>
      )}
    </button>
  );
}
