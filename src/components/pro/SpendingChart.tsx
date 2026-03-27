import { lazy, Suspense, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MonthlySpending } from '@/hooks/useB2BDashboardStats';

const LazyChart = lazy(() =>
  import('recharts').then(mod => ({
    default: function SpendingAreaChart({ data }: { data: MonthlySpending[] }) {
      const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } = mod;

      return (
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215,85%,35%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(215,85%,35%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis
              className="text-xs"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) => `${v.toLocaleString('fr-FR')} €`}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }),
                'Dépenses',
              ]}
              contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid hsl(215,15%,85%)' }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="hsl(215,85%,35%)"
              strokeWidth={2}
              fill="url(#spendingGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    },
  })),
);

interface SpendingChartProps {
  data: MonthlySpending[];
  isLoading: boolean;
}

export function SpendingChart({ data, isLoading }: SpendingChartProps) {
  const hasData = useMemo(() => data.some(d => d.amount > 0), [data]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Dépenses mensuelles (12 mois)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[250px] animate-pulse bg-muted rounded-lg" />
        ) : !hasData ? (
          <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée de dépenses disponible
          </div>
        ) : (
          <Suspense fallback={<div className="h-[250px] animate-pulse bg-muted rounded-lg" />}>
            <LazyChart data={data} />
          </Suspense>
        )}
      </CardContent>
    </Card>
  );
}
