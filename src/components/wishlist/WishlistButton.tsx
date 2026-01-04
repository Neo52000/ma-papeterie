import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlistStore } from "@/stores/wishlistStore";
import { ShopifyProduct } from "@/stores/cartStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  product: ShopifyProduct;
  variant?: "icon" | "default";
  className?: string;
}

export const WishlistButton = ({ product, variant = "icon", className }: WishlistButtonProps) => {
  const { addItem, removeItem, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product.node.id);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      removeItem(product.node.id);
      toast.info("Retiré des favoris", {
        description: product.node.title,
        position: "top-center"
      });
    } else {
      addItem(product);
      toast.success("Ajouté aux favoris", {
        description: product.node.title,
        position: "top-center"
      });
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          "h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background",
          className
        )}
      >
        <Heart 
          className={cn(
            "h-4 w-4 transition-colors",
            isWishlisted ? "fill-accent text-accent" : "text-muted-foreground"
          )} 
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isWishlisted ? "secondary" : "outline"}
      onClick={handleToggle}
      className={className}
    >
      <Heart 
        className={cn(
          "h-4 w-4 mr-2",
          isWishlisted && "fill-accent text-accent"
        )} 
      />
      {isWishlisted ? "Dans vos favoris" : "Ajouter aux favoris"}
    </Button>
  );
};
