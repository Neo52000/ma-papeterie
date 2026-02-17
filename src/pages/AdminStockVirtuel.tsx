import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle, Package, Warehouse } from "lucide-react";

export default function AdminStockVirtuel() {
  const { data: stocks, isLoading } = useQuery({
    queryKey: ["stock-virtuel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_stock_virtuel" as any)
        .select("*")
        .order("statut_stock", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const rupture = stocks?.filter(s => s.statut_stock === "rupture") || [];
  const alerte = stocks?.filter(s => s.statut_stock === "alerte") || [];
  const ok = stocks?.filter(s => s.statut_stock === "ok") || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "rupture":
        return <Badge variant="destructive">Rupture</Badge>;
      case "alerte":
        return <Badge className="bg-accent text-accent-foreground">Alerte</Badge>;
      default:
        return <Badge className="bg-primary/10 text-primary">OK</Badge>;
    }
  };

  return (
    <AdminLayout title="Stock Virtuel Agrégé" description="Vue unifiée des stocks multi-sources avec pondération fournisseurs">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stocks?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Produits actifs</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{rupture.length}</p>
                  <p className="text-sm text-muted-foreground">En rupture</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Warehouse className="h-8 w-8 text-accent-foreground" />
                <div>
                  <p className="text-2xl font-bold">{alerte.length}</p>
                  <p className="text-sm text-muted-foreground">Sous seuil</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{ok.length}</p>
                  <p className="text-sm text-muted-foreground">Stock OK</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Détail des stocks par produit</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Chargement...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead className="text-right">Boutique</TableHead>
                    <TableHead className="text-right">Entrepôt</TableHead>
                    <TableHead className="text-right">Fournisseurs</TableHead>
                    <TableHead className="text-right font-bold">Stock Virtuel</TableHead>
                    <TableHead className="text-right">Seuil</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Fourn. actifs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks?.map((s: any) => (
                    <TableRow key={s.product_id} className={s.statut_stock === "rupture" ? "bg-destructive/5" : s.statut_stock === "alerte" ? "bg-accent/20" : ""}>
                      <TableCell className="font-medium max-w-[200px] truncate">{s.product_name}</TableCell>
                      <TableCell className="font-mono text-xs">{s.ean || "-"}</TableCell>
                      <TableCell className="text-right">{s.stock_boutique + s.stock_propre}</TableCell>
                      <TableCell className="text-right">{s.stock_entrepot}</TableCell>
                      <TableCell className="text-right">{s.stock_fournisseurs_distant}</TableCell>
                      <TableCell className="text-right font-bold">{s.stock_virtuel}</TableCell>
                      <TableCell className="text-right">{s.seuil_alerte}</TableCell>
                      <TableCell>{getStatusBadge(s.statut_stock)}</TableCell>
                      <TableCell className="text-right">{s.nb_fournisseurs_actifs}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
