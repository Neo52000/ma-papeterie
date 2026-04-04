import { describe, it, expect, beforeEach } from 'vitest';
import { useWishlistStore } from './wishlistStore';
import type { ShopifyProduct } from './shopifyCartStore';

function mockProduct(overrides: Partial<ShopifyProduct['node']> = {}): ShopifyProduct {
  return {
    node: {
      id: 'gid://shopify/Product/1',
      title: 'Stylo Bic',
      description: 'Un stylo classique',
      handle: 'stylo-bic',
      priceRange: {
        minVariantPrice: { amount: '1.50', currencyCode: 'EUR' },
      },
      images: { edges: [] },
      variants: {
        edges: [
          {
            node: {
              id: 'gid://shopify/ProductVariant/1',
              title: 'Default',
              price: { amount: '1.50', currencyCode: 'EUR' },
              availableForSale: true,
              selectedOptions: [{ name: 'Title', value: 'Default' }],
            },
          },
        ],
      },
      options: [{ name: 'Title', values: ['Default'] }],
      ...overrides,
    },
  };
}

describe('wishlistStore', () => {
  beforeEach(() => {
    useWishlistStore.setState({ items: [] });
  });

  describe('addItem', () => {
    it('adds a product to the wishlist', () => {
      useWishlistStore.getState().addItem(mockProduct());
      expect(useWishlistStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().items[0].node.id).toBe('gid://shopify/Product/1');
    });

    it('does not add duplicate products', () => {
      const product = mockProduct();
      useWishlistStore.getState().addItem(product);
      useWishlistStore.getState().addItem(product);
      expect(useWishlistStore.getState().items).toHaveLength(1);
    });

    it('adds different products', () => {
      useWishlistStore.getState().addItem(mockProduct({ id: 'product-A' }));
      useWishlistStore.getState().addItem(mockProduct({ id: 'product-B' }));
      expect(useWishlistStore.getState().items).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes a product by ID', () => {
      useWishlistStore.getState().addItem(mockProduct({ id: 'A' }));
      useWishlistStore.getState().addItem(mockProduct({ id: 'B' }));
      useWishlistStore.getState().removeItem('A');

      expect(useWishlistStore.getState().items).toHaveLength(1);
      expect(useWishlistStore.getState().items[0].node.id).toBe('B');
    });

    it('does nothing if ID not found', () => {
      useWishlistStore.getState().addItem(mockProduct());
      useWishlistStore.getState().removeItem('nonexistent');
      expect(useWishlistStore.getState().items).toHaveLength(1);
    });
  });

  describe('isInWishlist', () => {
    it('returns true for existing product', () => {
      useWishlistStore.getState().addItem(mockProduct({ id: 'test-id' }));
      expect(useWishlistStore.getState().isInWishlist('test-id')).toBe(true);
    });

    it('returns false for non-existing product', () => {
      expect(useWishlistStore.getState().isInWishlist('unknown')).toBe(false);
    });
  });

  describe('clearWishlist', () => {
    it('removes all items', () => {
      useWishlistStore.getState().addItem(mockProduct({ id: 'A' }));
      useWishlistStore.getState().addItem(mockProduct({ id: 'B' }));
      useWishlistStore.getState().clearWishlist();
      expect(useWishlistStore.getState().items).toHaveLength(0);
    });
  });

  describe('getTotalItems', () => {
    it('returns 0 for empty wishlist', () => {
      expect(useWishlistStore.getState().getTotalItems()).toBe(0);
    });

    it('returns count of items', () => {
      useWishlistStore.getState().addItem(mockProduct({ id: 'A' }));
      useWishlistStore.getState().addItem(mockProduct({ id: 'B' }));
      expect(useWishlistStore.getState().getTotalItems()).toBe(2);
    });
  });
});
