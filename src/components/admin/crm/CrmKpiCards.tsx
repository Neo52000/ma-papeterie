import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp, Target, Heart, ShoppingCart, FileText, AlertCircle, DollarSign,
} from "lucide-react";
import type { CrmKpis } from "@/hooks/admin/useAdminCrmKpis";
import { Skeleton } from "@/components/ui/skeleton";

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

interface Props {
  kpis: CrmKpis | undefined;
  isLoading: boolean;
}

export function CrmKpiCards({ kpis, isLoading }: Props) {
  if (isLoading || !kpis) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Pipeline pondere",
      value: fmtPrice(kpis.pipelineWeighted),
      sub: `${kpis.pipelineDealsCount} deals actifs`,
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      label: "Taux conversion",
      value: `${kpis.winRate}%`,
      sub: "Won / Total",
      icon: Target,
      color: "text-green-500",
    },
    {
      label: "CLV moyen",
      value: fmtPrice(kpis.avgClv),
      sub: "Valeur vie client",
      icon: Heart,
      color: "text-pink-500",
    },
    {
      label: "Paniers recuperes",
      value: `${kpis.recoveryRate}%`,
      sub: `${kpis.abandonedCartsRecovered}/${kpis.abandonedCartsTotal}`,
      icon: ShoppingCart,
      color: "text-amber-500",
    },
    {
      label: "Devis en attente",
      value: String(kpis.pendingQuotes),
      sub: fmtPrice(kpis.pendingQuotesValue),
      icon: FileText,
      color: "text-purple-500",
    },
    {
      label: "Taches en retard",
      value: String(kpis.overdueTasks),
      sub: kpis.overdueTasks > 0 ? "Action requise" : "Tout est a jour",
      icon: AlertCircle,
      color: kpis.overdueTasks > 0 ? "text-red-500" : "text-green-500",
    },
    {
      label: "Pipeline total",
      value: fmtPrice(kpis.pipelineTotal),
      sub: "Valeur brute",
      icon: DollarSign,
      color: "text-indigo-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                  <p className="text-lg font-bold truncate">{card.value}</p>
                  <p className="text-xs text-muted-foreground truncate">{card.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
