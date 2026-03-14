import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface B2BInvoice {
  id: string;
  invoice_number: string;
  account_id: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  period_start: string;
  period_end: string;
  total_ht: number;
  total_ttc: number;
  issued_at: string | null;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  b2b_invoice_orders?: B2BInvoiceOrder[];
}

export interface B2BInvoiceOrder {
  id: string;
  invoice_id: string;
  order_id: string;
  amount: number;
  orders?: {
    order_number: string;
    created_at: string;
    total_amount: number;
    status: string;
  } | null;
}

// Helper: Supabase client typed as any for tables missing from generated types.
// Remove after running `supabase gen types typescript`.
const db = supabase as any;

export function useB2BInvoices(accountId: string | undefined) {
  return useQuery({
    queryKey: ['b2b-invoices', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data, error } = await db
        .from('b2b_invoices')
        .select(`
          *,
          b2b_invoice_orders(
            *,
            orders(order_number, created_at, total_amount, status)
          )
        `)
        .eq('account_id', accountId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as B2BInvoice[];
    },
  });
}

// Admin: toutes les factures
export function useAllB2BInvoices() {
  return useQuery({
    queryKey: ['b2b-all-invoices'],
    queryFn: async () => {
      const { data, error } = await db
        .from('b2b_invoices')
        .select(`*, b2b_accounts(name)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as (B2BInvoice & { b2b_accounts: { name: string } | null })[];
    },
  });
}

export function useB2BInvoiceMutations() {
  const qc = useQueryClient();

  // Générer la facture mensuelle d'un compte (admin)
  const generateMonthlyInvoice = useMutation({
    mutationFn: async ({
      accountId,
      periodStart,
      periodEnd,
      orderIds,
    }: {
      accountId: string;
      periodStart: string;
      periodEnd: string;
      orderIds: string[];
    }) => {
      // Récupérer les commandes sélectionnées
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount')
        .in('id', orderIds);
      if (ordersError) throw ordersError;

      const totalTtc = orders?.reduce((s, o) => s + (o.total_amount || 0), 0) ?? 0;
      const totalHt = Math.round((totalTtc / 1.2) * 100) / 100; // TVA 20% approximation

      // Générer le numéro de facture
      const { data: numData, error: numError } = await db
        .rpc('next_invoice_number');
      if (numError) throw numError;

      // Créer la facture
      const dueDate = new Date(periodEnd);
      dueDate.setDate(dueDate.getDate() + 30);

      const { data: invoice, error: invError } = await db
        .from('b2b_invoices')
        .insert({
          invoice_number: numData,
          account_id: accountId,
          status: 'draft',
          period_start: periodStart,
          period_end: periodEnd,
          total_ht: totalHt,
          total_ttc: totalTtc,
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select('id')
        .single();
      if (invError) throw invError;

      // Lier les commandes à la facture
      const invoiceOrders = (orders ?? []).map(o => ({
        invoice_id: invoice.id,
        order_id: o.id,
        amount: o.total_amount,
      }));
      if (invoiceOrders.length > 0) {
        const { error: linkError } = await db
          .from('b2b_invoice_orders')
          .insert(invoiceOrders);
        if (linkError) throw linkError;
      }

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['b2b-invoices'] });
      qc.invalidateQueries({ queryKey: ['b2b-all-invoices'] });
      toast.success('Facture générée avec succès');
    },
    onError: (e: any) => toast.error(`Erreur : ${e.message}`),
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({
      invoiceId,
      status,
    }: {
      invoiceId: string;
      status: B2BInvoice['status'];
    }) => {
      const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
      if (status === 'issued') updates.issued_at = new Date().toISOString();
      if (status === 'paid') updates.paid_at = new Date().toISOString();

      const { error } = await db
        .from('b2b_invoices')
        .update(updates)
        .eq('id', invoiceId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['b2b-invoices'] });
      qc.invalidateQueries({ queryKey: ['b2b-all-invoices'] });
      toast.success('Statut mis à jour');
    },
    onError: () => toast.error('Erreur lors de la mise à jour du statut'),
  });

  return { generateMonthlyInvoice, updateInvoiceStatus };
}
