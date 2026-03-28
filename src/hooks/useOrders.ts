import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Address } from '@/types/common';

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
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';
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

export const useOrders = (adminView = false) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          id, user_id, order_number, status, total_amount, shipping_address, billing_address, customer_email, customer_phone, notes, created_at, updated_at,
          order_items (
            id,
            product_id,
            product_name,
            product_price,
            quantity,
            subtotal
          )
        `);

      if (!adminView) {
        const { data: { user } } = await supabase.auth.getUser();
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  }, [adminView]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const createOrder = async (orderData: {
    items: Array<{
      product_id: string;
      product_name: string;
      product_price: number;
      quantity: number;
      stamp_design_id?: string;
    }>;
    customer_email: string;
    customer_phone?: string;
    shipping_address: Address;
    billing_address: Address;
    notes?: string;
    delivery_cost?: number;
    shipping_method_name?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check stock availability for all items in a single batch query
      const productItems = orderData.items.filter(item => !item.stamp_design_id);
      if (productItems.length > 0) {
        const productIds = productItems.map(item => item.product_id);
        const { data: products, error: stockError } = await supabase
          .from('products')
          .select('id, stock_quantity')
          .in('id', productIds);

        if (stockError) throw stockError;

        const stockMap = new Map(products?.map(p => [p.id, p.stock_quantity]) ?? []);
        for (const item of productItems) {
          const stock = stockMap.get(item.product_id) ?? 0;
          if (stock < item.quantity) {
            throw new Error(`Stock insuffisant pour ${item.product_name}`);
          }
        }
      }

      const total_amount = orderData.items.reduce((sum, item) => 
        sum + item.product_price * item.quantity, 0
      );

      const deliveryCost = orderData.delivery_cost ?? 0;

      // Create order
      const { data: order, error: orderError } = await (supabase
        .from('orders') as any)
        .insert({
          user_id: user.id,
          order_number: `TEMP-${Date.now()}`, // Will be replaced by trigger
          total_amount: total_amount + deliveryCost,
          status: 'pending',
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          shipping_address: orderData.shipping_address as unknown as Record<string, unknown>,
          billing_address: orderData.billing_address as unknown as Record<string, unknown>,
          notes: orderData.notes,
          delivery_cost: deliveryCost,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_price: item.product_price,
        quantity: item.quantity,
        subtotal: item.product_price * item.quantity,
        customization_data: item.stamp_design_id
          ? { stamp_design_id: item.stamp_design_id, type: 'stamp' }
          : null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Decrement stock for each product
      for (const item of orderData.items) {
        // Skip stock decrement for stamp items (they use stamp_models stock)
        if (item.stamp_design_id) {
          // Update stamp design status to 'ordered'
          await supabase
            .from('stamp_designs')
            .update({ status: 'ordered', updated_at: new Date().toISOString() })
            .eq('id', item.stamp_design_id);
          continue;
        }

        const { error: stockError } = await supabase.rpc('decrement_stock', {
          product_id: item.product_id,
          quantity: item.quantity
        });

        if (stockError) {
          if (import.meta.env.DEV) console.error('Error decrementing stock:', stockError);
          // Continue even if stock decrement fails - order is already created
        }
      }

      // Fire-and-forget email confirmation — ne bloque pas le checkout
      supabase.functions.invoke('order-confirmation', {
        body: {
          order_id: order.id,
          order_number: order.order_number,
          customer_email: orderData.customer_email,
          items: orderData.items.map(i => ({ name: i.product_name, quantity: i.quantity, price: i.product_price })),
          total_amount,
          shipping_cost: deliveryCost,
          shipping_address: orderData.shipping_address,
        },
      }).catch((err) => { if (import.meta.env.DEV) console.error(err); });

      await fetchOrders();

      return {
        success: true,
        order_number: order.order_number,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      };
    }
  };

  const createStripeCheckout = async (orderData: {
    items: Array<{
      product_id: string;
      product_name: string;
      product_price: number;
      quantity: number;
    }>;
    customer_email: string;
    customer_phone?: string;
    shipping_address: Address;
    billing_address: Address;
    notes?: string;
    delivery_cost?: number;
    shipping_method_name?: string;
  }): Promise<{ success: boolean; sessionUrl?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: orderData,
      });

      if (error) throw error;
      if (!data?.sessionUrl) throw new Error('URL de paiement non reçue');

      return { success: true, sessionUrl: data.sessionUrl };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur lors de la création du paiement',
      };
    }
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;

      await fetchOrders();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      };
    }
  };

  return { orders, loading, error, createOrder, createStripeCheckout, updateOrderStatus, refetch: fetchOrders };
};