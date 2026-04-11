import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const SEGMENT_COLORS: Record<string, string> = {
  Champions: "#f59e0b",
  Loyaux: "#3b82f6",
  Prometteurs: "#10b981",
  "À risque": "#f97316",
  Perdus: "#ef4444",
  Nouveau: "#6b7280",
  // English keys
  champion: "#f59e0b",
  loyal: "#3b82f6",
  promising: "#10b981",
  at_risk: "#f97316",
  lost: "#ef4444",
  new: "#6b7280",
};

interface Props {
  segments: Array<{ segment: string; count: number }>;
  isLoading: boolean;
}

export function RfmDonutChart({ segments, isLoading }: Props) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segments RFM</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!segments || segments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segments RFM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Aucune donnee RFM disponible
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = segments.map((s) => ({
    name: s.segment,
    value: s.count,
    fill: SEGMENT_COLORS[s.segment] ?? "#94a3b8",
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Segments RFM</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value} clients`, ""]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => (
                <span className="text-xs">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
