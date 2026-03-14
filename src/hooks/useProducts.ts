import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  badge: string | null;
  eco: boolean;
  stock_quantity: number;
  is_featured: boolean;
  ean: string | null;
}

export const useProducts = (featured?: boolean) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        let query = supabase.from('products').select('id, name, description, price, price_ht, price_ttc, image_url, category, stock_quantity, badge, is_active, featured, brand, ean');

        if (featured) {
          query = query.eq('is_featured', true);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (!isMounted) return;
        if (error) throw error;
        setProducts(data || []);
        setError(null);
      } catch (err) {
        if (!isMounted) return;
        setError('Erreur lors du chargement des produits');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [featured]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      let query = supabase.from('products').select('id, name, description, price, price_ht, price_ttc, image_url, category, stock_quantity, badge, is_active, featured, brand, ean');

      if (featured) {
        query = query.eq('is_featured', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch: fetchProducts };
};