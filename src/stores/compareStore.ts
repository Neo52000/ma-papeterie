import { create } from "zustand";

export interface CompareProduct {
  id: string;
  name: string;
  price: number;
  price_ttc: number | null;
  image_url: string | null;
  category: string;
  brand: string | null;
  description: string | null;
  stock_quantity: number | null;
}

interface CompareState {
  items: CompareProduct[];
  isOpen: boolean;
  add: (product: CompareProduct) => void;
  remove: (id: string) => void;
  clear: () => void;
  toggle: (product: CompareProduct) => void;
  setOpen: (open: boolean) => void;
  has: (id: string) => boolean;
}

const MAX_COMPARE = 4;

export const useCompareStore = create<CompareState>()((set, get) => ({
  items: [],
  isOpen: false,
  add: (product) =>
    set((s) => {
      if (s.items.length >= MAX_COMPARE || s.items.some((p) => p.id === product.id)) return s;
      return { items: [...s.items, product] };
    }),
  remove: (id) => set((s) => ({ items: s.items.filter((p) => p.id !== id) })),
  clear: () => set({ items: [], isOpen: false }),
  toggle: (product) => {
    const state = get();
    if (state.items.some((p) => p.id === product.id)) {
      set({ items: state.items.filter((p) => p.id !== product.id) });
    } else if (state.items.length < MAX_COMPARE) {
      set({ items: [...state.items, product] });
    }
  },
  setOpen: (open) => set({ isOpen: open }),
  has: (id) => get().items.some((p) => p.id === id),
}));
