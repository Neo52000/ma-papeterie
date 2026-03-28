import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { useStampDesignPersist } from "@/hooks/useStampDesignPersist";
import { useCart } from "@/contexts/CartContext";
import type Konva from "konva";

interface StampStickyCTAProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function StampStickyCTA({ stageRef }: StampStickyCTAProps) {
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);
  const lines = useStampDesignerStore((s) => s.lines);
  const reset = useStampDesignerStore((s) => s.reset);

  const { saveDesign } = useStampDesignPersist();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(false);

  if (!selectedModel) return null;

  const price = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(selectedModel.base_price_ttc);

  const handleAddToCart = async () => {
    const hasText = lines.some((line) => line.text.trim().length > 0);
    if (!hasText) {
      toast.error("Veuillez saisir au moins une ligne de texte.");
      return;
    }

    setLoading(true);
    try {
      const result = await saveDesign(stageRef.current);
      if (!result) {
        toast.error("Erreur lors de la sauvegarde du design.");
        return;
      }

      const { designId, previewUrl } = result;

      addToCart({
        id: `stamp-${designId}`,
        name: `${selectedModel.name} - Personnalisé`,
        price: selectedModel.base_price_ttc.toFixed(2),
        image: previewUrl || "/placeholder.svg",
        category: "Tampons personnalisés",
        stock_quantity: selectedModel.stock_quantity,
        stamp_design_id: designId,
      });

      toast.success("Tampon ajouté au panier !");
      reset();
    } catch (err) {
      if (import.meta.env.DEV) console.error("Add to cart error:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
          <Truck className="h-4 w-4" />
          <span>Livraison 3-5 jours</span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-lg font-bold hidden sm:block">{price}</span>
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2 text-base px-8"
            disabled={loading}
            onClick={handleAddToCart}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            Commander ce tampon — {price}
          </Button>
        </div>
      </div>
    </div>
  );
}
