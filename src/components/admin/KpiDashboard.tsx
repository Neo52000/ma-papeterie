import {
  TrendingUp,
  ShoppingCart,
  DollarSign,
  BarChart3,
  Globe,
  UserPlus,
  Percent,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Database,
} from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useKpiDashboard } from '@/hooks/admin/useKpiDashboard';
import { useIcecatStats } from '@/hooks/useIcecatEnrich';
import { supabase } from '@/integrations/supabase/client';
import { KpiCard } from './kpi/KpiCard';
import { SecondaryKpiCard } from './kpi/SecondaryKpiCard';
import { RevenueChart } from './kpi/RevenueChart';
import { ConversionChart } from './kpi/ConversionChart';
import { SchoolListWidget } from './kpi/SchoolListWidget';
import { RecentActivityWidget } from './kpi/RecentActivityWidget';
import { SystemStatusWidget } from './kpi/SystemStatusWidget';
import { ProductUpdateWidget } from './kpi/ProductUpdateWidget';

const formatEUR = (v: number) =>
  v.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

const formatNumber = (v: number) => v.toLocaleString('fr-FR');

const formatPercent = (v: number) => `${v.toFixed(2)}%`;

const formatMargin = (v: number) => `${v.toFixed(1)}%`;

function formatWeekDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function SkeletonCard() {
  return (
    <div
      className="h-36 rounded-2xl animate-pulse"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    />
  );
}

function SkeletonChart() {
  return (
    <div
      className="h-80 rounded-2xl animate-pulse"
      style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    />
  );
}

function IcecatKpiCard({ stats }: { stats: { enriched: number; total_with_ean: number; enriched_pct: number; not_enriched: number } }) {
  const pct = stats.enriched_pct;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#3B82F6';
  return (
    <a
      href="/admin/icecat-enrich"
      className="kpi-card-enter rounded-2xl p-4 flex flex-col gap-2 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer group no-underline"
      style={{
        background: `linear-gradient(135deg, ${color}10, rgba(255, 255, 255, 0.03))`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '250ms',
      }}
    >
      <div className="flex items-center gap-2">
        <Database className="h-4 w-4" style={{ color }} />
        <span className="text-xs font-medium" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
          Enrichissement Icecat
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
        >
          {pct}%
        </span>
        <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>
          {stats.enriched}/{stats.total_with_ean}
        </span>
      </div>
      {/* Mini progress bar */}
      <div className="w-full h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </a>
  );
}

export function KpiDashboard() {
  const { data, isLoading, error } = useKpiDashboard();
  const { data: icecatStats } = useIcecatStats();
  const queryClient = useQueryClient();

  const computeMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await supabase.functions.invoke('compute-kpi-snapshot', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      if (resp.error) throw resp.error;
      return resp.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-dashboard'] });
    },
  });

  const handleRefresh = () => {
    computeMutation.mutate();
  };

  return (
    <div
      className="min-h-screen p-6 lg:p-8 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0f0b1e 0%, #1a1145 25%, #0d1b2a 50%, #0a0e1a 100%)',
      }}
    >
      {/* Glow overlays */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 15% 10%, rgba(139, 92, 246, 0.15), transparent 50%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.1), transparent 50%)',
        }}
      />
      <div className="relative z-10">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Mono:wght@400;700&display=swap');

        @keyframes kpiCardEnter {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .kpi-card-enter {
          animation: kpiCardEnter 0.4s ease-out both;
        }
      `}</style>

      {/* Error banner */}
      {error && (
        <div
          className="mb-6 rounded-lg px-4 py-3 flex items-center gap-2 text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Erreur lors du chargement des KPIs : {(error as Error).message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
          >
            Dashboard
          </h1>
          {data?.current && (
            <p className="text-sm mt-1" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>
              Semaine du {formatWeekDate(data.current.week_start)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {data?.current && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                background: data.current.shopify_sync_errors > 0
                  ? 'rgba(239,68,68,0.1)'
                  : 'rgba(16,185,129,0.1)',
                color: data.current.shopify_sync_errors > 0 ? '#EF4444' : '#10B981',
                border: `1px solid ${data.current.shopify_sync_errors > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
              }}
            >
              {data.current.shopify_sync_errors > 0 ? (
                <>
                  <XCircle className="h-3 w-3" />
                  {data.current.shopify_sync_errors} erreurs sync
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3" />
                  Sync OK
                </>
              )}
            </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={computeMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 hover:bg-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#9CA3AF',
            }}
          >
            <RefreshCw className={`h-3 w-3 ${computeMutation.isPending ? 'animate-spin' : ''}`} />
            {computeMutation.isPending ? 'Calcul…' : 'Recalculer les KPIs'}
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </>
      )}

      {/* Empty state */}
      {!isLoading && !data?.current && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BarChart3 className="h-16 w-16 mb-4" style={{ color: '#374151' }} />
          <h2
            className="text-lg font-semibold mb-2"
            style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
          >
            Aucune donnée
          </h2>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            La première semaine apparaîtra ici dès qu'un snapshot sera enregistré.
          </p>
        </div>
      )}

      {/* Data state */}
      {data?.current && data.deltas && (
        <>
          {/* Primary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Chiffre d'affaires"
              icon={DollarSign}
              accentColor="#F59E0B"
              delta={data.deltas.revenue}
              formatValue={formatEUR}
              sparklineData={data.snapshots.map((s) => ({ value: s.revenue_ttc }))}
              sparklineColor="#F59E0B"
              index={0}
            />
            <KpiCard
              label="Commandes"
              icon={ShoppingCart}
              accentColor="#3B82F6"
              delta={data.deltas.orders}
              formatValue={formatNumber}
              sparklineData={data.snapshots.map((s) => ({ value: s.orders }))}
              sparklineColor="#3B82F6"
              index={1}
            />
            <KpiCard
              label="Panier moyen"
              icon={TrendingUp}
              accentColor="#F59E0B"
              delta={data.deltas.aov}
              formatValue={formatEUR}
              sparklineData={data.snapshots.map((s) => ({ value: s.aov }))}
              sparklineColor="#F59E0B"
              index={2}
            />
            <KpiCard
              label="Taux de conversion"
              icon={BarChart3}
              accentColor="#10B981"
              delta={data.deltas.conversion}
              formatValue={formatPercent}
              sparklineData={data.snapshots.map((s) => ({ value: s.conversion_rate * 100 }))}
              sparklineColor="#10B981"
              index={3}
            />
          </div>

          {/* Secondary KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <SecondaryKpiCard
              label="Sessions organiques"
              icon={Globe}
              accentColor="#3B82F6"
              delta={data.deltas.sessions}
              formatValue={formatNumber}
              index={0}
            />
            <SecondaryKpiCard
              label="Nouveaux clients"
              icon={UserPlus}
              accentColor="#3B82F6"
              delta={data.deltas.newCustomers}
              formatValue={formatNumber}
              index={1}
            />
            <SecondaryKpiCard
              label="Marge brute moyenne"
              icon={Percent}
              accentColor="#F59E0B"
              delta={data.deltas.margin}
              formatValue={formatMargin}
              index={2}
            />
            <SecondaryKpiCard
              label="Erreurs sync Shopify"
              icon={AlertCircle}
              accentColor={data.current.shopify_sync_errors > 0 ? '#EF4444' : '#10B981'}
              delta={{
                value: data.current.shopify_sync_errors,
                delta: 0,
                deltaPercent: 0,
                trend: data.current.shopify_sync_errors > 0 ? 'down' : 'up',
              }}
              formatValue={(v) => (v === 0 ? '0' : String(v))}
              index={3}
            />
            {icecatStats && (
              <IcecatKpiCard stats={icecatStats} />
            )}
          </div>

          {/* Charts + Activity Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <RevenueChart snapshots={data.snapshots} />
            </div>
            <RecentActivityWidget />
          </div>

          {/* Chart + Status Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <ConversionChart snapshots={data.snapshots} />
            </div>
            <SystemStatusWidget shopifySyncErrors={data.current.shopify_sync_errors} />
          </div>

          {/* Product Update KPI */}
          <div className="mb-6">
            <ProductUpdateWidget />
          </div>

          {/* School List Widget */}
          <SchoolListWidget
            snapshots={data.snapshots}
            current={data.current}
            schoolListDelta={data.deltas.schoolList}
          />
        </>
      )}
      </div>
    </div>
  );
}
