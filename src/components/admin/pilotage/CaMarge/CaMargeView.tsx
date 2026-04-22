import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePilotageTimeseries, usePilotageOverview } from '@/hooks/usePilotage';
import { usePilotageStore, PilotageTimeRange } from '@/stores/pilotageStore';
import { DATA_NOIR, CHART_COLORS } from '../_shared/colors';
import { formatEur, formatPct, formatNumber } from '../_shared/formatters';
import { KpiCard } from '../_shared/KpiCard';
import { PilotageErrorState } from '../_shared/PilotageErrorState';
import { TrendingUp, Euro, ShoppingBag, Percent } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

const RANGE_OPTIONS: { value: PilotageTimeRange; label: string }[] = [
  { value: '7d',   label: '7 jours' },
  { value: '30d',  label: '30 jours' },
  { value: '90d',  label: '90 jours' },
  { value: '180d', label: '6 mois' },
  { value: '365d', label: '1 an' },
];

export function CaMargeView() {
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErrObj,
    refetch: refetchOverview,
  } = usePilotageOverview();
  const {
    data: timeseries,
    isLoading: tsLoading,
    isError: tsError,
  } = usePilotageTimeseries();
  const timeRange = usePilotageStore(s => s.timeRange);
  const setTimeRange = usePilotageStore(s => s.setTimeRange);

  if (overviewError || tsError) {
    return (
      <PilotageErrorState
        message={overviewErrObj instanceof Error ? overviewErrObj.message : undefined}
        onRetry={() => refetchOverview()}
      />
    );
  }

  // Calculs agrégés sur la période
  const periodStats = useMemo(() => {
    if (!timeseries || timeseries.length === 0) return null;
    const totalCa = timeseries.reduce((s, p) => s + Number(p.ca_ht ?? 0), 0);
    const totalMarge = timeseries.reduce((s, p) => s + Number(p.marge_brute ?? 0), 0);
    const totalOrders = timeseries.reduce((s, p) => s + Number(p.nb_orders ?? 0), 0);
    const avgTauxMarge = totalCa > 0 ? (totalMarge / totalCa) * 100 : 0;
    const avgPanier = totalOrders > 0 ? totalCa / totalOrders : 0;
    return { totalCa, totalMarge, totalOrders, avgTauxMarge, avgPanier };
  }, [timeseries]);

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>CA & Marge</h2>
          <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
            Analyse détaillée par période
          </p>
        </div>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-md transition-colors',
                timeRange === opt.value
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI agrégés sur la période */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CA HT période"
          value={formatEur(periodStats?.totalCa, { compact: true })}
          icon={Euro}
          isLoading={tsLoading}
        />
        <KpiCard
          label="Marge brute période"
          value={formatEur(periodStats?.totalMarge, { compact: true })}
          secondary={periodStats ? formatPct(periodStats.avgTauxMarge) + ' de taux moyen' : undefined}
          icon={TrendingUp}
          isLoading={tsLoading}
          intent={periodStats && periodStats.avgTauxMarge >= 28 ? 'positive' : 'warning'}
        />
        <KpiCard
          label="Commandes"
          value={formatNumber(periodStats?.totalOrders)}
          icon={ShoppingBag}
          isLoading={tsLoading}
        />
        <KpiCard
          label="Panier moyen HT"
          value={formatEur(periodStats?.avgPanier)}
          icon={Percent}
          isLoading={tsLoading}
        />
      </div>

      {/* Chart 1 : Aire CA + Marge */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          CA HT vs Marge brute
        </h3>
        <div className="h-80">
          {tsLoading ? (
            <div className={cn('h-full flex items-center justify-center text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeseries ?? []}>
                <defs>
                  <linearGradient id="gradCa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.ca} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.ca} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradMarge" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.marge} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS.marge} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="snapshot_date"
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                  }
                />
                <YAxis
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`)}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  labelStyle={{ color: '#d4d4d8' }}
                  formatter={(value: number) => formatEur(value)}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="ca_ht" stroke={CHART_COLORS.ca} strokeWidth={2} fill="url(#gradCa)" name="CA HT" />
                <Area type="monotone" dataKey="marge_brute" stroke={CHART_COLORS.marge} strokeWidth={2} fill="url(#gradMarge)" name="Marge brute" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2 : Bar chart nombre de commandes */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          Volume de commandes par jour
        </h3>
        <div className="h-60">
          {tsLoading ? (
            <div className={cn('h-full flex items-center justify-center text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeseries ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="snapshot_date"
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                  }
                />
                <YAxis stroke="#71717a" style={{ fontSize: '11px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                />
                <Bar dataKey="nb_orders" fill={CHART_COLORS.web_b2c} name="Commandes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Comparaison 30j vs 30j précédents */}
      {overview && !overviewLoading && (
        <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
          <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
            30 derniers jours vs 30 jours précédents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ComparisonRow
              label="CA HT"
              current={overview.ca_ht_30d}
              previous={overview.ca_ht_30d_prev}
              delta={overview.ca_delta_pct}
              formatter={(v) => formatEur(v, { compact: true })}
            />
            <ComparisonRow
              label="Marge brute"
              current={overview.marge_brute_30d}
              previous={overview.marge_brute_30d_prev}
              delta={overview.marge_delta_pct}
              formatter={(v) => formatEur(v, { compact: true })}
            />
            <ComparisonRow
              label="Taux de marge"
              current={overview.taux_marge_30d}
              previous={overview.taux_marge_30d_prev}
              delta={overview.taux_marge_30d - overview.taux_marge_30d_prev}
              formatter={(v) => formatPct(v)}
              deltaIsPct={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ComparisonRowProps {
  label: string;
  current: number;
  previous: number;
  delta: number;
  formatter: (v: number) => string;
  deltaIsPct?: boolean;
}

function ComparisonRow({ label, current, previous, delta, formatter, deltaIsPct = true }: ComparisonRowProps) {
  const isPositive = delta > 0;
  const isNeutral = delta === 0;
  return (
    <div className={cn('rounded-lg p-4', DATA_NOIR.bgCardHover)}>
      <div className={cn('text-xs uppercase tracking-wider mb-2', DATA_NOIR.textMuted)}>{label}</div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={cn('text-lg font-semibold tabular-nums', DATA_NOIR.textPrimary)}>{formatter(current)}</div>
          <div className={cn('text-xs mt-0.5', DATA_NOIR.textMuted)}>vs {formatter(previous)}</div>
        </div>
        <div
          className={cn(
            'text-sm font-semibold tabular-nums',
            isNeutral ? DATA_NOIR.neutral : isPositive ? DATA_NOIR.positive : DATA_NOIR.negative
          )}
        >
          {isPositive ? '+' : ''}
          {deltaIsPct ? `${delta.toFixed(1)}%` : `${delta.toFixed(1)}pt`}
        </div>
      </div>
    </div>
  );
}
