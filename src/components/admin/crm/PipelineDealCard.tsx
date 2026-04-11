import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Calendar, DollarSign, Percent } from "lucide-react";
import type { PipelineDeal } from "@/hooks/admin/usePipeline";

const fmtPrice = (v: number | null) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v ?? 0);

interface Props {
  deal: PipelineDeal;
  onClick?: () => void;
}

export function PipelineDealCard({ deal, onClick }: Props) {
  const isWon = deal.stage === "won";
  const isLost = deal.stage === "lost";

  return (
    <Card
      className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isWon ? "border-green-200 bg-green-50" : isLost ? "border-red-200 bg-red-50" : ""
      }`}
      onClick={onClick}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4 className="text-sm font-semibold line-clamp-1">{deal.company_name}</h4>
          {deal.source && (
            <Badge variant="outline" className="text-[10px] h-4 flex-shrink-0">
              {deal.source}
            </Badge>
          )}
        </div>

        {deal.contact_name && (
          <p className="text-xs text-muted-foreground">{deal.contact_name}</p>
        )}

        <div className="flex items-center gap-3 text-xs">
          {deal.estimated_value != null && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {fmtPrice(deal.estimated_value)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Percent className="h-3 w-3" />
            {deal.probability}%
          </span>
        </div>

        {deal.next_action && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span className="line-clamp-1">{deal.next_action}</span>
            {deal.next_action_date && (
              <span className="flex-shrink-0">
                {new Date(deal.next_action_date).toLocaleDateString("fr-FR")}
              </span>
            )}
          </div>
        )}

        {isLost && deal.lost_reason && (
          <p className="text-xs text-red-600 line-clamp-1">
            Raison : {deal.lost_reason}
          </p>
        )}

        {deal.weighted_value != null && (
          <p className="text-[10px] text-muted-foreground">
            Pondere : {fmtPrice(deal.weighted_value)}
          </p>
        )}
      </div>
    </Card>
  );
}
