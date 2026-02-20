import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, XCircle, Info } from "lucide-react";

interface OffersAlertsProps {
  publicPriceSource: string | null;
  publicPriceTtc: number | null;
  isAvailable: boolean;
  hasOffers: boolean;
}

export function OffersAlerts({
  publicPriceSource,
  publicPriceTtc,
  isAvailable,
  hasOffers,
}: OffersAlertsProps) {
  const alerts: React.ReactNode[] = [];

  if (publicPriceTtc == null && hasOffers) {
    alerts.push(
      <Alert key="no-price" variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Prix public indisponible</AlertTitle>
        <AlertDescription>
          Ni PVP fournisseur ni calcul par coefficient possible. Vérifiez qu'au moins une offre possède un prix d'achat HT et qu'un coefficient famille est configuré.
        </AlertDescription>
      </Alert>
    );
  }

  if (publicPriceSource === 'COEF') {
    alerts.push(
      <Alert key="coef" className="border-orange-300 bg-orange-50 text-orange-900 [&>svg]:text-orange-600">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aucun PVP disponible — Prix calculé par coefficient</AlertTitle>
        <AlertDescription>
          Aucune offre active ne fournit de prix de vente conseillé (PVP). Le prix public est calculé automatiquement via le coefficient famille/sous-famille appliqué au prix d'achat HT de l'offre prioritaire.
        </AlertDescription>
      </Alert>
    );
  }

  if (!isAvailable && hasOffers) {
    alerts.push(
      <Alert key="rupture" className="border-blue-300 bg-blue-50 text-blue-900 [&>svg]:text-blue-600">
        <Info className="h-4 w-4" />
        <AlertTitle>Rupture de stock</AlertTitle>
        <AlertDescription>
          Des offres fournisseurs existent mais toutes sont à 0 stock. Le produit est affiché comme indisponible côté client.
        </AlertDescription>
      </Alert>
    );
  }

  if (!hasOffers) {
    alerts.push(
      <Alert key="no-offers" variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Aucune offre fournisseur</AlertTitle>
        <AlertDescription>
          Ce produit n'a pas encore d'offre ALKOR / COMLANDI / SOFT. Les imports de catalogues alimenteront automatiquement ces données.
        </AlertDescription>
      </Alert>
    );
  }

  if (alerts.length === 0) return null;

  return <div className="space-y-3">{alerts}</div>;
}
