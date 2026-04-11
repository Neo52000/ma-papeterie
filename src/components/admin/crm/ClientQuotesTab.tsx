import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import type { ClientQuote } from "@/hooks/admin/useClientQuotes";

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

interface Props {
  quotes: ClientQuote[];
  isLoading: boolean;
}

export function ClientQuotesTab({ quotes, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Aucun devis
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>N. devis</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">HT</TableHead>
          <TableHead className="text-right">TTC</TableHead>
          <TableHead>PDF</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quotes.map((quote) => {
          const status = QUOTE_STATUS[quote.status] ?? QUOTE_STATUS.draft;
          return (
            <TableRow key={quote.id}>
              <TableCell className="font-mono text-sm">{quote.quote_number}</TableCell>
              <TableCell className="text-sm">
                {new Date(quote.created_at).toLocaleDateString("fr-FR")}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{fmtPrice(quote.subtotal_ht)}</TableCell>
              <TableCell className="text-right font-semibold">{fmtPrice(quote.total_ttc)}</TableCell>
              <TableCell>
                {quote.pdf_url && (
                  <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                    <a href={quote.pdf_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
