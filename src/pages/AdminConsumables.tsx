import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Printer, Package, Link2, RefreshCw, Loader2, Database, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase, SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";
import { toast } from "sonner";

function useConsumableStats() {
  return useQuery({
    queryKey: ["admin-consumable-stats"],
    staleTime: 60_000,
    queryFn: async () => {
      const [brands, models, consumables, links, logs] = await Promise.all([
        (supabase as any).from("printer_brands").select("id", { count: "exact", head: true }),
        (supabase as any).from("printer_models").select("id", { count: "exact", head: true }),
        (supabase as any).from("consumables").select("id", { count: "exact", head: true }),
        (supabase as any).from("printer_consumable_links").select("id", { count: "exact", head: true }),
        (supabase as any).from("consumable_import_logs").select("*").order("started_at", { ascending: false }).limit(10),
      ]);

      return {
        brands: brands.count ?? 0,
        models: models.count ?? 0,
        consumables: consumables.count ?? 0,
        links: links.count ?? 0,
        logs: logs.data ?? [],
      };
    },
  });
}

const AdminConsumables = () => {
  const { data: stats, isLoading, refetch } = useConsumableStats();
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    setImporting(true);
    try {
      const resp = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/import-consumables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ source: "bechlem" }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      toast.success("Import lanc\u00e9 avec succ\u00e8s");
      refetch();
    } catch (err) {
      toast.error(`Erreur d'import : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setImporting(false);
    }
  };

  const statCards = [
    { label: "Marques", value: stats?.brands ?? 0, icon: Printer, color: "text-blue-600" },
    { label: "Mod\u00e8les", value: stats?.models ?? 0, icon: Database, color: "text-purple-600" },
    { label: "Consommables", value: stats?.consumables ?? 0, icon: Package, color: "text-green-600" },
    { label: "Liens", value: stats?.links ?? 0, icon: Link2, color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin Consommables | Ma Papeterie</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Consommables informatiques</h1>
            <p className="text-muted-foreground mt-1">
              Gestion des donn\u00e9es Bechlem / DataWriter
            </p>
          </div>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Lancer l'import
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {statCards.map((s) => (
                <Card key={s.label} className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value.toLocaleString("fr-FR")}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Import logs */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Historique des imports
              </h2>
              {stats?.logs && stats.logs.length > 0 ? (
                <div className="space-y-3">
                  {stats.logs.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : log.status === "error" ? (
                          <XCircle className="w-4 h-4 text-red-600" />
                        ) : (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">
                            Source : <Badge variant="secondary" className="text-[10px] ml-1">{log.source}</Badge>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(log.started_at).toLocaleString("fr-FR")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{log.brands_count} marques, {log.models_count} mod\u00e8les</p>
                        <p>{log.consumables_count} consommables, {log.links_count} liens</p>
                        {log.error_message && (
                          <p className="text-red-600 mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Aucun import enregistr\u00e9.
                </p>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminConsumables;
