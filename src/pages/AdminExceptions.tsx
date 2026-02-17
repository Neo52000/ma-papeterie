import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProductExceptions } from "@/hooks/useProductExceptions";
import { CheckCircle, AlertTriangle, XCircle, Filter } from "lucide-react";

const typeLabels: Record<string, string> = {
  ean_manquant: "EAN manquant",
  prix_incalculable: "Prix incalculable",
  fournisseur_inactif: "Fournisseur inactif",
  conflit_prix: "Conflit de prix",
};

const typeSeverity: Record<string, "destructive" | "secondary" | "outline"> = {
  ean_manquant: "destructive",
  prix_incalculable: "destructive",
  fournisseur_inactif: "secondary",
  conflit_prix: "outline",
};

export default function AdminExceptions() {
  const { exceptions, loading, resolveException, unresolvedCount } = useProductExceptions();
  const [showResolved, setShowResolved] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);

  const filtered = exceptions.filter(e => {
    if (!showResolved && e.resolved) return false;
    if (filterType && e.exception_type !== filterType) return false;
    return true;
  });

  if (loading) {
    return (
      <AdminLayout title="Exceptions Produits" description="File d'attente des anomalies produits">
        <div className="text-center">Chargement...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Exceptions Produits" description={`${unresolvedCount} exception(s) non résolue(s)`}>
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={filterType === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType(null)}
        >
          Toutes ({exceptions.filter(e => !showResolved ? !e.resolved : true).length})
        </Button>
        {Object.entries(typeLabels).map(([key, label]) => (
          <Button
            key={key}
            variant={filterType === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(key)}
          >
            {label}
          </Button>
        ))}
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            <Filter className="h-4 w-4 mr-1" />
            {showResolved ? "Masquer résolues" : "Afficher résolues"}
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold">Aucune exception</h3>
            <p className="text-muted-foreground">Tous les produits sont conformes.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((ex) => (
            <Card key={ex.id} className={ex.resolved ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {ex.resolved ? (
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{ex.product?.name || ex.product_id}</span>
                      <Badge variant={typeSeverity[ex.exception_type] || "secondary"}>
                        {typeLabels[ex.exception_type] || ex.exception_type}
                      </Badge>
                    </div>
                    {ex.product?.ean && (
                      <span className="text-xs text-muted-foreground">EAN: {ex.product.ean}</span>
                    )}
                    {ex.details && Object.keys(ex.details).length > 0 && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {JSON.stringify(ex.details)}
                      </p>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(ex.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                {!ex.resolved && (
                  <Button size="sm" onClick={() => resolveException(ex.id)}>
                    Résoudre
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
