import { useCallback, useEffect, useState } from "react";

/**
 * Shape of an item persisted to the saved cart snapshot.
 * Matches the public CartItem shape so it can round-trip through addToCart.
 */
export interface SavedCartItem {
  id: string;
  name: string;
  price: string;
  image: string;
  category: string;
  quantity: number;
  stock_quantity: number;
  stamp_design_id?: string;
}

interface SavedCart {
  savedAt: number;
  items: SavedCartItem[];
}

const STORAGE_KEY = "ma-papeterie-saved-cart";

function read(): SavedCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedCart;
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Small localStorage-backed snapshot for "Save cart for later".
 * Kept separate from mainCartStore to avoid coupling persistence with pricing logic.
 */
export function useSavedCart() {
  const [saved, setSaved] = useState<SavedCart | null>(() => read());

  // Re-read on mount (covers tabs that may have saved in another context)
  useEffect(() => {
    setSaved(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSaved(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((items: SavedCartItem[]) => {
    const snapshot: SavedCart = { savedAt: Date.now(), items };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    setSaved(snapshot);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSaved(null);
  }, []);

  return { saved, save, clear };
}
