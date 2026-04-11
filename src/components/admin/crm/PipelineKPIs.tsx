import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Target, BarChart3, Trophy } from "lucide-react";
import type { PipelineDeal } from "@/hooks/admin/usePipeline";

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

interface Props {
  deals: PipelineDeal[];
}

export function PipelineKPIs({ deals }: Props) {
  const activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
  const wonDeals = deals.filter((d) => d.stage === "won");
  const closedDeals = deals.filter((d) => ["won", "lost"].includes(d.stage));

  const pipelineTotal = activeDeals.reduce(
    (sum, d) => sum + (d.estimated_value ?? 0), 0,
  );
  const pipelineWeighted = activeDeals.reduce(
    (sum, d) => sum + (d.weighted_value ?? 0), 0,
  );
  const winRate = closedDeals.length > 0
    ? Math.round((wonDeals.length / closedDeals.length) * 100)
    : 0;

  const kpis = [
    {
      label: "Pipeline total",
      value: fmtPrice(pipelineTotal),
      icon: BarChart3,
      color: "text-blue-500",
    },
    {
      label: "CA pondere",
      value: fmtPrice(pipelineWeighted),
      icon: TrendingUp,
      color: "text-indigo-500",
    },
    {
      label: "Deals actifs",
      value: String(activeDeals.length),
      icon: Target,
      color: "text-amber-500",
    },
    {
      label: "Taux de conversion",
      value: `${winRate}%`,
      icon: Trophy,
      color: "text-green-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-lg font-bold">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
