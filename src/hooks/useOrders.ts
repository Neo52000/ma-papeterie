import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OrderItem {
  id: string;
  order_id: string;
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
  total_amount: number;
  shipping_address?: any;
  billing_address?: any;
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

  useEffect(() => {
    fetchOrders();
  }, [adminView]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          *,
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
        query = query.eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as Order[]) || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Erreur lors du chargement des commandes');
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (orderData: {
    items: Array<{
      product_id: string;
      product_name: string;
      product_price: number;
      quantity: number;
    }>;
    customer_email: string;
    customer_phone?: string;
    shipping_address: any;
    billing_address: any;
    notes?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Check stock availability for all items first
      for (const item of orderData.items) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (productError) throw productError;
        
        if (!product || product.stock_quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour ${item.product_name}`);
        }
      }

      const total_amount = orderData.items.reduce((sum, item) => 
        sum + item.product_price * item.quantity, 0
      );

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: `TEMP-${Date.now()}`, // Will be replaced by trigger
          total_amount,
          status: 'pending',
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          shipping_address: orderData.shipping_address,
          billing_address: orderData.billing_address,
          notes: orderData.notes,
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
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Decrement stock for each product
      for (const item of orderData.items) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          product_id: item.product_id,
          quantity: item.quantity
        });

        if (stockError) {
          console.error('Error decrementing stock:', stockError);
          // Continue even if stock decrement fails - order is already created
        }
      }

      await fetchOrders();

      return {
        success: true,
        order_number: order.order_number,
      };
    } catch (error) {
      console.error('Error creating order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
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
      console.error('Error updating order status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue',
      };
    }
  };

  return { orders, loading, error, createOrder, updateOrderStatus, refetch: fetchOrders };
};