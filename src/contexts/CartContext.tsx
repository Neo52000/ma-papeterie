/**
 * Cart compatibility layer — delegates to Zustand mainCartStore.
 *
 * All consumers use `useCart()` which now reads from the Zustand store.
 * CartProvider is kept as a no-op wrapper for backwards compatibility
 * (can be removed from App.tsx in a future cleanup).
 *
 * For Shopify products, see @/stores/shopifyCartStore.ts (useShopifyCart).
 */
import { ReactNode } from 'react';
import { useMainCartStore } from '@/stores/mainCartStore';

// Re-export the CartItem type from the store
export type { CartItem } from '@/stores/mainCartStore';

/** No-op provider — kept for backwards compatibility. Can be safely removed from App.tsx. */
export function CartProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// eslint-disable-next-line react-refresh/only-export-components
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
