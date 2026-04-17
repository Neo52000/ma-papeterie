import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/stores/mainCartStore";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { priceLabel } from "@/lib/formatPrice";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CartRecoWidget } from "@/components/cart/CartRecoWidget";
import { track } from "@/hooks/useAnalytics";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { QuantityInput } from "@/components/cart/QuantityInput";
import { useSavedCart } from "@/hooks/useSavedCart";
import { toast } from "sonner";
import { confettiBurst } from "@/lib/confetti";
import { calculateLeasing } from "@/hooks/useLeasingCalculator";
import { LEASING_MIN_CART_HT, LEASING_DISCLAIMER, isCategoryEligible } from "@/lib/leasingConstants";

export function CartSheet() {
  const { state, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();
  const priceMode = usePriceModeStore((s) => s.mode);
  const [bouncing, setBouncing] = useState(false);
  const previousCount = useRef(state.itemCount);
  const { saved, save: saveSnapshot, clear: clearSnapshot } = useSavedCart();

  const handleSaveForLater = () => {
    if (state.items.length === 0) return;
    saveSnapshot(
      state.items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        image: i.image,
        category: i.category,
        quantity: i.quantity,
        stock_quantity: i.stock_quantity,
        stamp_design_id: i.stamp_design_id,
      }))
    );
    clearCart();
    toast.success("Panier sauvegardé pour plus tard");
  };

  const handleRestoreSaved = () => {
    if (!saved?.items?.length) return;
    saved.items.forEach((item) => {
      const { quantity, ...rest } = item;
      addToCart(rest, quantity);
    });
    clearSnapshot();
    toast.success("Panier restauré");
  };

  // Trigger a brief bounce + confetti on the cart icon when itemCount increases.
  useEffect(() => {
    // Skip the very first mount (avoids bouncing when a persisted cart rehydrates)
    if (!previousCount.current && state.itemCount > 0) {
      previousCount.current = state.itemCount;
      return;
    }
    if (state.itemCount > previousCount.current) {
      setBouncing(true);
      // Fire-and-forget small confetti near the cart icon (top-right, small burst)
      void confettiBurst({ particleCount: 28, spread: 50, origin: { x: 0.92, y: 0.08 } });
      const id = setTimeout(() => setBouncing(false), 400);
      previousCount.current = state.itemCount;
      return () => clearTimeout(id);
    }
    previousCount.current = state.itemCount;
  }, [state.itemCount]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={`Panier, ${state.itemCount} article${state.itemCount > 1 ? 's' : ''}`}>
          <ShoppingCart className={`h-4 w-4 ${bouncing ? "animate-cart-bounce" : ""}`} />
          {state.itemCount > 0 && (
            <Badge className={`absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs ${bouncing ? "animate-cart-bounce" : ""}`}>
              {state.itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Votre Panier</SheetTitle>
          <SheetDescription>
            {state.itemCount === 0 
              ? "Votre panier est vide" 
              : `${state.itemCount} article${state.itemCount > 1 ? 's' : ''} dans votre panier`
            }
          </SheetDescription>
        </SheetHeader>

        {state.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3 px-4 text-center">
            <ShoppingCart className="h-16 w-16" />
            <p>Votre panier est vide</p>
            <p className="text-sm">Découvrez notre catalogue pour ajouter des produits</p>
            {saved && saved.items.length > 0 && (
              <div className="mt-4 w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary mb-2">
                  <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                  Panier sauvegardé ({saved.items.length} article{saved.items.length > 1 ? "s" : ""})
                </p>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleRestoreSaved}>
                    Restaurer
                  </Button>
                  <Button size="sm" variant="outline" onClick={clearSnapshot} aria-label="Supprimer le panier sauvegardé">
                    Oublier
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 mt-6">
              <div className="space-y-4">
                {state.items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3">
                    <OptimizedImage
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                      width={48}
                      height={48}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{item.name}</h4>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                        {item.stamp_design_id && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Personnalisé
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary">{item.price}€ {priceLabel(priceMode)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <QuantityInput
                        value={item.quantity}
                        onChange={(next) => updateQuantity(item.id, next)}
                        ariaLabel={`Quantité de ${item.name}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Supprimer ${item.name} du panier`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <CartRecoWidget cartProductIds={state.items.map((i) => i.id)} />

            {/* Leasing CTA — visible si total >= 800€ et au moins 1 produit mobilier */}
            {state.total >= LEASING_MIN_CART_HT &&
              state.items.some((i) => isCategoryEligible(i.category)) && (
                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mt-2">
                  <p className="text-xs font-medium mb-1">
                    Financez ce panier en leasing : ≈ {calculateLeasing(state.total, 36).monthlyHT.toFixed(2)} € HT/mois
                  </p>
                  <a
                    href="/leasing-mobilier-bureau"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Demander un devis leasing
                  </a>
                  <p className="text-[9px] text-muted-foreground mt-1">{LEASING_DISCLAIMER}</p>
                </div>
              )}

            <div className="pt-4 space-y-4">
              <Separator />
              
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span className="text-primary">{state.total.toFixed(2)}€ {priceLabel(priceMode)}</span>
              </div>

              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => {
                    if (state.items.length > 0) {
                      track('checkout_started', { cart_value: state.total, item_count: state.itemCount });
                      window.location.href = '/checkout';
                    }
                  }}
                  disabled={state.items.length === 0}
                >
                  Commander ({state.total.toFixed(2)}€ {priceLabel(priceMode)})
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleSaveForLater}
                    disabled={state.items.length === 0}
                  >
                    <Bookmark className="h-4 w-4 mr-2" aria-hidden="true" />
                    Sauvegarder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearCart}
                    disabled={state.items.length === 0}
                  >
                    Vider
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}