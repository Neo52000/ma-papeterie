import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ShieldCheck, TrendingDown, TrendingUp, Minus,
  Clock, ExternalLink, ChevronDown, ChevronUp,
  MapPin, Wrench, AlertCircle, Truck,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { formatDistanceToNow } from "date-fns";
import { usePriceException, useTransparencyData, type TransparenceBadge } from "@/hooks/usePriceTransparency";

// ── Config badge ──────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<
  TransparenceBadge,
  { label: string; sublabel: string; className: string; icon: typeof ShieldCheck }
> = {
  best: {
    label: "Meilleur prix",
    sublabel: "Nous proposons le prix le plus bas du marché",
    className: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: TrendingDown,
  },
  comparable: {
    label: "Prix compétitif",
    sublabel: "Notre prix est dans la moyenne du marché",
    className: "bg-blue-50 border-blue-200 text-blue-800",
    icon: Minus,
  },
  expensive: {
    label: "Prix moins compétitif",
    sublabel: "Des offres similaires existent à prix inférieur",
    className: "bg-amber-50 border-amber-200 text-amber-800",
    icon: TrendingUp,
  },
  no_data: {
    label: "Aucune comparaison disponible",
    sublabel: "Relevés en cours…",
    className: "bg-gray-50 border-gray-200 text-gray-600",
    icon: AlertCircle,
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PrixTransparenceWidgetProps {
  productId: string;
  /** Prix TTC affiché sur la fiche produit */
  ourPriceTtc: number;
  /** Afficher ou non les CTAs retrait/SAV (true par défaut) */
  showLocalCta?: boolean;
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function PrixTransparenceWidget({
  productId,
  ourPriceTtc,
  showLocalCta = true,
}: PrixTransparenceWidgetProps) {
  const [offersOpen, setOffersOpen] = useState(false);

  // Vérifier l'exception avant tout (lecture rapide, mise en cache 5 min)
  const { data: exception, isLoading: loadingException } = usePriceException(productId);

  // Données de transparence (ne se charge que si pas d'exception)
  const { data, isLoading: loadingData } = useTransparencyData(
    exception === undefined ? null : exception ? null : productId,
    ourPriceTtc,
  );

  // ── États de chargement ───────────────────────────────────────────────────
  if (loadingException) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Produit exclu de la comparaison
  if (exception) return null;

  if (loadingData) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Aucune donnée du tout
  if (!data || (data.badge === "no_data" && data.offers.length === 0)) return null;

  const cfg = BADGE_CONFIG[data.badge];
  const BadgeIcon = cfg.icon;

  const latestDate = data.latest_scraped_at
    ? format(new Date(data.latest_scraped_at), "dd/MM/yyyy 'à' HH'h'mm", { locale: fr })
    : null;

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Transparence prix
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ── Badge de positionnement ─────────────────────────────────────── */}
        <div className={`rounded-lg border p-3 ${cfg.className}`}>
          <div className="flex items-start gap-2">
            <BadgeIcon className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{cfg.label}</p>
              <p className="text-xs mt-0.5 opacity-80">{cfg.sublabel}</p>
              {data.gap_eur !== null && data.badge !== "no_data" && (
                <p className="text-xs mt-1 font-medium">
                  {data.gap_eur > 0
                    ? `+${data.gap_eur.toFixed(2)} € vs meilleur prix livré concurrent`
                    : data.gap_eur < 0
                    ? `${Math.abs(data.gap_eur).toFixed(2)} € de moins que le moins cher livré`
                    : "Prix identique au meilleur concurrent"}
                  {data.gap_pct !== null && ` (${data.gap_pct > 0 ? "+" : ""}${data.gap_pct.toFixed(1)}%)`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Meilleur prix concurrent ──────────────────────────────────── */}
        {data.best_offer && (
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Meilleur prix relevé (livré)
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {data.best_offer.price_livre.toFixed(2)} €
                </span>
                {data.best_offer.delivery_cost > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    {data.best_offer.price.toFixed(2)} € + {data.best_offer.delivery_cost.toFixed(2)} € port
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="font-medium text-sm">{data.best_offer.competitor_name}</p>
                {data.best_offer.source_url && (
                  <a
                    href={data.best_offer.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary flex items-center gap-0.5 justify-end hover:underline"
                  >
                    Voir l'offre <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            {data.best_offer.scraped_at && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Relevé{" "}
                {formatDistanceToNow(new Date(data.best_offer.scraped_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            )}
          </div>
        )}

        {/* ── Liste déroulante des offres ───────────────────────────────── */}
        {data.offers.length > 1 && (
          <Collapsible open={offersOpen} onOpenChange={setOffersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between px-0 h-auto">
                <span className="text-xs font-medium">
                  {offersOpen ? "Masquer" : `Voir toutes les offres (${data.offers.length})`}
                </span>
                {offersOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {data.offers.map((offer) => {
                  const diff = ourPriceTtc - offer.price_livre;
                  return (
                    <div
                      key={offer.competitor_id}
                      className="flex items-center justify-between text-sm border rounded-md px-3 py-2 bg-muted/30"
                    >
                      <div>
                        <p className="font-medium">{offer.competitor_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {offer.delivery_cost > 0
                            ? `${offer.price.toFixed(2)} € + ${offer.delivery_cost.toFixed(2)} € port`
                            : "Livraison incluse ou retrait"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{offer.price_livre.toFixed(2)} €</p>
                        <p className={`text-xs ${diff < 0 ? "text-emerald-600" : diff > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {diff > 0 ? `+${diff.toFixed(2)} €` : diff < 0 ? `${diff.toFixed(2)} €` : "identique"}
                        </p>
                      </div>
                      {offer.source_url && (
                        <a
                          href={offer.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* ── CTA locaux ───────────────────────────────────────────────────── */}
        {showLocalCta && (
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">Retrait aujourd'hui disponible en magasin</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium">Service après-vente local inclus</span>
            </div>
          </div>
        )}

        {/* ── Mention légale compliance ─────────────────────────────────── */}
        <p className="text-xs text-muted-foreground border-t pt-3 leading-relaxed">
          {latestDate
            ? `Prix relevés automatiquement le ${latestDate} · `
            : "Prix relevés automatiquement · "}
          Susceptibles d'évoluer. Comparaison basée sur le prix produit + frais de port standard du concurrent.
          {data.offers.length > 0 && (
            <>
              {" "}Sources :{" "}
              {data.offers.map((o) => o.competitor_name).join(", ")}.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
