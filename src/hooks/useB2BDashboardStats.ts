import { useMemo } from 'react';
import type { Order } from '@/hooks/useOrders';
import type { B2BInvoice } from '@/hooks/useB2BInvoices';

export interface MonthlySpending {
  month: string; // "janv", "fév", etc.
  amount: number;
  monthIndex: number; // 0-11 for sorting
}

export interface StatusDistribution {
  status: string;
  count: number;
  label: string;
  color: string;
}

const MONTH_LABELS = [
  'janv.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'Préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  confirmed: '#3b82f6',
  preparing: '#a855f7',
  shipped: '#6366f1',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

export function useB2BDashboardStats(
  orders: Order[],
  invoices: B2BInvoice[] | undefined,
) {
  const monthlySpending = useMemo(() => {
    const now = new Date();
    const result: MonthlySpending[] = [];

    // Build last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const total = orders
        .filter(o => {
          const od = new Date(o.created_at);
          return `${od.getFullYear()}-${od.getMonth()}` === monthKey;
        })
        .reduce((sum, o) => sum + (o.total_amount || 0), 0);

      result.push({
        month: MONTH_LABELS[d.getMonth()],
        amount: Math.round(total * 100) / 100,
        monthIndex: d.getMonth(),
      });
    }
    return result;
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        count,
        label: STATUS_LABELS[status] || status,
        color: STATUS_COLORS[status] || '#94a3b8',
      }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  const unpaidInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => inv.status === 'issued' || inv.status === 'draft');
  }, [invoices]);

  const unpaidTotal = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + (inv.total_ttc || 0), 0);
  }, [unpaidInvoices]);

  // Trend: current month spending vs previous month
  const spendingTrend = useMemo(() => {
    if (monthlySpending.length < 2) return null;
    const current = monthlySpending[monthlySpending.length - 1].amount;
    const previous = monthlySpending[monthlySpending.length - 2].amount;
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }, [monthlySpending]);

  const activeOrders = useMemo(() => {
    return orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'pending');
  }, [orders]);

  const ytdTotal = useMemo(() => {
    return orders.reduce((s, o) => s + (o.total_amount || 0), 0);
  }, [orders]);

  return {
    monthlySpending,
    statusDistribution,
    unpaidInvoices,
    unpaidTotal,
    spendingTrend,
    activeOrders,
    pendingOrders,
    ytdTotal,
  };
}
