import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/stores/authStore";
import { useCart } from "@/stores/mainCartStore";
import { useOrders } from "@/hooks/useOrders";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { PageLoadingSpinner } from "@/components/ui/loading-states";
import { ShoppingCart, CreditCard, Truck, FileText, Check, ChevronLeft, ChevronRight, MapPin, Store } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { usePriceModeStore } from "@/stores/priceModeStore";
import { priceLabel } from "@/lib/formatPrice";
import { checkoutStep1Schema, checkoutStep2Schema } from "@/lib/checkoutSchema";
import { useShippingMethods, calculateShippingCost, formatDeliveryDays } from "@/hooks/useShippingMethods";
import type { ShippingMethod } from "@/hooks/useShippingMethods";
import { isAllowedRedirectUrl } from "@/lib/validate-redirect";
import { CheckoutNewsletterOptIn } from "@/components/newsletter";
import type { CheckoutNewsletterOptInRef } from "@/components/newsletter";

export default function Checkout() {
  const { user, isLoading: authLoading } = useAuth();
  const { state: cartState, clearCart, isLoaded } = useCart();
  const { createOrder, createStripeCheckout } = useOrders();
  const navigate = (url: string) => { window.location.href = url; };
  const priceMode = usePriceModeStore((s) => s.mode);
  const searchParams = new URLSearchParams(window.location.search);

  const newsletterRef = useRef<CheckoutNewsletterOptInRef>(null);
  const { data: shippingMethods = [] } = useShippingMethods();
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
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
      toast.error("Paiement annule", {
        description: "Vous pouvez modifier votre commande ou reessayer.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLoaded) return; // Wait for cart to load from localStorage before redirecting
    if (cartState.items.length === 0) {
      navigate('/catalogue');
    } else {
      trackEvent('checkout_started', { itemsCount: cartState.items.length, total: cartState.total });
    }
  }, [cartState.items.length, cartState.total, navigate, isLoaded]);

  // Auto-fill form with logged-in user data and last order addresses
  const prefilled = useRef(false);
  const prefillForm = useCallback(async () => {
    if (prefilled.current || !user) return;
    prefilled.current = true;

    const email = user.email || '';
    const phone = user.user_metadata?.phone || '';

    // Fetch the user's most recent order to reuse addresses & shipping method
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('shipping_address, billing_address, customer_phone, shipping_method_name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const savedShipping = lastOrder?.shipping_address as Record<string, string> | null;
    const savedBilling = lastOrder?.billing_address as Record<string, string> | null;

    setFormData(prev => ({
      ...prev,
      customer_email: prev.customer_email || email,
      customer_phone: prev.customer_phone || lastOrder?.customer_phone || phone,
      shipping_address: {
        street: prev.shipping_address.street || savedShipping?.street || '',
        city: prev.shipping_address.city || savedShipping?.city || '',
        postal_code: prev.shipping_address.postal_code || savedShipping?.postal_code || '',
        country: prev.shipping_address.country || savedShipping?.country || 'France',
      },
      billing_address: {
        street: prev.billing_address.street || savedBilling?.street || '',
        city: prev.billing_address.city || savedBilling?.city || '',
        postal_code: prev.billing_address.postal_code || savedBilling?.postal_code || '',
        country: prev.billing_address.country || savedBilling?.country || 'France',
      },
    }));

    // Auto-select the last used shipping method if available
    if (lastOrder?.shipping_method_name && shippingMethods.length > 0) {
      const match = shippingMethods.find(m => m.name === lastOrder.shipping_method_name);
      if (match && !selectedMethodId) {
        setSelectedMethodId(match.id);
      }
    }
  }, [user, shippingMethods, selectedMethodId]);

  useEffect(() => {
    prefillForm();
  }, [prefillForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    newsletterRef.current?.triggerSubscribe();

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
        delivery_cost: shippingCost,
        shipping_method_name: selectedMethod?.name,
      };

      // Try Stripe checkout first — falls back to direct order if Stripe is not configured
      const stripeResult = await createStripeCheckout(orderPayload);

      if (stripeResult.success && stripeResult.sessionUrl) {
        if (!isAllowedRedirectUrl(stripeResult.sessionUrl)) {
          toast.error("Erreur", { description: "URL de paiement invalide." });
          return;
        }
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
        toast.success("Commande validee !", {
          description: `Votre commande ${result.order_number} a ete enregistree avec succes.`,
        });
        navigate('/mon-compte?tab=orders');
      } else {
        const userMessage = result.error?.includes('stock')
          ? "Un article n'est plus disponible en quantité suffisante. Veuillez vérifier votre panier."
          : result.error?.includes('timeout') || result.error?.includes('connect')
          ? "La connexion a expiré. Veuillez réessayer dans quelques instants."
          : "Une erreur est survenue lors de la validation. Veuillez réessayer ou nous contacter.";
        toast.error("Impossible de valider la commande", {
          description: userMessage,
        });
      }
    } catch (_error) {
      toast.error("Erreur", {
        description: "Une erreur est survenue lors de la validation de votre commande.",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (path: string, value: string | boolean) => {
    setFormData(prev => {
      const keys = path.split('.');
      const result = { ...prev };
      let current: Record<string, unknown> = result;

      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...(current[keys[i]] as Record<string, unknown>) };
        current = current[keys[i]] as Record<string, unknown>;
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

  const selectedMethod: ShippingMethod | undefined = shippingMethods.find(m => m.id === selectedMethodId) || shippingMethods[0];
  const shippingCost = selectedMethod ? calculateShippingCost(selectedMethod, cartState.total) : 0;
  const totalWithShipping = cartState.total + shippingCost;

  // Auto-select first shipping method
  useEffect(() => {
    if (shippingMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(shippingMethods[0].id);
    }
  }, [shippingMethods, selectedMethodId]);

  // Redirect to catalogue if cart is empty
  useEffect(() => {
    if (isLoaded && cartState.items.length === 0) {
      navigate('/catalogue');
    }
  }, [isLoaded, cartState.items.length, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <PageLoadingSpinner />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || !isLoaded || cartState.items.length === 0) {
    return <PageLoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Panier — Ma Papeterie</title>
        <meta name="robots" content="noindex" />
      </Helmet>
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
                          ? "bg-green-500 dark:bg-green-600 text-white"
                          : isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : stepNum}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center whitespace-nowrap hidden sm:block ${
                        isActive ? "text-primary" : isCompleted ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div
                      className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-1.25rem] ${
                        step > stepNum ? "bg-green-500 dark:bg-green-600" : "bg-muted"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile order summary (collapsible) */}
          <div className="lg:hidden mb-6">
            <Accordion type="single" collapsible>
              <AccordionItem value="summary" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-2">
                    <span className="flex items-center gap-2 font-semibold text-sm">
                      <ShoppingCart className="h-4 w-4" />
                      {cartState.items.length} article{cartState.items.length > 1 ? "s" : ""}
                    </span>
                    <span className="font-bold text-primary">{totalWithShipping.toFixed(2)} €</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  {cartState.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{parseFloat(item.price).toFixed(2)} € x {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{(parseFloat(item.price) * item.quantity).toFixed(2)} €</p>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Livraison</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{shippingCost === 0 ? 'Gratuite' : `${shippingCost.toFixed(2)} €`}</span>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

                  {/* Shipping Method Selection */}
                  {shippingMethods.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Truck className="h-5 w-5 mr-2" />
                          Mode de livraison
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {shippingMethods.map((method) => {
                          const cost = calculateShippingCost(method, cartState.total);
                          const isSelected = selectedMethod?.id === method.id;
                          return (
                            <label
                              key={method.id}
                              className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="shipping_method"
                                  checked={isSelected}
                                  onChange={() => setSelectedMethodId(method.id)}
                                  className="h-4 w-4 text-primary"
                                />
                                <div className="flex items-center gap-2">
                                  {method.method_type === "store_pickup" ? (
                                    <Store className="h-4 w-4 text-muted-foreground" />
                                  ) : method.method_type === "relay_point" ? (
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div>
                                    <p className="font-medium text-sm">{method.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {method.carrier}
                                      {formatDeliveryDays(method) && ` — ${formatDeliveryDays(method)}`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <span className={`font-semibold text-sm ${cost === 0 ? "text-green-600" : ""}`}>
                                {cost === 0 ? "Gratuit" : `${cost.toFixed(2)} €`}
                              </span>
                            </label>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

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
                      {selectedMethod && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground">
                            Mode : <span className="font-medium text-foreground">{selectedMethod.name}</span>
                            {" — "}
                            <span className={shippingCost === 0 ? "text-green-600 font-medium" : "font-medium"}>
                              {shippingCost === 0 ? "Gratuit" : `${shippingCost.toFixed(2)} €`}
                            </span>
                          </p>
                        </div>
                      )}
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

                  <CheckoutNewsletterOptIn
                    ref={newsletterRef}
                    email={formData.customer_email}
                    className="mt-4"
                  />

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

            {/* Order Summary Sidebar (desktop only) */}
            <div className="hidden lg:block">
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
                    <p className="font-semibold text-green-600 dark:text-green-400">
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

                  {selectedMethod && selectedMethod.free_above != null && selectedMethod.free_above > 0 && cartState.total < selectedMethod.free_above && (
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                      <p>Ajoutez {(selectedMethod.free_above - cartState.total).toFixed(2)} € pour beneficier de la livraison gratuite</p>
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
