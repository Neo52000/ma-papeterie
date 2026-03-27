import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatusDistribution } from '@/hooks/useB2BDashboardStats';

interface OrderStatusChartProps {
  data: StatusDistribution[];
  total: number;
  isLoading: boolean;
}

export function OrderStatusChart({ data, total, isLoading }: OrderStatusChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-[250px] animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Répartition des commandes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune commande
          </div>
        ) : (
          <>
            {/* Stacked horizontal bar */}
            <div className="flex rounded-full overflow-hidden h-3">
              {data.map(item => (
                <div
                  key={item.status}
                  className="transition-all"
                  style={{
                    width: `${(item.count / total) * 100}%`,
                    backgroundColor: item.color,
                    minWidth: item.count > 0 ? 4 : 0,
                  }}
                />
              ))}
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4">
              {data.map(item => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="font-medium tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
