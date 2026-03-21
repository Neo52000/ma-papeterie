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
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
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

export const useMainCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      itemCount: 0,
      isLoaded: true,

      addToCart: (item) => {
        const { items } = get();
        const existing = items.find(i => i.id === item.id);

        if (existing) {
          if (existing.quantity >= existing.stock_quantity) {
            toast.error(`Stock insuffisant pour ${item.name}`);
            return;
          }
          const updated = items.map(i =>
            i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
          );
          set({ items: updated, ...calculateTotals(updated) });
        } else {
          if (item.stock_quantity <= 0) {
            toast.error(`${item.name} est en rupture de stock`);
            return;
          }
          const updated = [...items, { ...item, quantity: 1 }];
          set({ items: updated, ...calculateTotals(updated) });
        }

        toast.success(`${item.name} ajouté au panier`);
        track('add_to_cart', {
          product_id: item.id,
          name: item.name,
          price: item.price,
          category: item.category,
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
