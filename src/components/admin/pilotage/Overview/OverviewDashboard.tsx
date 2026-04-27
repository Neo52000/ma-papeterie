import { useMemo } from 'react';
import { Euro, TrendingUp, Target as TargetIcon, Wallet, Calendar, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePilotageOverview, usePilotageTimeseries } from '@/hooks/usePilotage';
import { useGoalProgress } from '@/hooks/usePilotageGoals';
import { useActiveAlerts } from '@/hooks/usePilotageAlerts';
import { usePilotageStore } from '@/stores/pilotageStore';
import { KpiCard } from '../_shared/KpiCard';
import { PilotageErrorState } from '../_shared/PilotageErrorState';
import { DATA_NOIR, CHART_COLORS } from '../_shared/colors';
import { formatEur, formatPct, formatNumber, channelLabel } from '../_shared/formatters';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

// Les 6 questions fondamentales du dirigeant (méthode Rivalis adaptée e-commerce)
const SIX_QUESTIONS = [
  { key: 'where', label: 'Où en suis-je ?', sub: 'Résultat sur 30 jours' },
  { key: 'forecast', label: 'Où vais-je finir l\'exercice ?', sub: 'Projection annuelle' },
  { key: 'pricing', label: 'Mes prix sont-ils bons ?', sub: 'Taux de marge vs cible' },
  { key: 'cash', label: 'Quelle trésorerie à 30j ?', sub: 'Encaissements attendus' },
  { key: 'goals', label: 'Suis-je en retard ?', sub: 'Progression vs objectif' },
  { key: 'alerts', label: 'Qu\'est-ce qui cloche ?', sub: 'Alertes actives' },
];

export function OverviewDashboard() {
  const channel = usePilotageStore(s => s.channel);
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    error: overviewErrObj,
    refetch: refetchOverview,
  } = usePilotageOverview();
  const { data: timeseries, isLoading: tsLoading } = usePilotageTimeseries();
  const { data: goalProgress } = useGoalProgress('month');
  const { data: activeAlerts } = useActiveAlerts();

  // Calculs dérivés — placés avant tout early return pour respecter les rules-of-hooks
  const projectionAnnuelle = useMemo(() => {
    if (!overview?.ca_ht_30d) return null;
    return overview.ca_ht_30d * 12;
  }, [overview]);

  const monthGoal = useMemo(() => {
    if (!goalProgress) return null;
    return goalProgress.find(g => g.channel === channel) ?? goalProgress[0] ?? null;
  }, [goalProgress, channel]);

  // Mémoisation de la série Recharts : évite de recalculer la référence à
  // chaque render (sinon Recharts remonte tout le graphe inutilement)
  const chartData = useMemo(() => timeseries ?? [], [timeseries]);

  if (overviewError) {
    return (
      <PilotageErrorState
        message={overviewErrObj instanceof Error ? overviewErrObj.message : undefined}
        onRetry={() => refetchOverview()}
      />
    );
  }

  const isRhythmLate = monthGoal && monthGoal.progression_pct < 50 && monthGoal.jours_restants < 15;

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>
            Vue d'ensemble
          </h2>
          <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
            Les 6 questions qui comptent — canal {channelLabel(channel)}
          </p>
        </div>
        <VendrediQuinzeMinutes />
      </div>

      {/* 6 cartes — 6 questions Rivalis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Où en suis-je ? */}
        <KpiCard
          label={SIX_QUESTIONS[0].label}
          value={formatEur(overview?.ca_ht_30d, { compact: true })}
          secondary={`Marge : ${formatEur(overview?.marge_brute_30d, { compact: true })} (${formatPct(overview?.taux_marge_30d)})`}
          delta={overview?.ca_delta_pct}
          icon={Euro}
          intent={(overview?.ca_delta_pct ?? 0) >= 0 ? 'positive' : 'negative'}
          isLoading={overviewLoading}
        />

        {/* 2. Projection annuelle */}
        <KpiCard
          label={SIX_QUESTIONS[1].label}
          value={formatEur(projectionAnnuelle, { compact: true })}
          secondary="Basé sur le rythme 30j × 12"
          icon={TrendingUp}
          isLoading={overviewLoading}
        />

        {/* 3. Taux de marge */}
        <KpiCard
          label={SIX_QUESTIONS[2].label}
          value={formatPct(overview?.taux_marge_30d)}
          secondary={`Cible papeterie : 28-35%`}
          delta={overview?.marge_delta_pct}
          icon={TrendingUp}
          intent={
            (overview?.taux_marge_30d ?? 0) >= 28
              ? 'positive'
              : (overview?.taux_marge_30d ?? 0) >= 20
              ? 'warning'
              : 'critical'
          }
          isLoading={overviewLoading}
        />

        {/* 4. Trésorerie */}
        <KpiCard
          label={SIX_QUESTIONS[3].label}
          value={formatEur(overview?.encaissements_30d, { compact: true })}
          secondary="Encaissements 30 derniers jours"
          icon={Wallet}
          isLoading={overviewLoading}
        />

        {/* 5. Progression objectif */}
        <KpiCard
          label={SIX_QUESTIONS[4].label}
          value={monthGoal ? formatPct(monthGoal.progression_pct) : '—'}
          secondary={
            monthGoal
              ? `${formatEur(monthGoal.realise_ca_ht, { compact: true })} / ${formatEur(monthGoal.objectif_ca_ht, { compact: true })} • J-${monthGoal.jours_restants}`
              : 'Aucun objectif défini'
          }
          icon={TargetIcon}
          intent={isRhythmLate ? 'critical' : monthGoal && monthGoal.progression_pct >= 80 ? 'positive' : 'default'}
        />

        {/* 6. Alertes */}
        <KpiCard
          label={SIX_QUESTIONS[5].label}
          value={formatNumber(activeAlerts?.length ?? 0)}
          secondary={
            activeAlerts && activeAlerts.length > 0
              ? activeAlerts[0]?.title ?? 'Alertes à traiter'
              : 'Aucune alerte active'
          }
          icon={AlertTriangle}
          intent={
            (activeAlerts?.length ?? 0) === 0
              ? 'positive'
              : (activeAlerts?.some(a => a.severity === 'critical') ? 'critical' : 'warning')
          }
        />
      </div>

      {/* Chart principal : CA vs Marge sur la période */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={cn('text-base font-semibold', DATA_NOIR.textPrimary)}>
              Évolution CA et Marge brute
            </h3>
            <p className={cn('text-xs mt-0.5', DATA_NOIR.textMuted)}>
              Courbe quotidienne sur la période sélectionnée
            </p>
          </div>
        </div>

        <div className="h-72">
          {tsLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className={cn('text-sm', DATA_NOIR.textMuted)}>Chargement…</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="snapshot_date"
                  stroke="#71717a"
                  style={{ fontSize: '11px' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                  }}
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
                  labelFormatter={(label: string) =>
                    new Date(label).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
                  }
                />
                <Line type="monotone" dataKey="ca_ht" stroke={CHART_COLORS.ca} strokeWidth={2} dot={false} name="CA HT" />
                <Line type="monotone" dataKey="marge_brute" stroke={CHART_COLORS.marge} strokeWidth={2} dot={false} name="Marge brute" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// Widget "Vendredi 15 minutes" — rappel de la routine de pilotage hebdo
function VendrediQuinzeMinutes() {
  const today = new Date();
  const isFriday = today.getDay() === 5;

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        isFriday ? DATA_NOIR.infoBorder : DATA_NOIR.bgBorder,
        isFriday ? DATA_NOIR.infoBg : DATA_NOIR.bgCard
      )}
    >
      <Calendar className={cn('h-4 w-4', isFriday ? DATA_NOIR.info : DATA_NOIR.textMuted)} />
      <div className="text-xs">
        <div className={cn('font-medium', isFriday ? DATA_NOIR.textPrimary : DATA_NOIR.textSecondary)}>
          {isFriday ? 'Routine vendredi 15 min' : 'Routine hebdo : vendredi'}
        </div>
        <div className={cn(DATA_NOIR.textMuted)}>Trésorerie court terme + 3 KPI</div>
      </div>
    </div>
  );
}
