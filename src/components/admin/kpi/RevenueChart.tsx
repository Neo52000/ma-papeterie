import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type KpiSnapshot } from '@/hooks/admin/useKpiDashboard';

interface RevenueChartProps {
  snapshots: KpiSnapshot[];
}

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

interface TooltipPayloadEntry {
  value: number;
  payload: { orders: number };
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: '#1F2937',
        border: '1px solid #374151',
        color: '#F9FAFB',
        fontFamily: "'DM Mono', 'Space Mono', monospace",
      }}
    >
      <p style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif' }}>{label}</p>
      <p className="font-bold" style={{ color: '#F59E0B' }}>
        {payload[0].value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
      </p>
      <p style={{ color: '#9CA3AF' }}>
        {payload[0].payload.orders} commandes
      </p>
    </div>
  );
}

export function RevenueChart({ snapshots }: RevenueChartProps) {
  const data = snapshots.map((s) => ({
    label: formatWeekLabel(s.week_start),
    revenue: s.revenue_ttc,
    orders: s.orders,
  }));

  return (
    <div
      className="kpi-card-enter rounded-xl p-5"
      style={{
        background: '#111827',
        border: '1px solid #1F2937',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.4)',
        animationDelay: '400ms',
      }}
    >
      <h3
        className="text-sm font-semibold mb-4"
        style={{ color: '#F9FAFB', fontFamily: 'Poppins, sans-serif' }}
      >
        Chiffre d'affaires — 12 semaines
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: 'Poppins, sans-serif' }}
              axisLine={{ stroke: '#1F2937' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatCompact}
              tick={{ fill: '#9CA3AF', fontSize: 11, fontFamily: "'DM Mono', monospace" }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#F59E0B"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: '#F59E0B', stroke: '#111827', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
