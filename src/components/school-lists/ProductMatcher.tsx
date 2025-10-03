import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ShoppingCart, Leaf, TrendingUp, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  eco: boolean;
  stock_quantity: number;
  badge: string | null;
}

interface ProductMatcherProps {
  itemName: string;
  quantity: number;
  onProductSelected?: (productId: string) => void;
}

const ProductMatcher = ({ itemName, quantity, onProductSelected }: ProductMatcherProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const { addToCart } = useCart();

  useEffect(() => {
    searchProducts();
  }, [itemName]);

  const searchProducts = async () => {
    try {
      setLoading(true);
      
      // Recherche avec ILIKE pour trouver des produits similaires
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'scolaire')
        .or(`name.ilike.%${itemName}%,description.ilike.%${itemName}%`)
        .order('price', { ascending: true })
        .limit(3);

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Error searching products:', err);
      toast.error('Erreur lors de la recherche de produits');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProduct(productId);
    if (onProductSelected) {
      onProductSelected(productId);
    }
  };

  const handleAddToCart = (product: Product) => {
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price.toString(),
        image: product.image_url || '/placeholder.svg',
        category: product.category,
        stock_quantity: product.stock_quantity
      });
    }
  };

  const getPriceCategory = (price: number) => {
    if (price < 2) return { label: 'Économique', icon: DollarSign, color: 'text-green-600' };
    if (price < 5) return { label: 'Standard', icon: TrendingUp, color: 'text-blue-600' };
    return { label: 'Premium', icon: TrendingUp, color: 'text-purple-600' };
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-20 bg-muted/50 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            Aucun produit trouvé pour "{itemName}"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product) => {
        const priceCategory = getPriceCategory(product.price);
        const PriceCategoryIcon = priceCategory.icon;
        const isSelected = selectedProduct === product.id;
        const totalPrice = (product.price * quantity).toFixed(2);

        return (
          <Card 
            key={product.id}
            className={`transition-all cursor-pointer hover:shadow-md ${
              isSelected ? 'ring-2 ring-primary bg-accent/50' : ''
            }`}
            onClick={() => handleSelectProduct(product.id)}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Image */}
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={product.image_url || '/placeholder.svg'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm line-clamp-1">{product.name}</h4>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Prix */}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <PriceCategoryIcon className={`w-3 h-3 ${priceCategory.color}`} />
                      <span className="text-xs">{priceCategory.label}</span>
                    </Badge>

                    {/* Éco */}
                    {product.eco && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Leaf className="w-3 h-3 text-green-600" />
                        <span className="text-xs">Éco</span>
                      </Badge>
                    )}

                    {/* Badge custom */}
                    {product.badge && (
                      <Badge variant="default" className="text-xs">
                        {product.badge}
                      </Badge>
                    )}

                    {/* Stock */}
                    {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        Plus que {product.stock_quantity}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {product.price.toFixed(2)}€ × {quantity} =
                      </span>
                      <span className="ml-2 font-bold text-primary">
                        {totalPrice}€
                      </span>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(product);
                      }}
                      disabled={product.stock_quantity === 0}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProductMatcher;
