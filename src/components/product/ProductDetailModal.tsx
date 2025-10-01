import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, Heart, ShoppingCart, Minus, Plus, Truck, Shield, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/hooks/useProductFilters";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addToCart } = useCart();

  if (!product) return null;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        stock_quantity: product.stock || 0
      });
    }
    onClose();
  };

  const productImages = [
    product.image,
    product.image, // Simulating multiple images
    product.image
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg bg-muted">
              <img 
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover"
              />
              {product.badge && (
                <Badge className={`absolute top-4 left-4 ${
                  product.badge === 'Bestseller' ? 'bg-primary text-primary-foreground' :
                  product.badge === 'Vintage' ? 'bg-vintage-cream text-vintage-brown' :
                  product.badge === 'Éco' ? 'bg-accent text-accent-foreground' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {product.badge}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${
                    selectedImage === index ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">{product.category}</div>
              <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
              
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${
                        i < 4 ? 'text-vintage-yellow fill-current' : 'text-muted-foreground'
                      }`} 
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(127 avis)</span>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold text-primary">{product.price}€</span>
                {product.originalPrice && (
                  <span className="text-lg text-muted-foreground line-through">
                    {product.originalPrice}€
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground">
                  Produit de qualité supérieure, parfait pour vos besoins de papeterie. 
                  Fabriqué avec des matériaux durables et respectueux de l'environnement.
                </p>
              </div>

              <Separator />

              {/* Quantity Selector */}
              <div className="flex items-center gap-4">
                <span className="font-semibold">Quantité:</span>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Button 
                  onClick={handleAddToCart} 
                  className="w-full" 
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Ajouter au panier - {(parseFloat(product.price) * quantity).toFixed(2)}€
                </Button>
                
                <Button variant="outline" className="w-full" size="lg">
                  <Heart className="w-5 h-5 mr-2" />
                  Ajouter aux favoris
                </Button>
              </div>

              <Separator />

              {/* Service Info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Truck className="w-5 h-5 text-primary" />
                  <span>Livraison gratuite dès 50€</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Shield className="w-5 h-5 text-primary" />
                  <span>Garantie qualité</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <RotateCcw className="w-5 h-5 text-primary" />
                  <span>Retour gratuit sous 30 jours</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}