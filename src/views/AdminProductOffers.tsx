import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { ProductRollupHeader } from "@/components/admin/ProductRollupHeader";
import { OffersAlerts } from "@/components/admin/OffersAlerts";
import { OffersTable } from "@/components/admin/OffersTable";
import { useProductOffers } from "@/hooks/useProductOffers";
import { useRecomputeRollups } from "@/hooks/useRecomputeRollups";

interface ProductRollup {
  id: string;
  name: string;
  ean: string | null;
  public_price_ttc: number | null;
  public_price_source: string | null;
  public_price_updated_at: string | null;
  is_available: boolean;
  available_qty_total: number;
  family: string | null;
  subfamily: string | null;
  cost_price: number | null;
  margin_percent: number | null;
}

export default function AdminProductOffers() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: product, isLoading: productLoading } = useQuery<ProductRollup>({
    queryKey: ['product-rollup', id],
    queryFn: async () => {
      if (!id) throw new Error("id requis");
      const { data, error } = await supabase
        .from('products')
        .select('id, name, ean, public_price_ttc, public_price_source, public_price_updated_at, is_available, available_qty_total, family, subfamily, cost_price, margin_percent')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as ProductRollup;
    },
    enabled: !!id,
  });

  const { offers, isLoading: offersLoading, toggleActive, setPreferred, setPriorityRank } = useProductOffers(id);
  const recomputeMutation = useRecomputeRollups(id);

  const isLoading = productLoading || offersLoading;

  return (
    <AdminLayout title="Offres fournisseurs">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/products')}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux produits
        </Button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !product ? (
          <div className="text-center py-12 text-muted-foreground">
            Produit introuvable.
          </div>
        ) : (
          <>
            <ProductRollupHeader
              productName={product.name}
              publicPriceTtc={product.public_price_ttc}
              publicPriceSource={product.public_price_source}
              publicPriceUpdatedAt={product.public_price_updated_at}
              isAvailable={product.is_available ?? false}
              availableQtyTotal={product.available_qty_total ?? 0}
              onRecompute={() => recomputeMutation.mutate()}
              isRecomputing={recomputeMutation.isPending}
              costPrice={product.cost_price}
              marginPercent={product.margin_percent}
            />

            <OffersAlerts
              publicPriceSource={product.public_price_source}
              publicPriceTtc={product.public_price_ttc}
              isAvailable={product.is_available ?? false}
              hasOffers={offers.length > 0}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  Offres fournisseurs
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({offers.length} offre{offers.length !== 1 ? 's' : ''})
                  </span>
                </h2>
              </div>
              <OffersTable
                offers={offers as any}
                onToggle={(offerId, isActive) => toggleActive.mutate({ offerId, isActive })}
                isToggling={toggleActive.isPending}
                onSetPreferred={(offerId, isPreferred) => setPreferred.mutate({ offerId, isPreferred })}
                isSettingPreferred={setPreferred.isPending}
                onSetPriorityRank={(offerId, rank) => setPriorityRank.mutate({ offerId, rank })}
                isSettingRank={setPriorityRank.isPending}
              />
            </div>

            {(product.family || product.subfamily) && (
              <div className="text-xs text-muted-foreground border-t pt-4">
                Famille : <span className="font-medium">{product.family ?? "—"}</span>
                {product.subfamily && (
                  <> · Sous-famille : <span className="font-medium">{product.subfamily}</span></>
                )}
                &nbsp;— utilisées pour le calcul du coefficient si pas de PVP
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
