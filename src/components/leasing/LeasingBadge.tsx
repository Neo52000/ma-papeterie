import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLeasingCalculator } from "@/hooks/useLeasingCalculator";
import { LEASING_MIN_PRODUCT_HT, LEASING_DISCLAIMER, isCategoryEligible } from "@/lib/leasingConstants";

interface LeasingBadgeProps {
  priceHT: number;
  category: string;
  className?: string;
}

export function LeasingBadge({ priceHT, category, className = "" }: LeasingBadgeProps) {
  const { monthlyHT, monthlyTTC, isEligible } = useLeasingCalculator(priceHT, 36);

  if (!isEligible || priceHT < LEASING_MIN_PRODUCT_HT || !isCategoryEligible(category)) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Ou <span className="font-semibold text-foreground">≈ {monthlyHT.toFixed(2)} € HT/mois</span> en leasing
          <span className="text-xs ml-1">({monthlyTTC.toFixed(2)} € TTC)</span>
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            <p className="font-medium mb-1">Financement Leasecom</p>
            <p>0 € d'apport · Mensualités déductibles en charges · Durée flexible de 24 à 60 mois</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/leasing-mobilier-bureau"
          className="text-xs font-medium text-primary hover:underline"
        >
          Demander un devis leasing
        </Link>
      </div>
      <p className="text-[10px] text-muted-foreground leading-tight">{LEASING_DISCLAIMER}</p>
    </div>
  );
}
