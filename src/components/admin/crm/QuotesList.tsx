import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { useQuotesList, useUpdateQuoteStatus, type Quote } from "@/hooks/admin/useQuotes";
import { toast } from "sonner";

const QUOTE_STATUS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  sent: { label: "Envoye", className: "bg-blue-100 text-blue-700" },
  viewed: { label: "Consulte", className: "bg-cyan-100 text-cyan-700" },
  accepted: { label: "Accepte", className: "bg-green-100 text-green-700" },
  rejected: { label: "Refuse", className: "bg-red-100 text-red-700" },
  expired: { label: "Expire", className: "bg-amber-100 text-amber-700" },
};

const fmtPrice = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);

export function QuotesList() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: quotes, isLoading } = useQuotesList(statusFilter);
  const updateStatus = useUpdateQuoteStatus();

  const handleStatusUpdate = (quoteId: string, status: string) => {
    updateStatus.mutate(
      { quoteId, status },
      {
        onSuccess: () => toast.success(`Devis marque comme "${QUOTE_STATUS[status]?.label ?? status}"`),
        onError: () => toast.error("Erreur lors de la mise a jour"),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filtrer par statut :</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
            <SelectItem value="sent">Envoye</SelectItem>
            <SelectItem value="viewed">Consulte</SelectItem>
            <SelectItem value="accepted">Accepte</SelectItem>
            <SelectItem value="rejected">Refuse</SelectItem>
            <SelectItem value="expired">Expire</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(!quotes || quotes.length === 0) ? (
        <div className="p-8 text-center text-muted-foreground">
          Aucun devis {statusFilter !== "all" ? `avec le statut "${QUOTE_STATUS[statusFilter]?.label}"` : ""}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N. devis</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Entreprise</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Validite</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Total TTC</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const status = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.draft;
              const isExpired = new Date(quote.valid_until) < new Date() && quote.status === "sent";
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono text-sm">{quote.quote_number}</TableCell>
                  <TableCell>{quote.contact_name}</TableCell>
                  <TableCell className="text-muted-foreground">{quote.company_name ?? "-"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(quote.created_at).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className={`text-sm ${isExpired ? "text-red-600 font-medium" : ""}`}>
                    {new Date(quote.valid_until).toLocaleDateString("fr-FR")}
                    {isExpired && " (expire)"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={status.className}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {fmtPrice(quote.total_ttc)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {quote.pdf_url && (
                        <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                          <a href={quote.pdf_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      {["sent", "viewed"].includes(quote.status) && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-green-600"
                            onClick={() => handleStatusUpdate(quote.id, "accepted")}
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-600"
                            onClick={() => handleStatusUpdate(quote.id, "rejected")}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
