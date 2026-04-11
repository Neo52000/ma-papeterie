import { useEffect, useRef } from "react";
import { useMainCartStore } from "@/stores/mainCartStore";

/**
 * Tracks abandoned carts by recording to the `abandoned_carts` table
 * when the user leaves the page (beforeunload) while items are in cart.
 *
 * Mount this hook in the Checkout page or any page where cart abandonment
 * should be tracked.
 */
export function useAbandonedCartTracker() {
  const recordAbandonedCart = useMainCartStore((s) => s.recordAbandonedCart);
  const items = useMainCartStore((s) => s.items);
  const hasItems = items.length > 0;
  const recorded = useRef(false);

  useEffect(() => {
    if (!hasItems) {
      recorded.current = false;
      return;
    }

    const handleUnload = () => {
      if (!recorded.current && hasItems) {
        recorded.current = true;
        // Use sendBeacon-style: recordAbandonedCart is fire-and-forget
        recordAbandonedCart();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [hasItems, recordAbandonedCart]);
}
