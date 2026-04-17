import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  WEBHOOK_SYNC_TYPES, WEBHOOK_TOPICS, formatDate,
  type SyncLogEntry,
} from "./shared";

interface WebhookStats {
  last24h: number;
  last7d: number;
  lastReceivedAt: string | null;
}

/**
 * Webhook activity counters are derived from `shopify_sync_log` entries whose
 * `sync_type` matches WEBHOOK_SYNC_TYPES — those are written exclusively by the
 * shopify-webhook Edge Function. Basing counters on `shopify_orders.synced_at`
 * would conflate real webhook deliveries with `pull-shopify-orders` backfills
 * and hide outages when the pull keeps running but webhooks are broken.
 */
function useWebhookStats(): WebhookStats | null {
  const [stats, setStats] = useState<WebhookStats | null>(null);

  useEffect(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const since24h = new Date(now - DAY).toISOString();
    const since7d = new Date(now - 7 * DAY).toISOString();

    const fetchStats = async () => {
      const [c24, c7d, last] = await Promise.all([
        supabase
          .from("shopify_sync_log")
          .select("id", { count: "exact", head: true })
          .in("sync_type", [...WEBHOOK_SYNC_TYPES])
          .gte("synced_at", since24h),
        supabase
          .from("shopify_sync_log")
          .select("id", { count: "exact", head: true })
          .in("sync_type", [...WEBHOOK_SYNC_TYPES])
          .gte("synced_at", since7d),
        supabase
          .from("shopify_sync_log")
          .select("synced_at")
          .in("sync_type", [...WEBHOOK_SYNC_TYPES])
          .order("synced_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setStats({
        last24h: c24.count ?? 0,
        last7d: c7d.count ?? 0,
        lastReceivedAt: (last.data as { synced_at: string } | null)?.synced_at ?? null,
      });
    };

    fetchStats();
  }, []);

  return stats;
}

export function WebhooksTab({ syncLogs }: { syncLogs: SyncLogEntry[] }) {
  const stats = useWebhookStats();
  const webhookUrl = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "{project}"}.supabase.co/functions/v1/shopify-webhook`;

  const webhookLogs = syncLogs
    .filter((l) => (WEBHOOK_SYNC_TYPES as readonly string[]).includes(l.sync_type))
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité webhook</CardTitle>
          <CardDescription>
            Entrées <code>shopify_sync_log</code> écrites par l'Edge Function
            webhook (hors pulls manuels).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Reçus dans les dernières 24h</span>
            <Badge variant={stats && stats.last24h > 0 ? "default" : "secondary"}>
              {stats ? stats.last24h : "…"}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Reçus dans les 7 derniers jours</span>
            <Badge variant={stats && stats.last7d > 0 ? "default" : "secondary"}>
              {stats ? stats.last7d : "…"}
            </Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span>Dernier webhook reçu</span>
            <span className="text-muted-foreground text-xs">
              {stats ? formatDate(stats.lastReceivedAt) : "…"}
            </span>
          </div>
          {stats && stats.last24h === 0 && (
            <p className="text-xs text-amber-600 border-t pt-3">
              ⚠ Aucun webhook reçu ces dernières 24h. Vérifier la configuration
              dans Shopify Admin → Settings → Notifications → Webhooks.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration Shopify</CardTitle>
          <CardDescription>
            Topics à enregistrer dans Shopify Admin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-xs font-medium mb-1">URL à enregistrer :</p>
            <code className="block text-xs bg-muted p-2 rounded break-all">
              {webhookUrl}
            </code>
          </div>
          <div>
            <p className="text-xs font-medium mb-1">Topics requis :</p>
            <div className="flex flex-wrap gap-1">
              {WEBHOOK_TOPICS.map((topic) => (
                <Badge key={topic} variant="outline" className="font-mono text-xs">
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground border-t pt-3">
            Format JSON. Secret HMAC à stocker dans <code>shopify_config.webhook_secret</code> ou
            env var <code>SHOPIFY_WEBHOOK_SECRET</code>.
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Derniers logs webhook</CardTitle>
          <CardDescription>
            Filtré sur <code>sync_type ∈ {"{"}WEBHOOK_SYNC_TYPES{"}"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {webhookLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(log.synced_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.sync_type}</Badge>
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
              {webhookLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">
                    Aucun log webhook dans les 50 entrées récentes
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
