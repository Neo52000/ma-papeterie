import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBrevoResync } from "@/hooks/useBrevoSync";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Loader2 } from "lucide-react";

type StatusFilter = "all" | "success" | "error" | "skipped";

interface BrevoLog {
  id: string;
  event_type: string;
  customer_email: string;
  order_id: string | null;
  status: string;
  brevo_response: unknown;
  error_message: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "destructive" | "secondary" }> = {
  success: { label: "Succès", variant: "default" },
  error: { label: "Erreur", variant: "destructive" },
  skipped: { label: "Ignoré", variant: "secondary" },
};

const EVENT_LABELS: Record<string, string> = {
  contact_sync: "Sync contact",
  transactional_email: "Email transactionnel",
  manual_resync: "Re-sync manuel",
};

export function BrevoSyncDashboard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const resync = useBrevoResync();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["brevo-sync-logs", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("brevo_sync_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as BrevoLog[];
    },
    staleTime: 60_000,
  });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Logs Brevo CRM</CardTitle>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="success">Succès</SelectItem>
            <SelectItem value="error">Erreur</SelectItem>
            <SelectItem value="skipped">Ignoré</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !logs?.length ? (
          <p className="text-muted-foreground text-center py-8">
            Aucun log Brevo pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const badge = STATUS_BADGE[log.status] ?? STATUS_BADGE.error;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">{log.customer_email}</TableCell>
                      <TableCell className="text-sm">
                        {EVENT_LABELS[log.event_type] ?? log.event_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {log.error_message && (
                          <span className="block text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={log.error_message}>
                            {log.error_message}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {log.order_id ? log.order_id.slice(0, 8) + "…" : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {log.order_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resync.isPending}
                            onClick={() => resync.mutate(log.order_id!)}
                          >
                            {resync.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            <span className="ml-1">Re-sync</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
