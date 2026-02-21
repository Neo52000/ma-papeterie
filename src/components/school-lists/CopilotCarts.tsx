import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Leaf, DollarSign, Scale, Crown, Package } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import type { SchoolListCart } from '@/hooks/useSchoolCopilot';

interface CopilotCartsProps {
  carts: SchoolListCart[];
}

const tierConfig = {
  essentiel: {
    label: 'Essentiel',
    description: 'Prix mini, l\'indispensable',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-800',
  },
  equilibre: {
    label: 'Équilibré',
    description: 'Meilleur rapport qualité/prix',
    icon: Scale,
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 text-blue-800',
  },
  premium: {
    label: 'Premium Durable',
    description: 'Éco-responsable & qualité',
    icon: Crown,
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-800',
  },
};

const CopilotCarts = ({ carts }: CopilotCartsProps) => {
  const { addToCart } = useCart();

  if (!carts.length) return null;

  const handleAddCart = (cart: SchoolListCart) => {
    const items = cart.items as any[];
    let added = 0;
    for (const item of items) {
      for (let i = 0; i < (item.quantity || 1); i++) {
        addToCart({
          id: item.product_id,
          name: item.product_name,
          price: String(item.price_ttc || item.price),
          image: item.image_url || '/placeholder.svg',
          category: 'scolaire',
          stock_quantity: 999,
        });
        added++;
      }
    }
    trackEvent('cart_variant_selected', { tier: cart.tier, itemsCount: added, totalTtc: cart.total_ttc });
    toast.success(`${added} articles ajoutés au panier (${tierConfig[cart.tier].label})`);
  };

  // Sort: essentiel, equilibre, premium
  const sortedCarts = [...carts].sort((a, b) => {
    const order = { essentiel: 0, equilibre: 1, premium: 2 };
    return (order[a.tier] ?? 0) - (order[b.tier] ?? 0);
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        Choisissez votre panier
      </h3>
      
      <div className="grid md:grid-cols-3 gap-4">
        {sortedCarts.map((cart) => {
          const config = tierConfig[cart.tier];
          const Icon = config.icon;
          const ecoCount = (cart.items as any[]).filter((i: any) => i.eco).length;

          return (
            <Card key={cart.id} className={cn("relative overflow-hidden", config.border)}>
              {cart.tier === 'equilibre' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                  Recommandé
                </div>
              )}
              <CardHeader className={cn("pb-3", config.bg)}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={cn("w-5 h-5", config.color)} />
                  {config.label}
                </CardTitle>
                <CardDescription className="text-xs">
                  {config.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="text-center">
                  <p className="text-3xl font-bold">{cart.total_ttc.toFixed(2)}€</p>
                  <p className="text-xs text-muted-foreground">
                    {cart.items_count} article{cart.items_count > 1 ? 's' : ''} TTC
                  </p>
                </div>

                <div className="flex gap-2 justify-center flex-wrap">
                  {ecoCount > 0 && (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Leaf className="w-3 h-3 text-green-600" />
                      {ecoCount} éco
                    </Badge>
                  )}
                </div>

                {/* Mini list of items */}
                <div className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {(cart.items as any[]).slice(0, 5).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="truncate mr-2">{item.product_name}</span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                  {cart.items_count > 5 && (
                    <p className="text-muted-foreground italic">
                      +{cart.items_count - 5} autre{cart.items_count - 5 > 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <Button
                  className="w-full"
                  variant={cart.tier === 'equilibre' ? 'default' : 'outline'}
                  onClick={() => handleAddCart(cart)}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ajouter au panier
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CopilotCarts;
