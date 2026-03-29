import { useMemo, lazy, Suspense } from "react";
import { useStockMovements } from "@/hooks/admin/useStockMovements";
import { Loader2 } from "lucide-react";

const LazyChart = lazy(() =>
  import("recharts").then((mod) => ({
    default: function StockChart({ data }: { data: Array<{ date: string; stock: number }> }) {
      return (
        <mod.ResponsiveContainer width="100%" height={300}>
          <mod.LineChart data={data}>
            <mod.CartesianGrid strokeDasharray="3 3" />
            <mod.XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <mod.YAxis tick={{ fontSize: 12 }} />
            <mod.Tooltip />
            <mod.Line
              type="monotone"
              dataKey="stock"
              stroke="hsl(215, 85%, 35%)"
              strokeWidth={2}
              dot={false}
            />
          </mod.LineChart>
        </mod.ResponsiveContainer>
      );
    },
  })),
);

interface StockMovementChartProps {
  productId?: string | null;
}

export function StockMovementChart({ productId }: StockMovementChartProps) {
  const { data: movements, isLoading } = useStockMovements({
    productId,
    pageSize: 200,
  });

  const chartData = useMemo(() => {
    if (!movements?.length) return [];

    // Build daily stock snapshots from movements (newest first → reverse)
    const reversed = [...movements].reverse();
    const dailyMap = new Map<string, number>();

    for (const m of reversed) {
      const date = new Date(m.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
      });
      if (m.stock_after != null) {
        dailyMap.set(date, m.stock_after);
      }
    }

    return Array.from(dailyMap.entries()).map(([date, stock]) => ({ date, stock }));
  }, [movements]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Aucun mouvement à afficher.
      </p>
    );
  }

  return (
    <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto" />}>
      <LazyChart data={chartData} />
    </Suspense>
  );
}
