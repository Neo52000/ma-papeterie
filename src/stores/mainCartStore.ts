import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { track } from '@/hooks/useAnalytics';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
  quantity: number;
  stock_quantity: number;
  /** UUID reference to stamp_designs table for customized stamps */
  stamp_design_id?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isLoaded: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

function calculateTotals(items: CartItem[]) {
  const total = items.reduce((sum, item) => {
    const price = parseFloat(item.price);
    return sum + (Number.isNaN(price) ? 0 : price) * item.quantity;
  }, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return { total: parseFloat(total.toFixed(2)), itemCount };
}

/**
 * Convenience hook — drop-in replacement for the legacy useCart() from CartContext.
 * Returns the same shape so existing consumers don't need refactoring.
 */
export function useCart() {
  const items = useMainCartStore((s) => s.items);
  const total = useMainCartStore((s) => s.total);
  const itemCount = useMainCartStore((s) => s.itemCount);
  const isLoaded = useMainCartStore((s) => s.isLoaded);
  const addToCart = useMainCartStore((s) => s.addToCart);
  const removeFromCart = useMainCartStore((s) => s.removeFromCart);
  const updateQuantity = useMainCartStore((s) => s.updateQuantity);
  const clearCart = useMainCartStore((s) => s.clearCart);

  return {
    state: { items, total, itemCount },
    isLoaded,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
}

export const useMainCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [] as CartItem[],
      total: 0,
      itemCount: 0,
      isLoaded: true,

      addToCart: (item, quantity = 1) => {
        const { items } = get();
        const existing = items.find(i => i.id === item.id);

        if (existing) {
          const newQty = existing.quantity + quantity;
          if (newQty > existing.stock_quantity) {
            toast.error(`Stock insuffisant pour ${item.name}`);
            return;
          }
          const updated = items.map(i =>
            i.id === item.id ? { ...i, quantity: newQty } : i,
          );
          set({ items: updated, ...calculateTotals(updated) });
        } else {
          if (item.stock_quantity < quantity) {
            toast.error(`${item.name} est en rupture de stock`);
            return;
          }
          const updated = [...items, { ...item, quantity }];
          set({ items: updated, ...calculateTotals(updated) });
        }

        toast.success(`${item.name} ajouté au panier`);
        track('add_to_cart', {
          product_id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
          quantity,
        });
      },

      removeFromCart: (id) => {
        const { items } = get();
        const item = items.find(i => i.id === id);
        const updated = items.filter(i => i.id !== id);
        set({ items: updated, ...calculateTotals(updated) });
        if (item) toast.success(`${item.name} retiré du panier`);
      },

      updateQuantity: (id, quantity) => {
        const { items } = get();
        if (quantity <= 0) {
          const updated = items.filter(i => i.id !== id);
          set({ items: updated, ...calculateTotals(updated) });
          return;
        }
        const item = items.find(i => i.id === id);
        if (item && quantity > item.stock_quantity) {
          toast.error(`Stock insuffisant. Maximum disponible: ${item.stock_quantity}`);
          return;
        }
        const updated = items.map(i =>
          i.id === id ? { ...i, quantity } : i,
        );
        set({ items: updated, ...calculateTotals(updated) });
      },

      clearCart: () => {
        set({ items: [], total: 0, itemCount: 0 });
        toast.success('Panier vidé');
      },
    }),
    {
      name: 'ma-papeterie-cart',
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const { total, itemCount } = calculateTotals(state.items);
          state.total = total;
          state.itemCount = itemCount;
          state.isLoaded = true;
        }
      },
    },
  ),
);
