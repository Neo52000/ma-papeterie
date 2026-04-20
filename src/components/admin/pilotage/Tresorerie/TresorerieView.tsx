import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  usePilotageOverview,
  usePilotageTresorerieProjection,
} from '@/hooks/usePilotage';
import { DATA_NOIR, CHART_COLORS } from '../_shared/colors';
import { formatEur, formatDate, channelLabel } from '../_shared/formatters';
import { KpiCard } from '../_shared/KpiCard';
import { Wallet, Clock, AlertCircle, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, Legend,
} from 'recharts';

export function TresorerieView() {
  const { data: overview, isLoading: overviewLoading } = usePilotageOverview();
  const { data: projection, isLoading: projLoading } = usePilotageTresorerieProjection();

  // Agrégation : projection sur 30j à venir, groupée par jour
  const projection30d = useMemo(() => {
    if (!projection) return [];
    const today = new Date().toISOString().slice(0, 10);
    const in30d = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    const byDate = new Map<string, number>();
    for (const p of projection) {
      if (p.encaissement_prevu_date >= today && p.encaissement_prevu_date <= in30d) {
        const curr = byDate.get(p.encaissement_prevu_date) ?? 0;
        byDate.set(p.encaissement_prevu_date, curr + Number(p.montant_ttc));
      }
    }

    // Générer toutes les dates (même sans données) pour une courbe continue
    const result: { date: string; encaissements: number; cumul: number }[] = [];
    let cumul = 0;
    for (let i = 0; i <= 30; i++) {
      const d = new Date(Date.now() + i * 86400000).toISOString().slice(0, 10);
      const encaissements = byDate.get(d) ?? 0;
      cumul += encaissements;
      result.push({ date: d, encaissements, cumul });
    }
    return result;
  }, [projection]);

  // Créances totales pendantes (non encaissées, payment_status != paid)
  const creancesTotales = useMemo(() => {
    if (!projection) return 0;
    return projection
      .filter(p => p.payment_status !== 'paid' && p.payment_status !== 'captured')
      .reduce((s, p) => s + Number(p.montant_ttc), 0);
  }, [projection]);

  // Créances échues (date passée, pas encaissé)
  const creancesEchues = useMemo(() => {
    if (!projection) return 0;
    const today = new Date().toISOString().slice(0, 10);
    return projection
      .filter(
        p =>
          p.encaissement_prevu_date < today &&
          p.payment_status !== 'paid' &&
          p.payment_status !== 'captured'
      )
      .reduce((s, p) => s + Number(p.montant_ttc), 0);
  }, [projection]);

  // Total projeté 30 prochains jours
  const totalProjete30d = projection30d.reduce((s, p) => s + p.encaissements, 0);

  return (
    <div className={cn('p-6 space-y-6', DATA_NOIR.bg)}>
      {/* En-tête */}
      <div>
        <h2 className={cn('text-2xl font-semibold', DATA_NOIR.textPrimary)}>Trésorerie</h2>
        <p className={cn('text-sm mt-1', DATA_NOIR.textSecondary)}>
          Encaissements réalisés et projection sur 30 jours
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Encaissé sur 30j"
          value={formatEur(overview?.encaissements_30d, { compact: true })}
          icon={Wallet}
          isLoading={overviewLoading}
          intent="positive"
        />
        <KpiCard
          label="Projeté 30 prochains j"
          value={formatEur(totalProjete30d, { compact: true })}
          secondary="Sur commandes existantes"
          icon={TrendingUp}
          isLoading={projLoading}
        />
        <KpiCard
          label="Créances en attente"
          value={formatEur(creancesTotales, { compact: true })}
          secondary="Commandes non payées"
          icon={Clock}
          isLoading={projLoading}
          intent={creancesTotales > 5000 ? 'warning' : 'default'}
        />
        <KpiCard
          label="Créances échues"
          value={formatEur(creancesEchues, { compact: true })}
          secondary={creancesEchues > 0 ? 'À relancer !' : 'À jour'}
          icon={AlertCircle}
          isLoading={projLoading}
          intent={creancesEchues > 0 ? 'critical' : 'positive'}
        />
      </div>

      {/* Chart : encaissements journaliers projetés + cumul */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          Projection d'encaissement — 30 prochains jours
        </h3>
        <div className="h-80">
          {projLoading ? (
            <div className={cn('h-full flex items-center justify-center text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projection30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
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
                  formatter={(value: number) => formatEur(value)}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="encaissements" fill={CHART_COLORS.encaissements} name="Encaissement prévu" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart cumul */}
      <div className={cn('rounded-xl border p-5', DATA_NOIR.bgCard, DATA_NOIR.bgBorder)}>
        <h3 className={cn('text-base font-semibold mb-4', DATA_NOIR.textPrimary)}>
          Trésorerie cumulée projetée
        </h3>
        <div className="h-60">
          {projLoading ? (
            <div className={cn('h-full flex items-center justify-center text-sm', DATA_NOIR.textMuted)}>
              Chargement…
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projection30d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
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
                  formatter={(value: number) => formatEur(value)}
                />
                <Line
                  type="monotone"
                  dataKey="cumul"
                  stroke={CHART_COLORS.encaissements}
                  strokeWidth={2}
                  dot={false}
                  name="Trésorerie cumulée"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Liste des créances à relancer */}
      {creancesEchues > 0 && projection && (
        <div className={cn('rounded-xl border p-5', DATA_NOIR.criticalBg, DATA_NOIR.criticalBorder)}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className={cn('h-5 w-5', DATA_NOIR.critical)} />
            <h3 className={cn('text-base font-semibold', DATA_NOIR.textPrimary)}>
              Créances échues à relancer
            </h3>
          </div>
          <div className="space-y-2">
            {projection
              .filter(
                p =>
                  p.encaissement_prevu_date < new Date().toISOString().slice(0, 10) &&
                  p.payment_status !== 'paid' &&
                  p.payment_status !== 'captured'
              )
              .slice(0, 10)
              .map((p, i) => (
                <div
                  key={i}
                  className={cn('flex items-center justify-between py-2 border-b last:border-0', DATA_NOIR.bgBorder)}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs', DATA_NOIR.textMuted)}>
                      {formatDate(p.encaissement_prevu_date, { short: true })}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded', DATA_NOIR.bgCard, DATA_NOIR.textSecondary)}>
                      {channelLabel(p.channel)}
                    </span>
                    <span className={cn('text-sm', DATA_NOIR.textSecondary)}>
                      {p.nb_orders} commande{p.nb_orders > 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className={cn('text-sm font-semibold tabular-nums', DATA_NOIR.negative)}>
                    {formatEur(p.montant_ttc)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
