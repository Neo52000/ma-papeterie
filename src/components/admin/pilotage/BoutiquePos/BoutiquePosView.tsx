import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { usePilotageOverview, usePilotageTimeseries, usePilotageSnapshots } from '@/hooks/usePilotage';
import { DATA_NOIR, CHART_COLORS } from '../_shared/colors';
import { formatEur, formatNumber } from '../_shared/formatters';
import { KpiCard } from '../_shared/KpiCard';
import { Store, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ComposedChart, Line,
} from 'recharts';

export function BoutiquePosView() {
  const { data: overview, isLoading: overviewLoading } = usePilotageOverview('pos');
  const { data: timeseries, isLoading: tsLoading } = usePilotageTimeseries('pos');
  const { data: snapshots } = usePilotageSnapshots('pos', 30);

  // Agrégats pos sur 30j
  const pos30d = useMemo(() => {
    if (!snapshots) return null;
    const totalTx = snapshots.reduce((s, p) => s + (p.nb_transactions_pos ?? 0), 0);
    const totalCa = snapshots.reduce((s, p) => s + Number(p.ca_ttc ?? 0), 0);
    const avgTicket = totalTx > 0 ? totalCa / totalTx : 0;
    const daysOpen = snapshots.filter(p => (p.nb_transactions_pos ?? 0) > 0).length;
    return { totalTx, totalCa, avgTicket, daysOpen };
  }, [snapshots]);

  // Répartition jour de la semaine (performances hebdo)
  const byDayOfWeek = useMemo(() => {
    if (!snapshots) return [];
    const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const buckets = new Array(7).fill(0).map((_, i) => ({
      day: dayLabels[i],
      ca: 0,
      transactions: 0,
    }));
    for (const snap of snapshots) {
      const dow = new Date(snap.snapshot_date).getDay();
      buckets[dow].ca += Number(snap.ca_ttc ?? 0);
      buckets[dow].transactions += Number(snap.nb_transactions_pos ?? 0);
    }
    // Réarranger pour commencer par Lundi (plus lisible en français)
    return [...buckets.slice(1), buckets[0]];
  }, [snapshots]);

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      <div>
        <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>Boutique physique</h2>
        <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
          10 rue Toupot de Béveaux, Chaumont — Shopify POS
        </p>
      </div>

      {/* KPI POS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CA TTC 30j"
          value={formatEur(pos30d?.totalCa, { compact: true })}
          icon={Store}
          isLoading={overviewLoading}
        />
        <KpiCard
          label="Transactions 30j"
          value={formatNumber(pos30d?.totalTx)}
          secondary={pos30d ? `${pos30d.daysOpen} jours d'activité` : undefined}
          icon={ShoppingBag}
          isLoading={overviewLoading}
        />
        <KpiCard
          label="Ticket moyen"
          value={formatEur(pos30d?.avgTicket)}
          icon={TrendingUp}
          isLoading={overviewLoading}
        />
        <KpiCard
          label="Clients uniques 7j"
          value={formatNumber(overview?.nb_orders_7d ?? 0)}
          secondary="Transactions sur 7 derniers jours"
          icon={Users}
          isLoading={overviewLoading}
        />
      </div>

      {/* CA + ticket moyen quotidien */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          CA TTC et ticket moyen — jour par jour
        </h3>
        <div className="h-72">
          {tsLoading ? (
            <div className={cn('h-full flex items-center justify-center text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeseries ?? []}>
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
                  yAxisId="left"
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                  formatter={(value: number) => formatEur(value)}
                />
                <Bar yAxisId="left" dataKey="ca_ht" fill={CHART_COLORS.pos} name="CA HT" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="panier_moyen_ht"
                  stroke={CHART_COLORS.marge}
                  strokeWidth={2}
                  name="Ticket moyen HT"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Répartition par jour de la semaine */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          Performances par jour de la semaine
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="day" stroke="#71717a" style={{ fontSize: '11px' }} />
              <YAxis
                stroke="#71717a"
                style={{ fontSize: '11px' }}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                formatter={(value: number) => formatEur(value)}
              />
              <Bar dataKey="ca" fill={CHART_COLORS.pos} name="CA TTC" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
