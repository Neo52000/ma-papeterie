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
  Camera, Download, RefreshCw, Loader2, Euro, Save, Image, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { FINISH_LABELS } from '@/components/photos/photoPricing';
import type { PhotoFinish } from '@/components/photos/photoPricing';

interface PhotoOrder {
  id: string;
  user_id: string;
  finish: PhotoFinish;
  notes: string | null;
  total_price: number;
  status: string;
  created_at: string;
}

interface PhotoOrderItem {
  id: string;
  order_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  format: string;
  quantity: number;
  unit_price: number;
}

interface PricingRow {
  id: string;
  format: string;
  label: string;
  price_per_unit: number;
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

export default function AdminPhotoOrders() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery<PhotoOrder[]>({
    queryKey: ['admin-photo-orders', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('photo_orders' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Fetch items for expanded order
  const { data: orderItems = [] } = useQuery<PhotoOrderItem[]>({
    queryKey: ['admin-photo-order-items', expandedOrder],
    queryFn: async () => {
      if (!expandedOrder) return [];
      const { data, error } = await supabase
        .from('photo_order_items' as any)
        .select('*')
        .eq('order_id', expandedOrder);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!expandedOrder,
  });

  // Fetch pricing
  const { data: pricing = [], isLoading: pricingLoading } = useQuery<PricingRow[]>({
    queryKey: ['admin-photo-pricing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('photo_pricing' as any)
        .select('*')
        .order('price_per_unit', { ascending: true });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Update order status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('photo_orders' as any)
        .update({ status, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-photo-orders'] });
      toast.success('Statut mis à jour');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Update pricing
  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from('photo_pricing' as any)
        .update({ price_per_unit: price, updated_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-photo-pricing'] });
      queryClient.invalidateQueries({ queryKey: ['photo-pricing'] });
      toast.success('Tarif mis à jour');
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Download photo
  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('photo-prints')
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

  const totalPhotos = (orderId: string) => {
    if (expandedOrder !== orderId) return null;
    return orderItems.reduce((s, i) => s + i.quantity, 0);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Commandes photo
          </h1>
          <p className="text-muted-foreground">Gérez les tirages photo envoyés par les clients</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-photo-orders'] })}
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
            Tarifs tirage photo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pricingLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {pricing.map(p => (
                <PhotoPricingCard
                  key={p.id}
                  pricing={p}
                  onSave={price => updatePrice.mutate({ id: p.id, price })}
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
              <Image className="h-5 w-5" />
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
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="border rounded-lg">
                  {/* Order row */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    <div className="flex-shrink-0">
                      {expandedOrder === order.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {new Date(order.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Finition : {FINISH_LABELS[order.finish]}
                        {order.notes && ` — ${order.notes.substring(0, 60)}${order.notes.length > 60 ? '...' : ''}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">
                      {Number(order.total_price).toFixed(2)} &euro;
                    </span>
                    <Select
                      value={order.status}
                      onValueChange={status => {
                        updateStatus.mutate({ id: order.id, status });
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8" onClick={e => e.stopPropagation()}>
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
                  </div>

                  {/* Expanded items */}
                  {expandedOrder === order.id && (
                    <div className="border-t px-4 py-3 bg-muted/20">
                      {orderItems.length === 0 ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {orderItems.map(item => (
                            <div key={item.id} className="text-center space-y-1">
                              <button
                                onClick={() => handleDownload(item.file_path, item.file_name)}
                                className="block w-full aspect-square rounded-lg bg-muted overflow-hidden hover:ring-2 ring-primary transition-all"
                              >
                                <div className="w-full h-full flex items-center justify-center">
                                  <Download className="h-6 w-6 text-muted-foreground" />
                                </div>
                              </button>
                              <p className="text-[10px] truncate text-muted-foreground">{item.file_name}</p>
                              <p className="text-xs font-medium">{item.format} &times; {item.quantity}</p>
                              <p className="text-xs text-muted-foreground">
                                {(Number(item.unit_price) * item.quantity).toFixed(2)} &euro;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoPricingCard({ pricing, onSave, saving }: {
  pricing: PricingRow;
  onSave: (price: number) => void;
  saving: boolean;
}) {
  const [price, setPrice] = useState(String(pricing.price_per_unit));
  const changed = Number(price) !== pricing.price_per_unit;

  return (
    <Card className="text-center">
      <CardContent className="pt-4 pb-4 space-y-2">
        <p className="font-semibold">{pricing.label}</p>
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
