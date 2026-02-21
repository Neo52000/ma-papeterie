import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useOrders } from "@/hooks/useOrders";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, CreditCard, Truck, FileText } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

export default function Checkout() {
  const { user, isLoading: authLoading } = useAuth();
  const { state: cartState, clearCart } = useCart();
  const { createOrder } = useOrders();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_email: '',
    customer_phone: '',
    shipping_address: {
      street: '',
      city: '',
      postal_code: '',
      country: 'France',
    },
    billing_address: {
      street: '',
      city: '',
      postal_code: '',
      country: 'France',
    },
    notes: '',
    same_billing: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (cartState.items.length === 0) {
      navigate('/catalogue');
    } else {
      trackEvent('checkout_started', { itemsCount: cartState.items.length, total: cartState.total });
    }
  }, [cartState.items.length, cartState.total, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare order items
      const items = cartState.items.map(item => ({
        product_id: item.id,
        product_name: item.name,
        product_price: parseFloat(item.price),
        quantity: item.quantity,
      }));

      // Create order
      const result = await createOrder({
        items,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: formData.shipping_address,
        billing_address: formData.same_billing ? formData.shipping_address : formData.billing_address,
        notes: formData.notes,
      });

      if (result.success) {
        trackEvent('purchase', { orderNumber: result.order_number, total: cartState.total, itemsCount: cartState.items.length });
        clearCart();
        toast({
          title: "Commande validée !",
          description: `Votre commande ${result.order_number} a été enregistrée avec succès.`,
        });
        navigate('/mon-compte?tab=orders');
      } else {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la validation de votre commande.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const result = { ...prev };
      let current: any = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return result;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">Chargement...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || cartState.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finaliser ma commande</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2" />
                      Informations de contact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.customer_email}
                        onChange={(e) => updateFormData('customer_email', e.target.value)}
                        placeholder="votre@email.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.customer_phone}
                        onChange={(e) => updateFormData('customer_phone', e.target.value)}
                        placeholder="01 23 45 67 89"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Shipping Address */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Adresse de livraison
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="shipping_street">Adresse *</Label>
                      <Input
                        id="shipping_street"
                        required
                        value={formData.shipping_address.street}
                        onChange={(e) => updateFormData('shipping_address.street', e.target.value)}
                        placeholder="123 rue de la Paix"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="shipping_city">Ville *</Label>
                        <Input
                          id="shipping_city"
                          required
                          value={formData.shipping_address.city}
                          onChange={(e) => updateFormData('shipping_address.city', e.target.value)}
                          placeholder="Paris"
                        />
                      </div>
                      <div>
                        <Label htmlFor="shipping_postal">Code postal *</Label>
                        <Input
                          id="shipping_postal"
                          required
                          value={formData.shipping_address.postal_code}
                          onChange={(e) => updateFormData('shipping_address.postal_code', e.target.value)}
                          placeholder="75001"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Commentaires</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Informations supplémentaires pour votre commande..."
                      value={formData.notes}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      rows={4}
                    />
                  </CardContent>
                </Card>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  {loading ? 'Validation en cours...' : 'Valider ma commande'}
                </Button>
              </form>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Récapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartState.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {parseFloat(item.price).toFixed(2)} € × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Sous-total</p>
                    <p className="font-semibold">{cartState.total.toFixed(2)} €</p>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="font-medium">Livraison</p>
                    <p className="font-semibold text-green-600">
                      {cartState.total >= 49 ? 'Gratuite' : '4.90 €'}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center text-lg">
                    <p className="font-bold">Total</p>
                    <p className="font-bold text-primary">
                      {(cartState.total + (cartState.total >= 49 ? 0 : 4.90)).toFixed(2)} €
                    </p>
                  </div>

                  {cartState.total < 49 && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <p>Ajoutez {(49 - cartState.total).toFixed(2)} € pour bénéficier de la livraison gratuite</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}