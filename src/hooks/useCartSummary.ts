import { useMainCartStore } from '@/stores/mainCartStore';
import { useShopifyCart } from '@/stores/shopifyCartStore';

/**
 * Hook combining both cart systems for a unified item count.
 * Useful for displaying a single badge in the header.
 */
export function useCartSummary() {
  const internalItems = useMainCartStore((s) => s.itemCount);
  const shopifyItems = useShopifyCart((s) => s.getTotalItems());

  return {
    totalItems: internalItems + shopifyItems,
    internalItems,
    shopifyItems,
  };
}
