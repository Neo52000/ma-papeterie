import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ShopifyProduct } from './cartStore';

interface WishlistStore {
  items: ShopifyProduct[];
  
  // Actions
  addItem: (product: ShopifyProduct) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        const { items } = get();
        const exists = items.find(i => i.node.id === product.node.id);
        
        if (!exists) {
          set({ items: [...items, product] });
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter(item => item.node.id !== productId)
        });
      },

      isInWishlist: (productId) => {
        return get().items.some(item => item.node.id === productId);
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.length;
      }
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
