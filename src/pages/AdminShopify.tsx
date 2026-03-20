import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw, ShoppingCart, Package, ArrowUpDown, AlertCircle,
  CheckCircle2, Clock, Loader2, Store, CreditCard, TrendingUp,
  AlertTriangle, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface SyncLogEntry {
  id: string;
  product_id: string | null;
  shopify_product_id: string | null;
  sync_type: string;
  sync_direction: string;
  status: string;
  error_message: string | null;
  details: any;
  synced_at: string;
}

interface ShopifyOrder {
  id: string;
  shopify_order_id: string;
  order_number: string;
  source_name: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: number;
  customer_name: string | null;
  customer_email: string | null;
  line_items: any[];
  pos_location_id: string | null;
  shopify_created_at: string;
  synced_at: string;
}

interface SyncStats {
  total_synced: number;
  total_errors: number;
  last_push: string | null;
  last_pull: string | null;
  pos_orders_today: number;
  web_orders_today: number;
  total_revenue_today: number;
}

interface POSPeriodStats {
  orders: number;
  revenue: number;
  avgTicket: number;
}

interface POSStats {
  today: POSPeriodStats;
  yesterday: POSPeriodStats;
  week: POSPeriodStats;
  month: POSPeriodStats;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  lowStockProducts: Array<{ id: string; name: string; ean: string | null; stock_quantity: number }>;
  lastSyncAt: string | null;
  totalMappedProducts: number;
}

export default function AdminShopify() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [posStats, setPosStats] = useState<POSStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate("/admin");
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch sync logs
      const { data: logs } = await supabase
        .from("shopify_sync_log")
        .select("*")
        .order("synced_at", { ascending: false })
        .limit(50);
      const typedLogs = (logs || []) as unknown as SyncLogEntry[];
      setSyncLogs(typedLogs);

      // Fetch orders (shopify_orders not yet in generated types)
      const { data: shopifyOrders } = await (supabase as any)
        .from("shopify_orders")
        .select("*")
        .order("shopify_created_at", { ascending: false })
        .limit(50);
      const typedOrders = (shopifyOrders || []) as ShopifyOrder[];
      setOrders(typedOrders);

      // Calculer les stats
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = typedOrders.filter(
        (o) => o.shopify_created_at?.startsWith(today)
      );
      const posToday = todayOrders.filter((o) => o.source_name === "pos");
      const webToday = todayOrders.filter((o) => o.source_name !== "pos");

      const lastPush = typedLogs.find((l) => l.sync_direction === "push")?.synced_at;
      const lastPull = typedLogs.find((l) => l.sync_direction === "pull")?.synced_at;

      const totalSynced = typedLogs.filter((l) => l.status === "success" && l.sync_type === "create").length;
      const totalErrors = typedLogs.filter((l) => l.status === "error").length;

      setStats({
        total_synced: totalSynced,
        total_errors: totalErrors,
        last_push: lastPush || null,
        last_pull: lastPull || null,
        pos_orders_today: posToday.length,
        web_orders_today: webToday.length,
        total_revenue_today: todayOrders.reduce((s, o) => s + (o.total_price || 0), 0),
      });

      // ── POS Dashboard stats ──
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Yesterday for comparison
      const startOfYesterday = new Date(now);
      startOfYesterday.setDate(now.getDate() - 1);
      const yesterdayStr = startOfYesterday.toISOString().split("T")[0];

      const allPosOrders = typedOrders.filter(
        (o) => o.source_name === "pos"
      );

      const posYesterday = allPosOrders.filter(
        (o) => o.shopify_created_at?.startsWith(yesterdayStr)
      );
      const posThisWeek = allPosOrders.filter(
        (o) => new Date(o.shopify_created_at) >= startOfWeek
      );
      const posThisMonth = allPosOrders.filter(
        (o) => new Date(o.shopify_created_at) >= startOfMonth
      );

      // Top products from POS line_items
      const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const order of allPosOrders) {
        if (!order.line_items) continue;
        for (const li of order.line_items) {
          const key = li.title || li.shopify_product_id || "Inconnu";
          const existing = productSales.get(key) || { name: key, quantity: 0, revenue: 0 };
          existing.quantity += li.quantity || 0;
          existing.revenue += (parseFloat(li.price) || 0) * (li.quantity || 0);
          productSales.set(key, existing);
        }
      }
      const topProducts = [...productSales.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Low stock products (synced to Shopify)
      const { data: lowStock } = await supabase
        .from("products")
        .select("id, name, ean, stock_quantity")
        .eq("is_active", true)
        .lte("stock_quantity", 5)
        .gte("stock_quantity", 0)
        .order("stock_quantity")
        .limit(20);

      // Count mapped products (from new mapping table, fallback to sync log)
      const { count: mappedCount } = await (supabase as any)
        .from("shopify_product_mapping")
        .select("id", { count: "exact", head: true });

      // Last sync timestamp
      const lastSyncEntry = typedLogs[0];

      const buildPeriodStats = (orders: ShopifyOrder[]): POSPeriodStats => {
        const revenue = orders.reduce((s, o) => s + (o.total_price || 0), 0);
        return {
          orders: orders.length,
          revenue,
          avgTicket: orders.length > 0 ? revenue / orders.length : 0,
        };
      };

      setPosStats({
        today: buildPeriodStats(posToday),
        yesterday: buildPeriodStats(posYesterday),
        week: buildPeriodStats(posThisWeek),
        month: buildPeriodStats(posThisMonth),
        topProducts,
        lowStockProducts: (lowStock || []) as POSStats["lowStockProducts"],
        lastSyncAt: lastSyncEntry?.synced_at || null,
        totalMappedProducts: mappedCount || 0,
      });
    } catch (error) {
      toast.error("Erreur lors du chargement des données Shopify");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async (action: string) => {
    setSyncing(action);
    try {
      let functionName = "";
      let body = {};

      switch (action) {
        case "push_all":
          functionName = "sync-shopify";
          body = { mode: "all", sync_type: "all" };
          break;
        case "push_collections":
          functionName = "sync-shopify";
          body = { sync_type: "collections" };
          break;
        case "pull_orders":
          functionName = "pull-shopify-orders";
          body = { source_filter: "all" };
          break;
        case "pull_inventory":
          functionName = "pull-shopify-inventory";
          body = {};
          break;
        case "pull_pos_orders":
          functionName = "pull-shopify-orders";
          body = { source_filter: "pos" };
          break;
        case "push_inventory":
          functionName = "push-shopify-inventory";
          body = {};
          break;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: JSON.stringify(body),
      });

      if (error) throw error;
      toast.success(`Sync "${action}" terminée`, {
        description: JSON.stringify(data).substring(0, 200),
      });
      fetchData();
    } catch (error: any) {
      toast.error(`Erreur sync "${action}"`, { description: error.message });
    } finally {
      setSyncing(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Jamais";
    return new Date(date).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading) return null;

  return (
    <AdminLayout title="Shopify & POS">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Shopify & POS</h1>
            <p className="text-muted-foreground">
              Synchronisation bidirectionnelle avec Shopify et le Point de Vente
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produits synchronisés</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_synced || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.total_errors || 0} erreurs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventes POS aujourd'hui</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pos_orders_today || 0}</div>
              <p className="text-xs text-muted-foreground">commandes en boutique</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventes Web aujourd'hui</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.web_orders_today || 0}</div>
              <p className="text-xs text-muted-foreground">commandes en ligne</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CA aujourd'hui</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.total_revenue_today || 0).toFixed(2)} €
              </div>
              <p className="text-xs text-muted-foreground">POS + Web combinés</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions de synchronisation */}
        <Card>
          <CardHeader>
            <CardTitle>Actions de synchronisation</CardTitle>
            <CardDescription>
              Dernière sync push : {formatDate(stats?.last_push || null)} | Dernière sync pull : {formatDate(stats?.last_pull || null)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => handleSync("push_all")}
                disabled={!!syncing}
              >
                {syncing === "push_all" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowUpDown className="h-4 w-4 mr-2" />}
                Sync Produits → Shopify
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync("push_collections")}
                disabled={!!syncing}
              >
                {syncing === "push_collections" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                Sync Collections
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync("pull_orders")}
                disabled={!!syncing}
              >
                {syncing === "pull_orders" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                Pull Commandes
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync("pull_pos_orders")}
                disabled={!!syncing}
              >
                {syncing === "pull_pos_orders" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Store className="h-4 w-4 mr-2" />}
                Pull Commandes POS
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync("pull_inventory")}
                disabled={!!syncing}
              >
                {syncing === "pull_inventory" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Pull Inventaire
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSync("push_inventory")}
                disabled={!!syncing}
              >
                {syncing === "push_inventory" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Push Stock → Shopify
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Commandes + Historique sync */}
        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">
              <CreditCard className="h-4 w-4 mr-2" /> Commandes Shopify
            </TabsTrigger>
            <TabsTrigger value="pos-dashboard">
              <Store className="h-4 w-4 mr-2" /> Dashboard POS
            </TabsTrigger>
            <TabsTrigger value="sync-log">
              <Clock className="h-4 w-4 mr-2" /> Historique sync
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>N° Commande</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Aucune commande Shopify synchronisée
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>
                            <Badge variant={order.source_name === "pos" ? "default" : "secondary"}>
                              {order.source_name === "pos" ? "POS" : "Web"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>{order.customer_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{order.customer_email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                order.financial_status === "paid"
                                  ? "default"
                                  : order.financial_status === "refunded"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {order.financial_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {order.total_price.toFixed(2)} €
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(order.shopify_created_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pos-dashboard">
            {posStats ? (
              <div className="space-y-4">
                {/* Sync status bar */}
                <Card className="bg-muted/50">
                  <CardContent className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Dernière sync : <strong>{formatDate(posStats.lastSyncAt)}</strong>
                      </span>
                      <span className="text-muted-foreground">
                        Produits liés à Shopify : <strong>{posStats.totalMappedProducts}</strong>
                      </span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleSync("pull_pos_orders")} disabled={!!syncing}>
                      {syncing === "pull_pos_orders" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Sync POS
                    </Button>
                  </CardContent>
                </Card>

                {/* POS Revenue cards */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Aujourd'hui</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{posStats.today.revenue.toFixed(2)} €</div>
                      <p className="text-xs text-muted-foreground">
                        {posStats.today.orders} commande{posStats.today.orders > 1 ? "s" : ""}
                        {posStats.yesterday.revenue > 0 && (
                          <span className={posStats.today.revenue >= posStats.yesterday.revenue ? "text-green-600 ml-1" : "text-red-500 ml-1"}>
                            {posStats.today.revenue >= posStats.yesterday.revenue ? "+" : ""}
                            {((posStats.today.revenue - posStats.yesterday.revenue) / posStats.yesterday.revenue * 100).toFixed(0)}% vs hier
                          </span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Panier moyen</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {posStats.today.avgTicket.toFixed(2)} €
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Mois : {posStats.month.avgTicket.toFixed(2)} €
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Cette semaine</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{posStats.week.revenue.toFixed(2)} €</div>
                      <p className="text-xs text-muted-foreground">{posStats.week.orders} commande{posStats.week.orders > 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Ce mois</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{posStats.month.revenue.toFixed(2)} €</div>
                      <p className="text-xs text-muted-foreground">{posStats.month.orders} commande{posStats.month.orders > 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Top produits POS */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Top produits vendus en boutique
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {posStats.topProducts.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground text-sm">
                          Aucune vente POS enregistrée
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produit</TableHead>
                              <TableHead className="text-right">Qté</TableHead>
                              <TableHead className="text-right">CA</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {posStats.topProducts.map((p, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium text-sm truncate max-w-[200px]">
                                  {p.name}
                                </TableCell>
                                <TableCell className="text-right font-mono">{p.quantity}</TableCell>
                                <TableCell className="text-right font-mono">{p.revenue.toFixed(2)} €</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  {/* Alertes stock bas */}
                  <Card className={posStats.lowStockProducts.length > 0 ? "border-amber-200" : ""}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className={`h-4 w-4 ${posStats.lowStockProducts.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
                        Alertes stock bas
                        {posStats.lowStockProducts.length > 0 && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            {posStats.lowStockProducts.length}
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      {posStats.lowStockProducts.length === 0 ? (
                        <div className="py-8 text-center text-sm">
                          <CheckCircle2 className="h-5 w-5 mx-auto text-green-500 mb-2" />
                          <span className="text-muted-foreground">Tous les stocks sont suffisants</span>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Produit</TableHead>
                              <TableHead>EAN</TableHead>
                              <TableHead className="text-right">Stock</TableHead>
                              <TableHead className="w-20">Niveau</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {posStats.lowStockProducts.map((p) => (
                              <TableRow key={p.id}>
                                <TableCell className="font-medium text-sm truncate max-w-[180px]">
                                  {p.name}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                  {p.ean || "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant={p.stock_quantity === 0 ? "destructive" : "secondary"}>
                                    {p.stock_quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Progress
                                    value={Math.min(100, (p.stock_quantity / 5) * 100)}
                                    className={`h-1.5 ${p.stock_quantity === 0 ? "[&>div]:bg-red-500" : "[&>div]:bg-amber-500"}`}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin mb-2" />
                  Chargement des données POS...
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sync-log">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Détails</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Aucun historique de synchronisation
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge variant="outline">{log.sync_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.sync_direction === "push" ? "default" : "secondary"}>
                              {log.sync_direction === "push" ? "→ Push" : "← Pull"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {log.status === "success" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">
                            {log.error_message || (log.details ? JSON.stringify(log.details).substring(0, 100) : "—")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(log.synced_at)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
