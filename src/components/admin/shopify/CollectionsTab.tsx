import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { FolderOpen, Loader2 } from "lucide-react";
import { formatDate, type SyncLogEntry } from "./shared";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function CollectionsTab({
  syncLogs,
  syncing,
  onSync,
}: {
  syncLogs: SyncLogEntry[];
  syncing: string | null;
  onSync: () => void;
}) {
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("level", "famille")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data as Category[]) || []));
  }, []);

  const collectionLogs = syncLogs.filter((l) => l.sync_type === "collections").slice(0, 10);
  const lastSuccess = collectionLogs.find((l) => l.status === "success");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Synchronisation des collections</CardTitle>
          <CardDescription>
            Pousse les catégories de niveau « famille » vers Shopify comme <em>smart collections</em>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Catégories à synchroniser</span>
            <Badge variant="secondary">{categories?.length ?? "…"}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Dernière sync réussie</span>
            <span className="text-muted-foreground text-xs">
              {lastSuccess ? formatDate(lastSuccess.synced_at) : "jamais"}
            </span>
          </div>
          <Button
            onClick={onSync}
            disabled={syncing !== null}
            className="w-full"
            variant="secondary"
          >
            {syncing === "push_collections" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="mr-2 h-4 w-4" />
            )}
            Synchroniser toutes les collections
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Catégories « famille »</CardTitle>
          <CardDescription>Seront créées/mises à jour côté Shopify</CardDescription>
        </CardHeader>
        <CardContent>
          {categories === null ? (
            <div className="text-sm text-muted-foreground">Chargement…</div>
          ) : categories.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Aucune catégorie de niveau <code>famille</code> active.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-60 overflow-auto">
              {categories.map((c) => (
                <Badge key={c.id} variant="outline" className="text-xs">
                  {c.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Historique des syncs collections</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(log.synced_at)}
                  </TableCell>
                  <TableCell className="text-xs">{log.sync_direction}</TableCell>
                  <TableCell>
                    <Badge
                      variant={log.status === "success" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-md">
                    {log.error_message || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {collectionLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">
                    Aucune sync de collections enregistrée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
