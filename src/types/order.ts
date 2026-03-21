import type { Address } from './common';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  payment_status?: PaymentStatus;
  payment_method?: string;
  stripe_session_id?: string;
  total_amount: number;
  shipping_address?: Address;
  billing_address?: Address;
  customer_email: string;
  customer_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderFilters {
  search: string;
  statuses: OrderStatus[];
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: 'created_at' | 'total_amount' | 'order_number' | 'status';
  sortDir: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: OrderFilters = {
  search: '',
  statuses: [],
  dateFrom: null,
  dateTo: null,
  sortBy: 'created_at',
  sortDir: 'desc',
  page: 0,
  pageSize: 25,
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  preparing: 'En préparation',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};
