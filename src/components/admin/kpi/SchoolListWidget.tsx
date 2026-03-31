import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { ClipboardList } from 'lucide-react';
import { type KpiSnapshot, type KpiDelta } from '@/hooks/admin/useKpiDashboard';

interface SchoolListWidgetProps {
  snapshots: KpiSnapshot[];
  current: KpiSnapshot;
  schoolListDelta: KpiDelta;
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface SchoolTooltipPayloadEntry {
  value: number;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: SchoolTooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: 'rgba(15, 11, 30, 0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#F9FAFB',
        fontFamily: "'DM Mono', 'Space Mono', monospace",
      }}
    >
      <p style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>{label}</p>
      <p className="font-bold" style={{ color: '#10B981' }}>
        {payload[0].value} uploads
      </p>
    </div>
  );
}

export function SchoolListWidget({ snapshots, current, schoolListDelta }: SchoolListWidgetProps) {
  const last8 = snapshots.slice(-8);
  const data = last8.map((s) => ({
    label: formatWeekLabel(s.week_start),
    uploads: s.school_list_uploads,
  }));

  const trendIcon = schoolListDelta.trend === 'up' ? '↑' : schoolListDelta.trend === 'down' ? '↓' : '→';
  const trendColor = schoolListDelta.trend === 'up' ? '#10B981' : schoolListDelta.trend === 'down' ? '#EF4444' : '#9CA3AF';

  return (
    <div
      className="kpi-card-enter rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '500ms',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-4 w-4" style={{ color: '#10B981' }} />
        <h3
          className="text-sm font-semibold"
          style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
        >
          Listes Scolaires — Feature différenciante
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Uploads cette semaine</p>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
          >
            {current.school_list_uploads}
          </p>
          <span className="text-xs font-medium" style={{ color: trendColor }}>
            {trendIcon} {schoolListDelta.deltaPercent >= 0 ? '+' : ''}{schoolListDelta.deltaPercent.toFixed(1)}%
          </span>
        </div>

        <div>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Taux conversion liste</p>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
          >
            {(current.school_list_conversion_rate * 100).toFixed(0)}%
          </p>
        </div>

        <div>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Commandes générées</p>
          <p
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#F9FAFB', fontFamily: "'DM Mono', 'Space Mono', monospace" }}
          >
            {Math.round(current.school_list_uploads * current.school_list_conversion_rate)}
          </p>
        </div>
      </div>

      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'Poppins, sans-serif' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.06)' }}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="uploads"
              fill="#10B981"
              radius={[3, 3, 0, 0]}
              opacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
