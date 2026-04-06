/**
 * Island component for the shipping rates section.
 * Uses usePriceModeStore (Zustand) to toggle HT/TTC display.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";
import { usePriceModeStore } from "@/stores/priceModeStore";

const SHIPPING_RATES = [
  { label: "< 250g (Lettre suivie)", priceHt: 3.50, delay: "2-3 jours ouvrés" },
  { label: "250g – 1kg (Colissimo)", priceHt: 5.50, delay: "2-3 jours ouvrés" },
  { label: "1kg – 3kg", priceHt: 7.50, delay: "3-5 jours ouvrés" },
  { label: "> 3kg", priceHt: 9.50, delay: "3-5 jours ouvrés" },
] as const;

export default function ShippingRates() {
  const mode = usePriceModeStore((s) => s.mode);
  const fmt = (ht: number) => {
    const val = mode === "ttc" ? ht * 1.2 : ht;
    return `${val.toFixed(2)} €`;
  };
  const suffix = mode === "ttc" ? "TTC" : "HT";

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Frais de Livraison</h2>
        <Badge variant="outline">Prix {suffix}</Badge>
      </div>

      <div className="space-y-4">
        {SHIPPING_RATES.map((rate) => (
          <Card key={rate.label}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{rate.label}</h4>
                  <p className="text-sm text-muted-foreground">{rate.delay}</p>
                </div>
                <span className="font-bold text-primary">{fmt(rate.priceHt)} {suffix}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-primary">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold text-primary">Retrait en boutique</h4>
                  <p className="text-sm text-muted-foreground">Disponible sous 1h</p>
                </div>
              </div>
              <span className="font-bold text-primary">GRATUIT</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
