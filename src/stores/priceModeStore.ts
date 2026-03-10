import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type PriceMode = 'ttc' | 'ht';

interface PriceModeStore {
  mode: PriceMode;
  toggle: () => void;
  setMode: (mode: PriceMode) => void;
}

export const usePriceModeStore = create<PriceModeStore>()(
  persist(
    (set, get) => ({
      mode: 'ttc' as PriceMode,
      toggle: () => set({ mode: get().mode === 'ttc' ? 'ht' : 'ttc' }),
      setMode: (mode: PriceMode) => set({ mode }),
    }),
    {
      name: 'ma-papeterie-price-mode',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
