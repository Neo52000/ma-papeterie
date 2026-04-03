import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ExternalLink, Check, Image as ImageIcon } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";

const db = supabase as unknown as SupabaseClient;

interface IcecatData {
  id: string;
  name: string;
  ean: string | null;
  brand: string | null;
  icecat_id: number | null;
  icecat_enriched_at: string | null;
  icecat_title: string | null;
  icecat_description: string | null;
  icecat_images: Array<{ url: string; is_main: boolean }> | null;
  specifications: Record<string, Array<{ feature: string; value: string; unit: string }>> | null;
  bullet_points: string[] | null;
  reasons_to_buy: Array<{ title: string; description: string; image?: string }> | null;
  icecat_brand_logo: string | null;
  icecat_warranty: string | null;
  icecat_leaflet_url: string | null;
  icecat_manual_url: string | null;
  icecat_category: string | null;
}

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IcecatProductPreview({ productId, open, onOpenChange }: Props) {
  const { data, isLoading } = useQuery<IcecatData | null>({
    queryKey: ["icecat-preview", productId],
    enabled: !!productId && open,
    queryFn: async () => {
      if (!productId) return null;
      const { data: row, error } = await db
        .from("products")
        .select(
          "id, name, ean, brand, icecat_id, icecat_enriched_at, icecat_title, icecat_description, icecat_images, specifications, bullet_points, reasons_to_buy, icecat_brand_logo, icecat_warranty, icecat_leaflet_url, icecat_manual_url, icecat_category",
        )
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return row as unknown as IcecatData | null;
    },
    staleTime: 60_000,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {isLoading ? <Skeleton className="h-6 w-48" /> : data?.name ?? "Produit"}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !data?.icecat_enriched_at ? (
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Ce produit n'a pas encore été enrichi via Icecat.
          </p>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Status */}
            <div className="flex items-center gap-3 flex-wrap">
              {data.icecat_id ? (
                <Badge className="bg-green-100 text-green-800">Enrichi — ID {data.icecat_id}</Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300">Non trouvé dans Icecat</Badge>
              )}
              {data.icecat_category && (
                <Badge variant="secondary">{data.icecat_category}</Badge>
              )}
            </div>

            {/* Brand logo + title */}
            {(data.icecat_brand_logo || data.icecat_title) && (
              <div className="flex items-center gap-3">
                {data.icecat_brand_logo && (
                  <img
                    src={data.icecat_brand_logo}
                    alt={data.brand ?? ""}
                    className="h-8 object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                {data.icecat_title && (
                  <p className="text-sm font-medium">{data.icecat_title}</p>
                )}
              </div>
            )}

            {/* Bullet points */}
            {data.bullet_points && data.bullet_points.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Points clés</h4>
                  <ul className="space-y-1">
                    {data.bullet_points.map((bp, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {bp}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {data.icecat_description && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Description Icecat</h4>
                  <div
                    className="text-sm text-muted-foreground prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.icecat_description) }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Images */}
            {data.icecat_images && data.icecat_images.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" /> Images ({data.icecat_images.length})
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {data.icecat_images.map((img, i) => (
                      <a key={i} href={img.url} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                          src={img.url}
                          alt={`Image ${i + 1}`}
                          className="w-full h-24 object-contain rounded border bg-white"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Specifications */}
            {data.specifications && Object.keys(data.specifications).length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h4 className="font-semibold text-sm">
                    Spécifications ({Object.keys(data.specifications).length} groupes)
                  </h4>
                  {Object.entries(data.specifications).map(([group, features]) => (
                    <div key={group}>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">{group}</p>
                      <dl className="space-y-1">
                        {features.map((f, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <dt className="text-muted-foreground">{f.feature}</dt>
                            <dd className="font-medium text-right">{f.value}{f.unit ? ` ${f.unit}` : ""}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Reasons to buy */}
            {data.reasons_to_buy && data.reasons_to_buy.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold text-sm mb-2">Raisons d'acheter</h4>
                  <div className="space-y-3">
                    {data.reasons_to_buy.map((r, i) => (
                      <div key={i} className="flex gap-3">
                        {r.image && (
                          <img
                            src={r.image}
                            alt=""
                            className="h-12 w-12 object-contain shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Documentation & Warranty */}
            {(data.icecat_warranty || data.icecat_leaflet_url || data.icecat_manual_url) && (
              <Card>
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-sm">Documents & Garantie</h4>
                  {data.icecat_warranty && (
                    <p className="text-sm text-muted-foreground">{data.icecat_warranty}</p>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    {data.icecat_leaflet_url && (
                      <a
                        href={data.icecat_leaflet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" /> Fiche produit
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {data.icecat_manual_url && (
                      <a
                        href={data.icecat_manual_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4" /> Manuel
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
