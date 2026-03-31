import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { type KpiSnapshot } from '@/hooks/admin/useKpiDashboard';

interface ConversionChartProps {
  snapshots: KpiSnapshot[];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface ConversionTooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: ConversionTooltipPayloadEntry[];
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
      <p className="mb-1" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name === 'sessions' ? 'Sessions' : 'Conversion'} :{' '}
          <span className="font-bold">
            {entry.name === 'sessions' ? entry.value : `${entry.value.toFixed(2)}%`}
          </span>
        </p>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null;
  return (
    <div className="flex items-center gap-4 mb-2 justify-end">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
          {entry.value === 'sessions' ? 'Sessions' : 'Taux conversion'}
        </div>
      ))}
    </div>
  );
}

export function ConversionChart({ snapshots }: ConversionChartProps) {
  const data = snapshots.map((s) => ({
    label: formatWeekLabel(s.week_start),
    sessions: s.sessions,
    conversion: s.conversion_rate * 100,
  }));

  return (
    <div
      className="kpi-card-enter rounded-2xl p-5"
      style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.06), rgba(255, 255, 255, 0.03))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        animationDelay: '450ms',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
      >
        Sessions & Conversion — 12 semaines
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.06)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={<CustomLegend />} />
            <Bar
              yAxisId="left"
              dataKey="sessions"
              fill="#3B82F6"
              opacity={0.3}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversion"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: '#10B981', stroke: 'rgba(16, 185, 129, 0.3)', strokeWidth: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
