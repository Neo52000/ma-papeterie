import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useStampDesignerStore } from "@/stores/stampDesignerStore";
import { useStampDesignPersist } from "@/hooks/useStampDesignPersist";
import { useCart } from "@/contexts/CartContext";
import type Konva from "konva";

interface StampAddToCartButtonProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function StampAddToCartButton({ stageRef }: StampAddToCartButtonProps) {
  const selectedModel = useStampDesignerStore((s) => s.selectedModel);
  const lines = useStampDesignerStore((s) => s.lines);
  const reset = useStampDesignerStore((s) => s.reset);

  const { saveDesign } = useStampDesignPersist();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(false);

  if (!selectedModel) return null;

  const handleAddToCart = async () => {
    // Validate at least one line has text
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

      toast.success("Tampon personnalisé ajouté au panier !");
      reset();
    } catch (err) {
      if (import.meta.env.DEV) console.error("Add to cart error:", err);
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      className="w-full"
      disabled={loading}
      onClick={handleAddToCart}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
      ) : (
        <ShoppingCart className="h-5 w-5 mr-2" />
      )}
      Ajouter au panier — {selectedModel.base_price_ttc.toFixed(2)} €
    </Button>
  );
}
