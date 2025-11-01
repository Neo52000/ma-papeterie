import { useState, useEffect } from 'react';
import { fetchShopifyProducts, setShopifyConfig } from '@/lib/shopify';
import { ShopifyProduct } from '@/stores/cartStore';

export const useShopifyProducts = (shopDomain?: string, storefrontToken?: string) => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [shopDomain, storefrontToken]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      if (shopDomain && storefrontToken) {
        setShopifyConfig(shopDomain, storefrontToken);
      }
      const productsData = await fetchShopifyProducts();
      setProducts(productsData);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement produits Shopify:', err);
      setError('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  return { products, loading, error, refetch: loadProducts };
};
