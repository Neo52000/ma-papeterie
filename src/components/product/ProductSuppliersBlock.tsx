import { useProductSuppliers } from "@/hooks/useProductSuppliers";
import { useSupplierOffers, SupplierOffer } from "@/hooks/useSupplierOffers";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Package, Star, Clock, Truck, CircleDot } from "lucide-react";

interface ProductSuppliersBlockProps {
  productId: string;
  ean?: string | null;
}

// Priorité fournisseurs : ALKOR (1) > COMLANDI (2) > SOFT (3) > direct (4)
const SUPPLIER_PRIORITY: Record<string, number> = {
  ALKOR: 1,
  BUROLIKE: 1,
  COMLANDI: 2,
  'CS GROUP': 2,
  LIDERPAPEL: 2,
  SOFT: 3,
  SOFTCARRIER: 3,
  'SOFT CARRIER': 3,
};

function getSupplierPriority(name: string): number {
  const upper = name.toUpperCase();
  for (const [key, prio] of Object.entries(SUPPLIER_PRIORITY)) {
    if (upper.includes(key)) return prio;
  }
  return 4; // fabricant direct / autre
}

// Résoudre le nom d'un fournisseur depuis l'enum supplier_offers
function offerSupplierLabel(supplier: string): string {
  switch (supplier) {
    case 'ALKOR': return 'Alkor / Burolike';
    case 'COMLANDI': return 'Comlandi / CS Group';
    case 'SOFT': return 'Soft Carrier';
    default: return supplier;
  }
}

// Normaliser l'enum supplier_offers vers une clé de déduplication
function offerSupplierKey(supplier: string): string {
  switch (supplier) {
    case 'ALKOR': return 'ALKOR';
    case 'COMLANDI': return 'COMLANDI';
    case 'SOFT': return 'SOFT';
    default: return supplier;
  }
}

// Normaliser le nom legacy vers une clé de déduplication
function legacySupplierKey(name: string): string | null {
  const upper = name.toUpperCase();
  if (upper.includes('ALKOR') || upper.includes('BUROLIKE')) return 'ALKOR';
  if (upper.includes('COMLANDI') || upper.includes('CS GROUP') || upper.includes('LIDERPAPEL')) return 'COMLANDI';
  if (upper.includes('SOFT')) return 'SOFT';
  return null;
}

interface UnifiedSupplier {
  key: string;
  name: string;
  reference: string | null;
  priceHt: number | null;
  pvpTtc: number | null;
  stockQty: number | null;
  leadTimeDays: number | null;
  isPreferred: boolean;
  isActive: boolean;
  priority: number;
  source: 'offer' | 'legacy';
}

function mergeSuppliers(
  offers: SupplierOffer[],
  legacySuppliers: { supplier_name: string; supplier_reference: string | null; supplier_price: number | null; stock_quantity: number | null; lead_time_days: number | null; is_preferred: boolean }[],
): UnifiedSupplier[] {
  const map = new Map<string, UnifiedSupplier>();

  // D'abord les offres modernes (source de vérité)
  for (const offer of offers) {
    const key = offerSupplierKey(offer.supplier);
    map.set(key, {
      key,
      name: offerSupplierLabel(offer.supplier),
      reference: offer.supplier_product_id,
      priceHt: offer.purchase_price_ht,
      pvpTtc: offer.pvp_ttc,
      stockQty: offer.stock_qty,
      leadTimeDays: offer.delivery_delay_days,
      isPreferred: false,
      isActive: offer.is_active,
      priority: getSupplierPriority(key),
      source: 'offer',
    });
  }

  // Ensuite les legacy — compléter sans écraser les offres modernes
  for (const sp of legacySuppliers) {
    const modernKey = legacySupplierKey(sp.supplier_name);
    const key = modernKey || sp.supplier_name;

    if (map.has(key)) {
      // Enrichir avec les données legacy manquantes
      const existing = map.get(key)!;
      if (existing.priceHt == null && sp.supplier_price != null) existing.priceHt = sp.supplier_price;
      if (existing.stockQty == null && sp.stock_quantity != null) existing.stockQty = sp.stock_quantity;
      if (existing.leadTimeDays == null && sp.lead_time_days != null) existing.leadTimeDays = sp.lead_time_days;
      if (sp.is_preferred) existing.isPreferred = true;
    } else {
      map.set(key, {
        key,
        name: sp.supplier_name,
        reference: sp.supplier_reference,
        priceHt: sp.supplier_price,
        pvpTtc: null,
        stockQty: sp.stock_quantity,
        leadTimeDays: sp.lead_time_days,
        isPreferred: sp.is_preferred,
        isActive: true,
        priority: getSupplierPriority(key),
        source: 'legacy',
      });
    }
  }

  // Trier par priorité puis par prix
  return [...map.values()].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (a.priceHt ?? Infinity) - (b.priceHt ?? Infinity);
  });
}

export function ProductSuppliersBlock({ productId, ean }: ProductSuppliersBlockProps) {
  const { isAdmin } = useAuth();
  const { data: legacySuppliers, isLoading: legacyLoading } = useProductSuppliers(productId, ean);
  const { offers, isLoading: offersLoading } = useSupplierOffers(productId, ean);

  if (!isAdmin) return null;

  const isLoading = legacyLoading || offersLoading;
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement fournisseurs...
      </div>
    );
  }

  const unified = mergeSuppliers(offers, legacySuppliers ?? []);
  if (unified.length === 0) return null;

  const prices = unified.filter(s => s.priceHt != null).map(s => s.priceHt!);
  const minPrice = prices.length > 0 ? Math.min(...prices) : null;

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Fournisseurs ({unified.length})
          <Badge variant="outline" className="ml-auto text-xs">Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {unified.map((sp, idx) => (
          <div key={sp.key}>
            {idx > 0 && <Separator className="mb-3" />}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{sp.name}</span>
                  {sp.priority === 1 && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Principal
                    </Badge>
                  )}
                  {sp.isPreferred && sp.priority !== 1 && (
                    <Badge className="bg-amber-500/20 text-amber-700 border-amber-300 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Préféré
                    </Badge>
                  )}
                  {sp.priceHt != null && minPrice != null && sp.priceHt === minPrice && unified.length > 1 && (
                    <Badge className="bg-green-500/20 text-green-700 border-green-300 text-xs">
                      Meilleur prix
                    </Badge>
                  )}
                  {!sp.isActive && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Inactif
                    </Badge>
                  )}
                </div>
                {sp.reference && (
                  <p className="text-xs text-muted-foreground">Réf: {sp.reference}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {sp.leadTimeDays != null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {sp.leadTimeDays}j
                    </span>
                  )}
                  {sp.stockQty != null && (
                    <span className="flex items-center gap-1">
                      <Truck className="h-3 w-3" />
                      Stock: {sp.stockQty}
                    </span>
                  )}
                  {sp.pvpTtc != null && (
                    <span className="flex items-center gap-1">
                      <CircleDot className="h-3 w-3" />
                      PVP: {sp.pvpTtc.toFixed(2)}€
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                {sp.priceHt != null ? (
                  <span className="font-bold text-sm">{sp.priceHt.toFixed(2)}€ HT</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Prix N/A</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
