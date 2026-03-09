import { useCart } from '@/contexts/CartContext';
import { useShopifyCart } from '@/stores/shopifyCartStore';

/**
 * Hook combining both cart systems for a unified item count.
 * Useful for displaying a single badge in the header.
 */
export function useCartSummary() {
  const { state } = useCart();
  const shopifyItemCount = useShopifyCart((s) => s.getTotalItems());

  return {
    totalItems: state.itemCount + shopifyItemCount,
    internalItems: state.itemCount,
    shopifyItems: shopifyItemCount,
  };
}
