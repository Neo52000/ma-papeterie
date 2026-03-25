import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Printer, Download, RefreshCw, Loader2, Euro, Save, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { FORMAT_LABELS, COLOR_LABELS } from '@/components/print/printPricing';
import type { PrintFormat, PrintColor } from '@/components/print/printPricing';

interface PrintOrder {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  format: PrintFormat;
  color: PrintColor;
  recto_verso: boolean;
  copies: number;
  notes: string | null;
  unit_price: number;
  total_price: number;
  status: string;
  created_at: string;
}

interface PricingRow {
  id: string;
  format: PrintFormat;
  color: PrintColor;
  price_per_page: number;
  active: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  processing: 'En cours',
  ready: 'Prêt',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function AdminPrintOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<PrintOrder[]>({
    queryKey: ['admin-print-orders', statusFilter],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('print_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as PrintOrder[]) ?? [];
    },
  });

  // Fetch pricing
  const { data: pricing = [], isLoading: pricingLoading } = useQuery<PricingRow[]>({
    queryKey: ['admin-print-pricing'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('print_pricing')
        .select('*')
        .order('format', { ascending: true });
      if (error) throw error;
      return (data as PricingRow[]) ?? [];
    },
  });

  // Update order status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('print_orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-print-orders'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  // Update pricing
  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('print_pricing')
        .update({ price_per_page: price, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-print-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['print-pricing'] });
      toast.success('Tarif mis à jour');
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : String(err)),
  });

  // Download document
  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('print-documents')
      .download(filePath);
    if (error) {
      toast.error("Erreur de téléchargement");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Printer className="h-6 w-6" />
            Commandes d'impression
          </h1>
          <p className="text-muted-foreground">Gérez les documents envoyés par les clients</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-print-orders'] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* ── Pricing Management ─────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Euro className="h-5 w-5" />
            Tarifs d'impression
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pricingLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pricing.map(p => (
                <PricingCard
                  key={p.id}
                  pricing={p}
                  onSave={(price) => updatePrice.mutate({ id: p.id, price })}
                  saving={updatePrice.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Orders List ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Commandes ({orders.length})
            </CardTitle>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="processing">En cours</SelectItem>
                <SelectItem value="ready">Prêt</SelectItem>
                <SelectItem value="completed">Terminé</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune commande</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fichier</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Copies</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => handleDownload(order.file_path, order.file_name)}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline max-w-[200px] truncate"
                        >
                          <Download className="h-3.5 w-3.5 flex-shrink-0" />
                          {order.file_name}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {(order.file_size / 1024 / 1024).toFixed(2)} Mo
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {FORMAT_LABELS[order.format]}, {COLOR_LABELS[order.color]}
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {order.recto_verso ? 'Recto-verso' : 'Recto'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{order.copies}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {Number(order.total_price).toFixed(2)} &euro;
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={status => updateStatus.mutate({ id: order.id, status })}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <Badge className={`${STATUS_COLORS[order.status]} text-xs border-0`}>
                              {STATUS_LABELS[order.status]}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {order.notes && (
                          <span className="text-xs text-muted-foreground italic" title={order.notes}>
                            {order.notes.substring(0, 40)}{order.notes.length > 40 ? '...' : ''}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PricingCard({ pricing, onSave, saving }: {
  pricing: PricingRow;
  onSave: (price: number) => void;
  saving: boolean;
}) {
  const [price, setPrice] = useState(String(pricing.price_per_page));
  const changed = Number(price) !== pricing.price_per_page;

  return (
    <Card className="text-center">
      <CardContent className="pt-4 pb-4 space-y-2">
        <p className="font-semibold">{FORMAT_LABELS[pricing.format]}</p>
        <p className="text-sm text-muted-foreground">{COLOR_LABELS[pricing.color]}</p>
        <div className="flex items-center gap-2 justify-center">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            className="w-24 text-center"
          />
          <span className="text-sm">&euro;</span>
        </div>
        {changed && (
          <Button
            size="sm"
            onClick={() => onSave(Number(price))}
            disabled={saving}
          >
            <Save className="h-3 w-3 mr-1" />
            Enregistrer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
