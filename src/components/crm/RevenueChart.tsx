import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Line, ComposedChart,
} from "recharts";
import { useMonthlyRevenue } from "@/hooks/useCustomers";

export function RevenueChart() {
  const { data, isLoading } = useMonthlyRevenue();

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Evolution du CA</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader><CardTitle>Evolution du CA</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Pas assez de données</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Evolution du CA (12 derniers mois)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis
              yAxisId="revenue"
              orientation="left"
              className="text-xs"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              yAxisId="orders"
              orientation="right"
              className="text-xs"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === "revenue"
                  ? [`${value.toFixed(2)} €`, "Chiffre d'affaires"]
                  : [value, "Commandes"]
              }
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar yAxisId="revenue" dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} opacity={0.8} />
            <Line yAxisId="orders" type="monotone" dataKey="orders" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
