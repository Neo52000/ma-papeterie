import { useState } from 'react';
import { FileText, Download, Table2, Search, CheckCircle, Clock, XCircle, FileX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useB2BAccount } from '@/hooks/useB2BAccount';
import { useB2BInvoices } from '@/hooks/useB2BInvoices';
import { generateInvoicePDF, exportInvoicesCSV } from '@/components/pro/generateInvoicePDF';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { B2BInvoice } from '@/hooks/useB2BInvoices';

const STATUS_CONFIG: Record<B2BInvoice['status'], { label: string; icon: typeof FileText; className: string }> = {
  draft:     { label: 'Brouillon',  icon: Clock,        className: 'bg-gray-100 text-gray-700' },
  issued:    { label: 'Émise',      icon: FileText,     className: 'bg-blue-100 text-blue-700' },
  paid:      { label: 'Payée',      icon: CheckCircle,  className: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',   icon: XCircle,      className: 'bg-red-100 text-red-700' },
};

export default function ProFactures() {
  const { account } = useB2BAccount();
  const { data: invoices = [], isLoading } = useB2BInvoices(account?.id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = invoices.filter(inv => {
    const matchSearch = !search || inv.invoice_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDownloadPDF = (invoice: B2BInvoice) => {
    if (!account) return;
    generateInvoicePDF(invoice, account);
  };

  const handleExportCSV = () => {
    exportInvoicesCSV(filtered);
  };

  const totalTtc = filtered.reduce((s, inv) => s + inv.total_ttc, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Factures</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} facture{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
          <Table2 className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° de facture…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, { label }]) => (
              <SelectItem key={v} value={v}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse bg-muted rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 flex flex-col items-center gap-2 text-center text-muted-foreground">
            <FileX className="h-10 w-10" />
            <p>Aucune facture pour l'instant</p>
            <p className="text-xs">Vos factures mensuelles seront générées automatiquement par votre chargé de compte.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map(invoice => {
              const cfg = STATUS_CONFIG[invoice.status];
              const Icon = cfg.icon;
              return (
                <div
                  key={invoice.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/50 rounded-xl p-4 hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{invoice.invoice_number}</p>
                        <Badge className={`text-xs gap-1 ${cfg.className}`} variant="outline">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Période : {format(new Date(invoice.period_start), 'd MMM', { locale: fr })} – {format(new Date(invoice.period_end), 'd MMM yyyy', { locale: fr })}
                        {invoice.due_date && ` · Échéance : ${format(new Date(invoice.due_date), 'd MMM yyyy', { locale: fr })}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="text-right">
                      <p className="font-bold">{invoice.total_ttc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                      <p className="text-xs text-muted-foreground">HT : {invoice.total_ht.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadPDF(invoice)}
                      className="gap-2 shrink-0"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-muted rounded-lg px-4 py-2 text-sm">
              Total TTC affiché :{' '}
              <span className="font-bold">
                {totalTtc.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
