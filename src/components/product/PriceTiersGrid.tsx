import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PriceTier {
  tier: number;
  min_qty: number;
  price_ht: number;
  price_pvp: number | null;
  tax_cop: number;
  tax_d3e: number;
}

interface PriceTiersGridProps {
  tiers: PriceTier[];
  currentQty?: number;
  vatRate?: number;
}

export function PriceTiersGrid({ tiers, currentQty = 1, vatRate = 20 }: PriceTiersGridProps) {
  if (!tiers || tiers.length === 0) return null;

  const sortedTiers = [...tiers].sort((a, b) => a.tier - b.tier);

  const getActiveTier = () => {
    let active = sortedTiers[0];
    for (const tier of sortedTiers) {
      if (currentQty >= tier.min_qty) active = tier;
    }
    return active;
  };

  const activeTier = getActiveTier();

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Prix dégressifs</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Qté min.</TableHead>
            <TableHead className="text-xs">Prix HT</TableHead>
            <TableHead className="text-xs">Prix TTC</TableHead>
            <TableHead className="text-xs">Éco-taxes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTiers.map((tier) => {
            const isActive = tier.tier === activeTier.tier;
            const priceTTC = tier.price_ht * (1 + vatRate / 100);
            const ecoTotal = (tier.tax_cop || 0) + (tier.tax_d3e || 0);

            return (
              <TableRow
                key={tier.tier}
                className={isActive ? 'bg-primary/5 font-medium' : ''}
              >
                <TableCell className="text-sm">
                  {tier.min_qty}+
                  {isActive && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Actif
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">{tier.price_ht.toFixed(2)} €</TableCell>
                <TableCell className="text-sm font-medium">{priceTTC.toFixed(2)} €</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {ecoTotal > 0 ? `+${ecoTotal.toFixed(4)} €` : '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
