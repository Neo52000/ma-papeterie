import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useStockAlerts } from "@/hooks/admin/useStockAlerts";
import { useStockStore } from "@/stores/stockStore";
import { StockAlertTable } from "@/components/admin/stock/StockAlertTable";
import { StockMovementTable } from "@/components/admin/stock/StockMovementTable";
import { StockMovementChart } from "@/components/admin/stock/StockMovementChart";
import { StockThresholdEditor } from "@/components/admin/stock/StockThresholdEditor";
import { PurchaseOrderForm } from "@/components/admin/stock/PurchaseOrderForm";
import { AlertTriangle, Package, ShoppingBag, TrendingDown, Settings } from "lucide-react";

export default function AdminStock() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useStockStore();
  const [poFormOpen, setPOFormOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/auth");
  }, [authLoading, user, isAdmin, navigate]);

  const { data: alerts } = useStockAlerts();

  const ruptureCount = alerts?.filter((a) => a.stock_status === "rupture").length ?? 0;
  const critiqueCount = alerts?.filter((a) => a.stock_status === "critique").length ?? 0;
  const faibleCount = alerts?.filter((a) => a.stock_status === "faible").length ?? 0;

  return (
    <AdminLayout title="Gestion des Stocks" description="Dashboard stock, alertes, bons de commande et mouvements">
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Package className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{alerts?.length ?? 0}</p>
                  <p className="text-sm text-muted-foreground">Produits en alerte</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{ruptureCount}</p>
                  <p className="text-sm text-muted-foreground">Ruptures</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{critiqueCount}</p>
                  <p className="text-sm text-muted-foreground">Critiques</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <TrendingDown className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{faibleCount}</p>
                  <p className="text-sm text-muted-foreground">Faibles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="alerts" className="gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Alertes
              {ruptureCount > 0 && (
                <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {ruptureCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              Bons de commande
            </TabsTrigger>
            <TabsTrigger value="movements" className="gap-1.5">
              <Package className="h-4 w-4" />
              Mouvements
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings className="h-4 w-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Alertes de stock</CardTitle>
              </CardHeader>
              <CardContent>
                <StockAlertTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="purchase-orders" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bons de commande fournisseurs</CardTitle>
                <Button onClick={() => setPOFormOpen(true)}>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Nouveau PO
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Utilisez la page{" "}
                  <a href="/admin/purchases" className="text-primary underline">
                    Achats
                  </a>{" "}
                  pour gérer les bons de commande existants, ou créez un nouveau PO ci-dessus.
                </p>
              </CardContent>
            </Card>
            <PurchaseOrderForm open={poFormOpen} onOpenChange={setPOFormOpen} />
          </TabsContent>

          <TabsContent value="movements" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Évolution du stock (30 derniers jours)</CardTitle>
              </CardHeader>
              <CardContent>
                <StockMovementChart />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Historique des mouvements</CardTitle>
              </CardHeader>
              <CardContent>
                <StockMovementTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Seuils de stock par produit</CardTitle>
              </CardHeader>
              <CardContent>
                <StockThresholdEditor />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
