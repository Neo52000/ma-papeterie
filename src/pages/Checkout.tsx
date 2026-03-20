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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { ShoppingCart, CreditCard, Truck, FileText, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { priceLabel } from "@/lib/formatPrice";
import { checkoutStep1Schema, checkoutStep2Schema } from "@/lib/checkoutSchema";

export default function Checkout() {
  const { user, isLoading: authLoading } = useAuth();
  const { state: cartState, clearCart, isLoaded } = useCart();
  const { createOrder, createStripeCheckout } = useOrders();
  const navigate = useNavigate();
  const { toast } = useToast();
  const priceMode = usePriceModeStore((s) => s.mode);
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
    if (searchParams.get('cancelled') === 'true') {
      toast({
        title: "Paiement annule",
        description: "Vous pouvez modifier votre commande ou reessayer.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (!isLoaded) return; // Wait for cart to load from localStorage before redirecting
    if (cartState.items.length === 0) {
      navigate('/catalogue');
    } else {
      trackEvent('checkout_started', { itemsCount: cartState.items.length, total: cartState.total });
    }
  }, [cartState.items.length, cartState.total, navigate, isLoaded]);

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

      const orderPayload = {
        items,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: formData.shipping_address,
        billing_address: formData.same_billing ? formData.shipping_address : formData.billing_address,
        notes: formData.notes,
      };

      // Try Stripe checkout first — falls back to direct order if Stripe is not configured
      const stripeResult = await createStripeCheckout(orderPayload);

      if (stripeResult.success && stripeResult.sessionUrl) {
        trackEvent('checkout_redirect_stripe', { total: cartState.total, itemsCount: cartState.items.length });
        clearCart();
        // Redirect to Stripe hosted checkout page
        window.location.href = stripeResult.sessionUrl;
        return;
      }

      // Fallback: direct order creation (no payment gateway)
      const result = await createOrder(orderPayload);

      if (result.success) {
        trackEvent('purchase', { orderNumber: result.order_number, total: cartState.total, itemsCount: cartState.items.length });
        clearCart();
        toast({
          title: "Commande validee !",
          description: `Votre commande ${result.order_number} a ete enregistree avec succes.`,
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

  const validateAndAdvance = (nextStep: number) => {
    setErrors({});
    if (step === 1) {
      const result = checkoutStep1Schema.safeParse({
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: formData.shipping_address,
      });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((e) => {
          fieldErrors[e.path.join(".")] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }
    if (step === 2) {
      const result = checkoutStep2Schema.safeParse({
        same_billing: formData.same_billing,
        billing_address: formData.billing_address,
        notes: formData.notes,
      });
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((e) => {
          fieldErrors[e.path.join(".")] = e.message;
        });
        setErrors(fieldErrors);
        return;
      }
    }
    setStep(nextStep);
  };

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-sm text-destructive mt-1">{errors[key]}</p> : null;

  const stepLabels = ["Contact & Livraison", "Facturation", "Confirmation"];

  const shippingCost = cartState.total >= 89 ? 0 : 4.90;
  const totalWithShipping = cartState.total + shippingCost;

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

  if (!user || (!isLoaded) || cartState.items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finaliser ma commande</h1>

          {/* Visual Stepper */}
          <div className="flex items-center justify-center mb-10">
            {stepLabels.map((label, index) => {
              const stepNum = index + 1;
              const isCompleted = step > stepNum;
              const isActive = step === stepNum;

              return (
                <div key={stepNum} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : stepNum}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center whitespace-nowrap hidden sm:block ${
                        isActive ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-1.25rem] ${
                        step > stepNum ? "bg-green-500" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Steps Content */}
            <div className="lg:col-span-2 space-y-6">

              {/* Step 1: Contact & Livraison */}
              {step === 1 && (
                <>
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
                        {fieldError("customer_email")}
                      </div>
                      <div>
                        <Label htmlFor="phone">Telephone</Label>
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
                        {fieldError("shipping_address.street")}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="shipping_city">Ville *</Label>
                          <Input
                            id="shipping_city"
                            required
                            value={formData.shipping_address.city}
                            onChange={(e) => updateFormData('shipping_address.city', e.target.value)}
                            placeholder="Paris"
                          />
                          {fieldError("shipping_address.city")}
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
                          {fieldError("shipping_address.postal_code")}
                        </div>
                      </div>
                      <div>
                        <Label>Pays</Label>
                        <Input value="France" disabled />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => validateAndAdvance(2)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 2: Facturation & Notes */}
              {step === 2 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Adresse de facturation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="same_billing"
                          checked={formData.same_billing}
                          onCheckedChange={(checked) => updateFormData('same_billing', !!checked)}
                        />
                        <Label htmlFor="same_billing" className="cursor-pointer">
                          Adresse de facturation identique a la livraison
                        </Label>
                      </div>

                      {!formData.same_billing && (
                        <div className="space-y-4 pt-4">
                          <div>
                            <Label htmlFor="billing_street">Adresse *</Label>
                            <Input
                              id="billing_street"
                              required
                              value={formData.billing_address.street}
                              onChange={(e) => updateFormData('billing_address.street', e.target.value)}
                              placeholder="123 rue de la Paix"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="billing_city">Ville *</Label>
                              <Input
                                id="billing_city"
                                required
                                value={formData.billing_address.city}
                                onChange={(e) => updateFormData('billing_address.city', e.target.value)}
                                placeholder="Paris"
                              />
                            </div>
                            <div>
                              <Label htmlFor="billing_postal">Code postal *</Label>
                              <Input
                                id="billing_postal"
                                required
                                value={formData.billing_address.postal_code}
                                onChange={(e) => updateFormData('billing_address.postal_code', e.target.value)}
                                placeholder="75001"
                              />
                            </div>
                          </div>
                          <div>
                            <Label>Pays</Label>
                            <Input value="France" disabled />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Commentaires</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder="Informations supplementaires pour votre commande..."
                        value={formData.notes}
                        onChange={(e) => updateFormData('notes', e.target.value)}
                        rows={4}
                      />
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Precedent
                    </Button>
                    {fieldError("billing_address")}
                    <Button
                      onClick={() => validateAndAdvance(3)}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Informations de contact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p><span className="font-medium">Email :</span> {formData.customer_email}</p>
                      {formData.customer_phone && (
                        <p><span className="font-medium">Telephone :</span> {formData.customer_phone}</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Truck className="h-5 w-5 mr-2" />
                        Adresse de livraison
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      <p>{formData.shipping_address.street}</p>
                      <p>{formData.shipping_address.postal_code} {formData.shipping_address.city}</p>
                      <p>{formData.shipping_address.country}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="h-5 w-5 mr-2" />
                        Adresse de facturation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {formData.same_billing ? (
                        <p className="text-muted-foreground italic">Identique a l'adresse de livraison</p>
                      ) : (
                        <>
                          <p>{formData.billing_address.street}</p>
                          <p>{formData.billing_address.postal_code} {formData.billing_address.city}</p>
                          <p>{formData.billing_address.country}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Articles
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {cartState.items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {parseFloat(item.price).toFixed(2)} € {priceLabel(priceMode)} x {item.quantity}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {(parseFloat(item.price) * item.quantity).toFixed(2)} € {priceLabel(priceMode)}
                          </p>
                        </div>
                      ))}

                      <Separator />

                      <div className="flex justify-between items-center">
                        <p className="font-medium">Sous-total</p>
                        <p className="font-semibold">{cartState.total.toFixed(2)} € {priceLabel(priceMode)}</p>
                      </div>

                      <div className="flex justify-between items-center">
                        <p className="font-medium">Livraison</p>
                        <p className="font-semibold text-green-600">
                          {shippingCost === 0 ? 'Gratuite' : `${shippingCost.toFixed(2)} € ${priceLabel(priceMode)}`}
                        </p>
                      </div>

                      <Separator />

                      <div className="flex justify-between items-center text-lg">
                        <p className="font-bold">Total</p>
                        <p className="font-bold text-primary">
                          {totalWithShipping.toFixed(2)} € {priceLabel(priceMode)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {formData.notes && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Commentaires</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{formData.notes}</p>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Precedent
                    </Button>
                    <form onSubmit={handleSubmit}>
                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        {loading ? 'Validation en cours...' : 'Valider ma commande'}
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Recapitulatif
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cartState.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {parseFloat(item.price).toFixed(2)} € {priceLabel(priceMode)} x {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold">
                        {(parseFloat(item.price) * item.quantity).toFixed(2)} € {priceLabel(priceMode)}
                      </p>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between items-center">
                    <p className="font-medium">Sous-total</p>
                    <p className="font-semibold">{cartState.total.toFixed(2)} € {priceLabel(priceMode)}</p>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className="font-medium">Livraison</p>
                    <p className="font-semibold text-green-600">
                      {shippingCost === 0 ? 'Gratuite' : `${shippingCost.toFixed(2)} € ${priceLabel(priceMode)}`}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center text-lg">
                    <p className="font-bold">Total</p>
                    <p className="font-bold text-primary">
                      {totalWithShipping.toFixed(2)} € {priceLabel(priceMode)}
                    </p>
                  </div>

                  {cartState.total < 89 && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <p>Ajoutez {(89 - cartState.total).toFixed(2)} € pour beneficier de la livraison gratuite</p>
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
