import { useState, useEffect, useCallback } from 'react';
import { fetchShopifyProducts, fetchProductByHandle } from '@/lib/shopify';
import { ShopifyProduct } from '@/stores/cartStore';

interface ShopifyProductNode {
  node: {
    id: string;
    title: string;
    description: string;
    descriptionHtml?: string;
    handle: string;
    productType?: string;
    vendor?: string;
    tags?: string[];
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
      maxVariantPrice?: {
        amount: string;
        currencyCode: string;
      };
    };
    compareAtPriceRange?: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
          width?: number;
          height?: number;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          compareAtPrice?: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          quantityAvailable?: number;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
          image?: {
            url: string;
            altText: string | null;
          };
        };
      }>;
    };
    options: Array<{
      id?: string;
      name: string;
      values: string[];
    }>;
    seo?: {
      title?: string;
      description?: string;
    };
  };
}

export const useShopifyProducts = (initialQuery?: string) => {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async (query?: string) => {
    try {
      setLoading(true);
      const productsData = await fetchShopifyProducts(50, query);
      // Transform to ShopifyProduct format if needed
      const formattedProducts = productsData.map((p: ShopifyProductNode) => ({
        node: p.node
      }));
      setProducts(formattedProducts);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement produits Shopify:', err);
      setError('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts(initialQuery);
  }, [initialQuery, loadProducts]);

  const searchProducts = useCallback(async (searchQuery: string) => {
    await loadProducts(searchQuery ? `title:*${searchQuery}*` : undefined);
  }, [loadProducts]);

  const filterByCategory = useCallback(async (category: string) => {
    await loadProducts(category ? `product_type:${category}` : undefined);
  }, [loadProducts]);

  return { 
    products, 
    loading, 
    error, 
    refetch: loadProducts,
    searchProducts,
    filterByCategory
  };
};

export const useShopifyProduct = (handle: string | undefined) => {
  const [product, setProduct] = useState<ShopifyProduct['node'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!handle) {
      setLoading(false);
      return;
    }

    const loadProduct = async () => {
      try {
        setLoading(true);
        const productData = await fetchProductByHandle(handle);
        setProduct(productData);
        setError(null);
      } catch (err) {
        console.error('Erreur chargement produit:', err);
        setError('Produit introuvable');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [handle]);

  return { product, loading, error };
};
